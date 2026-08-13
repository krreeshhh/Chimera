/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@huggingface/transformers', 'sharp'],
};

module.exports = nextConfig;
// eslint-disable-next-line @typescript-eslint/no-require-imports
