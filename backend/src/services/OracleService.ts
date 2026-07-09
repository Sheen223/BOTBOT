import { ethers } from 'ethers';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class OracleService {
  private wallet: ethers.Wallet;

  constructor() {
    const provider = env.RPC_URL.startsWith('ws')
      ? new ethers.WebSocketProvider(env.RPC_URL)
      : new ethers.JsonRpcProvider(env.RPC_URL);
    this.wallet = new ethers.Wallet(env.ORACLE_PRIVATE_KEY, provider);
    logger.info(`OracleService initialized with wallet: ${this.wallet.address}`);
  }

  public async generateSignature(roomId: number, aiAddress: string, salt: string): Promise<string> {
    logger.info({ roomId, aiAddress }, 'Generating Oracle signature');
    
    const domain = {
      name: "BotBot",
      version: "1",
      chainId: Number((await this.wallet.provider!.getNetwork()).chainId),
      verifyingContract: env.CONTRACT_ADDRESS as `0x${string}`
    };

    const types = {
      ResolveRoom: [
        { name: "roomId", type: "uint256" },
        { name: "aiAddress", type: "address" },
        { name: "salt", type: "bytes32" }
      ]
    };

    const value = { roomId, aiAddress, salt };

    // Sign the EIP-712 typed data
    const signature = await this.wallet.signTypedData(domain, types, value);
    
    logger.debug({ signature }, 'Oracle signature generated');
    return signature;
  }
}

export const oracleService = new OracleService();
