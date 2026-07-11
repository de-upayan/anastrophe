import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getAmbigramById } from '@/lib/db';

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

    const expectedPassword = ambigram.password || 'secret123';
    if (password !== expectedPassword) {
      return NextResponse.json(
        { success: false, error: 'Incorrect password' },
        { status: 403 }
      );
    }

    // In dev mock, the SVG is stored locally in vectorSrc
    if (!ambigram.vectorSrc) {
      return NextResponse.json(
        { success: false, error: 'Vector file not found' },
        { status: 404 }
      );
    }

    const relativePath = ambigram.vectorSrc.startsWith('/') ? ambigram.vectorSrc : `/${ambigram.vectorSrc}`;
    const svgPath = path.join(process.cwd(), 'public', relativePath);

    try {
      const svgContent = await fs.readFile(svgPath, 'utf-8');
      
      return new Response(svgContent, {
        headers: {
          'Content-Type': 'image/svg+xml',
          'Content-Disposition': `attachment; filename="${id}.svg"`
        }
      });
    } catch (fileErr) {
      console.error('Error reading vector file:', fileErr);
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve vector file from storage' },
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
