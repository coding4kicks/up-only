import { useCallback } from 'react';
import { parseEther, Log, decodeEventLog } from 'viem';
import { useWallet } from '@/context/wallet-context';
import UpOnlyArtifact from '@/artifacts/contracts/UpOnly.sol/UpOnly.json';
import type { NFTMetadata } from '@/types/nft';
import { nftMetadata } from '@/data/nft-metadata';

export interface NFTData {
  owner: string;
  lastPrice: bigint;
  currentOffer: bigint;
  offerer: string;
}

type ExtendedLog = Log & { eventName?: string };

export function useUpOnlyContract() {
  const { walletClient, publicClient, address, contractAddress } = useWallet();

  const mint = useCallback(
    async (amount: number, tokenId?: number) => {
      if (!walletClient || !publicClient || !address) {
        throw new Error('Wallet not connected');
      }

      const cost = parseEther('0.01');
      const totalCost = cost * BigInt(amount);

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: UpOnlyArtifact.abi,
        functionName: 'mint',
        args: tokenId ? [amount, tokenId] : [amount],
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
      const currentBlock = await publicClient.getBlockNumber();
      // Increase the block range to catch more historical transfers
      const fromBlock = currentBlock - BigInt(100000); // Look back further

      // Track token ownership changes
      const tokenOwnership = new Map<number, boolean>();

      // Get ALL Transfer events for the contract
      const transferEvents = await publicClient.getContractEvents({
        address: contractAddress,
        abi: UpOnlyArtifact.abi,
        eventName: 'Transfer',
        fromBlock
        // Remove any filtering here to get all transfers
      });

      // Process transfer events chronologically
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

          const tokenId = Number(args.tokenId);
          const fromAddress = args.from.toLowerCase();
          const toAddress = args.to.toLowerCase();
          const userAddress = address.toLowerCase();

          // Track the most recent transfer for each token
          if (fromAddress === userAddress) {
            // User sent the token
            tokenOwnership.set(tokenId, false);
          }
          if (toAddress === userAddress) {
            // User received the token (including mints from zero address)
            tokenOwnership.set(tokenId, true);
          }
        } catch (err) {
          console.error('Error processing transfer event:', err);
        }
      }

      // Double check current ownership with ownerOf calls
      const ownedTokenIds = new Set<number>();

      await Promise.all(
        Array.from(tokenOwnership.entries())
          .filter(([, isOwned]) => isOwned) // Only verify tokens marked as owned
          .map(async ([tokenId]) => {
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
        .map(id => nftMetadata[id - 1]) // Adjust index since tokenIds start at 1
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
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - BigInt(100000); // Look back further

      // Track active offers by token ID
      const activeOffers = new Map<number, boolean>();

      // Get Offer events
      const offerEvents = await publicClient.getContractEvents({
        address: contractAddress,
        abi: UpOnlyArtifact.abi,
        eventName: 'Offer',
        fromBlock
      });

      // Get Transfer events (to detect when NFTs change hands)
      const transferEvents = await publicClient.getContractEvents({
        address: contractAddress,
        abi: UpOnlyArtifact.abi,
        eventName: 'Transfer',
        fromBlock
      });

      // Process events chronologically
      const allEvents = [...offerEvents, ...transferEvents].sort((a, b) =>
        Number(a.blockNumber - b.blockNumber)
      );

      for (const event of allEvents as ExtendedLog[]) {
        try {
          if (event.eventName === 'Offer') {
            const decoded = decodeEventLog({
              abi: UpOnlyArtifact.abi,
              data: event.data,
              topics: event.topics,
              eventName: 'Offer'
            });
            const args = decoded.args as unknown as {
              token: bigint;
              recipient: string;
              owner: string;
              offer: bigint;
            };

            const tokenId = Number(args.token);
            const offererAddress = args.recipient.toLowerCase();
            const userAddress = address.toLowerCase();

            if (offererAddress === userAddress) {
              activeOffers.set(tokenId, true);
            }
          } else if (event.eventName === 'Transfer') {
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

            const tokenId = Number(args.tokenId);
            activeOffers.delete(tokenId);
          }
        } catch (err) {
          console.error('Error processing event:', err);
          console.error('Event data:', event);
        }
      }

      // Verify current state of offers
      const confirmedOffers = new Set<number>();

      await Promise.all(
        Array.from(activeOffers.keys()).map(async tokenId => {
          try {
            const tokenData = (await publicClient.readContract({
              address: contractAddress,
              abi: UpOnlyArtifact.abi,
              functionName: 'tokenData',
              args: [BigInt(tokenId)]
            })) as [bigint, bigint, string];

            const [, , offerer] = tokenData;

            if (offerer.toLowerCase() === address.toLowerCase()) {
              confirmedOffers.add(tokenId);
            }
          } catch {
            // Token doesn't exist or offer was revoked
            return;
          }
        })
      );

      // Map token IDs to metadata
      return Array.from(confirmedOffers)
        .map(id => nftMetadata[id - 1])
        .filter(Boolean);
    } catch (error) {
      console.error('Error fetching offers:', error);
      throw error;
    }
  }, [publicClient, address, contractAddress]);

  const getNFTData = useCallback(
    async (tokenId: number): Promise<NFTData | null> => {
      if (!publicClient || !contractAddress) {
        throw new Error('Wallet not connected');
      }

      try {
        // First check if token exists by checking owner
        const owner = (await publicClient.readContract({
          address: contractAddress,
          abi: UpOnlyArtifact.abi,
          functionName: 'ownerOf',
          args: [BigInt(tokenId)]
        })) as `0x${string}`;

        // If we get here, token exists, get its data
        const tokenData = (await publicClient.readContract({
          address: contractAddress,
          abi: UpOnlyArtifact.abi,
          functionName: 'tokenData',
          args: [BigInt(tokenId)]
        })) as [bigint, bigint, string];

        // Map array response to object properties
        const [lastPrice, currentOffer, offerer] = tokenData;

        // Return combined data
        return {
          owner,
          lastPrice,
          currentOffer,
          offerer
        };
      } catch {
        // Token doesn't exist yet
        return null;
      }
    },
    [publicClient, contractAddress]
  );

  const makeOffer = useCallback(
    async (tokenId: number, amount: bigint) => {
      if (!walletClient || !publicClient || !address) {
        throw new Error('Wallet not connected');
      }

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: UpOnlyArtifact.abi,
        functionName: 'offer',
        args: [BigInt(tokenId)],
        value: amount,
        chain: walletClient.chain,
        account: {
          address,
          type: 'json-rpc'
        }
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'reverted') {
        throw new Error('Transaction failed');
      }

      return receipt;
    },
    [walletClient, publicClient, address, contractAddress]
  );

  const revokeOffer = useCallback(
    async (tokenId: number) => {
      if (!walletClient || !publicClient || !address) {
        throw new Error('Wallet not connected');
      }

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: UpOnlyArtifact.abi,
        functionName: 'revoke',
        args: [BigInt(tokenId)],
        chain: walletClient.chain,
        account: {
          address,
          type: 'json-rpc'
        }
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'reverted') {
        throw new Error('Transaction failed');
      }

      return receipt;
    },
    [walletClient, publicClient, address, contractAddress]
  );

  const acceptOffer = useCallback(
    async (tokenId: number, to: string) => {
      if (!walletClient || !publicClient || !address) {
        throw new Error('Wallet not connected');
      }

      const hash = await walletClient.writeContract({
        address: contractAddress,
        abi: UpOnlyArtifact.abi,
        functionName: 'transferFrom',
        args: [address, to, BigInt(tokenId)],
        chain: walletClient.chain,
        account: {
          address,
          type: 'json-rpc'
        }
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === 'reverted') {
        throw new Error('Transaction failed');
      }

      return receipt;
    },
    [walletClient, publicClient, address, contractAddress]
  );

  return {
    mint,
    getOwnedNFTs,
    getOffers,
    getNFTData,
    makeOffer,
    revokeOffer,
    acceptOffer
  };
}
