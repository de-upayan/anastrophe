import { NextResponse } from 'next/server';
import { getAmbigramById } from '@/lib/db';
import { downloadTextFileFromStorage } from '@/lib/storage';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { password } = await request.json();
    
    const ambigram = await getAmbigramById(id);
    if (!ambigram) {
      return NextResponse.json(
        { success: false, error: 'Ambigram not found' },
        { status: 404 }
      );
    }

    const expectedPassword = ambigram.password;
    if (password !== expectedPassword) {
      return NextResponse.json(
        { success: false, error: 'Incorrect password' },
        { status: 403 }
      );
    }

    if (!ambigram.vectorSrc) {
      return NextResponse.json(
        { success: false, error: 'Vector file name not found in storage record' },
        { status: 404 }
      );
    }

    try {
      // Download raw text content of the vector file from the private 'vectors' bucket
      const svgContent = await downloadTextFileFromStorage(ambigram.vectorSrc, 'vectors');
      
      return new Response(svgContent, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `attachment; filename="${id}.svg"`
        }
      });
    } catch (fileErr) {
      console.error('Error fetching vector from Supabase Storage:', fileErr);
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve vector file from Supabase Storage' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error in download handler:', error);
    const errorMsg = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: 500 }
    );
  }
}
