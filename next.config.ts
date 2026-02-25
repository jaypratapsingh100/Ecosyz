import type { NextConfig } from 'next';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : 'ltenyoiaydemsnrvdbpc.supabase.co';

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: '/problem-mentions', destination: '/problems-and-ideas', permanent: true },
      { source: '/open-idea', destination: '/problems-and-ideas', permanent: true },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Build output directory
  distDir: '.next',
  // Optionally enable compression
  compress: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    },
  },
  serverExternalPackages: ['@prisma/client', 'esbuild'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/u/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/a/**',
      },
      {
        protocol: 'https',
        hostname: supabaseHostname,
        port: '',
        pathname: '/storage/v1/object/public/avatars/**',
      },
      {
        protocol: 'https',
        hostname: supabaseHostname,
        port: '',
        pathname: '/storage/v1/object/public/problem-idea-images/**',
      },
      {
        protocol: 'https',
        hostname: 'media2.dev.to',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
