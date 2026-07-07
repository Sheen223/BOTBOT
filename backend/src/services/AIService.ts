import { ethers } from 'ethers';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import OpenAI from 'openai';
import { prisma } from '../prisma/client';
import { Namespace } from 'socket.io';

export class AIService {
  private wallet: ethers.Wallet;
  private openai: OpenAI | null = null;
  private playNs: Namespace | null = null;

  // Personas for random selection
  private personas = [
    "You are a confused crypto noob trying to figure out how to play this game.",
    "You are an overly aggressive troll who thinks everyone else is a bot.",
    "You are a overly friendly person who just wants to make friends.",
    "You are a paranoid conspiracy theorist who thinks the game is rigged.",
    "You are a robotic-sounding bot trying very hard to convince people you are human."
  ];

  constructor() {
    this.wallet = new ethers.Wallet(env.AI_WALLET_PRIVATE_KEY);
    logger.info(`AIService initialized with wallet: ${this.wallet.address}`);
    
    if (env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    } else {
      logger.warn('OPENAI_API_KEY is not set. AI will not chat.');
    }
  }

  public init(playNs: Namespace) {
    this.playNs = playNs;
  }

  public getWalletAddress(): string {
    return this.wallet.address;
  }

  public async handleNewMessage(roomId: number, senderAddress: string, content: string) {
    if (!this.openai || !this.playNs) return;
    
    // Ignore if sender is the AI itself
    if (senderAddress.toLowerCase() === this.wallet.address.toLowerCase()) return;

    // Check if AI is in this room
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.aiAddress?.toLowerCase() !== this.wallet.address.toLowerCase()) return;
    if (room.state !== 'Chatting') return;

    logger.info({ roomId, senderAddress }, 'AI received message, generating response...');
    
    try {
      // Fetch chat history for context
      const history = await prisma.message.findMany({
        where: { roomId },
        orderBy: { timestamp: 'asc' },
        take: 10
      });

      // Simple deterministic persona based on room ID
      const persona = this.personas[roomId % this.personas.length];

      const messages: any[] = [
        { role: 'system', content: `You are playing a game where you must convince the other players you are human. ${persona} Keep responses short, casual, like a chat room. Do not use punctuation if possible. Do not say you are an AI.` }
      ];

      for (const msg of history) {
        messages.push({
          role: msg.senderAddress.toLowerCase() === this.wallet.address.toLowerCase() ? 'assistant' : 'user',
          content: msg.content
        });
      }

      // Simulate typing delay
      setTimeout(() => {
        this.playNs?.to(`room_${roomId}`).emit('player_typing', { walletAddress: this.wallet.address });
      }, 1000);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages,
        max_tokens: 50,
      });

      const responseText = completion.choices[0].message.content || '...';
      
      // Delay response to seem human
      setTimeout(async () => {
        const aiMsg = await prisma.message.create({
          data: {
            roomId,
            senderAddress: this.wallet.address,
            content: responseText
          }
        });
        this.playNs?.to(`room_${roomId}`).emit('chat_message', aiMsg);
      }, 3000 + Math.random() * 2000);

    } catch (error) {
      logger.error({ error }, 'Failed to generate AI response');
    }
  }
}

export const aiService = new AIService();
