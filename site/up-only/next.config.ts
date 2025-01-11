import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true
    // Remove domains config as it's not needed with unoptimized images
  }
};

export default nextConfig;
