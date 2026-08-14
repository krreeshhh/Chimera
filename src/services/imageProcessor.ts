import { env, pipeline, RawImage } from '@huggingface/transformers';
import sharp from 'sharp';

// Configure transformers cache for Vercel
env.cacheDir = process.env.TRANSFORMERS_CACHE || '/tmp/transformers-cache';

let segmenterPromise: any = null;

async function getSegmenter() {
  if (!segmenterPromise) {
    // briaai/RMBG-1.4 is the official image segmentation model from BRIA AI (~44MB quantized)
    segmenterPromise = pipeline('image-segmentation', 'briaai/RMBG-1.4');
  }
  return segmenterPromise;
}

export interface ImageValidationResult {
  valid: boolean;
  width?: number;
  height?: number;
  format?: string;
  error?: string;
}

/**
 * Validates that the buffer is a valid image and fits the size/pixel constraints.
 */
export async function validateImage(buffer: Buffer): Promise<ImageValidationResult> {
  try {
    const metadata = await sharp(buffer).metadata();
    if (!metadata.width || !metadata.height) {
      return { valid: false, error: 'Invalid image dimensions.' };
    }

    const format = metadata.format;
    const allowedFormats = ['jpeg', 'jpg', 'png', 'webp', 'avif'];
    if (!format || !allowedFormats.includes(format)) {
      return { valid: false, error: `Unsupported image format: ${format || 'unknown'}. Only PNG, JPG, WebP, and AVIF are supported.` };
    }

    // Configurable pixel limit, default 4MP
    const maxPixels = parseInt(process.env.MAX_IMAGE_PIXELS || '4194304', 10);
    const pixels = metadata.width * metadata.height;
    if (pixels > maxPixels) {
      return { valid: false, error: `Image is too large (${metadata.width}x${metadata.height}). Maximum pixels allowed: ${maxPixels}` };
    }

    return {
      valid: true,
      width: metadata.width,
      height: metadata.height,
      format
    };
  } catch (error: any) {
    return { valid: false, error: error.message || 'Failed to decode image metadata.' };
  }
}

/**
 * Converts an image buffer to the specified format with given options.
 */
export async function convertImage(
  buffer: Buffer,
  format: 'jpeg' | 'jpg' | 'png' | 'webp' | 'avif',
  quality = 85
): Promise<Buffer> {
  let pipelineInstance = sharp(buffer).rotate();
  const fmt = format === 'jpg' ? 'jpeg' : format;

  switch (fmt) {
    case 'jpeg':
      pipelineInstance = pipelineInstance.jpeg({ quality });
      break;
    case 'png':
      pipelineInstance = pipelineInstance.png({ quality });
      break;
    case 'webp':
      pipelineInstance = pipelineInstance.webp({ quality });
      break;
    case 'avif':
      pipelineInstance = pipelineInstance.avif({ quality });
      break;
    default:
      throw new Error(`Unsupported output format: ${format}`);
  }

  return await pipelineInstance.toBuffer();
}

/**
 * Removes the background of the image using the RMBG-1.4 model.
 */
export async function removeBackground(
  buffer: Buffer,
  backgroundColor: 'transparent' | 'white' | 'black' | string = 'transparent'
): Promise<Buffer> {
  // Auto-rotate/orient the image to respect EXIF orientation metadata
  const orientedBuffer = await sharp(buffer).rotate().toBuffer();

  // 1. Decode original image using Sharp to get raw pixel data
  // RMBG models work best with RGB, so we convert to 3-channel RGB first
  const { data, info } = await sharp(orientedBuffer)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 2. Wrap raw pixels in RawImage for Transformers.js
  const rawImage = new RawImage(new Uint8Array(data), info.width, info.height, 3);

  // 3. Run the background removal model
  const segmenter = await getSegmenter();
  const output = await segmenter(rawImage);
  
  // result[0].mask contains the generated single-channel alpha mask
  const mask = output[0].mask;

  // 4. Retrieve mask bytes
  const maskBuffer = Buffer.from(mask.data);

  // 5. Apply the mask back to the raw 3-channel RGB pixels to produce a 4-channel RGBA output
  let processed = sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 3
    }
  }).joinChannel(maskBuffer, {
    raw: {
      width: mask.width,
      height: mask.height,
      channels: 1
    }
  });

  // 6. If background color is not transparent, flatten onto a solid color background
  if (backgroundColor !== 'transparent') {
    let flatColor = { r: 255, g: 255, b: 255, alpha: 1 }; // default white
    
    if (backgroundColor === 'black') {
      flatColor = { r: 0, g: 0, b: 0, alpha: 1 };
    } else if (backgroundColor.startsWith('#')) {
      const hex = backgroundColor.replace('#', '');
      let r = 255, g = 255, b = 255;
      if (hex.length === 3) {
        r = parseInt(hex[0] + hex[0], 16);
        g = parseInt(hex[1] + hex[1], 16);
        b = parseInt(hex[2] + hex[2], 16);
      } else if (hex.length === 6) {
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
      }
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        flatColor = { r, g, b, alpha: 1 };
      }
    }
    
    // Flatten background to render transparent pixels as solid color
    processed = sharp(await processed.png().toBuffer())
      .flatten({ background: flatColor });
  }

  // Output as transparent PNG
  return await processed.png().toBuffer();
}

export interface CropOptions {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * General unified processing helper.
 */
export async function processImage(
  buffer: Buffer,
  options: {
    operation: 'convert' | 'remove-background' | 'convert-and-remove-background';
    format?: 'jpeg' | 'jpg' | 'png' | 'webp' | 'avif';
    quality?: number;
    background?: 'transparent' | 'white' | 'black' | string;
    crop?: CropOptions;
  }
): Promise<Buffer> {
  // First, auto-rotate/orient the image to ensure crop coordinates align with the preview
  let outputBuffer = await sharp(buffer).rotate().toBuffer();

  // Apply crop extraction first if specified
  if (options.crop) {
    outputBuffer = await sharp(outputBuffer)
      .extract({
        left: options.crop.left,
        top: options.crop.top,
        width: options.crop.width,
        height: options.crop.height
      })
      .toBuffer();
  }

  const runRemoveBg = options.operation === 'remove-background' || options.operation === 'convert-and-remove-background';
  const runConvert = options.operation === 'convert' || options.operation === 'convert-and-remove-background';

  if (runRemoveBg) {
    outputBuffer = await removeBackground(outputBuffer, options.background || 'transparent');
  }

  if (runConvert) {
    const format = options.format || 'png';
    const quality = options.quality || 85;
    outputBuffer = await convertImage(outputBuffer, format, quality);
  }

  return outputBuffer;
}

