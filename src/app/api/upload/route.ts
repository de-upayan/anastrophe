import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { saveAmbigram, AmbigramItem } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    const title = formData.get('title') as string;
    const recipient = formData.get('recipient') as string || undefined;
    const description = formData.get('description') as string || undefined;
    const isPublic = formData.get('isPublic') === 'true';
    const isShareable = formData.get('isShareable') === 'true';
    const password = formData.get('password') as string || undefined;
    
    const vectorFile = formData.get('vectorFile') as File | null;
    const timelapseFile = formData.get('timelapseFile') as File | null;

    if (!title || !vectorFile) {
      return NextResponse.json(
        { success: false, error: 'Missing title or vector file' },
        { status: 400 }
      );
    }

    const id = title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');

    // Setup local filesystem storage path
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Save vector file (.svg)
    const vectorBytes = await vectorFile.arrayBuffer();
    const vectorBuffer = Buffer.from(vectorBytes);
    const vectorFileName = `${id}.svg`;
    const vectorPath = path.join(uploadsDir, vectorFileName);
    await fs.writeFile(vectorPath, vectorBuffer);
    const imageSrc = `/uploads/${vectorFileName}`;

    // Save timelapse file (.mp4) if provided
    let timelapseSrc = undefined;
    if (timelapseFile) {
      const timelapseBytes = await timelapseFile.arrayBuffer();
      const timelapseBuffer = Buffer.from(timelapseBytes);
      const timelapseFileName = `${id}.mp4`;
      const timelapsePath = path.join(uploadsDir, timelapseFileName);
      await fs.writeFile(timelapsePath, timelapseBuffer);
      timelapseSrc = `/uploads/${timelapseFileName}`;
    }

    // Save metadata record into database
    const newItem: AmbigramItem = {
      id,
      title,
      recipient,
      description,
      imageSrc,
      timelapseSrc,
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

  } catch (error: any) {
    console.error('Error handling design upload API:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
