import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { saveAmbigram } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const title = formData.get('title') as string;
    const recipient = formData.get('recipient') as string || undefined;
    const description = formData.get('description') as string || undefined;
    const password = formData.get('password') as string || undefined;
    
    const vectorFile = formData.get('vectorFile') as File | null;
    const previewFile = formData.get('previewFile') as File | null;
    const timelapseFile = formData.get('timelapseFile') as File | null;

    if (!title || !vectorFile || !previewFile) {
      return NextResponse.json(
        { success: false, error: 'Missing title, vector file, or preview image' },
        { status: 400 }
      );
    }

    const id = title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');

    // Setup local filesystem uploads directory (simulates cloud storage in dev mock)
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Save preview image (.png)
    const previewBytes = await previewFile.arrayBuffer();
    const previewFileName = `${id}.png`;
    const previewPath = path.join(uploadsDir, previewFileName);
    await fs.writeFile(previewPath, Buffer.from(previewBytes));
    const imageSrc = `/uploads/${previewFileName}`;

    // Save vector file (.svg)
    const vectorBytes = await vectorFile.arrayBuffer();
    const vectorFileName = `${id}.svg`;
    const vectorPath = path.join(uploadsDir, vectorFileName);
    await fs.writeFile(vectorPath, Buffer.from(vectorBytes));
    const vectorSrc = `/uploads/${vectorFileName}`;

    // Save timelapse file (.mp4) if provided
    let timelapseSrc = undefined;
    if (timelapseFile) {
      const timelapseBytes = await timelapseFile.arrayBuffer();
      const timelapseFileName = `${id}.mp4`;
      const timelapsePath = path.join(uploadsDir, timelapseFileName);
      await fs.writeFile(timelapsePath, Buffer.from(timelapseBytes));
      timelapseSrc = `/uploads/${timelapseFileName}`;
    }

    // Save metadata record into database
    const newItem = {
      id,
      title,
      recipient,
      description,
      imageSrc,     // Path to preview PNG
      vectorSrc,    // Path to secure SVG (mocked)
      timelapseSrc, // Path to timelapse MP4 (mocked)
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

