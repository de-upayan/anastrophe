import { NextResponse } from 'next/server';
import { getAmbigramById } from '@/lib/db';

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
