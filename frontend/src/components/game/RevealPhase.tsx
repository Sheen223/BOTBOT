"use client";

import React, { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { botBotAbi } from "@/lib/abi/BotBot";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export const RevealPhase = ({ room }: { room: any }) => {
  const [timeLeft, setTimeLeft] = useState("");
  const [localData, setLocalData] = useState<{ target: string; salt: string } | null>(null);
  const [isMissingData, setIsMissingData] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);

  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!room?.id) return;
    const salt = localStorage.getItem(`botbot_salt_${room.id}`);
    const target = localStorage.getItem(`botbot_vote_${room.id}`);
    
    if (salt && target) {
      setLocalData({ salt, target });
    } else {
      setIsMissingData(true);
    }
  }, [room?.id]);

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

  const handleReveal = async () => {
    if (!localData || !room?.id) return;
    
    try {
      toast.loading("Revealing your vote...", { id: "reveal" });
      const hashTx = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: botBotAbi,
        functionName: "revealVote",
        args: [BigInt(room.id), localData.target as `0x${string}`, localData.salt],
      });
      setTxHash(hashTx);
    } catch (err: any) {
      console.error(err);
      toast.error(err.shortMessage || "Failed to reveal vote");
      toast.dismiss("reveal");
    }
  };

  useEffect(() => {
    if (isSuccess) {
      toast.dismiss("reveal");
      toast.success("Vote revealed successfully!");
      setHasRevealed(true);
    }
  }, [isSuccess]);

  if (isMissingData) {
    return (
      <div className="flex flex-col items-center w-full max-w-md mx-auto mt-8 px-4">
        <div className="bg-white rounded-3xl shadow-xl p-6 w-full text-center border-b-8 border-red-100">
          <h2 className="text-2xl font-nunito font-black text-red-500 mb-2">Missing Data</h2>
          <p className="text-slate-500 mb-6">
            We could not find your encrypted vote signature (salt) in this browser's Local Storage. 
            Did you switch browsers, clear your cache, or open a private tab?
          </p>
          <div className="bg-red-50 text-red-700 font-bold py-3 px-4 rounded-xl text-sm text-left mb-6">
            Unfortunately, without the original cryptographic salt generated during the Voting Phase, 
            your vote cannot be proven to the blockchain and you have forfeited this round.
          </div>
          <div className="absolute -top-4 right-4 bg-red-400 text-white font-bold px-4 py-1 rounded-full shadow-md tabular-nums">
            {timeLeft || "00:00"}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto mt-8 px-4">
      <div className="bg-white rounded-3xl shadow-xl p-6 w-full text-center relative border-b-8 border-sky-100">
        <h2 className="text-2xl font-nunito font-black text-slate-800 mb-2">Reveal Phase</h2>
        <p className="text-slate-500 mb-6">
          Submit your cryptographic salt to the blockchain to prove your vote and claim your winnings!
        </p>
        
        <div className="absolute -top-4 right-4 bg-red-400 text-white font-bold px-4 py-1 rounded-full shadow-md tabular-nums">
          {timeLeft || "00:00"}
        </div>

        {localData && (
          <div className="bg-sky-50 rounded-2xl p-4 mb-6 border-2 border-sky-100 text-left overflow-hidden">
            <div className="text-xs font-bold text-sky-800 mb-1 uppercase tracking-wide">Target Address</div>
            <div className="text-sm text-slate-600 font-mono mb-3 truncate">{localData.target}</div>
            
            <div className="text-xs font-bold text-sky-800 mb-1 uppercase tracking-wide">Cryptographic Salt</div>
            <div className="text-sm text-slate-600 font-mono truncate">{localData.salt}</div>
          </div>
        )}

        {hasRevealed ? (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-green-100 text-green-700 font-bold py-3 rounded-xl border-2 border-green-200"
          >
            Vote Revealed! Waiting for Oracle...
          </motion.div>
        ) : (
          <Button 
            className="w-full rounded-full h-14 text-lg shadow-lg"
            onClick={handleReveal}
            disabled={isPending || isConfirming}
          >
            {isPending || isConfirming ? "Confirming Transaction..." : "REVEAL VOTE"}
          </Button>
        )}
      </div>
    </div>
  );
};
