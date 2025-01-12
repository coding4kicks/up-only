'use client';

import MemoizedImage from '@/components/memoized-image';
import NFTCard from '@/components/nft-card';
import { Button } from '@/components/ui/button';
import { nftMetadata } from '@/data/nft-metadata';
import { useState } from 'react';
import { getFallbackIPFSUrl } from '@/utils/ipfs';
import Navbar from '@/components/navbar';
import MintModal from '@/components/mint-modal';
import { useWallet } from '@/context/wallet-context';
import { useToast } from '@/components/ui/use-toast';

const IPFS_GATEWAY = 'https://gateway.pinata.cloud/ipfs';
const COLLECTION_IPFS_HASH =
  'bafybeigvaawsd6evhlgs2woqtvfeoprrlgvnhibzf4pejycbpniittg32e';
const INITIAL_BANNER_URL = `${IPFS_GATEWAY}/${COLLECTION_IPFS_HASH}/banner_image.png`;
const INITIAL_LOGO_URL = `${IPFS_GATEWAY}/${COLLECTION_IPFS_HASH}/collection-image.gif`;

export default function Home() {
  const [bannerGatewayIndex, setBannerGatewayIndex] = useState(0);
  const [logoGatewayIndex, setLogoGatewayIndex] = useState(0);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isMintModalOpen, setIsMintModalOpen] = useState(false);
  const { address } = useWallet();
  const { toast } = useToast();

  const handleBannerError = () => {
    const nextUrl = getFallbackIPFSUrl(
      `${COLLECTION_IPFS_HASH}/banner_image.png`,
      bannerGatewayIndex
    );
    setBannerUrl(nextUrl);
    setBannerGatewayIndex(prev => (prev + 1) % 3);
  };

  const handleLogoError = () => {
    const nextUrl = getFallbackIPFSUrl(
      `${COLLECTION_IPFS_HASH}/collection-image.gif`,
      logoGatewayIndex
    );
    setLogoUrl(nextUrl);
    setLogoGatewayIndex(prev => (prev + 1) % 3);
  };

  return (
    <div className="min-h-screen pt-16">
      <Navbar />
      {/* Hero Banner */}
      <div className="relative hidden md:block h-[50vh] w-full">
        <MemoizedImage
          src={bannerUrl || INITIAL_BANNER_URL}
          alt="UpOnly Collection Banner"
          fill
          priority={true}
          loading="eager"
          className="object-cover"
          onError={handleBannerError}
        />
      </div>

      <main className="container mx-auto px-4 py-8">
        {/* Collection Info */}
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="relative h-32 w-32 rounded-full overflow-hidden mb-6">
            <MemoizedImage
              src={logoUrl || INITIAL_LOGO_URL}
              alt="UpOnly Collection"
              fill
              loading="eager"
              className="object-cover"
              onError={handleLogoError}
            />
          </div>
          <h1 className="text-4xl font-bold mb-4">UpOnly NFT Collection</h1>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl">
            A unique collection of 131 NFTs celebrating the eternal optimism of
            crypto markets. Each piece captures the essence of the unstoppable
            upward trajectory.
          </p>
          <Button
            size="lg"
            className="font-semibold"
            onClick={() => {
              if (!address) {
                toast({
                  title: 'Wallet Required',
                  description: 'Please connect your wallet first',
                  variant: 'destructive',
                  duration: 3000
                });
                return;
              }
              setIsMintModalOpen(true);
            }}
          >
            Mint Now
          </Button>
        </div>

        {/* NFT Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {nftMetadata.map((metadata, index) => (
            <NFTCard
              key={index + 1}
              metadata={metadata}
              collectionHash={COLLECTION_IPFS_HASH}
            />
          ))}
        </div>
      </main>
      <MintModal
        isOpen={isMintModalOpen}
        onClose={() => setIsMintModalOpen(false)}
      />
    </div>
  );
}
