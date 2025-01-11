import { useState } from 'react';
import Image from 'next/image';
import { Card, CardContent } from './ui/card';
import { getFallbackIPFSUrl } from '@/utils/ipfs';

interface NFTCardProps {
  id: number;
  imageUrl: string;
}

const NFTCard = ({ id, imageUrl }: NFTCardProps) => {
  const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);

  const handleImageError = () => {
    // Try next gateway if current one fails
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
            alt={`UpOnly NFT #${id}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onError={handleImageError}
          />
        </div>
        <div className="p-3">
          <p className="text-sm font-medium">UpOnly #{id}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default NFTCard;
