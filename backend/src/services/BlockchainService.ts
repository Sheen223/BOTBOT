import { ethers } from 'ethers';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import BotBotArtifact from '../config/BotBot.json';
import { gameService } from './GameService';

export class BlockchainService {
  private provider: ethers.WebSocketProvider | ethers.JsonRpcProvider;
  private adminWallet: ethers.Signer;
  private contract: ethers.Contract;

  constructor() {
    if (env.RPC_URL.startsWith('ws')) {
      this.provider = new ethers.WebSocketProvider(env.RPC_URL);
    } else {
      const provider = new ethers.JsonRpcProvider(env.RPC_URL);
      provider.pollingInterval = 10000;
      this.provider = provider;
    }

    // Using ORACLE_PRIVATE_KEY as the default admin key for injections unless separated later
    const baseWallet = new ethers.Wallet(env.ORACLE_PRIVATE_KEY, this.provider);
    this.adminWallet = new ethers.NonceManager(baseWallet);
    
    this.contract = new ethers.Contract(
      env.CONTRACT_ADDRESS,
      BotBotArtifact.abi,
      this.adminWallet
    );

    this.setupEventListeners();
  }

  private lastProcessedBlock: number = 0;

  private async setupEventListeners() {
    try {
      // Get the current block to start polling from
      this.lastProcessedBlock = await this.provider.getBlockNumber();
      logger.info({ startBlock: this.lastProcessedBlock }, 'Starting block-based event polling');
    } catch (err) {
      logger.error({ err }, 'Failed to get initial block number, starting from 0');
      this.lastProcessedBlock = 0;
    }

    if (this.provider instanceof ethers.WebSocketProvider) {
      // WebSocket: use native event subscriptions (they work reliably)
      this.contract.on('RoomCreated', async (roomId: bigint, roomType: bigint, stakeAmount: bigint) => {
        try {
          logger.info({ roomId: roomId.toString() }, 'Event: RoomCreated');
          const typeStr = Number(roomType) === 0 ? 'RoomA' : 'RoomB';
          await gameService.handleRoomCreated(Number(roomId), typeStr, stakeAmount.toString());
        } catch (err) {
          logger.error({ err, roomId: roomId.toString() }, 'Error handling RoomCreated');
        }
      });

      this.contract.on('PlayerJoined', async (roomId: bigint, player: string) => {
        try {
          await new Promise(resolve => setTimeout(resolve, 500));
          logger.info({ roomId: roomId.toString(), player }, 'Event: PlayerJoined');
          await gameService.handlePlayerJoined(Number(roomId), player);
        } catch (err) {
          logger.error({ err, roomId: roomId.toString(), player }, 'Error handling PlayerJoined');
        }
      });

      this.contract.on('RoomStateChanged', async (roomId: bigint, newState: number) => {
        try {
          logger.info({ roomId: roomId.toString(), newState }, 'Event: RoomStateChanged');
          await gameService.handleStateChange(Number(roomId), newState);
        } catch (err) {
          logger.error({ err, roomId: roomId.toString() }, 'Error handling RoomStateChanged');
        }
      });

      (this.provider.websocket as any).on('close', () => {
        logger.error('WebSocket connection closed! Attempting to reconnect...');
        setTimeout(() => this.reconnect(), 5000);
      });
    } else {
      // HTTP provider: use block polling instead of filters to avoid 'filter not found' errors
      this.provider.on('block', async (blockNumber: number) => {
        await this.pollEvents(blockNumber);
      });
    }
  }

  private async pollEvents(toBlock: number) {
    if (toBlock <= this.lastProcessedBlock) return;
    const fromBlock = this.lastProcessedBlock + 1;
    this.lastProcessedBlock = toBlock;

    try {
      const roomCreatedFilter = this.contract.filters.RoomCreated();
      const playerJoinedFilter = this.contract.filters.PlayerJoined();
      const stateChangedFilter = this.contract.filters.RoomStateChanged();

      const [roomCreatedEvents, playerJoinedEvents, stateChangedEvents] = await Promise.all([
        this.contract.queryFilter(roomCreatedFilter, fromBlock, toBlock),
        this.contract.queryFilter(playerJoinedFilter, fromBlock, toBlock),
        this.contract.queryFilter(stateChangedFilter, fromBlock, toBlock),
      ]);

      for (const event of roomCreatedEvents) {
        const e = event as ethers.EventLog;
        const [roomId, roomType, stakeAmount] = e.args;
        logger.info({ roomId: roomId.toString() }, 'Polled Event: RoomCreated');
        const typeStr = Number(roomType) === 0 ? 'RoomA' : 'RoomB';
        await gameService.handleRoomCreated(Number(roomId), typeStr, stakeAmount.toString());
      }

      for (const event of playerJoinedEvents) {
        const e = event as ethers.EventLog;
        const [roomId, player] = e.args;
        logger.info({ roomId: roomId.toString(), player }, 'Polled Event: PlayerJoined');
        await gameService.handlePlayerJoined(Number(roomId), player);
      }

      for (const event of stateChangedEvents) {
        const e = event as ethers.EventLog;
        const [roomId, newState] = e.args;
        logger.info({ roomId: roomId.toString(), newState }, 'Polled Event: RoomStateChanged');
        await gameService.handleStateChange(Number(roomId), Number(newState));
      }
    } catch (err) {
      logger.error({ err, fromBlock, toBlock }, 'Error polling events');
    }
  }

