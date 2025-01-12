'use client';

import { useState, memo } from 'react';
import Image from 'next/image';
import { Card, CardContent } from './ui/card';
import { getFallbackIPFSUrl } from '@/utils/ipfs';
import type { NFTMetadata } from '@/types/nft';

interface NFTCardProps {
  metadata: NFTMetadata;
  collectionHash: string;
}

const NFTCard = memo(({ metadata, collectionHash }: NFTCardProps) => {
  const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);
  const imageFilename = metadata.image.split('/').pop() || '';
  const initialUrl = `https://gateway.pinata.cloud/ipfs/${collectionHash}/${imageFilename}`;
  const [currentImageUrl, setCurrentImageUrl] = useState(initialUrl);

  const handleImageError = () => {
    const nextUrl = getFallbackIPFSUrl(
      `${collectionHash}/${imageFilename}`,
      currentGatewayIndex
    );
    setCurrentImageUrl(nextUrl);
    setCurrentGatewayIndex(prev => (prev + 1) % 3);
  };

  return (
    <Card className="overflow-hidden transition-transform hover:scale-105">
      <CardContent className="p-0">
        <div className="relative aspect-square">
          <Image
            src={currentImageUrl}
            alt={metadata.name}
            fill
            loading="lazy"
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={handleImageError}
          />
        </div>
        <div className="p-3">
          <p className="text-sm font-medium">{metadata.name}</p>
          <p className="text-xs text-muted-foreground">
            {metadata.attributes.value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

NFTCard.displayName = 'NFTCard';

export default NFTCard;
