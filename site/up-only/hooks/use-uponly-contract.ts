import { useCallback } from 'react';
import { parseEther, Log, decodeEventLog, type Abi } from 'viem';
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

// Maximum block range allowed by RPC provider
const MAX_BLOCK_RANGE = BigInt(10000);
// How far back to look for events (keep the 200000 blocks)
const TOTAL_BLOCK_RANGE = BigInt(200000);

// Add these interfaces at the top of the file
interface TransferEvent {
  eventName: 'Transfer';
  args: {
    from: string;
    to: string;
    tokenId: bigint;
  };
}

interface OfferEvent {
  eventName: 'Offer';
  args: {
    token: bigint;
    recipient: string;
    owner: string;
    offer: bigint;
  };
}

// Add at the top with other interfaces
interface MulticallResult<T> {
  status: 'success' | 'failure';
  result: T;
  error?: Error;
}

// Add this helper function at the top level
async function getAllEvents(
  publicClient: any,
  params: {
    address: `0x${string}`;
    eventName: string;
    fromBlock: bigint;
    toBlock: bigint;
    args?: Record<string, any>;
  }
) {
  const { address, eventName, fromBlock, toBlock, args } = params;
  const events = [];

  // Paginate through blocks in chunks of MAX_BLOCK_RANGE
  for (let start = fromBlock; start <= toBlock; start += MAX_BLOCK_RANGE) {
    const end =
      start + MAX_BLOCK_RANGE > toBlock ? toBlock : start + MAX_BLOCK_RANGE;

    const chunk = await publicClient.getContractEvents({
      address,
      abi: UpOnlyArtifact.abi,
      eventName,
      fromBlock: start,
      toBlock: end,
      args
    });

    events.push(...chunk);
  }

  return events;
}

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
      const fromBlock = currentBlock - TOTAL_BLOCK_RANGE;

      // Get Transfer events with pagination
      const transferEvents = await getAllEvents(publicClient, {
        address: contractAddress,
        eventName: 'Transfer',
        fromBlock,
        toBlock: currentBlock,
        args: {
          to: address
        }
      });

      const ownedTokenIds = new Set<number>();

      transferEvents.forEach(event => {
        const decoded = decodeEventLog({
          abi: UpOnlyArtifact.abi,
          data: event.data,
          topics: event.topics,
          eventName: 'Transfer'
        }) as unknown as TransferEvent;

        const tokenId = Number(decoded.args.tokenId);
        ownedTokenIds.add(tokenId);
      });

      // Get outgoing transfers with pagination
      const outgoingTransfers = await getAllEvents(publicClient, {
        address: contractAddress,
        eventName: 'Transfer',
        fromBlock,
        toBlock: currentBlock,
        args: {
          from: address
        }
      });

      outgoingTransfers.forEach(event => {
        const decoded = decodeEventLog({
          abi: UpOnlyArtifact.abi,
          data: event.data,
          topics: event.topics,
          eventName: 'Transfer'
        }) as unknown as TransferEvent;

        const tokenId = Number(decoded.args.tokenId);
        ownedTokenIds.delete(tokenId);
      });

      // Verify current ownership with multicall for efficiency
      if (ownedTokenIds.size > 0) {
        const ownershipChecks = (await publicClient.multicall({
          contracts: Array.from(ownedTokenIds).map(tokenId => ({
            address: contractAddress,
            abi: UpOnlyArtifact.abi as Abi,
            functionName: 'ownerOf',
            args: [BigInt(tokenId)]
          }))
        })) as MulticallResult<`0x${string}`>[];

        // Keep only tokens still owned by user
        const verifiedTokens = new Set<number>();
        Array.from(ownedTokenIds).forEach((tokenId, index) => {
          if (
            ownershipChecks[index].status === 'success' &&
            ownershipChecks[index].result?.toLowerCase() ===
              address.toLowerCase()
          ) {
            verifiedTokens.add(tokenId);
          }
        });

        return Array.from(verifiedTokens)
          .map(id => nftMetadata[id - 1])
          .filter(Boolean);
      }

      return [];
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
      const fromBlock = currentBlock - TOTAL_BLOCK_RANGE;

      // Get Offer events with pagination
      const offerEvents = await getAllEvents(publicClient, {
        address: contractAddress,
        eventName: 'Offer',
        fromBlock,
        toBlock: currentBlock,
        args: {
          recipient: address
        }
      });

      // Track active offers
      const potentialOffers = new Set<number>();

      offerEvents.forEach(event => {
        const decoded = decodeEventLog({
          abi: UpOnlyArtifact.abi,
          data: event.data,
          topics: event.topics,
          eventName: 'Offer'
        }) as unknown as OfferEvent;

        potentialOffers.add(Number(decoded.args.token));
      });

      // Verify offers are still active with multicall
      if (potentialOffers.size > 0) {
        const offerChecks = (await publicClient.multicall({
          contracts: Array.from(potentialOffers).map(tokenId => ({
            address: contractAddress,
            abi: UpOnlyArtifact.abi as Abi,
            functionName: 'tokenData',
            args: [BigInt(tokenId)]
          }))
        })) as MulticallResult<[bigint, bigint, `0x${string}`]>[];

        const activeOffers = new Set<number>();
        Array.from(potentialOffers).forEach((tokenId, index) => {
          if (
            offerChecks[index].status === 'success' &&
            offerChecks[index].result?.[2].toLowerCase() ===
              address.toLowerCase()
          ) {
            activeOffers.add(tokenId);
          }
        });

        return Array.from(activeOffers)
          .map(id => nftMetadata[id - 1])
          .filter(Boolean);
      }

      return [];
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
