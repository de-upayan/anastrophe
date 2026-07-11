import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Uploads a file buffer directly to a Supabase storage bucket.
 * Bucket names are 'previews' (public) and 'vectors' (private).
 */
export async function uploadFileToStorage(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  bucketName: 'previews' | 'vectors'
): Promise<string> {
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

  return data.path; // Returns the file path name (e.g. "xT9kR3w2.png")
}

/**
 * Deletes a file from a Supabase storage bucket by its filename.
 */
export async function deleteFileFromStorage(
  fileName: string,
  bucketName: 'previews' | 'vectors'
): Promise<void> {
  if (!fileName) return;
  const { error } = await supabase.storage
    .from(bucketName)
    .remove([fileName]);

  if (error) {
    console.warn(`Error deleting ${fileName} from bucket ${bucketName}:`, error);
  }
}

/**
 * Downloads a file's content from a private bucket as a text string (useful for raw SVG).
 */
export async function downloadTextFileFromStorage(
  fileName: string,
  bucketName: 'previews' | 'vectors' = 'vectors'
): Promise<string> {
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
 * Helper to construct the public direct access URL for Supabase storage files.
 */
export function getStoragePublicUrl(
  fileName: string,
  bucketName: 'previews' | 'vectors' = 'previews'
): string {
  if (!fileName) return '';
  const { data } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  return data.publicUrl;
}
