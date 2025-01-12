'use client';

import { Github, Sun, Moon } from 'lucide-react';
import { Button } from './ui/button';
import { useTheme } from 'next-themes';
import WalletConnectButton from './wallet-connect-button';
import { useWallet } from '@/context/wallet-context';
import Link from 'next/link';

const Navbar = () => {
  const { theme, setTheme } = useTheme();
  const { isConnected } = useWallet();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="text-xl font-bold">UpOnly</div>
          <div className="flex gap-4 items-center">
            {isConnected && (
              <Link href="/my-nfts">
                <Button variant="ghost">My NFTs</Button>
              </Link>
            )}
            <WalletConnectButton />
            <div className="flex gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  window.open(
                    'https://github.com/coding4kicks/up-only',
                    '_blank'
                  )
                }
              >
                <Github className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
