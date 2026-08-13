import assert from 'node:assert';
import test from 'node:test';
import sharp from 'sharp';
import { NextRequest } from 'next/server';

import { validateImage, convertImage, removeBackground, processImage } from '../services/imageProcessor';
import { GET as healthHandler } from '../app/api/health/route';
import { POST as convertHandler } from '../app/api/convert/route';
import { POST as removeBgHandler } from '../app/api/remove-background/route';
import { POST as processHandler } from '../app/api/process/route';

// Helper to generate a solid red test image of given size and format
async function generateTestImage(width = 10, height = 10, format: 'png' | 'jpeg' = 'png'): Promise<Buffer> {
  const factory = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 255, g: 0, b: 0 } // Red
    }
  });

  if (format === 'jpeg') {
    return await factory.jpeg().toBuffer();
  }
  return await factory.png().toBuffer();
}

test('Unit Tests: validateImage', async (t) => {
  await t.test('should validate a correct PNG image', async () => {
    const png = await generateTestImage(10, 10, 'png');
    const result = await validateImage(png);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.width, 10);
    assert.strictEqual(result.height, 10);
    assert.strictEqual(result.format, 'png');
  });

  await t.test('should validate a correct JPEG image', async () => {
    const jpg = await generateTestImage(20, 15, 'jpeg');
    const result = await validateImage(jpg);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.width, 20);
    assert.strictEqual(result.height, 15);
    assert.strictEqual(result.format, 'jpeg');
  });

  await t.test('should reject invalid formats or corrupted data', async () => {
    const corrupted = Buffer.from('NOT_AN_IMAGE_FILE_BUFFER');
    const result = await validateImage(corrupted);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error);
  });

  await t.test('should reject oversized pixel count', async () => {
    // Temporarily set limit to 50 pixels for test
    process.env.MAX_IMAGE_PIXELS = '50';
    const large = await generateTestImage(10, 10, 'png'); // 100 pixels
    const result = await validateImage(large);
    assert.strictEqual(result.valid, false);
    assert.ok(result.error?.includes('Image is too large'));
    delete process.env.MAX_IMAGE_PIXELS;
  });
});

test('Unit Tests: convertImage', async (t) => {
  const pngInput = await generateTestImage(10, 10, 'png');
  const jpgInput = await generateTestImage(10, 10, 'jpeg');

  await t.test('PNG -> JPG conversion', async () => {
    const output = await convertImage(pngInput, 'jpg', 90);
    const meta = await sharp(output).metadata();
    assert.strictEqual(meta.format, 'jpeg');
  });

  await t.test('JPG -> PNG conversion', async () => {
    const output = await convertImage(jpgInput, 'png');
    const meta = await sharp(output).metadata();
    assert.strictEqual(meta.format, 'png');
  });

  await t.test('PNG -> WebP conversion', async () => {
    const output = await convertImage(pngInput, 'webp');
    const meta = await sharp(output).metadata();
    assert.strictEqual(meta.format, 'webp');
  });

  await t.test('JPG -> WebP conversion', async () => {
    const output = await convertImage(jpgInput, 'webp');
    const meta = await sharp(output).metadata();
    assert.strictEqual(meta.format, 'webp');
  });

  await t.test('PNG -> AVIF conversion', async () => {
    const output = await convertImage(pngInput, 'avif');
    const meta = await sharp(output).metadata();
    assert.ok(meta.format === 'avif' || meta.format === 'heif');
  });
});

test('Unit Tests: removeBackground', async (t) => {
  const img = await generateTestImage(5, 5, 'png');

  await t.test('should execute local AI background removal and return transparent PNG', async () => {
    // This will download the model to /tmp on the first run, testing the runtime path!
    const output = await removeBackground(img, 'transparent');
    const meta = await sharp(output).metadata();
    assert.strictEqual(meta.format, 'png');
    assert.strictEqual(meta.hasAlpha, true);
  });
});

test('Integration Tests: GET /api/health', async () => {
  const res = await healthHandler();
  assert.strictEqual(res.status, 200);
  const json = await res.json();
  assert.strictEqual(json.ok, true);
  assert.strictEqual(json.service, 'chimera');
});

test('Integration Tests: POST /api/convert', async () => {
  const png = await generateTestImage(10, 10, 'png');

  // Create multipart/form-data payload
  const formData = new FormData();
  formData.append('image', new Blob([png]), 'test.png');
  formData.append('format', 'webp');
  formData.append('quality', '85');

  const req = new Request('http://localhost/api/convert', {
    method: 'POST',
    body: formData
  });

  const res = await convertHandler(req as NextRequest);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('content-type'), 'image/webp');
  assert.ok(res.headers.get('content-disposition')?.includes('filename="test.webp"'));
  
  const arrayBuffer = await res.arrayBuffer();
  const meta = await sharp(Buffer.from(arrayBuffer)).metadata();
  assert.strictEqual(meta.format, 'webp');
});

test('Integration Tests: POST /api/remove-background', async () => {
  const png = await generateTestImage(5, 5, 'png');

  const formData = new FormData();
  formData.append('image', new Blob([png]), 'test.png');
  formData.append('background', 'transparent');

  const req = new Request('http://localhost/api/remove-background', {
    method: 'POST',
    body: formData
  });

  const res = await removeBgHandler(req as NextRequest);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('content-type'), 'image/png');
  
  const arrayBuffer = await res.arrayBuffer();
  const meta = await sharp(Buffer.from(arrayBuffer)).metadata();
  assert.strictEqual(meta.format, 'png');
  assert.strictEqual(meta.hasAlpha, true);
});

test('Integration Tests: POST /api/process', async () => {
  const png = await generateTestImage(5, 5, 'png');

  const formData = new FormData();
  formData.append('image', new Blob([png]), 'test.png');
  formData.append('operation', 'convert-and-remove-background');
  formData.append('format', 'webp');
  formData.append('background', 'white');

  const req = new Request('http://localhost/api/process', {
    method: 'POST',
    body: formData
  });

  const res = await processHandler(req as NextRequest);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.headers.get('content-type'), 'image/webp');
  
  const arrayBuffer = await res.arrayBuffer();
  const meta = await sharp(Buffer.from(arrayBuffer)).metadata();
  assert.strictEqual(meta.format, 'webp');
});
