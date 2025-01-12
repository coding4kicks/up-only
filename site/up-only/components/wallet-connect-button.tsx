'use client';

import { Button } from '@/components/ui/button';
import { Wallet } from 'lucide-react';
import { useWallet } from '@/context/wallet-context';

export default function WalletConnectButton() {
  const { address, isConnected, connect, disconnect } = useWallet();

  const handleClick = async () => {
    if (isConnected) {
      disconnect();
    } else {
      await connect();
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleClick}>
      {isConnected ? (
        <div className="flex items-center gap-2">
          <span>{`${address?.slice(0, 6)}`}</span>
        </div>
      ) : (
        <>
          <Wallet className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Connect Wallet</span>
        </>
      )}
    </Button>
  );
}
