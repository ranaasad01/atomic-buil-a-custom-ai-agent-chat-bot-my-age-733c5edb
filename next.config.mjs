/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ['@anthropic-ai/sdk', 'xlsx'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
};
export default nextConfig;
