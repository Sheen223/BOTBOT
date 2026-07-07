import { Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';
import { toRoomDto } from '../dtos/RoomDto';

export const getRooms = async (req: Request, res: Response) => {
  try {
    const rooms = await prisma.room.findMany({
      where: { state: 'Waiting' },
      include: { players: true }
    });
    res.json({ success: true, data: rooms.map(toRoomDto) });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch rooms');
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const getRoomById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const room = await prisma.room.findUnique({
      where: { id: Number(id) },
      include: { players: true, messages: true }
    });
    
    if (!room) {
       res.status(404).json({ success: false, message: 'Room not found' });
       return;
    }
    
    res.json({ success: true, data: toRoomDto(room) });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch room');
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};
