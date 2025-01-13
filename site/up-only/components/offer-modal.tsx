'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWallet } from '@/context/wallet-context';
import { useUpOnlyContract } from '@/hooks/use-uponly-contract';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { parseEther, formatEther } from 'viem';

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenId: number;
  minPrice: bigint;
}

export default function OfferModal({
  isOpen,
  onClose,
  tokenId,
  minPrice
}: OfferModalProps) {
  const [offerAmount, setOfferAmount] = useState(() => {
    const minimumEth = Number(formatEther(minPrice));
    return (minimumEth + 0.001).toFixed(3);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { address } = useWallet();
  const { makeOffer } = useUpOnlyContract();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!address || !offerAmount) return;

    setIsSubmitting(true);
    try {
      const tx = await makeOffer(tokenId, parseEther(offerAmount));
      if (tx.status === 'success') {
        toast({
          title: 'Offer Made Successfully!',
          description: `You have offered ${offerAmount} ETH.`,
          duration: 5000
        });
        onClose();
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Error making offer:', error);
      toast({
        title: 'Offer Failed',
        description:
          error instanceof Error ? error.message : 'Failed to make offer',
        variant: 'destructive',
        duration: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValidAmount = () => {
    try {
      const amount = parseEther(offerAmount);
      return amount > minPrice;
    } catch {
      return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isSubmitting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Make an Offer</DialogTitle>
          <DialogDescription>
            Enter your offer amount (minimum {formatEther(minPrice)} ETH)
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
            <Input
              type="number"
              step="0.001"
              min={formatEther(minPrice)}
              placeholder="ETH Amount"
              value={offerAmount}
              onChange={e => setOfferAmount(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={!address || isSubmitting || !isValidAmount()}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Make Offer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
