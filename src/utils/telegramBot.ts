import { Telegraf, Context } from 'telegraf';
import { message } from 'telegraf/filters';
import { validateImage, processImage } from '../services/imageProcessor';
import { isRateLimited } from './rateLimiter';

let botInstance: Telegraf | null = null;

/**
 * Initializes and setups the Telegram bot handlers.
 */
function setupBotHandlers(bot: Telegraf) {
  // Rate limiting helper
  const checkRateLimit = (ctx: Context): boolean => {
    const userId = ctx.from?.id.toString() || 'unknown';
    const { limited } = isRateLimited(userId);
    if (limited) {
      ctx.reply('⚠️ Too many requests. Please wait a moment before sending more images.');
      return true;
    }
    return false;
  };

  // 1. Welcome and start instructions
  bot.start((ctx) => {
    if (checkRateLimit(ctx)) return;

    ctx.reply(
      `🔮 *Chimera: AI Image Processor & Background Remover* \n\n` +
      `I process images locally without sending them to any third-party services like remove.bg.\n\n` +
      `*Supported Operations:*\n` +
      `• ✂️ *Remove Background* (outputs a transparent PNG)\n` +
      `• 🔄 *Convert Format* (JPEG, PNG, WebP, AVIF)\n` +
      `• ⚡ *Convert + Remove BG* (Combined pipeline)\n\n` +
      `*How to use:*\n` +
      `Send me an image directly as a *Photo* or as a *Document* file, and choose an action.`,
      { parse_mode: 'Markdown' }
    );
  });

  // 2. Capture incoming photo or document
  bot.on([message('photo'), message('document')], async (ctx) => {
    if (checkRateLimit(ctx)) return;

    try {
      let fileId = '';
      
      if ('photo' in ctx.message) {
        const photos = ctx.message.photo;
        const bestPhoto = photos[photos.length - 1]; // largest version
        fileId = bestPhoto.file_id;
      } else if ('document' in ctx.message) {
        const doc = ctx.message.document;
        const mimeType = doc.mime_type || '';
        if (!mimeType.startsWith('image/')) {
          return ctx.reply('❌ Please send a valid image file.', {
            reply_parameters: { message_id: ctx.message.message_id }
          });
        }
        fileId = doc.file_id;
      }

      if (!fileId) {
        return ctx.reply('❌ Could not retrieve file metadata from Telegram.', {
          reply_parameters: { message_id: ctx.message.message_id }
        });
      }

      // Show operation menu
      await ctx.reply(
        `✨ *Choose an action for this image:*`,
        {
          parse_mode: 'Markdown',
          reply_parameters: { message_id: ctx.message.message_id },
          reply_markup: {
            inline_keyboard: [
              [{ text: '✂️ Remove Background', callback_data: 'btn:bg' }],
              [{ text: '🔄 Convert Format', callback_data: 'btn:conv' }],
              [{ text: '⚡ Convert + Remove BG', callback_data: 'btn:bg_conv' }]
            ]
          }
        }
      );
    } catch (error) {
      console.error('Error in bot photo listener:', error);
      ctx.reply('❌ Failed to retrieve image file. Please try again.');
    }
  });

  // 3. Callback handlers for inline menus
  bot.on('callback_query', async (ctx) => {
    if (checkRateLimit(ctx)) return;

    const data = (ctx.callbackQuery as any).data;
    if (!data) return;

    const replyMessage = ctx.callbackQuery.message && 'reply_to_message' in ctx.callbackQuery.message
      ? ctx.callbackQuery.message.reply_to_message
      : null;

    if (!replyMessage) {
      await ctx.answerCbQuery('❌ Original image not found. Please upload a new image.', { show_alert: true });
      return;
    }

    // Extract file_id from original message
    let fileId = '';
    let originalName = 'image';

    if ('photo' in replyMessage) {
      const photos = replyMessage.photo;
      fileId = photos[photos.length - 1].file_id;
      originalName = `photo_${Date.now()}.png`;
    } else if ('document' in replyMessage) {
      const doc = replyMessage.document;
      fileId = doc.file_id;
      originalName = doc.file_name || `document_${Date.now()}.png`;
    }

    if (!fileId) {
      await ctx.answerCbQuery('❌ Original file link has expired or is invalid.', { show_alert: true });
      return;
    }

    const lastDot = originalName.lastIndexOf('.');
    const baseName = lastDot !== -1 ? originalName.substring(0, lastDot) : originalName;

    // Handle Menus
    if (data === 'btn:bg') {
      await ctx.editMessageText(
        '🌈 *Select Background Output Type:*',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Transparent', callback_data: 'bg:transparent' },
                { text: 'Solid White', callback_data: 'bg:white' },
                { text: 'Solid Black', callback_data: 'bg:black' }
              ],
              [{ text: '🔙 Back to Menu', callback_data: 'btn:main' }]
            ]
          }
        }
      );
    } else if (data === 'btn:conv') {
      await ctx.editMessageText(
        '🔄 *Select Output Image Format:*',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'PNG', callback_data: 'conv:png' },
                { text: 'JPEG', callback_data: 'conv:jpeg' }
              ],
              [
                { text: 'WebP', callback_data: 'conv:webp' },
                { text: 'AVIF', callback_data: 'conv:avif' }
              ],
              [{ text: '🔙 Back to Menu', callback_data: 'btn:main' }]
            ]
          }
        }
      );
    } else if (data === 'btn:bg_conv') {
      await ctx.editMessageText(
        '⚡ *Select Output Format for background removal:*',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'PNG', callback_data: 'bg_conv:png' },
                { text: 'WebP', callback_data: 'bg_conv:webp' },
                { text: 'AVIF', callback_data: 'bg_conv:avif' }
              ],
              [{ text: '🔙 Back to Menu', callback_data: 'btn:main' }]
            ]
          }
        }
      );
    } else if (data === 'btn:main') {
      await ctx.editMessageText(
        `✨ *Choose an action for this image:*`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✂️ Remove Background', callback_data: 'btn:bg' }],
              [{ text: '🔄 Convert Format', callback_data: 'btn:conv' }],
              [{ text: '⚡ Convert + Remove BG', callback_data: 'btn:bg_conv' }]
            ]
          }
        }
      );
    }
    // Format callback bg_conv:<format>
    else if (data.startsWith('bg_conv:') && !data.includes(':', 8)) {
      const format = data.split(':')[1];
      await ctx.editMessageText(
        `🌈 *Select Background for background-removed ${format.toUpperCase()}:*`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: 'Transparent', callback_data: `bg_conv:${format}:transparent` },
                { text: 'White', callback_data: `bg_conv:${format}:white` },
                { text: 'Black', callback_data: `bg_conv:${format}:black` }
              ],
              [{ text: '🔙 Back to Menu', callback_data: 'btn:main' }]
            ]
          }
        }
      );
    }
    // Handle Actions
    else {
      await ctx.answerCbQuery('⚙️ Processing image... this may take a few seconds.');
      await ctx.editMessageText('⏳ _Processing your image. Please wait a few seconds..._', { parse_mode: 'Markdown' });

      try {
        let operation: 'convert' | 'remove-background' | 'convert-and-remove-background' = 'convert';
        let format: 'png' | 'webp' | 'jpeg' | 'avif' = 'png';
        let background = 'transparent';
        let filenameSuffix = '';

        if (data.startsWith('bg:')) {
          operation = 'remove-background';
          background = data.split(':')[1];
          format = 'png';
          filenameSuffix = `-no-bg`;
        } else if (data.startsWith('conv:')) {
          operation = 'convert';
          format = data.split(':')[1] as any;
          filenameSuffix = `-converted`;
        } else if (data.startsWith('bg_conv:')) {
          operation = 'convert-and-remove-background';
          const parts = data.split(':');
          format = parts[1] as any;
          background = parts[2];
          filenameSuffix = `-no-bg-converted`;
        }

        // 1. Fetch file from Telegram servers
        const fileLink = await ctx.telegram.getFileLink(fileId);
        const fileResponse = await fetch(fileLink.toString());
        if (!fileResponse.ok) {
          throw new Error('Failed to download image from Telegram servers.');
        }

        const arrayBuffer = await fileResponse.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 2. Enforce file size limit
        const maxSizeMb = parseInt(process.env.MAX_FILE_SIZE_MB || '20', 10);
        if (buffer.length > maxSizeMb * 1024 * 1024) {
          await ctx.editMessageText(`❌ The image is too large. Maximum size allowed is ${maxSizeMb}MB.`);
          return;
        }

        // 3. Enforce format/magic-byte validations
        const validation = await validateImage(buffer);
        if (!validation.valid) {
          await ctx.editMessageText(`❌ Image validation failed: ${validation.error}`);
          return;
        }

        // 4. Run pipeline
        const processedBuffer = await processImage(buffer, {
          operation,
          format,
          quality: 85,
          background
        });

        const extension = format === 'jpeg' ? 'jpg' : format;
        const outputFilename = `${baseName}${filenameSuffix}.${extension}`;

        await ctx.editMessageText('📤 _Uploading result to Telegram..._', { parse_mode: 'Markdown' });

        // Transparency: send as document to avoid compression and loss of alpha channel
        const isTransparent = background === 'transparent';
        const sendAsDocument = isTransparent || ('document' in replyMessage);

        if (sendAsDocument) {
          await ctx.replyWithDocument(
            { source: processedBuffer, filename: outputFilename },
            {
              reply_parameters: { message_id: replyMessage.message_id },
              caption: `✨ Processed by *Chimera*`,
              parse_mode: 'Markdown'
            }
          );
        } else {
          await ctx.replyWithPhoto(
            { source: processedBuffer },
            {
              reply_parameters: { message_id: replyMessage.message_id },
              caption: `✨ Processed by *Chimera*`,
              parse_mode: 'Markdown'
            }
          );
        }

        // Delete processing progress message
        await ctx.deleteMessage().catch(() => {});
      } catch (err: any) {
        console.error('Image processing failed inside bot handler:', err);
        await ctx.editMessageText(
          `❌ I couldn't process this image. ${err.message || 'Please try another image.'}`
        );
      }
    }
  });
}

/**
 * Singleton getter for Telegram Bot instance.
 */
export function getBot(): Telegraf {
  if (!botInstance) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not defined in environment variables.');
    }
    botInstance = new Telegraf(token);
    setupBotHandlers(botInstance);
  }
  return botInstance;
}
