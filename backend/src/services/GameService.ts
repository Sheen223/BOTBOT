import { logger } from '../utils/logger';
import { blockchainService } from './BlockchainService';
import { oracleService } from './OracleService';
import { aiService } from './AIService';
import { prisma } from '../prisma/client';
import { env } from '../config/env';
import { ethers } from 'ethers';
import type { Room } from '@prisma/client';

export class GameService {

  private maintainPoolTimer: NodeJS.Timeout | null = null;
  private roomTimers: Map<number, NodeJS.Timeout> = new Map();

  private scheduleTimer(roomId: number, delayMs: number, action: () => Promise<void>, logMsg: string) {
    if (this.roomTimers.has(roomId)) {
      clearTimeout(this.roomTimers.get(roomId)!);
    }
    logger.info({ roomId, delayMs }, logMsg);
    const timer = setTimeout(() => {
      this.roomTimers.delete(roomId);
      action().catch(err => logger.error({ err, roomId }, 'Timer execution failed'));
    }, delayMs);
    this.roomTimers.set(roomId, timer);
  }

  public clearRoomTimer(roomId: number) {
    if (this.roomTimers.has(roomId)) {
      clearTimeout(this.roomTimers.get(roomId)!);
      this.roomTimers.delete(roomId);
      logger.info({ roomId }, 'Cleared active timer for room');
    }
  }

  public startRoomMaintenance() {
    if (this.maintainPoolTimer) return;
    logger.info('Starting auto-spawning room maintenance pool');
    // Run immediately, then every 10 seconds
    this.maintainRoomPool();
    this.maintainPoolTimer = setInterval(() => this.maintainRoomPool(), 10000);
  }

  private async maintainRoomPool() {
    try {
      const activeRooms = await prisma.room.findMany({
        where: { state: 'Waiting' }
      });
      
      const roomACount = activeRooms.filter((r: Room) => r.type === 'RoomA').length;
      const roomBCount = activeRooms.filter((r: Room) => r.type === 'RoomB').length;

      // Ensure 3 of each type
      const neededA = Math.max(0, 3 - roomACount);
      const neededB = Math.max(0, 3 - roomBCount);

      if (neededA > 0 || neededB > 0) {
        logger.info({ neededA, neededB }, 'Auto-spawning new rooms to maintain pool');
      }

      for (let i = 0; i < neededA; i++) {
        // RoomA: type 0, 0.5 BOT stake
        await blockchainService.createRoom(0, 500000000000000000n, 120, 30, 30);
      }
      for (let i = 0; i < neededB; i++) {
        // RoomB: type 1, 1 BOT stake
        await blockchainService.createRoom(1, 1000000000000000000n, 120, 30, 30);
      }
    } catch (error) {
      logger.error({ error }, 'Failed to maintain room pool');
    }
  }

