import { useCallback } from 'react';
import { parseEther } from 'viem';
import { useWallet } from '@/context/wallet-context';
import UpOnlyArtifact from '../../../artifacts/contracts/UpOnly.sol/UpOnly.json';

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

  return { mint };
}
