import { NextResponse } from 'next/server';
import { getAmbigrams } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const publicOnly = searchParams.get('public') === 'true';

    const records = await getAmbigrams();
    
    let ambigrams = records;
    if (publicOnly) {
      ambigrams = records.filter(r => r.isPublic);
    }

    return NextResponse.json({ success: true, ambigrams });
  } catch (error: any) {
    console.error('Error fetching ambigrams:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
