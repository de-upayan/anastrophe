import { NextResponse } from 'next/server';
import { getAmbigramById, deleteAmbigram, incrementViews, incrementDownloads } from '@/lib/db';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ambigram = await getAmbigramById(id);

    if (!ambigram) {
      return NextResponse.json(
        { success: false, error: 'Ambigram not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, ambigram });
  } catch (error) {
    console.error('Error fetching dynamic ambigram:', error);
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await request.json();

    // Extract client IP and hash it for anonymous unique viewer identification
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
    const viewerId = crypto.createHash('sha256').update(ip).digest('hex').substring(0, 16);

    if (action === 'view') {
      await incrementViews(id, viewerId);
      return NextResponse.json({ success: true, message: 'View registered' });
    } else if (action === 'download') {
      await incrementDownloads(id, viewerId);
      return NextResponse.json({ success: true, message: 'Download registered' });
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error updating stats:', error);
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // 1. Fetch metadata entry to identify files
    const ambigram = await getAmbigramById(id);
    
    if (ambigram) {
      const deleteLocalFile = async (srcPath: string | undefined) => {
        if (srcPath && srcPath.startsWith('/uploads/')) {
          try {
            const fullPath = path.join(process.cwd(), 'public', srcPath);
            await fs.unlink(fullPath);
          } catch (err) {
            console.warn(`Could not delete file ${srcPath} from disk:`, err);
          }
        }
      };

      // 2. Clean up associated files from the local directory
      await deleteLocalFile(ambigram.imageSrc);
      await deleteLocalFile(ambigram.vectorSrc);
      await deleteLocalFile(ambigram.timelapseSrc);
    }
    
    // 3. Perform deletion from JSON database
    await deleteAmbigram(id);

    return NextResponse.json({ success: true, message: 'Ambigram and its files deleted' });
  } catch (error) {
    console.error('Error deleting ambigram:', error);
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
