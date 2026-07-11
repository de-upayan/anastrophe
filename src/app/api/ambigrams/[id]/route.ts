import { NextResponse } from 'next/server';
import { getAmbigramById, deleteAmbigram, incrementViews, incrementDownloads } from '@/lib/db';
import crypto from 'crypto';
import { deleteFileFromStorage } from '@/lib/storage';

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
    console.error('Error fetching ambigram details:', error);
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

    const viewerId = request.headers.get('x-viewer-id') || undefined;

    if (action === 'view') {
      await incrementViews(id, viewerId);
      return NextResponse.json({ success: true, message: 'View tracked' });
    } else if (action === 'download') {
      await incrementDownloads(id, viewerId);
      return NextResponse.json({ success: true, message: 'Download tracked' });
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
      // 2. Clean up associated files from Supabase Storage buckets
      await deleteFileFromStorage(`${id}.png`, 'previews');
      
      if (ambigram.vectorSrc) {
        await deleteFileFromStorage(ambigram.vectorSrc, 'vectors');
      }
      
      if (ambigram.timelapseSrc) {
        await deleteFileFromStorage(`${id}.mp4`, 'previews');
      }
    }
    
    // 3. Perform deletion from Supabase database
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
