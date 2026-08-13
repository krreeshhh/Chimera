import { NextRequest, NextResponse } from 'next/server';
import { getBot } from '@/utils/telegramBot';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Telegram Webhook Secret Token if configured
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
    if (webhookSecret) {
      const headerSecret = request.headers.get('x-telegram-bot-api-secret-token');
      if (headerSecret !== webhookSecret) {
        console.warn('Unauthorized webhook request: secret token mismatch.');
        return new Response('Unauthorized', { status: 403 });
      }
    }

    // 2. Parse the Update body
    const body = await request.json();

    // 3. Process the update asynchronously
    const bot = getBot();
    await bot.handleUpdate(body);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Error handling Telegram Webhook Update:', error);
    // Return a 200 OK anyway so Telegram doesn't retry indefinitely and flood the endpoint
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }
}

// We want webhook requests to execute within 60 seconds (useful if AI processing is slow)
export const maxDuration = 60;
