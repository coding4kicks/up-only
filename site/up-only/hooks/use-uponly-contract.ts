import { useCallback } from 'react';
import { parseEther } from 'viem';
import { useWallet } from '@/context/wallet-context';
import UpOnlyArtifact from '../../../artifacts/contracts/UpOnly.sol/UpOnly.json';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

export function useUpOnlyContract() {
  const { walletClient, publicClient, address } = useWallet();

  const mint = useCallback(
    async (amount: number) => {
      if (!walletClient || !CONTRACT_ADDRESS) return;

      const cost = parseEther('0.01'); // 0.01 ETH per NFT
      const totalCost = cost * BigInt(amount);

      const hash = await walletClient.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: UpOnlyArtifact.abi,
        functionName: 'mint',
        args: [amount],
        value: totalCost,
        chain: walletClient.chain,
        account: address as `0x${string}`
      });

      const receipt = await publicClient?.waitForTransactionReceipt({ hash });
      return receipt;
    },
    [walletClient, publicClient, address]
  );

  return { mint };
}
