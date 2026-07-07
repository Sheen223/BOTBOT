import { ethers } from 'ethers';
import { env } from '../src/config/env';
import BotBotArtifact from '../src/config/BotBot.json';
import { logger } from '../src/utils/logger';

// Hardhat standard test accounts
const deployerKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const player1Key = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const player2Key = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";
const player3Key = "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  logger.info('Starting E2E Integration Tests...');

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const owner = new ethers.Wallet(deployerKey, provider);
  const player1 = new ethers.Wallet(player1Key, provider);
  const player2 = new ethers.Wallet(player2Key, provider);

  const contract = new ethers.Contract(env.CONTRACT_ADDRESS, BotBotArtifact.abi, owner) as any;

  logger.info('--- TEST SCENARIO 1: Happy Path (Room A) ---');
  
  logger.info('Wiping database for clean E2E run...');
  const { prisma } = require('../src/prisma/client');
  await prisma.player.deleteMany({});
  await prisma.room.deleteMany({});
  await prisma.$disconnect();

  // Reset Hardhat block timestamp to current real-world time to avoid drift delays in the backend
  logger.info('Syncing Hardhat time with real-world time...');
  try {
    const currentRealWorldTime = Math.floor(Date.now() / 1000);
    await provider.send("evm_setNextBlockTimestamp", [currentRealWorldTime]);
    await provider.send("evm_mine", []);
  } catch (err: any) {
    logger.warn(`Could not sync time (likely already ahead): ${err.message}`);
  }

  // 1. Create Room
  logger.info('Creating Room...');
  let tx = await contract.createRoom(
    0, // RoomA
    ethers.parseEther("10"), // 10 BOT
    5, // 5s chat
    3, // 3s vote
    3  // 3s reveal
  );
  let receipt = await tx.wait();
  
  // Extract roomId from RoomCreated event
  const event = receipt.logs.map((log: any) => contract.interface.parseLog(log)).find((e: any) => e && e.name === 'RoomCreated');
  const roomId = Number(event.args[0]);
  logger.info(`✅ Room Created (ID: ${roomId}). TX: ${tx.hash}`);

  // 2. Player 1 Joins
  logger.info('Player 1 joining...');
  tx = await contract.connect(player1).joinRoom(roomId);
  await tx.wait();
  logger.info(`✅ Player 1 Joined. TX: ${tx.hash}`);

  await sleep(1000); // Prevent backend race condition between upserts

  // 3. Player 2 Joins (Should trigger AI Injection by Backend)
  logger.info('Player 2 joining...');
  tx = await contract.connect(player2).joinRoom(roomId);
  await tx.wait();
  logger.info(`✅ Player 2 Joined. TX: ${tx.hash}`);

  // Wait for Backend to inject AI
  logger.info('Waiting for backend to inject AI...');
  await new Promise<void>((resolve) => {
    contract.on('AIInjected', (id: bigint) => {
      if (Number(id) === roomId) {
        logger.info('✅ Backend injected AI automatically!');
        contract.removeAllListeners('AIInjected');
        resolve();
      }
    });
  });

  // 4. Chat Phase (Wait 5s + buffer for backend timer)
  logger.info('Waiting 6s for Chat phase to complete and backend to call startVoting...');
  while (true) {
    const r = await contract.rooms(roomId);
    const currentState = Number(r[7]); // state is index 7 (without humanPlayers array)
    if (currentState === 2) {
      logger.info('✅ Backend called startVoting automatically!');
      break;
    }
    await sleep(1000);
  }

  // 5. Commit Phase
  logger.info('Committing votes...');
  const aiWalletAddress = new ethers.Wallet(env.AI_WALLET_PRIVATE_KEY).address;
  const salt = "secret_salt";
  
  // Both players vote for the AI
  const commitHash = ethers.solidityPackedKeccak256(['address', 'string'], [aiWalletAddress, salt]);
  
  tx = await contract.connect(player1).commitVote(roomId, commitHash);
  await tx.wait();
  logger.info(`✅ Player 1 Committed. TX: ${tx.hash}`);

  tx = await contract.connect(player2).commitVote(roomId, commitHash);
  await tx.wait();
  logger.info(`✅ Player 2 Committed. TX: ${tx.hash}`);

  // Wait for backend to call startRevealing
  logger.info('Waiting 4s for Vote phase to complete and backend to call startRevealing...');
  while (true) {
    const r = await contract.rooms(roomId);
    const currentState = Number(r[7]);
    if (currentState === 3) {
      logger.info('✅ Backend called startRevealing automatically!');
      break;
    }
    await sleep(1000);
  }

  // 6. Reveal Phase
  logger.info('Revealing votes...');
  tx = await contract.connect(player1).revealVote(roomId, aiWalletAddress, salt);
  await tx.wait();
  logger.info(`✅ Player 1 Revealed. TX: ${tx.hash}`);

  tx = await contract.connect(player2).revealVote(roomId, aiWalletAddress, salt);
  await tx.wait();
  logger.info(`✅ Player 2 Revealed. TX: ${tx.hash}`);

  // Wait for backend to call resolveRoom
  logger.info('Waiting 4s for Reveal phase to complete and backend to call resolveRoom...');
  while (true) {
    const r = await contract.rooms(roomId);
    const currentState = Number(r[7]);
    if (currentState === 4) { // 4 = Resolved
      logger.info(`✅ Backend called resolveRoom automatically! Payout: ${ethers.formatEther(r[9])} BOT`); // pot is at index 9
      break;
    }
    await sleep(1000);
  }

  logger.info('🎉 SCENARIO 1 COMPLETE SUCCESSFULLY!');
  
  logger.info('--- TEST SCENARIO 2: Room B (3 Humans) ---');
  
  // Reset Hardhat block timestamp again
  logger.info('Syncing Hardhat time with real-world time...');
  try {
    const currentRealWorldTime2 = Math.floor(Date.now() / 1000);
    await provider.send("evm_setNextBlockTimestamp", [currentRealWorldTime2]);
    await provider.send("evm_mine", []);
  } catch (err: any) {
    logger.warn(`Could not sync time (likely already ahead): ${err.message}`);
  }

  logger.info('Creating Room B...');
  let tx2 = await contract.createRoom(
    1, // RoomB
    ethers.parseEther("10"), // 10 BOT
    5, // 5s chat
    3, // 3s vote
    3  // 3s reveal
  );
  let receipt2 = await tx2.wait();
  
  const event2 = receipt2.logs.map((log: any) => contract.interface.parseLog(log)).find((e: any) => e && e.name === 'RoomCreated');
  const roomId2 = Number(event2.args[0]);
  logger.info(`✅ Room B Created (ID: ${roomId2}). TX: ${tx2.hash}`);

  logger.info('Player 1 joining Room B...');
  tx2 = await contract.connect(player1).joinRoom(roomId2);
  await tx2.wait();
  logger.info(`✅ Player 1 Joined. TX: ${tx2.hash}`);

  await sleep(1000);

  logger.info('Player 2 joining Room B...');
  tx2 = await contract.connect(player2).joinRoom(roomId2);
  await tx2.wait();
  logger.info(`✅ Player 2 Joined. TX: ${tx2.hash}`);

  await sleep(1000);
  
  const player3 = new ethers.Wallet(player3Key, provider);
  logger.info('Player 3 joining Room B...');
  tx2 = await contract.connect(player3).joinRoom(roomId2);
  await tx2.wait();
  logger.info(`✅ Player 3 Joined. TX: ${tx2.hash}`);

  logger.info('Waiting for backend to inject AI...');
  await new Promise<void>((resolve) => {
    contract.on('AIInjected', (id: bigint) => {
      if (Number(id) === roomId2) {
        logger.info('✅ Backend injected AI automatically!');
        contract.removeAllListeners('AIInjected');
        resolve();
      }
    });
  });

  logger.info('Waiting for Chat phase to complete...');
  while (true) {
    const r = await contract.rooms(roomId2);
    if (Number(r[7]) === 2) {
      logger.info('✅ Backend called startVoting automatically!');
      break;
    }
    await sleep(1000);
  }

  logger.info('Committing votes (P1, P2 vote AI, P3 votes Player 1)...');
  const commitHashAI = ethers.solidityPackedKeccak256(['address', 'string'], [aiWalletAddress, salt]);
  const commitHashP1 = ethers.solidityPackedKeccak256(['address', 'string'], [player1.address, salt]);
  
  tx2 = await contract.connect(player1).commitVote(roomId2, commitHashAI);
  await tx2.wait();
  tx2 = await contract.connect(player2).commitVote(roomId2, commitHashAI);
  await tx2.wait();
  tx2 = await contract.connect(player3).commitVote(roomId2, commitHashP1);
  await tx2.wait();
  logger.info(`✅ All Players Committed.`);

  logger.info('Waiting for Vote phase to complete...');
  while (true) {
    const r = await contract.rooms(roomId2);
    if (Number(r[7]) === 3) {
      logger.info('✅ Backend called startRevealing automatically!');
      break;
    }
    await sleep(1000);
  }

  logger.info('Revealing votes...');
  tx2 = await contract.connect(player1).revealVote(roomId2, aiWalletAddress, salt);
  await tx2.wait();
  tx2 = await contract.connect(player2).revealVote(roomId2, aiWalletAddress, salt);
  await tx2.wait();
  tx2 = await contract.connect(player3).revealVote(roomId2, player1.address, salt);
  await tx2.wait();
  logger.info(`✅ All Players Revealed.`);

  logger.info('Waiting for Reveal phase to complete...');
  while (true) {
    const r = await contract.rooms(roomId2);
    if (Number(r[7]) === 4) {
      logger.info(`✅ Backend called resolveRoom automatically! Payout: ${ethers.formatEther(r[9])} BOT`);
      break;
    }
    await sleep(1000);
  }

  logger.info('🎉 SCENARIO 2 COMPLETE SUCCESSFULLY!');
  process.exit(0);
}

main().catch(console.error);
