import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  DATABASE_URL: z.string().url(),
  RPC_URL: z.string().url(),
  CONTRACT_ADDRESS: z.string(),
  ORACLE_PRIVATE_KEY: z.string(),
  AI_WALLET_PRIVATE_KEY: z.string(),
  REDIS_URL: z.string().url(),
  OPENAI_API_KEY: z.string().optional(),
  WAITING_ROOM_TIMEOUT_MS: z.string().default('900000').transform(Number), // 15 mins default
  CHAT_PHASE_MS: z.string().default('60000').transform(Number),
  COMMIT_PHASE_MS: z.string().default('30000').transform(Number),
  REVEAL_PHASE_MS: z.string().default('30000').transform(Number),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:', _env.error.format());
  throw new Error('Invalid environment variables');
}

export const env = _env.data;