  public async syncActiveRoomsOnBoot() {
    logger.info('Starting robust startup recovery for active rooms...');
    try {
      // Find all active rooms
      const activeRooms = await prisma.room.findMany({
        where: {
          state: {
            in: ['Waiting', 'Chatting', 'Voting', 'Revealing']
          }
        }
      });
      
      const contract = blockchainService.getContract();

      for (const room of activeRooms) {
        // Query blockchain to ensure we are completely synced
        const blockchainRoom = await contract.rooms(room.id);
        const stateMapping = ['Waiting', 'Chatting', 'Voting', 'Revealing', 'Resolved', 'Cancelled'];
        const actualState = stateMapping[Number(blockchainRoom.state)];
        const phaseEndTimeMs = Number(blockchainRoom.phaseEndTime) * 1000;
        
        logger.info({ roomId: room.id, dbState: room.state, actualState, phaseEndTimeMs }, 'Syncing active room');
        
        // If the state somehow drifted, fix the DB first
        if (room.state !== actualState) {
          await prisma.room.update({ where: { id: room.id }, data: { state: actualState } });
        }

        if (actualState === 'Waiting') {
          const WAITING_ROOM_TIMEOUT_MS = 10000;
          const createdAtMs = new Date(room.createdAt).getTime();
          const elapsed = Date.now() - createdAtMs;
          if (elapsed >= WAITING_ROOM_TIMEOUT_MS) {
            logger.info({ roomId: room.id }, 'Waiting phase timer has expired while offline. Force advancing state...');
            await this.handleWaitingTimeout(room.id);
          } else {
            const remainingDelay = WAITING_ROOM_TIMEOUT_MS - elapsed;
            this.scheduleTimer(room.id, remainingDelay, () => this.handleWaitingTimeout(room.id), 'Phase timer is still active. Re-adding setTimeout job for Waiting.');
          }
          continue;
        }

        const now = Date.now();
        if (now >= phaseEndTimeMs) {
          // Phase time has expired! We must forcefully advance the state immediately.
          logger.info({ roomId: room.id, actualState }, 'Phase timer has expired while offline. Force advancing state...');
          if (actualState === 'Chatting') {
            await this.handleChatEnd(room.id);
          } else if (actualState === 'Voting') {
            await this.handleVotingEnd(room.id);
          } else if (actualState === 'Revealing') {
            const currentRoom = await prisma.room.findUnique({ where: { id: room.id } });
            const aiAddress = currentRoom?.aiAddress || '0x0000000000000000000000000000000000000000';
            await this.handleRevealEnd(room.id, aiAddress);
          }
        } else {
          // Time is still running. Re-create the setTimeout job with the EXACT remaining delay.
          const remainingDelay = phaseEndTimeMs - now;
          
          if (actualState === 'Chatting') {
            this.scheduleTimer(room.id, remainingDelay, () => this.handleChatEnd(room.id), 'Phase timer is still active. Re-adding setTimeout job for Chatting.');
          } else if (actualState === 'Voting') {
            this.scheduleTimer(room.id, remainingDelay, () => this.handleVotingEnd(room.id), 'Phase timer is still active. Re-adding setTimeout job for Voting.');
          } else if (actualState === 'Revealing') {
            const currentRoom = await prisma.room.findUnique({ where: { id: room.id } });
            const aiAddress = currentRoom?.aiAddress || '0x0000000000000000000000000000000000000000';
            this.scheduleTimer(room.id, remainingDelay, () => this.handleRevealEnd(room.id, aiAddress), 'Phase timer is still active. Re-adding setTimeout job for Revealing.');
          }
        }
      }
      logger.info('Startup recovery complete.');
    } catch (error) {
      logger.error({ error }, 'Failed to sync active rooms on boot');
    }
  }

  public async handleRoomCreated(roomId: number, roomType: string, stakeAmount: string) {
    logger.info({ roomId, roomType, stakeAmount }, 'Syncing RoomCreated to DB');
    await prisma.room.upsert({
      where: { id: roomId },
      update: {},
      create: {
        id: roomId,
        type: roomType,
        state: 'Waiting',
        stakeAmount
      }
    });
  }

  public async handlePlayerJoined(roomId: number, playerAddress: string) {
    logger.info({ roomId, playerAddress }, 'Syncing PlayerJoined to DB');
    
    // Retry logic to handle race conditions where RoomCreated hasn't finished writing to DB yet
    let retries = 5;
    while (retries > 0) {
      try {
        await prisma.player.upsert({
          where: { walletAddress: playerAddress },
          update: { roomId },
          create: {
            walletAddress: playerAddress,
            roomId,
            isAI: false
          }
        });
        break; // Success
      } catch (err: any) {
        if (err.code === 'P2003') {
          retries--;
          if (retries === 0) throw err;
          await new Promise(resolve => setTimeout(resolve, 500)); // wait 500ms and retry
        } else {
          throw err;
        }
      }
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { players: true }
    });
    if (!room) return;

    const maxHumans = room.type === 'RoomA' ? 2 : 3;
    const humanCount = room.players.filter(p => !p.isAI).length;

    if (humanCount === maxHumans - 1 && room.state === 'Waiting' && !room.aiAddress) {
      logger.info({ roomId }, 'Room needs 1 more player. Starting waiting timer...');
      this.scheduleTimer(roomId, 10000, () => this.handleWaitingTimeout(roomId), 'Scheduling waiting timeout.');
    }

