'use client';

import { useState, memo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(
    getFallbackIPFSUrl(`${collectionHash}/${imageFilename}`, 0)
  );

  const handleImageError = () => {
    const nextUrl = getFallbackIPFSUrl(
      `${collectionHash}/${imageFilename}`,
      currentGatewayIndex
    );
    setCurrentImageUrl(nextUrl);
    setCurrentGatewayIndex(prev => (prev + 1) % 3);
  };

  const nftPath = `/nft/${metadata.name.replace(/\s+/g, '_')}`;

  return (
    <Link href={nftPath} className="block">
      <Card className="overflow-hidden transition-all hover:scale-105">
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
    </Link>
  );
});

NFTCard.displayName = 'NFTCard';

export default NFTCard;
