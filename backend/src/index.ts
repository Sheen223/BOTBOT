import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { setupPlayNamespace } from './websockets/playNamespace';

import './services/BlockchainService';
import './services/OracleService';

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
  }
});

setupPlayNamespace(io);

const startServer = () => {
  try {
    const port = env.PORT;
    httpServer.listen(port, async () => {
      logger.info(`🚀 BOTBOT Server running in ${env.NODE_ENV} mode on port ${port}`);
      // Sync any active rooms that were running while the server was offline
      const { gameService } = await import('./services/GameService');
      await gameService.syncActiveRoomsOnBoot();

      // Start auto-spawning room maintenance
      gameService.startRoomMaintenance();
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
};

startServer();
