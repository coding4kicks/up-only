import Image from 'next/image';
import { Card, CardContent } from './ui/card';

interface NFTCardProps {
  id: number;
  imageUrl: string;
}

const NFTCard = ({ id, imageUrl }: NFTCardProps) => {
  return (
    <Card className="overflow-hidden transition-transform hover:scale-105">
      <CardContent className="p-0">
        <div className="relative aspect-square">
          <Image
            src={imageUrl}
            alt={`UpOnly NFT #${id}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
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
