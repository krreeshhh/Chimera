import { NextRequest, NextResponse } from 'next/server';
import { removeBackground, validateImage } from '@/services/imageProcessor';
import { isRateLimited } from '@/utils/rateLimiter';

export async function POST(request: NextRequest) {
  // Rate limiting check using request IP
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  const { limited } = isRateLimited(ip);
  if (limited) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const background = (formData.get('background') as string | null) || 'transparent';

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided in "image" field.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate size limit (MAX_FILE_SIZE_MB)
    const maxSizeMb = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10);
    if (buffer.length > maxSizeMb * 1024 * 1024) {
      return NextResponse.json(
        { error: `File size exceeds the limit of ${maxSizeMb}MB.` },
        { status: 400 }
      );
    }

    // Validate image integrity and pixel limits
    const validation = await validateImage(buffer);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Remove background
    const outputBuffer = await removeBackground(buffer, background);

    // Determine filename
    const originalName = file.name || 'image';
    const lastDotIndex = originalName.lastIndexOf('.');
    const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
    const outputFilename = `${baseName}-no-bg.png`;

    return new Response(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${outputFilename}"`,
        'X-Processed-By': 'Chimera'
      }
    });
  } catch (error: any) {
    console.error('Error in POST /api/remove-background:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during background removal.' },
      { status: 500 }
    );
  }
}
export const maxDuration = 60; // Set Vercel execution limit to 60 seconds (Pro tier supports up to 300, hobby is 10-60 depending on region, but setting 60 is standard for ML tasks)
