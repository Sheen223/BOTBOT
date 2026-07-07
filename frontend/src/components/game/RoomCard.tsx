import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface RoomCardProps {
  type: 'A' | 'B';
  stake: number;
  players: number;
  maxPlayers?: number;
  onJoin: () => void;
}

export function RoomCard({ type, stake, players, maxPlayers = 4, onJoin }: RoomCardProps) {
  const isVariantA = type === 'A';
  const bgColor = isVariantA ? 'bg-secondary' : 'bg-success';
  const shadowColor = isVariantA ? 'shadow-[0_6px_0_0_#7C3AED]' : 'shadow-[0_6px_0_0_#059669]'; // Using exact hex values for custom shadows to ensure they render on arbitrary divs if needed, though Tailwind might parse the variable.
  const robotEmoji = isVariantA ? '🤖' : '👾'; 

  return (
    <motion.div whileHover={{ y: -5, scale: 1.02 }} className="w-full max-w-[180px]">
      <Card className={`border-none ${bgColor} ${shadowColor} rounded-3xl overflow-hidden cursor-pointer active:translate-y-1 active:shadow-none transition-all`} onClick={onJoin}>
        <CardContent className="p-6 flex flex-col items-center justify-center space-y-3 text-white text-center">
          <div className="text-6xl drop-shadow-md">{robotEmoji}</div>
          <div>
            <div className="font-sans text-sm opacity-90 font-bold tracking-wider">{stake} BOT</div>
            <div className="font-bubbly text-4xl font-black mt-1">
              {players}/{maxPlayers}
            </div>
            <div className="font-sans text-xs font-bold uppercase tracking-widest mt-1 opacity-90">Players</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
