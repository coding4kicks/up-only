'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from './ui/card';
import { getFallbackIPFSUrl } from '@/utils/ipfs';
import type { NFTMetadata } from '@/types/nft';

interface NFTCardProps {
  metadata: NFTMetadata;
  id: number;
}

const NFTCard = ({ metadata, id }: NFTCardProps) => {
  const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);
  const imageUrl = metadata.image.replace('ipfs://', `${IPFS_GATEWAY}/`);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);

  const handleImageError = () => {
    const nextUrl = getFallbackIPFSUrl(
      imageUrl.split('/ipfs/')[1],
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
};

export default NFTCard;
