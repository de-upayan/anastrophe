import { NextResponse } from 'next/server';
import { getAmbigramById, deleteAmbigram, incrementViews, incrementDownloads } from '@/lib/db';
import crypto from 'crypto';

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
  } catch (error: any) {
    console.error('Error fetching dynamic ambigram:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
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
  } catch (error: any) {
    console.error('Error updating stats:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
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
    
    // Perform metadata-only deletion from JSON database
    await deleteAmbigram(id);

    return NextResponse.json({ success: true, message: 'Ambigram metadata deleted' });
  } catch (error: any) {
    console.error('Error deleting ambigram:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
