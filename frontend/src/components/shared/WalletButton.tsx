"use client";

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { botBotAbi } from '@/lib/abi/BotBot';
import { formatEther } from 'viem';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export function WalletButton() {
  const { address } = useAccount();

  const { data: pendingAmount } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: botBotAbi,
    functionName: 'pendingWithdrawals',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 5000,
    }
  });

  const { writeContractAsync } = useWriteContract();

  const handleClaim = async () => {
    try {
      await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: botBotAbi,
        functionName: 'claimRewards',
      });
    } catch (err) {
      console.error("Failed to claim:", err);
    }
  };

  const hasRewards = pendingAmount && (pendingAmount as bigint) > BigInt(0);

  return (
    <div className="flex items-center gap-4">
      {hasRewards && (
        <button 
          onClick={handleClaim}
          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-bold shadow-md animate-pulse"
        >
          Claim {formatEther(pendingAmount as bigint)} BOT
        </button>
      )}
      <div className="font-sans font-bold shadow-sm rounded-xl">
        <ConnectButton />
      </div>
    </div>
  );
}
