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
  const { getOwnedNFTs, getOffers } = useUpOnlyContract();
  const [ownedTokens, setOwnedTokens] = useState<NFTMetadata[]>([]);
  const [myOffers, setMyOffers] = useState<NFTMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        const [tokens, offers] = await Promise.all([
          getOwnedNFTs(),
          getOffers()
        ]);
        setOwnedTokens(tokens);
        setMyOffers(offers);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (isConnected) {
      fetchData();
    }
  }, [isConnected, getOwnedNFTs, getOffers]);

  if (!isConnected) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 pt-24">
      <div className="mb-16">
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

      <div>
        <h2 className="text-3xl font-bold mb-8">My Offers</h2>
        {isLoading ? (
          <p className="text-muted-foreground">Loading your offers...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {myOffers.length > 0 ? (
              myOffers.map(metadata => (
                <NFTCard
                  key={metadata.name}
                  metadata={metadata}
                  collectionHash={COLLECTION_IPFS_HASH}
                />
              ))
            ) : (
              <Card className="overflow-hidden">
                <CardContent className="p-6 flex flex-col items-center justify-center min-h-[300px] text-center">
                  <p className="text-xl font-semibold mb-2">No Active Offers</p>
                  <p className="text-muted-foreground">
                    Make an offer on the main page!
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
