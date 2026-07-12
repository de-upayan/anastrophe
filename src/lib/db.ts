import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { AmbigramItem, DEFAULT_ITEMS, ActivityEvent } from './types';

export type { AmbigramItem };
export { DEFAULT_ITEMS };

const DB_PATH = path.join(process.cwd(), 'db.json');

// Check storage mode (defaults to 'supabase' in production/if not specified)
const isLocal = process.env.STORAGE_MODE === 'local';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

export const supabase = !isLocal && supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

// Schema conversion: database (snake_case) <-> application (camelCase)
function mapDbToItem(row: any): AmbigramItem {
  return {
    id: row.id,
    title: row.title,
    recipient: row.recipient || undefined,
    imageSrc: row.image_src,
    timelapseSrc: row.timelapse_src || undefined,
    vectorSrc: row.vector_src,
    password: row.password || undefined,
    views: row.views ?? 0,
    downloads: row.downloads ?? 0,
    createdAt: row.created_at,
    viewsLog: row.views_log || [],
    downloadsLog: row.downloads_log || []
  };
}

function mapItemToDb(item: AmbigramItem) {
  return {
    id: item.id,
    title: item.title,
    recipient: item.recipient || null,
    image_src: item.imageSrc,
    timelapse_src: item.timelapseSrc || null,
    vector_src: item.vectorSrc,
    password: item.password || null,
    views: item.views ?? 0,
    downloads: item.downloads ?? 0,
    created_at: item.createdAt || new Date().toISOString(),
    views_log: item.viewsLog || [],
    downloads_log: item.downloadsLog || []
  };
}

// Helper to check if file exists (local DB)
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Read local DB
async function readLocalDb(): Promise<AmbigramItem[]> {
  const exists = await fileExists(DB_PATH);
  if (!exists) {
    await writeLocalDb(DEFAULT_ITEMS);
    return DEFAULT_ITEMS;
  }
  try {
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading JSON DB file, fallback to defaults:', error);
    return DEFAULT_ITEMS;
  }
}

// Write local DB
async function writeLocalDb(items: AmbigramItem[]): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(items, null, 2), 'utf-8');
}

// --- Unified Database Interface ---

// Get all ambigrams
export async function getAmbigrams(): Promise<AmbigramItem[]> {
  if (isLocal) {
    return readLocalDb();
  }

  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('ambigrams')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ambigrams from Supabase:', error);
      return [];
    }

    return (data || []).map(mapDbToItem);
  } catch (error) {
    console.error('Unhandled error in getAmbigrams:', error);
    return [];
  }
}

// Add or overwrite a single ambigram
export async function saveAmbigram(item: AmbigramItem): Promise<void> {
  if (isLocal) {
    const items = await readLocalDb();
    const index = items.findIndex(x => x.id === item.id);
    
    const newItem = {
      ...item,
      views: item.views ?? 0,
      downloads: item.downloads ?? 0,
      createdAt: item.createdAt || new Date().toISOString()
    };

    if (index !== -1) {
      items[index] = newItem;
    } else {
      items.unshift(newItem); // prepends new items
    }
    await writeLocalDb(items);
    return;
  }

  if (!supabase) throw new Error('Supabase client is not initialized');
  const dbRow = mapItemToDb({
    ...item,
    views: item.views ?? 0,
    downloads: item.downloads ?? 0,
    createdAt: item.createdAt || new Date().toISOString()
  });

  const { error } = await supabase
    .from('ambigrams')
    .upsert(dbRow);

  if (error) {
    console.error('Error upserting ambigram to Supabase:', error);
    throw error;
  }
}

// Get a single ambigram by ID
export async function getAmbigramById(id: string): Promise<AmbigramItem | null> {
  if (isLocal) {
    const items = await readLocalDb();
    return items.find(item => item.id === id) || null;
  }

  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('ambigrams')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching ambigram ${id} from Supabase:`, error);
      return null;
    }

    return data ? mapDbToItem(data) : null;
  } catch (error) {
    console.error(`Unhandled error in getAmbigramById ${id}:`, error);
    return null;
  }
}

// Delete an ambigram by ID
export async function deleteAmbigram(id: string): Promise<void> {
  if (isLocal) {
    const items = await readLocalDb();
    const updatedItems = items.filter(item => item.id !== id);
    await writeLocalDb(updatedItems);
    return;
  }

  if (!supabase) throw new Error('Supabase client is not initialized');
  const { error } = await supabase
    .from('ambigrams')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting ambigram ${id} from Supabase:`, error);
    throw error;
  }
}