  private reconnect() {
    try {
      if (env.RPC_URL.startsWith('ws')) {
        this.provider = new ethers.WebSocketProvider(env.RPC_URL);
      } else {
        const provider = new ethers.JsonRpcProvider(env.RPC_URL);
        provider.pollingInterval = 10000;
        this.provider = provider;
      }
      const baseWallet = new ethers.Wallet(env.ORACLE_PRIVATE_KEY, this.provider);
      this.adminWallet = new ethers.NonceManager(baseWallet);
      this.contract = new ethers.Contract(env.CONTRACT_ADDRESS, BotBotArtifact.abi, this.adminWallet);
      this.setupEventListeners();
      logger.info('Successfully reconnected to blockchain provider');
    } catch (err) {
      logger.error('Reconnection failed, retrying in 5s...');
      setTimeout(() => this.reconnect(), 5000);
    }
  }

  public async createRoom(
    roomType: 0 | 1,
    stakeAmount: bigint,
    chatDuration: number,
    voteDuration: number,
    revealDuration: number
  ): Promise<void> {
    logger.info({ roomType }, 'Calling createRoom on smart contract');
    try {
      const tx = await this.contract.createRoom(roomType, stakeAmount, chatDuration, voteDuration, revealDuration);
      await tx.wait();
      logger.info({ txHash: tx.hash }, 'createRoom transaction confirmed');
    } catch (error) {
      logger.error({ error }, 'Failed to createRoom');
      throw error;
    }
  }

  public async startGame(roomId: number, aiCommitment: string): Promise<void> {
    logger.info({ roomId, aiCommitment }, 'Calling startGame on smart contract');
    try {
      const tx = await this.contract.startGame(roomId, aiCommitment);
      await tx.wait();
      logger.info({ txHash: tx.hash }, 'startGame transaction confirmed');
    } catch (error) {
      logger.error({ error }, 'Failed to startGame');
      throw error;
    }
  }

  public async startVoting(roomId: number): Promise<void> {
    logger.info({ roomId }, 'Calling startVoting on smart contract');
    try {
      const tx = await this.contract.startVoting(roomId);
      await tx.wait();
      logger.info({ txHash: tx.hash }, 'startVoting transaction confirmed');
    } catch (error) {
      logger.error({ error }, 'Failed to startVoting');
      throw error;
    }
  }

  public async startRevealing(roomId: number): Promise<void> {
    logger.info({ roomId }, 'Calling startRevealing on smart contract');
    try {
      const tx = await this.contract.startRevealing(roomId);
      await tx.wait();
      logger.info({ txHash: tx.hash }, 'startRevealing transaction confirmed');
    } catch (error) {
      logger.error({ error }, 'Failed to startRevealing');
      throw error;
    }
  }

  public async resolveRoom(roomId: number, aiAddress: string, salt: string, oracleSignature: string): Promise<void> {
    logger.info({ roomId }, 'Calling resolveRoom on smart contract');
    try {
      const tx = await this.contract.resolveRoom(roomId, aiAddress, salt, oracleSignature);
      await tx.wait();
      logger.info({ txHash: tx.hash }, 'resolveRoom transaction confirmed');
    } catch (error) {
      logger.error({ error }, 'Failed to resolveRoom');
      throw error;
    }
  }

  public async cancelRoom(roomId: number): Promise<void> {
    logger.info({ roomId }, 'Calling cancelRoom on smart contract');
    try {
      const tx = await this.contract.cancelRoom(roomId);
      await tx.wait();
      logger.info({ txHash: tx.hash }, 'cancelRoom transaction confirmed');
    } catch (error) {
      logger.error({ error }, 'Failed to cancelRoom');
      throw error;
    }
  }

  public getContract(): ethers.Contract {
    return this.contract;
  }
}

export const blockchainService = new BlockchainService();
