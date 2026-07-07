import { Server, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { prisma } from '../prisma/client';
import { aiService } from '../services/AIService';

export const setupPlayNamespace = (io: Server) => {
  const playNs = io.of('/play');
  aiService.init(playNs);

  playNs.on('connection', async (socket: Socket) => {
    logger.info({ socketId: socket.id }, 'New WebSocket connection to /play');
    
    const walletAddress = socket.handshake.auth.walletAddress; 
    const authRoomId = Number(socket.handshake.auth.roomId);
    const nickname = socket.handshake.auth.nickname;
    
    if (!walletAddress) {
      logger.warn('Socket connection rejected: No wallet address provided');
      return socket.disconnect();
    }

    try {
      const player = await prisma.player.upsert({
        where: { walletAddress },
        update: { nickname: nickname || undefined, roomId: authRoomId || undefined },
        create: {
          walletAddress,
          roomId: authRoomId,
          isAI: false,
          nickname: nickname || null,
        }
      });

      await prisma.playerSession.upsert({
        where: { socketId: socket.id },
        update: { disconnectedAt: null, walletAddress },
        create: {
          walletAddress,
          socketId: socket.id,
        }
      });

      const finalRoomId = authRoomId || player.roomId;
      if (finalRoomId && finalRoomId !== 0) {
        socket.join(`room_${finalRoomId}`);
        logger.info({ walletAddress, roomId: finalRoomId }, 'Player connected and joined room channel');
      } else {
        logger.warn({ walletAddress, authRoomId, playerRoomId: player.roomId }, 'Player connected but no valid roomId to join');
      }

    } catch (error: any) {
      logger.error({ error: error?.message || error, walletAddress, authRoomId }, 'Failed to authenticate player session');
      // Don't disconnect — let them stay connected even if upsert fails
    }

    socket.on('disconnect', async () => {
      logger.info({ socketId: socket.id }, 'WebSocket disconnected');
      await prisma.playerSession.update({
        where: { socketId: socket.id },
        data: { disconnectedAt: new Date() }
      }).catch(err => logger.error({ err }, 'Failed to update disconnectedAt'));
    });

    socket.on('send_message', async (data) => {
      const { roomId, content } = data;
      try {
        const message = await prisma.message.create({
          data: {
            roomId,
            senderAddress: walletAddress,
            content
          }
        });
        logger.info({ roomId, senderAddress: walletAddress }, 'Message saved and broadcasting');
        playNs.to(`room_${roomId}`).emit('chat_message', message);
        
        // Let AI know a human sent a message
        aiService.handleNewMessage(roomId, walletAddress, content);
      } catch (error: any) {
        logger.error({ error: error?.message || error, roomId, walletAddress }, 'Failed to save/send message');
        // Still try to broadcast even if DB save fails so chat doesn't appear frozen
        playNs.to(`room_${roomId}`).emit('chat_message', {
          id: `temp-${Date.now()}`,
          roomId,
          senderAddress: walletAddress,
          content,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('typing', (data) => {
      playNs.to(`room_${data.roomId}`).emit('player_typing', { walletAddress });
    });
  });

  return playNs;
};
