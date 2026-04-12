/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@crm/ui', '@crm/shared'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
}

export default nextConfig
