import React from 'react';

export function WoodenSign({ text }: { text: string }) {
  return (
    <div className="relative flex flex-col items-center mt-6">
      {/* Ropes */}
      <div className="absolute -top-4 w-full flex justify-between px-10 z-0">
        <div className="w-1.5 h-8 bg-slate-400 rounded-full shadow-sm" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #94a3b8, #94a3b8 2px, #64748b 2px, #64748b 4px)' }}></div>
        <div className="w-1.5 h-8 bg-slate-400 rounded-full shadow-sm" style={{ backgroundImage: 'repeating-linear-gradient(to bottom, #94a3b8, #94a3b8 2px, #64748b 2px, #64748b 4px)' }}></div>
      </div>
      {/* Sign */}
      <div className="relative z-10 bg-[#D49A6A] border-b-4 border-[#8B5A2B] rounded-xl px-12 py-3 shadow-card transform -rotate-1">
        <div className="font-bubbly text-xl font-black text-[#5C3A21] tracking-wide uppercase drop-shadow-sm">
          {text}
        </div>
        {/* Nails */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-[#5C3A21] opacity-70 shadow-inner"></div>
        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#5C3A21] opacity-70 shadow-inner"></div>
        <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-[#5C3A21] opacity-70 shadow-inner"></div>
        <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-[#5C3A21] opacity-70 shadow-inner"></div>
      </div>
    </div>
  );
}
