import { createClient } from '@supabase/supabase-js';
import { AmbigramItem, DEFAULT_ITEMS } from './types';

export type { AmbigramItem };
export { DEFAULT_ITEMS };

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Securely use service role key if available for administrative write privileges, fallback to public key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

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

// Get all ambigrams from Supabase
export async function getAmbigrams(): Promise<AmbigramItem[]> {
  try {
    const { data, error } = await supabase
      .from('ambigrams')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching ambigrams from Supabase, returning empty array:', error);
      return [];
    }

    return (data || []).map(mapDbToItem);
  } catch (error) {
    console.error('Unhandled error in getAmbigrams:', error);
    return [];
  }
}

// Add or overwrite a single ambigram in Supabase
export async function saveAmbigram(item: AmbigramItem): Promise<void> {
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

// Get a single ambigram by ID from Supabase
export async function getAmbigramById(id: string): Promise<AmbigramItem | null> {
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

// Delete an ambigram by ID from Supabase
export async function deleteAmbigram(id: string): Promise<void> {
  const { error } = await supabase
    .from('ambigrams')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting ambigram ${id} from Supabase:`, error);
    throw error;
  }
}

// Increment views counter with telemetry logging in Supabase
export async function incrementViews(id: string, viewerId?: string): Promise<void> {
  try {
    const item = await getAmbigramById(id);
    if (!item) return;

    const viewsLog = item.viewsLog || [];
    viewsLog.push({
      timestamp: new Date().toISOString(),
      viewerId: viewerId || 'anonymous'
    });

    // Prune views log entries older than 8 days to prevent DB bloat
    const limitTime = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const prunedViewsLog = viewsLog.filter(x => new Date(x.timestamp).getTime() >= limitTime);

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

// Increment downloads counter with telemetry logging in Supabase
export async function incrementDownloads(id: string, viewerId?: string): Promise<void> {
  try {
    const item = await getAmbigramById(id);
    if (!item) return;

    const downloadsLog = item.downloadsLog || [];
    downloadsLog.push({
      timestamp: new Date().toISOString(),
      viewerId: viewerId || 'anonymous'
    });

    // Prune downloads log entries older than 8 days to prevent DB bloat
    const limitTime = Date.now() - 8 * 24 * 60 * 60 * 1000;
    const prunedDownloadsLog = downloadsLog.filter(x => new Date(x.timestamp).getTime() >= limitTime);

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
