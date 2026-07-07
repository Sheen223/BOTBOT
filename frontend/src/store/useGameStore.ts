import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3005';

export type Message = {
  id: string;
  roomId: number;
  senderAddress: string;
  content: string;
  timestamp: string;
};

interface GameState {
  socket: Socket | null;
  isConnected: boolean;
  messages: Message[];
  typingPlayers: Set<string>;
  connect: (walletAddress: string, roomId: number, nickname?: string) => void;
  disconnect: () => void;
  sendMessage: (roomId: number, content: string) => void;
  emitTyping: (roomId: number) => void;
  setInitialMessages: (messages: Message[]) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  socket: null,
  isConnected: false,
  messages: [],
  typingPlayers: new Set(),

  connect: (walletAddress: string, roomId: number, nickname?: string) => {
    if (get().socket) return; // Already connected

    console.log(`Connecting to WebSocket at ${WS_URL}/play with wallet ${walletAddress} for room ${roomId}`);
    const socket = io(`${WS_URL}/play`, {
      auth: { walletAddress, roomId, nickname },
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err);
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully');
      set({ isConnected: true });
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      set({ isConnected: false });
    });

    socket.on('chat_message', (msg: Message) => {
      set((state) => {
        if (state.messages.some(m => m.id === msg.id)) return state;
        return { messages: [...state.messages, msg] };
      });
    });

    socket.on('player_typing', ({ walletAddress }: { walletAddress: string }) => {
      set((state) => {
        const newSet = new Set(state.typingPlayers);
        newSet.add(walletAddress);
        return { typingPlayers: newSet };
      });
      // Clear typing after 3 seconds
      setTimeout(() => {
        set((state) => {
          const newSet = new Set(state.typingPlayers);
          newSet.delete(walletAddress);
          return { typingPlayers: newSet };
        });
      }, 3000);
    });

    set({ socket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false, messages: [], typingPlayers: new Set() });
    }
  },

  sendMessage: (roomId: number, content: string) => {
    const { socket } = get();
    if (socket && content.trim()) {
      socket.emit('send_message', { roomId, content });
    }
  },

  emitTyping: (roomId: number) => {
    const { socket } = get();
    if (socket) {
      socket.emit('typing', { roomId });
    }
  },

  setInitialMessages: (messages: Message[]) => {
    set({ messages });
  }
}));
