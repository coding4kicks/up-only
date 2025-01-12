'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect
} from 'react';
import {
  createPublicClient,
  createWalletClient,
  http,
  custom,
  Chain,
  WalletClient,
  PublicClient
} from 'viem';
import { mainnet, sepolia } from 'viem/chains';

interface WalletContextType {
  address: `0x${string}` | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  walletClient: WalletClient | null;
  publicClient: PublicClient | null;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
  walletClient: null,
  publicClient: null
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [chain, setChain] = useState<Chain>(mainnet);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [publicClient, setPublicClient] = useState<PublicClient | null>(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isTest = searchParams.get('test') === 'true';
    setChain(isTest ? sepolia : mainnet);
  }, []);

  const connect = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to use this feature');
      return;
    }

    try {
      const publicClient = createPublicClient({
        chain,
        transport: http()
      });

      const walletClient = createWalletClient({
        chain,
        transport: custom(window.ethereum)
      }) as WalletClient;

      const [address] = await walletClient.requestAddresses();
      setAddress(address);

      // Update wallet client with account
      walletClient.account = {
        address,
        type: 'json-rpc'
      } as const;

      // Listen for account changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      setWalletClient(walletClient);
      setPublicClient(publicClient);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const disconnect = () => {
    setAddress(null);

    // Remove listeners
    window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
    window.ethereum?.removeListener('chainChanged', handleChainChanged);
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnect();
    } else {
      setAddress(accounts[0] as `0x${string}`);
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: !!address,
        connect,
        disconnect,
        walletClient,
        publicClient
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
