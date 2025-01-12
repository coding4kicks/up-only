'use client';

import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';

export default function WalletConnectButton() {
  const handleConnect = async () => {
    // Wallet connection logic will be added later
    console.log('Connecting wallet...');
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleConnect}>
      <Wallet className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Connect Wallet</span>
    </Button>
  );
}
