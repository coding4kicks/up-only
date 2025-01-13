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
import { formatEther, parseEther } from 'viem';
import type { NFTMetadata } from '@/types/nft';
import type { NFTData } from '@/hooks/use-uponly-contract';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import OfferModal from '@/components/offer-modal';
import { truncateAddress } from '@/lib/utils';

export default function NFTPage() {
  const params = useParams();
  const { address, isConnected } = useWallet();
  const { mint, getNFTData } = useUpOnlyContract();
  const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [nft, setNft] = useState<NFTMetadata | null>(null);
  const [nftData, setNftData] = useState<NFTData | null>(null);
  const [tokenId, setTokenId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMinting, setIsMinting] = useState(false);
  const { toast } = useToast();
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

  useEffect(() => {
    const nftName = (params.nftName as string).replace(/_/g, ' ');
    const foundNft = nftMetadata.find(n => n.name === nftName);

    if (foundNft) {
      setNft(foundNft);
      // Calculate and save tokenId
      const id = nftMetadata.findIndex(n => n.name === foundNft.name) + 1;
      setTokenId(id);
      const imageFilename = foundNft.image.split('/').pop() || '';
      setCurrentImageUrl(
        getFallbackIPFSUrl(`${COLLECTION_IPFS_HASH}/${imageFilename}`, 0)
      );
    }
  }, [params.nftName]);

  // Separate useEffect for fetching NFT data
  useEffect(() => {
    if (tokenId) {
      fetchNFTData();
    }
  }, [tokenId]);

  const fetchNFTData = async () => {
    if (!tokenId || !nft) return;

    try {
      setIsLoading(true);
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
    if (!tokenId) return;

    if (!isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to mint',
        variant: 'destructive',
        duration: 5000
      });
      return;
    }

    setIsMinting(true);
    try {
      const tx = await mint(1, tokenId);
      if (tx.status === 'success') {
        toast({
          title: 'NFT Minted Successfully!',
          description: `You have minted ${nft?.name}.`,
          duration: 5000
        });
        fetchNFTData(nft!);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Error minting:', error);
      toast({
        title: 'Minting Failed',
        description:
          error instanceof Error ? error.message : 'Failed to mint NFT',
        variant: 'destructive',
        duration: 5000
      });
    } finally {
      setIsMinting(false);
    }
  };

  const handleOfferClick = () => {
    if (!isConnected) {
      toast({
        title: 'Wallet Not Connected',
        description: 'Please connect your wallet to make an offer',
        variant: 'destructive',
        duration: 5000
      });
      return;
    }
    setIsOfferModalOpen(true);
  };

  const renderNFTInfo = () => {
    if (isLoading) return <p className="text-muted-foreground">Loading...</p>;

    // NFT hasn't been minted yet
    if (!nftData) {
      return (
        <div className="space-y-4">
          <div className="bg-secondary p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Category</span>
              <span className="text-sm font-medium">
                {nft?.attributes.value}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Status</span>
              <span className="text-sm font-medium">Available to Mint</span>
            </div>
          </div>
          <Button onClick={handleMint} className="w-full" disabled={isMinting}>
            {isMinting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Minting...
              </>
            ) : (
              'Mint for 0.01 ETH'
            )}
          </Button>
        </div>
      );
    }

    const isOwner =
      address &&
      nftData.owner &&
      nftData.owner.toLowerCase() === address.toLowerCase();
    const isOfferer =
      address &&
      nftData.offerer &&
      nftData.offerer.toLowerCase() === address.toLowerCase();
    const hasOffer = nftData.currentOffer > BigInt(0);
    const hasLastPrice = nftData.lastPrice > BigInt(0);

    return (
      <div className="space-y-4">
        <div className="bg-secondary p-4 rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Category</span>
            <span className="text-sm font-medium">{nft?.attributes.value}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Owner</span>
            <span
              className="text-sm font-medium hover:cursor-help"
              title={nftData.owner}
            >
              {truncateAddress(nftData.owner)}
            </span>
          </div>
          {hasLastPrice && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Last Price</span>
              <span className="text-sm font-medium">
                {formatEther(nftData.lastPrice)} ETH
              </span>
            </div>
          )}
          {hasOffer &&
            nftData.offerer !==
              '0x0000000000000000000000000000000000000000' && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Offerer</span>
                <span
                  className="text-sm font-medium hover:cursor-help"
                  title={nftData.offerer}
                >
                  {truncateAddress(nftData.offerer)}
                </span>
              </div>
            )}
          {hasOffer && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                Current Offer
              </span>
              <span className="text-sm font-medium">
                {formatEther(nftData.currentOffer)} ETH
              </span>
            </div>
          )}
        </div>
        {!isOwner && !isOfferer && (
          <Button onClick={handleOfferClick} className="w-full">
            Make Offer
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
    <>
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
                  {renderNFTInfo()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {tokenId && (
        <OfferModal
          isOpen={isOfferModalOpen}
          onClose={() => setIsOfferModalOpen(false)}
          tokenId={tokenId}
          minPrice={
            nftData
              ? BigInt(
                  Math.max(
                    Number(nftData.lastPrice),
                    Number(nftData.currentOffer)
                  )
                )
              : parseEther('0.01')
          }
        />
      )}
    </>
  );
}
