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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useWallet } from '@/context/wallet-context';
import { useUpOnlyContract } from '@/hooks/use-uponly-contract';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface MintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MINT_COST = 0.01; // ETH
const MAX_MINT = 5;

export default function MintModal({ isOpen, onClose }: MintModalProps) {
  const [amount, setAmount] = useState('1');
  const [isMinting, setIsMinting] = useState(false);
  const { address } = useWallet();
  const { mint } = useUpOnlyContract();
  const { toast } = useToast();

  const handleMint = async () => {
    if (!address) return;

    setIsMinting(true);
    try {
      const tx = await mint(Number(amount));
      if (tx.status === 'success') {
        toast({
          title: 'NFTs Minted Successfully!',
          description: `You have minted ${amount} NFT${
            Number(amount) > 1 ? 's' : ''
          }.`,
          duration: 5000
        });
        onClose();
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Error minting:', error);
      toast({
        title: 'Minting Failed',
        description:
          error instanceof Error ? error.message : 'Failed to mint NFTs',
        variant: 'destructive',
        duration: 5000
      });
    } finally {
      setIsMinting(false);
    }
  };

  const totalCost = Number(amount) * MINT_COST;

  return (
    <Dialog open={isOpen} onOpenChange={() => !isMinting && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mint UpOnly NFTs</DialogTitle>
          <DialogDescription>
            Select the number of NFTs you want to mint
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4">
            <Select
              value={amount}
              onValueChange={setAmount}
              disabled={isMinting}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Amount" />
              </SelectTrigger>
              <SelectContent>
                {[...Array(MAX_MINT)].map((_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {i + 1} NFT{i > 0 ? 's' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">Cost: {totalCost} ETH</span>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleMint}
            disabled={!address || isMinting}
            className="w-full"
          >
            {isMinting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Minting...
              </>
            ) : (
              'Mint'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
