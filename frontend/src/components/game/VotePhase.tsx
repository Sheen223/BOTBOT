"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { botBotAbi } from "@/lib/abi/BotBot";
import { Button } from "@/components/ui/button";
import { keccak256, encodePacked } from "viem";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { motion } from "framer-motion";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export const VotePhase = ({ room }: { room: any }) => {
  const { address } = useAccount();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  
  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const [hasVoted, setHasVoted] = useState(false);

  // Timer logic
  useEffect(() => {
    if (!room?.phaseEndTime) return;
    const interval = setInterval(() => {
      const remaining = Number(room.phaseEndTime) * 1000 - Date.now();
      if (remaining <= 0) {
        setTimeLeft("Time's up!");
        clearInterval(interval);
      } else {
        const s = Math.floor(remaining / 1000);
        setTimeLeft(`00:${s.toString().padStart(2, '0')}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [room?.phaseEndTime]);

  // Check if they already voted in local storage just for UI state
  useEffect(() => {
    if (room?.id && localStorage.getItem(`botbot_salt_${room.id}`)) {
      setHasVoted(true);
    }
  }, [room?.id]);

  const handleCommitVote = async () => {
    if (!selectedPlayer || !room?.id) return;
    
    try {
      // 1. Generate salt
      const salt = nanoid();
      
      // 2. Hash the vote
      const hash = keccak256(
        encodePacked(
          ['address', 'string'],
          [selectedPlayer as `0x${string}`, salt]
        )
      );

      // 3. Submit transaction
      toast.loading("Locking your vote...", { id: "commit" });
      const hashTx = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: botBotAbi,
        functionName: "commitVote",
        args: [BigInt(room.id), hash],
      });
      
      setTxHash(hashTx);
      
      // 4. Important: Only save salt if tx is submitted
      localStorage.setItem(`botbot_salt_${room.id}`, salt);
      localStorage.setItem(`botbot_vote_${room.id}`, selectedPlayer);
      
    } catch (err: any) {
      console.error(err);
      toast.error(err.shortMessage || "Failed to commit vote");
      toast.dismiss("commit");
    }
  };

  useEffect(() => {
    if (isSuccess) {
      toast.dismiss("commit");
      toast.success("Vote locked securely!");
      setHasVoted(true);
    }
  }, [isSuccess]);

  const playersToVote = room?.players?.filter((p: any) => p.walletAddress.toLowerCase() !== address?.toLowerCase()) || [];
  
  // Add "No AI" option
  const voteOptions = [
    ...playersToVote,
    { walletAddress: '0x0000000000000000000000000000000000000000', nickname: 'No AI (Everyone is Human)' }
  ];

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto mt-8 px-4">
      <div className="bg-white rounded-3xl shadow-xl p-6 w-full text-center relative border-b-8 border-sky-100">
        <h2 className="text-2xl font-nunito font-black text-slate-800 mb-2">Who is the AI?</h2>
        <p className="text-slate-500 mb-6">Select the player you think is the imposter.</p>
        
        <div className="absolute -top-4 right-4 bg-red-400 text-white font-bold px-4 py-1 rounded-full shadow-md tabular-nums">
          {timeLeft || "00:00"}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {voteOptions.map((p: any, i: number) => {
            const isSelected = selectedPlayer === p.walletAddress;
            const isNoAi = p.walletAddress === '0x0000000000000000000000000000000000000000';
            
            return (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                key={p.walletAddress}
                onClick={() => !hasVoted && setSelectedPlayer(p.walletAddress)}
                className={`flex flex-col items-center justify-center p-4 rounded-2xl border-4 transition-all ${
                  isSelected 
                    ? "border-green-400 bg-green-50 shadow-md" 
                    : "border-slate-100 bg-slate-50 opacity-80 hover:opacity-100"
                } ${hasVoted ? "cursor-not-allowed opacity-50" : ""} ${isNoAi ? "col-span-2 border-dashed border-amber-300 bg-amber-50" : ""}`}
              >
                {!isNoAi && (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-300 to-indigo-300 mb-2 shadow-inner" />
                )}
                {isNoAi && (
                   <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-tr from-amber-300 to-orange-400 mb-2 shadow-inner text-white font-black text-xl">?</div>
                )}
                <span className="text-sm font-bold text-slate-700">
                  {p.nickname || `${p.walletAddress.slice(0, 6)}...${p.walletAddress.slice(-4)}`}
                </span>
              </motion.button>
            );
          })}
        </div>

        {hasVoted ? (
          <div className="bg-green-100 text-green-700 font-bold py-3 rounded-xl">
            Vote Locked! Waiting for others...
          </div>
        ) : (
          <Button 
            className="w-full rounded-full h-14 text-lg shadow-lg"
            onClick={handleCommitVote}
            disabled={!selectedPlayer || isPending || isConfirming}
          >
            {isPending || isConfirming ? "Confirming..." : "CONFIRM VOTE"}
          </Button>
        )}
      </div>
    </div>
  );
};
