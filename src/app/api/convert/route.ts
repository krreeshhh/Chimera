import { NextRequest, NextResponse } from 'next/server';
import { convertImage, validateImage } from '@/services/imageProcessor';
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
    const format = formData.get('format') as string | null;
    const qualityStr = formData.get('quality') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided in "image" field.' },
        { status: 400 }
      );
    }

    if (!format) {
      return NextResponse.json(
        { error: 'No output format specified in "format" field.' },
        { status: 400 }
      );
    }

    const allowedFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif'];
    if (!allowedFormats.includes(format.toLowerCase())) {
      return NextResponse.json(
        { error: `Unsupported output format: ${format}` },
        { status: 400 }
      );
    }

    const quality = qualityStr ? parseInt(qualityStr, 10) : 85;
    if (isNaN(quality) || quality < 1 || quality > 100) {
      return NextResponse.json(
        { error: 'Quality must be a number between 1 and 100.' },
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

    // Convert
    const outputBuffer = await convertImage(buffer, format.toLowerCase() as any, quality);

    // Determine filename
    const originalName = file.name || 'image';
    const lastDotIndex = originalName.lastIndexOf('.');
    const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
    const extension = format.toLowerCase() === 'jpeg' ? 'jpg' : format.toLowerCase();
    const outputFilename = `${baseName}.${extension}`;

    let contentType = `image/${format.toLowerCase()}`;
    if (format.toLowerCase() === 'jpg' || format.toLowerCase() === 'jpeg') {
      contentType = 'image/jpeg';
    }

    return new Response(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${outputFilename}"`,
        'X-Processed-By': 'Chimera'
      }
    });
  } catch (error: any) {
    console.error('Error in POST /api/convert:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during image conversion.' },
      { status: 500 }
    );
  }
}
