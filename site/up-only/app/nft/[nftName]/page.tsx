'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { nftMetadata } from '@/data/nft-metadata';
import { COLLECTION_IPFS_HASH } from '@/lib/constants';
import { getFallbackIPFSUrl } from '@/utils/ipfs';
import type { NFTMetadata } from '@/types/nft';

export default function NFTPage() {
  const params = useParams();
  const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [nft, setNft] = useState<NFTMetadata | null>(null);

  useEffect(() => {
    const nftName = (params.nftName as string).replace(/_/g, ' ');
    const foundNft = nftMetadata.find(n => n.name === nftName);

    if (foundNft) {
      setNft(foundNft);
      const imageFilename = foundNft.image.split('/').pop() || '';
      setCurrentImageUrl(
        getFallbackIPFSUrl(`${COLLECTION_IPFS_HASH}/${imageFilename}`, 0)
      );
    }
  }, [params.nftName]);

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
                    <h2 className="text-lg font-semibold mb-2">Description</h2>
                    <p className="text-muted-foreground">{nft.description}</p>
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Attributes</h2>
                    <div className="bg-secondary p-3 rounded-lg">
                      <p className="text-sm">
                        <span className="font-medium">Value: </span>
                        {nft.attributes.value}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
