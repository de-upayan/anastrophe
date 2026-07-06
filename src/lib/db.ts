import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'db.json');

import { AmbigramItem, DEFAULT_ITEMS } from './types';
export type { AmbigramItem };
export { DEFAULT_ITEMS };

// Helper to check if file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Get all ambigrams from JSON database
export async function getAmbigrams(): Promise<AmbigramItem[]> {
  const exists = await fileExists(DB_PATH);
  if (!exists) {
    // Initialize database with default items on first access
    await saveAllAmbigrams(DEFAULT_ITEMS);
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

// Save all items back to file
export async function saveAllAmbigrams(items: AmbigramItem[]): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(items, null, 2), 'utf-8');
}

// Add or overwrite a single ambigram
export async function saveAmbigram(item: AmbigramItem): Promise<void> {
  const items = await getAmbigrams();
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
    items.unshift(newItem); // prepends new items to show up first
  }
  await saveAllAmbigrams(items);
}

// Get single ambigram by ID
export async function getAmbigramById(id: string): Promise<AmbigramItem | null> {
  const items = await getAmbigrams();
  return items.find(item => item.id === id) || null;
}

// Delete an ambigram by ID (metadata-only, does not delete files from disk)
export async function deleteAmbigram(id: string): Promise<void> {
  const items = await getAmbigrams();
  const updatedItems = items.filter(item => item.id !== id);
  await saveAllAmbigrams(updatedItems);
}

// Increment views counter with telemetry logging
export async function incrementViews(id: string, viewerId?: string): Promise<void> {
  const items = await getAmbigrams();
  const index = items.findIndex(x => x.id === id);
  if (index !== -1) {
    const item = items[index];
    if (!item.viewsLog) item.viewsLog = [];
    
    // Add view event record
    item.viewsLog.push({
      timestamp: new Date().toISOString(),
      viewerId: viewerId || 'anonymous'
    });
    
    // Increment total views count
    item.views = (item.views || 0) + 1;
    
    // Prune views log entries older than 8 days to prevent DB bloat
    const limitTime = Date.now() - 8 * 24 * 60 * 60 * 1000;
    item.viewsLog = item.viewsLog.filter(x => new Date(x.timestamp).getTime() >= limitTime);
    
    await saveAllAmbigrams(items);
  }
}

// Increment downloads counter with telemetry logging
export async function incrementDownloads(id: string, viewerId?: string): Promise<void> {
  const items = await getAmbigrams();
  const index = items.findIndex(x => x.id === id);
  if (index !== -1) {
    const item = items[index];
    if (!item.downloadsLog) item.downloadsLog = [];
    
    // Add download event record
    item.downloadsLog.push({
      timestamp: new Date().toISOString(),
      viewerId: viewerId || 'anonymous'
    });
    
    // Increment total downloads count
    item.downloads = (item.downloads || 0) + 1;
    
    // Prune downloads log entries older than 8 days to prevent DB bloat
    const limitTime = Date.now() - 8 * 24 * 60 * 60 * 1000;
    item.downloadsLog = item.downloadsLog.filter(x => new Date(x.timestamp).getTime() >= limitTime);
    
    await saveAllAmbigrams(items);
  }
}
