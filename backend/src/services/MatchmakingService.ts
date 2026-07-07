import { prisma } from '../prisma/client';
import { logger } from '../utils/logger';

export class MatchmakingService {
  /**
   * Find an available waiting room based on room type
   */
  public async findAvailableRoom(roomType: 'RoomA' | 'RoomB'): Promise<number | null> {
    const maxHumans = roomType === 'RoomA' ? 2 : 3;

    const room = await prisma.room.findFirst({
      where: {
        state: 'Waiting',
        type: roomType,
      },
      include: {
        players: {
          where: { isAI: false }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    if (room && room.players.length < maxHumans) {
      return room.id;
    }

    return null;
  }
}

export const matchmakingService = new MatchmakingService();
