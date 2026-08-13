import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Chimera | Local AI Image Conversion & Background Removal',
  description: 'Production-ready self-hosted image processor and Telegram bot. Genuine local AI background removal without third-party APIs.',
  keywords: 'image processing, background removal, telegram bot, sharp, transformers, onnx, vercel, nextjs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
