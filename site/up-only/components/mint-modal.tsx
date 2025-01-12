'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
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
import { parseEther, formatEther } from 'viem';
import { useUpOnlyContract } from '@/hooks/use-uponly-contract';

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

  const handleMint = async () => {
    if (!address) return;

    setIsMinting(true);
    try {
      const tx = await mint(Number(amount));
      console.log('Minted successfully:', tx);
    } catch (error) {
      console.error('Error minting:', error);
    } finally {
      setIsMinting(false);
      onClose();
    }
  };

  const totalCost = Number(amount) * MINT_COST;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
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
          <Button
            onClick={handleMint}
            disabled={!address || isMinting}
            className="w-full"
          >
            {isMinting ? 'Minting...' : 'Mint'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
