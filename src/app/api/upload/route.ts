import { NextResponse } from 'next/server';
import { saveAmbigram } from '@/lib/db';
import { uploadFileToStorage, getStoragePublicUrl } from '@/lib/storage';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const title = formData.get('title') as string;
    const recipient = formData.get('recipient') as string || undefined;
    const password = formData.get('password') as string || undefined;
    
    const vectorFile = formData.get('vectorFile') as File | null;
    const previewFile = formData.get('previewFile') as File | null;
    const timelapseFile = formData.get('timelapseFile') as File | null;

    if (!title || !vectorFile || !previewFile || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing title, vector file, preview image, or password' },
        { status: 400 }
      );
    }

    const clientId = formData.get('id') as string || undefined;
    
    // Generate random 8-character ID if not provided by client
    const generateRandomId = (length: number = 8): string => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };
    const id = clientId || generateRandomId(8);

    // 1. Upload preview image (.png) to Supabase Storage (publicPreviews bucket)
    const previewBuffer = Buffer.from(await previewFile.arrayBuffer());
    const previewFileName = `${id}.png`;
    await uploadFileToStorage(
      previewBuffer,
      previewFileName,
      'image/png',
      'previews' // public bucket
    );
    const imageSrc = getStoragePublicUrl(previewFileName, 'previews');

    // 2. Upload vector artwork (.svg) to Supabase Storage (privateVectors bucket)
    const vectorBuffer = Buffer.from(await vectorFile.arrayBuffer());
    const vectorFileName = `${id}.svg`;
    await uploadFileToStorage(
      vectorBuffer,
      vectorFileName,
      'image/svg+xml',
      'vectors' // private bucket
    );
    const vectorSrc = vectorFileName; // Store file name path to download securely later

    // 3. Upload timelapse video (.mp4) if provided
    let timelapseSrc = undefined;
    if (timelapseFile) {
      const timelapseBuffer = Buffer.from(await timelapseFile.arrayBuffer());
      const timelapseFileName = `${id}.mp4`;
      await uploadFileToStorage(
        timelapseBuffer,
        timelapseFileName,
        'video/mp4',
        'previews' // public bucket
      );
      timelapseSrc = getStoragePublicUrl(timelapseFileName, 'previews');
    }

    // 4. Save metadata record into database
    const newItem = {
      id,
      title,
      recipient,
      imageSrc,
      vectorSrc,    // private filename (for gated download)
      timelapseSrc, // public video URL
      password
    };

    await saveAmbigram(newItem);

    // Construct response links
    const origin = new URL(request.url).origin;
    const generatedLink = `${origin}/${id}`;

    return NextResponse.json({
      success: true,
      ambigram: newItem,
      generatedLink
    });

  } catch (error) {
    console.error('Error handling design upload API:', error);
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
