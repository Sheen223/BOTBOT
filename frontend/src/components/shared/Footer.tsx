import React from 'react';
import { Star, Link as LinkIcon } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full bg-slate-900 text-slate-300 rounded-t-3xl p-4 flex items-center justify-between text-xs font-sans mt-auto">
      <div className="flex items-center space-x-2">
        <Star size={14} className="text-white" />
        <span>Built by Sheen</span>
      </div>
      <div className="flex items-center space-x-2 hover:text-white cursor-pointer transition-colors">
        <LinkIcon size={14} className="text-white" />
        <span>BOT Blockchain</span>
      </div>
    </footer>
  );
}
