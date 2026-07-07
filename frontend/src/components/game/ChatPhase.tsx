"use client";

import React, { useEffect, useState, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const ChatPhase = ({ room }: { room: any }) => {
  const { address } = useAccount();
  const { messages, sendMessage, emitTyping, typingPlayers } = useGameStore();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Map wallet addresses to nicknames
  const playerDict = (room?.players || []).reduce((acc: any, p: any) => {
    acc[p.walletAddress.toLowerCase()] = p.nickname;
    return acc;
  }, {});

  // Timer logic
  const [timeLeft, setTimeLeft] = useState("");

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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !room?.id) return;
    sendMessage(room.id, input);
    setInput("");
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (room?.id) emitTyping(room.id);
  };

  const otherTypers = Array.from(typingPlayers).filter(p => p !== address);

  return (
    <div className="flex flex-col h-full w-full max-w-md mx-auto bg-sky-50 rounded-t-3xl shadow-2xl overflow-hidden mt-4">
      {/* Header */}
      <div className="bg-sky-400 p-4 shadow-md flex justify-between items-center z-10">
        <h2 className="text-white font-nunito font-bold text-xl drop-shadow-sm">Live Chat</h2>
        <div className="bg-white/20 px-4 py-1 rounded-full text-white font-bold tabular-nums">
          {timeLeft || "00:00"}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-sky-50 to-white">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMe = msg.senderAddress.toLowerCase() === address?.toLowerCase();
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                {!isMe && (
                  <span className="text-xs text-slate-400 ml-2 mb-1 font-semibold">
                    {playerDict[msg.senderAddress.toLowerCase()] || `${msg.senderAddress.slice(0, 6)}...${msg.senderAddress.slice(-4)}`}
                  </span>
                )}
                <div 
                  className={`px-4 py-2 rounded-2xl max-w-[80%] shadow-sm ${
                    isMe 
                    ? "bg-green-400 text-white rounded-br-sm" 
                    : "bg-white text-slate-700 rounded-bl-sm border border-sky-100"
                  }`}
                  style={{ wordBreak: 'break-word' }}
                >
                  {msg.content}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {otherTypers.length > 0 && (
          <div className="text-sm text-slate-400 italic ml-2">
            Someone is typing...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-sky-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
        <form onSubmit={handleSend} className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={handleTyping}
            placeholder="Say hi to the humans..."
            className="flex-1 rounded-full bg-slate-100 px-4 py-3 outline-none focus:ring-2 focus:ring-green-400 text-slate-700"
            maxLength={200}
          />
          <Button 
            type="submit" 
            disabled={!input.trim()}
            className="rounded-full w-12 h-12 p-0 flex items-center justify-center shadow-md shrink-0"
          >
            <Send size={18} />
          </Button>
        </form>
      </div>
    </div>
  );
};