// Helper to prune activity logs to keep 8-day detailed history,
// but retain exactly one entry for each unique historical viewer/downloader (lifetime stats).
function pruneActivityLog(log: ActivityEvent[]): ActivityEvent[] {
  const limitTime = Date.now() - 8 * 24 * 60 * 60 * 1000;
  
  // 1. Split into recent (last 8 days) and old (older than 8 days)
  const recentEvents = log.filter(x => new Date(x.timestamp).getTime() >= limitTime);
  const oldEvents = log.filter(x => new Date(x.timestamp).getTime() < limitTime);
  
  // 2. Identify all viewerIds in the recent events
  const recentViewerIds = new Set(recentEvents.map(x => x.viewerId));
  
  // 3. Keep exactly one historical event per unique viewerId,
  // excluding those already counted in the recent events
  const uniqueOldEvents: ActivityEvent[] = [];
  const seenOldViewerIds = new Set<string>();
  
  for (const event of oldEvents) {
    const vId = event.viewerId || 'anonymous';
    if (vId !== 'anonymous' && !recentViewerIds.has(vId) && !seenOldViewerIds.has(vId)) {
      seenOldViewerIds.add(vId);
      uniqueOldEvents.push(event);
    }
  }
  
  // Keep one anonymous record from history if present, to represent anonymous events
  const hasOldAnonymous = oldEvents.some(x => (x.viewerId || 'anonymous') === 'anonymous');
  if (hasOldAnonymous && !recentViewerIds.has('anonymous')) {
    uniqueOldEvents.push({ timestamp: new Date(limitTime - 1).toISOString(), viewerId: 'anonymous' });
  }
  
  return [...uniqueOldEvents, ...recentEvents];
}

// Increment views counter with telemetry logging
export async function incrementViews(id: string, viewerId?: string): Promise<void> {
  if (isLocal) {
    const items = await readLocalDb();
    const index = items.findIndex(x => x.id === id);
    if (index !== -1) {
      const item = items[index];
      if (!item.viewsLog) item.viewsLog = [];
      
      item.viewsLog.push({
        timestamp: new Date().toISOString(),
        viewerId: viewerId || 'anonymous'
      });
      
      item.views = (item.views || 0) + 1;
      item.viewsLog = pruneActivityLog(item.viewsLog);
      
      await writeLocalDb(items);
    }
    return;
  }

  try {
    const item = await getAmbigramById(id);
    if (!item || !supabase) return;

    const viewsLog = item.viewsLog || [];
    viewsLog.push({
      timestamp: new Date().toISOString(),
      viewerId: viewerId || 'anonymous'
    });

    const prunedViewsLog = pruneActivityLog(viewsLog);

    const { error } = await supabase
      .from('ambigrams')
      .update({
        views: (item.views || 0) + 1,
        views_log: prunedViewsLog
      })
      .eq('id', id);

    if (error) {
      console.error(`Error incrementing views for ${id} in Supabase:`, error);
    }
  } catch (error) {
    console.error(`Unhandled error in incrementViews for ${id}:`, error);
  }
}

// Increment downloads counter with telemetry logging
export async function incrementDownloads(id: string, viewerId?: string): Promise<void> {
  if (isLocal) {
    const items = await readLocalDb();
    const index = items.findIndex(x => x.id === id);
    if (index !== -1) {
      const item = items[index];
      if (!item.downloadsLog) item.downloadsLog = [];
      
      item.downloadsLog.push({
        timestamp: new Date().toISOString(),
        viewerId: viewerId || 'anonymous'
      });
      
      item.downloads = (item.downloads || 0) + 1;
      item.downloadsLog = pruneActivityLog(item.downloadsLog);
      
      await writeLocalDb(items);
    }
    return;
  }

  try {
    const item = await getAmbigramById(id);
    if (!item || !supabase) return;

    const downloadsLog = item.downloadsLog || [];
    downloadsLog.push({
      timestamp: new Date().toISOString(),
      viewerId: viewerId || 'anonymous'
    });

    const prunedDownloadsLog = pruneActivityLog(downloadsLog);

    const { error } = await supabase
      .from('ambigrams')
      .update({
        downloads: (item.downloads || 0) + 1,
        downloads_log: prunedDownloadsLog
      })
      .eq('id', id);

    if (error) {
      console.error(`Error incrementing downloads for ${id} in Supabase:`, error);
    }
  } catch (error) {
    console.error(`Unhandled error in incrementDownloads for ${id}:`, error);
  }
}
