import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'db.json');

export interface AmbigramItem {
  id: string;
  title: string;
  recipient?: string;
  description?: string;
  imageSrc: string;
  timelapseSrc?: string;
  isPublic: boolean;
  isShareable: boolean;
  password?: string;
  createdAt?: string;
}

const DEFAULT_ITEMS: AmbigramItem[] = [
  {
    id: 'ambivalence',
    title: 'ambivalence',
    description: 'reflected and rotated symmetry',
    imageSrc: '/art/ambivalence.svg',
    timelapseSrc: '/art/ambivalence_timelapse.mp4',
    isPublic: true,
    isShareable: true,
    password: 'secret123',
    createdAt: new Date().toISOString()
  },
  {
    id: 'symmetry-art',
    title: 'symmetry',
    recipient: 'Alice',
    description: 'specially crafted design exploring center symmetry',
    imageSrc: '/art/symmetry.svg',
    timelapseSrc: '/art/symmetry_timelapse.mp4',
    isPublic: true,
    isShareable: true,
    password: 'secret123',
    createdAt: new Date().toISOString()
  },
  {
    id: 'illusionist',
    title: 'illusionist',
    recipient: 'Bob',
    description: 'optical shift showing dynamic shapes',
    imageSrc: '/art/illusionist.svg',
    timelapseSrc: '/art/illusionist_timelapse.mp4',
    isPublic: true,
    isShareable: true,
    password: 'secret123',
    createdAt: new Date().toISOString()
  }
];

// Helper to check if file exists
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Read all records from the database
export async function getAmbigrams(): Promise<AmbigramItem[]> {
  try {
    const exists = await fileExists(DB_PATH);
    if (!exists) {
      // Seed the JSON file
      await saveAllAmbigrams(DEFAULT_ITEMS);
      return DEFAULT_ITEMS;
    }
    const data = await fs.readFile(DB_PATH, 'utf-8');
    return JSON.parse(data) as AmbigramItem[];
  } catch (error) {
    console.error('Error reading JSON DB, returning defaults:', error);
    return DEFAULT_ITEMS;
  }
}

// Save all records to the database (internal helper)
export async function saveAllAmbigrams(items: AmbigramItem[]): Promise<void> {
  await fs.writeFile(DB_PATH, JSON.stringify(items, null, 2), 'utf-8');
}

// Add or overwrite a single ambigram
export async function saveAmbigram(item: AmbigramItem): Promise<void> {
  const items = await getAmbigrams();
  const index = items.findIndex(x => x.id === item.id);
  
  const newItem = {
    ...item,
    createdAt: item.createdAt || new Date().toISOString()
  };

  if (index !== -1) {
    items[index] = newItem;
  } else {
    items.unshift(newItem); // prepends new items to show up first in showcase
  }
  await saveAllAmbigrams(items);
}

// Get single ambigram by ID
export async function getAmbigramById(id: string): Promise<AmbigramItem | null> {
  const items = await getAmbigrams();
  return items.find(item => item.id === id) || null;
}
