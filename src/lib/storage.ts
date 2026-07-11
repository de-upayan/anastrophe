import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const isLocal = process.env.STORAGE_MODE === 'local';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = !isLocal && supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null;

// Local upload folder
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

/**
 * Uploads a file buffer. Saves locally to public/uploads in local dev mode,
 * otherwise uploads to the specified Supabase storage bucket.
 */
export async function uploadFileToStorage(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  bucketName: 'previews' | 'vectors'
): Promise<string> {
  if (isLocal) {
    try {
      await fs.mkdir(UPLOADS_DIR, { recursive: true });
      const filePath = path.join(UPLOADS_DIR, fileName);
      await fs.writeFile(filePath, fileBuffer);
      return fileName;
    } catch (err) {
      console.error(`Error saving local file ${fileName}:`, err);
      throw err;
    }
  }

  if (!supabase) throw new Error('Supabase client is not initialized');
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(fileName, fileBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error(`Error uploading ${fileName} to bucket ${bucketName}:`, error);
    throw error;
  }

  return data.path;
}

/**
 * Deletes a file. Unlinks locally in dev mode, otherwise removes from Supabase bucket.
 */
export async function deleteFileFromStorage(
  fileName: string,
  bucketName: 'previews' | 'vectors'
): Promise<void> {
  if (!fileName) return;

  if (isLocal) {
    try {
      // Remove leading directory paths if present
      const baseName = path.basename(fileName);
      const filePath = path.join(UPLOADS_DIR, baseName);
      await fs.unlink(filePath);
    } catch (err) {
      console.warn(`Could not delete local file ${fileName}:`, err);
    }
    return;
  }

  if (!supabase) return;
  const { error } = await supabase.storage
    .from(bucketName)
    .remove([fileName]);

  if (error) {
    console.warn(`Error deleting ${fileName} from bucket ${bucketName}:`, error);
  }
}

/**
 * Downloads a file's content as a text string (useful for raw SVG).
 */
export async function downloadTextFileFromStorage(
  fileName: string,
  bucketName: 'previews' | 'vectors' = 'vectors'
): Promise<string> {
  if (isLocal) {
    try {
      const baseName = path.basename(fileName);
      const filePath = path.join(UPLOADS_DIR, baseName);
      return await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      console.error(`Error reading local file ${fileName}:`, err);
      throw err;
    }
  }

  if (!supabase) throw new Error('Supabase client is not initialized');
  const { data, error } = await supabase.storage
    .from(bucketName)
    .download(fileName);

  if (error) {
    console.error(`Error downloading ${fileName} from bucket ${bucketName}:`, error);
    throw error;
  }

  return await data.text();
}

/**
 * Helper to construct the public direct access URL.
 */
export function getStoragePublicUrl(
  fileName: string,
  bucketName: 'previews' | 'vectors' = 'previews'
): string {
  if (!fileName) return '';

  if (isLocal) {
    const baseName = path.basename(fileName);
    return `/uploads/${baseName}`;
  }

  if (!supabase) return '';
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  return data.publicUrl;
}
