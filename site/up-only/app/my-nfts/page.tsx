'use client';

import { useWallet } from '@/context/wallet-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUpOnlyContract } from '@/hooks/use-uponly-contract';
import NFTCard from '@/components/nft-card';
import { Card, CardContent } from '@/components/ui/card';
import type { NFTMetadata } from '@/types/nft';
import { COLLECTION_IPFS_HASH } from '@/lib/constants';

export default function MyNFTs() {
  const { isConnected } = useWallet();
  const router = useRouter();
  const { getOwnedNFTs } = useUpOnlyContract();
  const [ownedTokens, setOwnedTokens] = useState<NFTMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  useEffect(() => {
    async function fetchOwnedNFTs() {
      try {
        setIsLoading(true);
        const tokens = await getOwnedNFTs();
        setOwnedTokens(tokens);
      } catch (error) {
        console.error('Error fetching NFTs:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (isConnected) {
      fetchOwnedNFTs();
    }
  }, [isConnected, getOwnedNFTs]);

  if (!isConnected) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 pt-24">
      <h1 className="text-4xl font-bold mb-8">My NFTs</h1>

      {isLoading ? (
        <p className="text-muted-foreground">Loading your NFTs...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {ownedTokens.length > 0 ? (
            ownedTokens.map(metadata => (
              <NFTCard
                key={metadata.name}
                metadata={metadata}
                collectionHash={COLLECTION_IPFS_HASH}
              />
            ))
          ) : (
            <Card className="overflow-hidden">
              <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
                <p className="text-xl font-semibold mb-2">No NFTs Owned</p>
                <p className="text-muted-foreground">
                  Mint one or make an offer!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
