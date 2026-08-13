import { NextRequest, NextResponse } from 'next/server';
import { processImage, validateImage } from '@/services/imageProcessor';
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
    const operation = formData.get('operation') as string | null;
    const format = formData.get('format') as string | null;
    const qualityStr = formData.get('quality') as string | null;
    const background = (formData.get('background') as string | null) || 'transparent';

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided in "image" field.' },
        { status: 400 }
      );
    }

    if (!operation) {
      return NextResponse.json(
        { error: 'No operation specified in "operation" field.' },
        { status: 400 }
      );
    }

    const allowedOperations = ['convert', 'remove-background', 'convert-and-remove-background'];
    if (!allowedOperations.includes(operation)) {
      return NextResponse.json(
        { error: `Unsupported operation: ${operation}` },
        { status: 400 }
      );
    }

    let outputFormat: any = format;
    if (outputFormat) {
      const allowedFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif'];
      if (!allowedFormats.includes(outputFormat.toLowerCase())) {
        return NextResponse.json(
          { error: `Unsupported output format: ${outputFormat}` },
          { status: 400 }
        );
      }
      outputFormat = outputFormat.toLowerCase();
    } else if (operation === 'convert' || operation === 'convert-and-remove-background') {
      return NextResponse.json(
        { error: 'Output format must be specified for convert operations.' },
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

    // Process image (convert, remove-background, or both)
    const outputBuffer = await processImage(buffer, {
      operation: operation as any,
      format: outputFormat,
      quality,
      background
    });

    // Determine filename and contentType
    const originalName = file.name || 'image';
    const lastDotIndex = originalName.lastIndexOf('.');
    const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;

    let finalFormat = 'png';
    if (operation === 'convert' || operation === 'convert-and-remove-background') {
      finalFormat = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
    } else {
      // remove-background defaults to PNG
      finalFormat = 'png';
    }

    const suffix = operation === 'convert' ? '-converted' : '-processed';
    const outputFilename = `${baseName}${suffix}.${finalFormat}`;

    let contentType = `image/${finalFormat}`;
    if (finalFormat === 'jpg' || finalFormat === 'jpeg') {
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
    console.error('Error in POST /api/process:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during combined image processing.' },
      { status: 500 }
    );
  }
}
export const maxDuration = 60; // Configured for AI processing duration
