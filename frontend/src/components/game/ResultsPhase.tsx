"use client";

import React, { useEffect, useState } from "react";
import { usePublicClient, useReadContract, useAccount } from "wagmi";
import { botBotAbi } from "@/lib/abi/BotBot";
import { parseAbiItem, formatEther } from "viem";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Confetti from "react-dom-confetti";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export const ResultsPhase = ({ room }: { room: any }) => {
  const router = useRouter();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  
  const [winners, setWinners] = useState<string[]>([]);
  const [payout, setPayout] = useState("0");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the pot size directly from the contract
  const { data: contractRoom } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: botBotAbi,
    functionName: "rooms",
    args: [BigInt(room?.id || 0)],
    query: {
      enabled: !!room?.id
    }
  });

  const potSize = contractRoom ? formatEther(contractRoom[9]) : "0";

  // Fetch the RoomResolved event logs to determine the winners securely
  useEffect(() => {
    if (!room?.id || !publicClient) return;

    const fetchWinners = async () => {
      try {
        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESS,
          event: parseAbiItem('event RoomResolved(uint256 indexed roomId, address[] winners, uint256 payoutPerWinner)'),
          args: {
            roomId: BigInt(room.id)
          },
          fromBlock: 'earliest',
          toBlock: 'latest'
        });

        if (logs.length > 0) {
          const latestLog = logs[logs.length - 1];
          setWinners(latestLog.args.winners as string[]);
          setPayout(formatEther(latestLog.args.payoutPerWinner as bigint));
        }
      } catch (err) {
        console.error("Failed to fetch RoomResolved logs", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWinners();
  }, [room?.id, publicClient]);

  const isWinner = address && winners.map(w => w.toLowerCase()).includes(address.toLowerCase());

  const confettiConfig = {
    angle: 90,
    spread: 360,
    startVelocity: 40,
    elementCount: 150,
    dragFriction: 0.12,
    duration: 3000,
    stagger: 3,
    width: "10px",
    height: "10px",
    perspective: "500px",
    colors: ["#a864fd", "#29cdff", "#78ff44", "#ff718d", "#fdff6a"]
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto mt-8 px-4 relative z-10">
      
      {/* Confetti Explosion for winners */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2">
        <Confetti active={!isLoading && !!isWinner} config={confettiConfig} />
      </div>

      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-8 w-full text-center border-b-8 border-sky-100"
      >
        <h2 className="text-3xl font-nunito font-black text-slate-800 mb-2">
          {isLoading ? "Fetching Results..." : (isWinner ? "You Won! 🎉" : "Game Over")}
        </h2>
        
        {!isLoading && (
          <p className="text-slate-500 mb-8 font-medium">
            {isWinner 
              ? "Your payout has been transferred to your wallet!" 
              : "Better luck next time. The AI tricked you!"}
          </p>
        )}

        <div className="bg-sky-50 rounded-2xl p-6 mb-8 border-2 border-sky-100 relative overflow-hidden">
          {/* Decorative background element */}
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-yellow-300 rounded-full opacity-20" />
          
          <div className="text-sm font-bold text-sky-800 mb-1 uppercase tracking-wide">Total Pot</div>
          <div className="text-4xl font-black text-slate-700 mb-6 font-nunito">{potSize} BOT</div>
          
          <div className="text-sm font-bold text-sky-800 mb-2 uppercase tracking-wide">Winners</div>
          {isLoading ? (
            <div className="animate-pulse flex space-x-2 justify-center">
              <div className="h-4 w-24 bg-sky-200 rounded"></div>
            </div>
          ) : winners.length > 0 ? (
            <div className="space-y-2">
              {winners.map(w => (
                <div key={w} className="bg-white px-3 py-2 rounded-xl text-sm font-mono text-slate-600 shadow-sm border border-sky-50 truncate">
                  {w} <span className="text-green-500 font-sans font-bold float-right">+{payout}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-500 italic text-sm">The AI won the entire pot!</div>
          )}
        </div>

        <Button 
          className="w-full rounded-full h-14 text-lg shadow-lg"
          onClick={() => router.push("/")}
        >
          PLAY AGAIN
        </Button>
      </motion.div>
    </div>
  );
};
