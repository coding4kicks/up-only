import Image from 'next/image';
import NFTCard from '@/components/nft-card';
import { Button } from '@/components/ui/button';
import { nftMetadata } from '@/data/nft-metadata';

const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs';
const COLLECTION_IPFS_HASH =
  'bafybeigvaawsd6evhlgs2woqtvfeoprrlgvnhibzf4pejycbpniittg32e';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="relative h-[50vh] w-full">
        <Image
          src={`${IPFS_GATEWAY}/${COLLECTION_IPFS_HASH}/banner_image.png`}
          alt="UpOnly Collection Banner"
          fill
          priority={true}
          loading="eager"
          className="object-cover"
        />
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Collection Info */}
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="relative h-32 w-32 rounded-full overflow-hidden mb-6">
            <Image
              src={`${IPFS_GATEWAY}/${COLLECTION_IPFS_HASH}/collection-image.gif`}
              alt="UpOnly Collection"
              fill
              loading="eager"
              className="object-cover"
            />
          </div>
          <h1 className="text-4xl font-bold mb-4">UpOnly NFT Collection</h1>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl">
            A unique collection of 131 NFTs celebrating the eternal optimism of
            crypto markets. Each piece captures the essence of the unstoppable
            upward trajectory.
          </p>
          <Button size="lg" className="font-semibold">
            Mint Now
          </Button>
        </div>

        {/* NFT Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {nftMetadata.map((metadata, index) => (
            <NFTCard key={index + 1} id={index + 1} metadata={metadata} />
          ))}
        </div>
      </main>
    </div>
  );
}
