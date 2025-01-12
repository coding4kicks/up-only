import { useCallback } from 'react';
import { parseEther } from 'viem';
import { useWallet } from '@/context/wallet-context';
import UpOnlyArtifact from '../../../artifacts/contracts/UpOnly.sol/UpOnly.json';
import type { NFTMetadata } from '@/types/nft';
import { nftMetadata } from '@/data/nft-metadata';

export function useUpOnlyContract() {
  const { walletClient, publicClient, address, contractAddress } = useWallet();

  const mint = useCallback(
    async (amount: number) => {
      if (!walletClient || !publicClient || !address) {
        throw new Error('Wallet not connected');
      }

      const cost = parseEther('0.01');
      const totalCost = cost * BigInt(amount);

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: UpOnlyArtifact.abi,
        functionName: 'mint',
        args: [amount],
        value: totalCost,
        chain: walletClient.chain,
        account: {
          address,
          type: 'json-rpc'
        }
      });

      // Wait for transaction to be confirmed
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'reverted') {
        throw new Error('Transaction failed');
      }

      return receipt;
    },
    [walletClient, publicClient, address, contractAddress]
  );

  const getOwnedNFTs = useCallback(async (): Promise<NFTMetadata[]> => {
    if (!publicClient || !address || !contractAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      // Get current supply
      const supply = await publicClient.readContract({
        address: contractAddress,
        abi: UpOnlyArtifact.abi,
        functionName: 'supply'
      });

      // Get recent mint events (last 1000 blocks)
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - BigInt(1000);

      const mintEvents = await publicClient.getContractEvents({
        address: contractAddress,
        abi: UpOnlyArtifact.abi,
        eventName: 'Mint',
        fromBlock
      });

      // Get recent transfer events
      const transferEvents = await publicClient.getContractEvents({
        address: contractAddress,
        abi: UpOnlyArtifact.abi,
        eventName: 'Transfer',
        fromBlock,
        args: {
          to: address
        }
      });

      // Combine token IDs from both events
      const potentialTokens = new Set<number>();

      mintEvents.forEach(event => {
        if (event.args?.owner === address) {
          potentialTokens.add(Number(event.args.token));
        }
      });

      transferEvents.forEach(event => {
        potentialTokens.add(Number(event.args?.tokenId));
      });

      // Verify current ownership of potential tokens
      const ownedTokenIds = new Set<number>();

      await Promise.all(
        Array.from(potentialTokens).map(async tokenId => {
          try {
            const owner = await publicClient.readContract({
              address: contractAddress,
              abi: UpOnlyArtifact.abi,
              functionName: 'ownerOf',
              args: [BigInt(tokenId)]
            });

            if (owner.toLowerCase() === address.toLowerCase()) {
              ownedTokenIds.add(tokenId);
            }
          } catch (error) {
            // Token doesn't exist or ownership changed
            return;
          }
        })
      );

      // Map token IDs to metadata
      return Array.from(ownedTokenIds)
        .map(id => nftMetadata[id])
        .filter(Boolean);
    } catch (error) {
      console.error('Error fetching NFTs:', error);
      throw error;
    }
  }, [publicClient, address, contractAddress]);

  return { mint, getOwnedNFTs };
}
