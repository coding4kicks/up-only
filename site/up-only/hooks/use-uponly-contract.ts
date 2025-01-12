import { useCallback } from 'react';
import { parseEther, Log, decodeEventLog } from 'viem';
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
      // Get recent mint events (last 1000 blocks)
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - BigInt(1000);

      // Combine token IDs from both events
      const potentialTokens = new Set<number>();

      try {
        // Handle mint events
        const mintEvents =
          (await publicClient.getContractEvents({
            address: contractAddress,
            abi: UpOnlyArtifact.abi,
            eventName: 'Mint',
            fromBlock
          })) ?? [];

        // Handle transfer events
        const transferEvents =
          (await publicClient.getContractEvents({
            address: contractAddress,
            abi: UpOnlyArtifact.abi,
            eventName: 'Transfer',
            fromBlock,
            args: {
              to: address
            }
          })) ?? [];

        // Process mint events
        for (const event of mintEvents) {
          try {
            const decoded = decodeEventLog({
              abi: UpOnlyArtifact.abi,
              data: event.data,
              topics: event.topics,
              eventName: 'Mint'
            });
            // Handle decoded args as an object instead of array
            const args = decoded.args as unknown as {
              token: bigint;
              owner: string;
              amount: bigint;
              cost: bigint;
              supply: bigint;
            };

            if (args.owner === address) {
              potentialTokens.add(Number(args.token));
            }
          } catch (err) {
            console.error('Error processing mint event:', err);
          }
        }

        // Process transfer events
        for (const event of transferEvents) {
          try {
            const decoded = decodeEventLog({
              abi: UpOnlyArtifact.abi,
              data: event.data,
              topics: event.topics,
              eventName: 'Transfer'
            });
            const args = decoded.args as unknown as {
              from: string;
              to: string;
              tokenId: bigint;
            };
            potentialTokens.add(Number(args.tokenId));
          } catch (err) {
            console.error('Error processing transfer event:', err);
          }
        }
      } catch (error) {
        console.error('Error processing events:', error);
      }

      // Verify current ownership of potential tokens
      const ownedTokenIds = new Set<number>();

      await Promise.all(
        Array.from(potentialTokens).map(async tokenId => {
          try {
            const owner = (await publicClient.readContract({
              address: contractAddress,
              abi: UpOnlyArtifact.abi,
              functionName: 'ownerOf',
              args: [BigInt(tokenId)]
            })) as `0x${string}`;

            if (owner.toLowerCase() === address.toLowerCase()) {
              ownedTokenIds.add(tokenId);
            }
          } catch {
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

  const getOffers = useCallback(async (): Promise<NFTMetadata[]> => {
    if (!publicClient || !address || !contractAddress) {
      throw new Error('Wallet not connected');
    }

    try {
      // Get recent offer events (last 1000 blocks)
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - BigInt(1000);

      const offerEvents = await publicClient.getContractEvents({
        address: contractAddress,
        abi: UpOnlyArtifact.abi,
        eventName: 'Offer',
        fromBlock,
        args: {
          recipient: address
        }
      });

      // Get current offers
      const offeredTokenIds = new Set<number>();

      offerEvents.forEach((event: Log) => {
        const decoded = decodeEventLog({
          abi: UpOnlyArtifact.abi,
          data: event.data,
          topics: event.topics,
          eventName: 'Offer'
        });
        const token = (
          decoded.args as unknown as [bigint, string, string, bigint]
        )[0];
        offeredTokenIds.add(Number(token));
      });

      // Map token IDs to metadata
      return Array.from(offeredTokenIds)
        .map(id => nftMetadata[id])
        .filter(Boolean);
    } catch (error) {
      console.error('Error fetching offers:', error);
      throw error;
    }
  }, [publicClient, address, contractAddress]);

  return { mint, getOwnedNFTs, getOffers };
}
