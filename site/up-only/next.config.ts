import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    domains: ['gateway.pinata.cloud']
    // Optional: Add other IPFS gateways you want to use as fallbacks
    // domains: ['gateway.pinata.cloud', 'ipfs.io', 'cloudflare-ipfs.com'],
  },
  // Enable static exports
  output: 'export'
};

export default nextConfig;
