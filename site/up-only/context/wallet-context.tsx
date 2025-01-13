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

const TEST_CONTRACT_ADDRESS = '0xa8Fe01276CDba2f22D10A4Ef908c90f24E7df709';
const MAINNET_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000000'; // Placeholder for future mainnet contract

interface WalletContextType {
  address: `0x${string}` | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  walletClient: WalletClient | null;
  publicClient: PublicClient | null;
  contractAddress: `0x${string}`;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
  walletClient: null,
  publicClient: null,
  contractAddress: MAINNET_CONTRACT_ADDRESS as `0x${string}`
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<`0x${string}` | null>(null);
  const [chain, setChain] = useState<Chain>(mainnet);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [publicClient, setPublicClient] = useState<PublicClient>(() =>
    createPublicClient({
      chain: mainnet,
      transport: http()
    })
  );
  const [contractAddress, setContractAddress] = useState<`0x${string}`>(
    MAINNET_CONTRACT_ADDRESS as `0x${string}`
  );

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isTest = searchParams.get('test') === 'true';
    const newChain = isTest ? sepolia : mainnet;
    setChain(newChain);

    // Update publicClient when chain changes
    setPublicClient(
      createPublicClient({
        chain: newChain,
        transport: http()
      })
    );

    setContractAddress(
      (isTest
        ? TEST_CONTRACT_ADDRESS
        : MAINNET_CONTRACT_ADDRESS) as `0x${string}`
    );
  }, []);

  const connect = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to use this feature');
      return;
    }

    try {
      const walletClient = createWalletClient({
        chain,
        transport: custom(window.ethereum)
      }) as WalletClient;

      // Get address
      const [newAddress] = await walletClient.requestAddresses();

      // Update wallet client with account
      walletClient.account = {
        address: newAddress,
        type: 'json-rpc'
      } as const;

      // Set state after everything is configured
      setAddress(newAddress);
      setWalletClient(walletClient);

      // Add listeners
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
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
        publicClient,
        contractAddress
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
