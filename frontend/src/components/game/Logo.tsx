import React from 'react';
import { motion } from 'framer-motion';

export function Logo() {
  const letters = [
    { char: 'B', color: 'text-blue-500' },
    { char: 'O', color: 'text-orange-500' },
    { char: 'T', color: 'text-purple-500' },
    { char: 'B', color: 'text-green-500' },
    { char: 'O', color: 'text-orange-400' },
    { char: 'T', color: 'text-yellow-400' },
  ];

  return (
    <div className="flex items-center justify-center space-x-1">
      {letters.map((l, i) => (
        <motion.span
          key={i}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, delay: i * 0.1 }}
          className={`font-bubbly text-5xl md:text-6xl font-black ${l.color} drop-shadow-[0_4px_0_rgba(0,0,0,0.2)] stroke-black stroke-2`}
          style={{ WebkitTextStroke: '2px black' }}
        >
          {l.char}
        </motion.span>
      ))}
    </div>
  );
}
