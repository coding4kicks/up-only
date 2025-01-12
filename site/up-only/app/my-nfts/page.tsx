'use client';

import { useWallet } from '@/context/wallet-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function MyNFTs() {
  const { isConnected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  if (!isConnected) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 pt-24">
      <h1 className="text-4xl font-bold mb-8">My NFTs</h1>
      <p className="text-muted-foreground">
        Your NFT collection will be displayed here soon.
      </p>
    </div>
  );
}