    if (humanCount >= maxHumans && room.state === 'Waiting' && !room.aiAddress) {
      logger.info({ roomId }, 'Room is full with humans, starting game with NO AI...');
      try {
        this.clearRoomTimer(roomId);
        
        const salt = ethers.hexlify(ethers.randomBytes(32));
        const emptyAddress = '0x0000000000000000000000000000000000000000';
        const aiCommitment = ethers.solidityPackedKeccak256(['address', 'bytes32'], [emptyAddress, salt]);
        
        await prisma.room.update({ 
          where: { id: roomId }, 
          data: { aiSalt: salt, aiAddress: emptyAddress } 
        });
        await blockchainService.startGame(roomId, aiCommitment);
      } catch (err: any) {
        logger.warn({ roomId, err: err.message }, 'Failed to startGame (likely a race condition, safely ignored)');
      }
    }
  }



  public async handleStateChange(roomId: number, newState: number) {
    const states = ['Waiting', 'Chatting', 'Voting', 'Revealing', 'Resolved', 'Cancelled'];
    const stateStr = states[newState];
    const contractRoom = await blockchainService.getContract().rooms(roomId);
    const phaseEndTimeMs = Number(contractRoom.phaseEndTime) * 1000;
    const delay = Math.max(0, phaseEndTimeMs - Date.now());

    logger.info({ roomId, phaseEndTimeMs, delay, stateStr }, `Syncing RoomStateChanged to DB and checking timers`);

    await prisma.room.update({
      where: { id: roomId },
      data: { 
        state: stateStr,
        phaseEndTime: contractRoom.phaseEndTime
      }
    });
    if (stateStr === 'Chatting') {
      this.scheduleTimer(roomId, delay, () => this.handleChatEnd(roomId), 'Scheduling Chatting timer');
    } else if (stateStr === 'Voting') {
      this.scheduleTimer(roomId, delay, () => this.handleVotingEnd(roomId), 'Scheduling Voting timer');
    } else if (stateStr === 'Revealing') {
      const room = await prisma.room.findUnique({ where: { id: roomId } });
      const aiAddress = room?.aiAddress || '0x0000000000000000000000000000000000000000';
      this.scheduleTimer(roomId, delay, () => this.handleRevealEnd(roomId, aiAddress), 'Scheduling Revealing timer');
    } else if (stateStr === 'Resolved' || stateStr === 'Cancelled') {
      this.clearRoomTimer(roomId);
    }
  }

  public async handleChatEnd(roomId: number) {
    logger.info({ roomId }, 'Chat phase timer popped, calling startVoting');
    await blockchainService.startVoting(roomId);
  }

  public async handleVotingEnd(roomId: number) {
    logger.info({ roomId }, 'Voting phase timer popped, calling startRevealing');
    await blockchainService.startRevealing(roomId);
  }

  public async handleRevealEnd(roomId: number, aiAddress: string) {
    logger.info({ roomId }, 'Reveal phase timer popped, resolving room with Oracle signature');
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    const salt = room?.aiSalt || ethers.ZeroHash;
    const signature = await oracleService.generateSignature(roomId, aiAddress, salt);
    await blockchainService.resolveRoom(roomId, aiAddress, salt, signature);
  }

  public async handleWaitingTimeout(roomId: number) {
    const room = await prisma.room.findUnique({ where: { id: roomId }, include: { players: true } });
    if (room && room.state === 'Waiting') {
      const maxHumans = room.type === 'RoomA' ? 2 : 3;
      const humanCount = room.players.filter(p => !p.isAI).length;
      
      if (humanCount === maxHumans - 1) {
        logger.info({ roomId }, 'Room waiting timer expired, spawning AI to fill last slot...');
        try {
          const aiWalletAddress = aiService.getWalletAddress(); 
          const salt = ethers.hexlify(ethers.randomBytes(32));
          const aiCommitment = ethers.solidityPackedKeccak256(['address', 'bytes32'], [aiWalletAddress, salt]);
          
          await prisma.room.update({ 
            where: { id: roomId }, 
            data: { aiSalt: salt, aiAddress: aiWalletAddress } 
          });

          await prisma.player.upsert({
            where: { walletAddress: aiWalletAddress },
            update: { roomId, isAI: true },
            create: {
              walletAddress: aiWalletAddress,
              roomId,
              isAI: true
            }
          });

          await blockchainService.startGame(roomId, aiCommitment);
        } catch (err: any) {
          logger.warn({ roomId, err: err.message }, 'Failed to startGame with AI');
        }
      } else {
        logger.info({ roomId }, 'Room timed out but does not have enough players to spawn AI, cancelling room');
        await blockchainService.cancelRoom(roomId);
      }
    }
  }
}

export const gameService = new GameService();
