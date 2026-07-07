"use client";

import React, { useState } from "react";
import { WalletButton } from "@/components/shared/WalletButton";
import { Logo } from "@/components/game/Logo";
import { WoodenSign } from "@/components/game/WoodenSign";
import { RoomCard } from "@/components/game/RoomCard";
import { Footer } from "@/components/shared/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { botBotAbi } from "@/lib/abi/BotBot";
import { parseEther } from "viem";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// Environment variables
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Types
type Room = { id: number; type: string; state: string; stakeAmount: string; players: any[] };

export default function LandingPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  // 1. Fetch Rooms from Backend
  const { data: rooms = [], isLoading: isRoomsLoading } = useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/rooms`);
      if (!res.ok) throw new Error("Failed to fetch rooms");
      const json = await res.json();
      return json.data || [];
    },
    refetchInterval: 5000,
  });

  // 2. Contract Writers
  const { writeContractAsync: writeContract, isPending: isWritePending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [targetRoomId, setTargetRoomId] = useState<number | null>(null);
  const { isLoading: isConfirming, isSuccess: isConfirmed, isError: isConfirmError, error: confirmError, data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  // UI Locks to prevent double clicking
  const [isLocked, setIsLocked] = useState(false);
  const [loadingText, setLoadingText] = useState("");

  const activeA = rooms.find(r => r.type === "RoomA" && r.state === "Waiting");
  const activeB = rooms.find(r => r.type === "RoomB" && r.state === "Waiting");

  const [nicknameModalOpen, setNicknameModalOpen] = useState(false);
  const [pendingJoin, setPendingJoin] = useState<{type: 'A' | 'B', id?: number} | null>(null);
  const [nickname, setNickname] = useState("");

  const initiateJoin = (roomType: 'A' | 'B', existingRoomId?: number) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    if (existingRoomId === undefined) {
      toast.error("No active rooms available right now. Please wait for the auto-spawner!");
      return;
    }

    // Try to load previous nickname if available
    const savedNick = localStorage.getItem("player_nickname");
    if (savedNick && !nickname) setNickname(savedNick);
    
    setPendingJoin({ type: roomType, id: existingRoomId });
    setNicknameModalOpen(true);
  };

  const handleJoinConfirm = () => {
    if (!pendingJoin || !nickname.trim()) return;
    localStorage.setItem("player_nickname", nickname.trim());
    setNicknameModalOpen(false);
    handleJoin(pendingJoin.type, pendingJoin.id);
  };

  const handleJoin = async (roomType: 'A' | 'B', existingRoomId?: number) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }
    
    if (existingRoomId === undefined) {
      toast.error("No active rooms available right now. Please wait for the auto-spawner!");
      return;
    }

    if (isLocked) return;
    setIsLocked(true);

    try {
      const stakeAmount = parseEther(roomType === 'A' ? "0.5" : "1.0");
      setLoadingText("Joining Room...");
      
      setTargetRoomId(existingRoomId);

      // Join existing room with Native BOT stake
      const joinHash = await writeContract({
        address: CONTRACT_ADDRESS,
        abi: botBotAbi,
        functionName: "joinRoom",
        args: [BigInt(existingRoomId)],
        value: stakeAmount,
      });

      setTxHash(joinHash);
      toast.loading("Confirming transaction...", { id: "join" });

    } catch (error: any) {
      console.error(error);
      toast.error(error.shortMessage || "Transaction failed");
      toast.dismiss("join");
    } finally {
      setTimeout(() => setIsLocked(false), 500);
      setLoadingText("");
    }
  };

  // Watch for successful transaction confirmation to redirect
  React.useEffect(() => {
    if (isConfirmed && receipt && targetRoomId !== null) {
      toast.dismiss("join");
      if (receipt.status === 'success') {
        toast.success("Successfully joined the room!");
        router.push(`/room/${targetRoomId}`);
      } else {
        toast.error("Transaction reverted!");
      }
    }
    if (isConfirmError && confirmError) {
      toast.dismiss("join");
      toast.error(confirmError.message || "Transaction failed to confirm");
    }
  }, [isConfirmed, receipt, targetRoomId, router, isConfirmError, confirmError]);

  const isBusy = isLocked || isWritePending || isConfirming;

  return (
    <main className="flex-1 relative flex flex-col items-center justify-between min-h-screen pt-4 pb-0 overflow-hidden">
      {/* Background Environment (Sky & Grass) */}
      <div className="absolute inset-0 -z-20 bg-sky-200 pointer-events-none" />
      {/* Clouds */}
      <div className="absolute top-10 left-10 w-32 h-12 bg-white rounded-full opacity-60 blur-sm -z-10" />
      <div className="absolute top-24 right-20 w-48 h-16 bg-white rounded-full opacity-60 blur-sm -z-10" />
      
      {/* Grassy Hills */}
      <div className="absolute bottom-0 left-0 w-[150%] h-[45%] bg-[#7DD3FC] rounded-t-[100%] -ml-[25%] -z-10 translate-y-10 border-t-8 border-sky-300 shadow-inner" style={{backgroundColor: '#86efac', borderColor: '#4ade80'}} />
      <div className="absolute bottom-0 right-0 w-[120%] h-[35%] bg-[#4ade80] rounded-t-[100%] -mr-[10%] -z-10 translate-y-5 border-t-8 border-[#22c55e]" />
      
      {/* Dirt Path */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-1/3 bg-[#D49A6A] rounded-t-full blur-[2px] opacity-80 -z-10 transform scale-y-150" />

      {/* Top Header Row */}
      <div className="w-full max-w-md px-4 flex justify-end z-10">
        <WalletButton />
      </div>

      {/* Hero Section */}
      <div className="flex flex-col items-center mt-8 z-10">
        <Logo />
        <WoodenSign text="FIND THE AI" />
      </div>

      {/* Action Section */}
      <div className="flex flex-col items-center mt-auto mb-10 w-full max-w-md px-6 space-y-8 z-10">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: "spring" }}
          className="w-full px-4"
        >
          <Button 
            className="w-full h-16 rounded-full text-xl shadow-xl bg-gradient-to-r from-amber-600 to-orange-600 border-2 border-orange-300 text-white font-black hover:brightness-110"
            onClick={() => initiateJoin('A', activeA?.id)}
            disabled={isBusy}
          >
            {isBusy ? loadingText || "Processing..." : "QUICK JOIN"}
          </Button>
        </motion.div>

        <div className="flex w-full items-center justify-between gap-4">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring" }}
            className="flex-1"
          >
            <RoomCard
              type="A"
              stake={0.5}
              players={activeA ? activeA.players?.length || 0 : 0}
              maxPlayers={2}
              onJoin={() => handleJoin('A', activeA?.id)}
            />
          </motion.div>
          <motion.div
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
            className="flex-1"
          >
            <RoomCard
              type="B"
              stake={1}
              players={activeB ? activeB.players?.length || 0 : 0}
              maxPlayers={3}
              onJoin={() => handleJoin('B', activeB?.id)}
            />
          </motion.div>
        </div>
      </div>

      {/* Nickname Modal */}
      {nicknameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#2A1B14] border-4 border-[#8B5A2B] rounded-xl p-6 w-full max-w-sm flex flex-col items-center gap-4 text-center shadow-2xl"
          >
            <h2 className="text-xl font-bold text-[#E6C280] font-mono">CHOOSE YOUR NICKNAME</h2>
            <p className="text-sm text-[#D4A373]">Other players will see this instead of your wallet address.</p>
            <input 
              type="text" 
              maxLength={15}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full bg-[#1A110D] border-2 border-[#5C3A21] rounded-md p-3 text-[#E6C280] font-mono text-center outline-none focus:border-[#C48B52]"
              placeholder="e.g. Satoshi"
            />
            <div className="flex w-full gap-3 mt-2">
              <Button 
                variant="secondary" 
                className="flex-1 border-2 border-[#8B5A2B] text-black hover:bg-[#8B5A2B]/20"
                onClick={() => setNicknameModalOpen(false)}
              >
                CANCEL
              </Button>
              <Button 
                className="flex-1 bg-gradient-to-b from-[#4ade80] to-[#22c55e] text-black border-2 border-[#166534] hover:brightness-110 font-bold"
                onClick={handleJoinConfirm}
                disabled={!nickname.trim()}
              >
                CONFIRM
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Footer */}
      <div className="w-full max-w-md mt-auto z-10 px-4 mb-4">
        <Footer />
      </div>
    </main>
  );
}
