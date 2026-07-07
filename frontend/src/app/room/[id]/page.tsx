"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccount, useWatchContractEvent } from "wagmi";
import { botBotAbi } from "@/lib/abi/BotBot";
import { useGameStore } from "@/store/useGameStore";
import { ChatPhase } from "@/components/game/ChatPhase";
import { VotePhase } from "@/components/game/VotePhase";
import { RevealPhase } from "@/components/game/RevealPhase";
import { ResultsPhase } from "@/components/game/ResultsPhase";
import { WalletButton } from "@/components/shared/WalletButton";
import { Logo } from "@/components/game/Logo";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export default function RoomPage() {
  const params = useParams();
  const roomId = Number(params.id);
  const { address, isConnected: isWalletConnected } = useAccount();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { connect, disconnect, isConnected, setInitialMessages } = useGameStore();

  const { data: room, isLoading, isError } = useQuery({
    queryKey: ["room", roomId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/rooms/${roomId}`);
      if (!res.ok) throw new Error("Room not found");
      const json = await res.json();
      return json.data;
    },
    // We rely on socket + contract events, but keep a 3000ms polling fallback to prevent freezes
    // if the public RPC drops the events
    refetchInterval: 3000, 
  });

  // Handle Socket Connection
  useEffect(() => {
    if (isWalletConnected && address) {
      const nickname = localStorage.getItem("player_nickname") || undefined;
      connect(address, roomId, nickname);
    }
    return () => disconnect();
  }, [isWalletConnected, address, roomId, connect, disconnect]);

  // Set initial messages when room data loads
  useEffect(() => {
    if (room?.messages) {
      setInitialMessages(room.messages);
    }
  }, [room?.messages, setInitialMessages]);

  // Watch for state changes from the blockchain to instantly update the UI cache
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: botBotAbi,
    eventName: "RoomStateChanged",
    onLogs(logs) {
      for (const log of logs) {
        if (Number(log.args.roomId) === roomId) {
          // Instantly invalidate and refetch the room to get the new state and timers
          queryClient.invalidateQueries({ queryKey: ["room", roomId] });
        }
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-bounce font-nunito font-bold text-sky-500 text-2xl">Loading Room...</div>
      </div>
    );
  }

  if (isError || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold mb-4">Room Not Found</h1>
        <button onClick={() => router.push("/")} className="text-blue-500 underline">Return Home</button>
      </div>
    );
  }

  // Determine what phase to show
  const isChatting = room.state === "Chatting";
  const isVoting = room.state === "Voting";
  const isWaiting = room.state === "Waiting";
  const isRevealing = room.state === "Revealing";
  const isResolved = room.state === "Resolved";

  return (
    <main className="flex-1 relative flex flex-col items-center justify-between min-h-screen pt-4 pb-0 overflow-hidden bg-sky-200">
      {/* Background Decor */}
      <div className="absolute top-10 left-10 w-32 h-12 bg-white rounded-full opacity-60 blur-sm -z-10" />
      <div className="absolute top-24 right-20 w-48 h-16 bg-white rounded-full opacity-60 blur-sm -z-10" />

      {/* Header */}
      <div className="w-full max-w-md px-4 flex justify-between items-center z-10">
        <Logo />
        <WalletButton />
      </div>

      {!isConnected && isChatting && (
        <div className="bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full font-bold text-sm mt-2 z-10 shadow-sm animate-pulse">
          Reconnecting to Live Chat...
        </div>
      )}

      {/* Phase Render */}
      <div className="flex-1 w-full flex flex-col relative z-10 mt-4">
        {isWaiting && (
          <div className="m-auto bg-white p-6 rounded-3xl shadow-xl text-center border-b-8 border-sky-100 max-w-sm">
            <h2 className="text-2xl font-nunito font-black mb-2">Waiting for Players</h2>
            <p className="text-slate-500 mb-4">Once the room is full, the AI will join and the game will begin.</p>
            <div className="bg-slate-100 rounded-full py-2 font-bold text-slate-700">
              {room.players.length} / {room.type === 'RoomA' ? 2 : 3} Joined
            </div>
          </div>
        )}

        {isChatting && <ChatPhase room={room} />}
        {isVoting && <VotePhase room={room} />}
        {isRevealing && <RevealPhase room={room} />}
        {isResolved && <ResultsPhase room={room} />}
      </div>
    </main>
  );
}
