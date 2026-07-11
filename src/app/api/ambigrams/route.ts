import { NextResponse } from 'next/server';
import { getAmbigrams } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const ambigrams = await getAmbigrams();
    return NextResponse.json({ success: true, ambigrams });
  } catch (error) {
    console.error('Error fetching ambigrams:', error);
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
