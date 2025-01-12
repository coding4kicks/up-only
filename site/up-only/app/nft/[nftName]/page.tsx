'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { nftMetadata } from '@/data/nft-metadata';
import { COLLECTION_IPFS_HASH } from '@/lib/constants';
import { getFallbackIPFSUrl } from '@/utils/ipfs';
import { useWallet } from '@/context/wallet-context';
import { useUpOnlyContract } from '@/hooks/use-uponly-contract';
import { formatEther } from 'viem';
import type { NFTMetadata } from '@/types/nft';
import type { NFTData } from '@/hooks/use-uponly-contract';

export default function NFTPage() {
  const params = useParams();
  const { address, isConnected } = useWallet();
  const { mint, getNFTData } = useUpOnlyContract();
  const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [nft, setNft] = useState<NFTMetadata | null>(null);
  const [nftData, setNftData] = useState<NFTData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const nftName = (params.nftName as string).replace(/_/g, ' ');
    const foundNft = nftMetadata.find(n => n.name === nftName);

    if (foundNft) {
      setNft(foundNft);
      const imageFilename = foundNft.image.split('/').pop() || '';
      setCurrentImageUrl(
        getFallbackIPFSUrl(`${COLLECTION_IPFS_HASH}/${imageFilename}`, 0)
      );
      fetchNFTData(foundNft);
    }
  }, [params.nftName]);

  const fetchNFTData = async (nft: NFTMetadata) => {
    try {
      setIsLoading(true);
      // Array index is 0-based, so we need to add 1
      const tokenId = nftMetadata.findIndex(n => n.name === nft.name) + 1;
      if (tokenId === -1) {
        throw new Error('NFT not found in metadata');
      }
      const data = await getNFTData(tokenId);
      setNftData(data);
    } catch (error) {
      console.error('Error fetching NFT data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageError = () => {
    if (!nft) return;
    const imageFilename = nft.image.split('/').pop() || '';
    const nextUrl = getFallbackIPFSUrl(
      `${COLLECTION_IPFS_HASH}/${imageFilename}`,
      currentGatewayIndex
    );
    setCurrentImageUrl(nextUrl);
    setCurrentGatewayIndex(prev => (prev + 1) % 3);
  };

  const handleMint = async () => {
    try {
      await mint(1);
      fetchNFTData(nft!);
    } catch (error) {
      console.error('Error minting:', error);
    }
  };

  const renderOwnershipInfo = () => {
    if (isLoading) return <p>Loading...</p>;

    // NFT hasn't been minted yet
    if (!nftData) {
      return isConnected ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This NFT hasn't been minted yet
          </p>
          <Button onClick={handleMint} className="w-full">
            Mint for 0.01 ETH
          </Button>
        </div>
      ) : null;
    }

    const isOwner =
      address &&
      nftData.owner &&
      nftData.owner.toLowerCase() === address.toLowerCase();
    const hasOffer = nftData.currentOffer > BigInt(0);

    return (
      <div className="space-y-4">
        <div className="bg-secondary p-3 rounded-lg space-y-2">
          <p className="text-sm">
            <span className="font-medium">Owner: </span>
            {nftData.owner}
          </p>
          {hasOffer && (
            <p className="text-sm">
              <span className="font-medium">Current Offer: </span>
              {formatEther(nftData.currentOffer)} ETH
            </p>
          )}
        </div>
        {!isOwner && isConnected && (
          <Button onClick={handleMint} className="w-full">
            Mint for 0.01 ETH
          </Button>
        )}
      </div>
    );
  };

  if (!nft) {
    return (
      <div className="container mx-auto px-4 pt-24">
        <p className="text-center text-2xl">NFT not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pt-24">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="relative aspect-square">
                <Image
                  src={currentImageUrl}
                  alt={nft.name}
                  fill
                  className="object-cover rounded-lg"
                  onError={handleImageError}
                />
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-4">{nft.name}</h1>
                <div className="space-y-4">
                  <div>
                    <div className="bg-secondary p-3 rounded-lg">
                      <p className="text-sm">
                        <span className="font-medium">Category: </span>
                        {nft.attributes.value}
                      </p>
                    </div>
                  </div>
                  {renderOwnershipInfo()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
