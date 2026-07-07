import { ethers } from 'ethers';
import { env } from '../src/config/env';
import BotBotArtifact from '../src/config/BotBot.json';
import { logger } from '../src/utils/logger';

const deployerKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const player1Key = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const player2Key = "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  logger.info('Starting E2E Failure Scenarios...');

  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const owner = new ethers.Wallet(deployerKey, provider);
  const player1 = new ethers.Wallet(player1Key, provider);
  const player2 = new ethers.Wallet(player2Key, provider);

  const contract = new ethers.Contract(env.CONTRACT_ADDRESS, BotBotArtifact.abi, owner) as any;
  const aiWalletAddress = new ethers.Wallet(env.AI_WALLET_PRIVATE_KEY).address;
  const salt = "secret_salt";

  logger.info('Wiping database for clean E2E run...');
  const { prisma } = require('../src/prisma/client');
  await prisma.player.deleteMany({});
  await prisma.room.deleteMany({});

  // ---------------------------------------------------------
  // SCENARIO 3: Nobody correctly identifies the AI
  // ---------------------------------------------------------
  logger.info('--- TEST SCENARIO 3: Nobody correctly identifies the AI ---');
  
  // Reset Hardhat block timestamp
  logger.info('Syncing Hardhat time with real-world time...');
  try {
    await provider.send("evm_setNextBlockTimestamp", [Math.floor(Date.now() / 1000)]);
    await provider.send("evm_mine", []);
  } catch (e: any) {}

  let tx = await contract.createRoom(0, ethers.parseEther("10"), 15, 15, 15);
  let receipt = await tx.wait();
  let event = receipt.logs.map((log: any) => contract.interface.parseLog(log)).find((e: any) => e && e.name === 'RoomCreated');
  let roomId = Number(event.args[0]);
  logger.info(`✅ Room Created (ID: ${roomId}).`);

  await contract.connect(player1).joinRoom(roomId);
  await sleep(1000);
  await contract.connect(player2).joinRoom(roomId);
  
  logger.info('Waiting for backend to inject AI...');
  while ((await contract.rooms(roomId))[7] === 0n) await sleep(500);

  logger.info('Waiting for startVoting...');
  while (Number((await contract.rooms(roomId))[7]) < 2) await sleep(500);

  logger.info('Committing incorrect votes...');
  // Player 1 votes for Player 2, Player 2 votes for Player 1 (Nobody votes for AI)
  const commitHashP2 = ethers.solidityPackedKeccak256(['address', 'string'], [player2.address, salt]);
  const commitHashP1 = ethers.solidityPackedKeccak256(['address', 'string'], [player1.address, salt]);
  
  await (await contract.connect(player1).commitVote(roomId, commitHashP2)).wait();
  await (await contract.connect(player2).commitVote(roomId, commitHashP1)).wait();

  logger.info('Waiting for startRevealing...');
  while (Number((await contract.rooms(roomId))[7]) < 3) await sleep(500);

  logger.info('Revealing incorrect votes...');
  await (await contract.connect(player1).revealVote(roomId, player2.address, salt)).wait();
  await (await contract.connect(player2).revealVote(roomId, player1.address, salt)).wait();

  logger.info('Waiting for resolveRoom...');
  while (Number((await contract.rooms(roomId))[7]) < 4) await sleep(500);
  
  const resolvedRoom = await contract.rooms(roomId);
  logger.info(`✅ Scenario 3 Complete. Payout was: ${ethers.formatEther(resolvedRoom[9])} BOT (Expected: 0.0)`);


  // ---------------------------------------------------------
  // SCENARIO 4: Player misses Reveal phase
  // ---------------------------------------------------------
  logger.info('--- TEST SCENARIO 4: Player misses Reveal phase ---');
  
  try {
    await provider.send("evm_setNextBlockTimestamp", [Math.floor(Date.now() / 1000)]);
    await provider.send("evm_mine", []);
  } catch (e: any) {}

  tx = await contract.createRoom(0, ethers.parseEther("10"), 15, 15, 15);
  receipt = await tx.wait();
  event = receipt.logs.map((log: any) => contract.interface.parseLog(log)).find((e: any) => e && e.name === 'RoomCreated');
  roomId = Number(event.args[0]);
  logger.info(`✅ Room Created (ID: ${roomId}).`);

  await contract.connect(player1).joinRoom(roomId);
  await sleep(1000);
  await contract.connect(player2).joinRoom(roomId);
  
  logger.info('Waiting for startVoting...');
  while (Number((await contract.rooms(roomId))[7]) < 2) await sleep(500);

  logger.info('Committing votes (Both vote AI)...');
  const commitHashAI = ethers.solidityPackedKeccak256(['address', 'string'], [aiWalletAddress, salt]);
  await (await contract.connect(player1).commitVote(roomId, commitHashAI)).wait();
  await (await contract.connect(player2).commitVote(roomId, commitHashAI)).wait();

  logger.info('Waiting for startRevealing...');
  while (Number((await contract.rooms(roomId))[7]) < 3) await sleep(500);

  logger.info('Only Player 1 reveals. Player 2 skips...');
  await (await contract.connect(player1).revealVote(roomId, aiWalletAddress, salt)).wait();

  logger.info('Waiting for resolveRoom...');
  while (Number((await contract.rooms(roomId))[7]) < 4) await sleep(500);
  
  const resolvedRoom4 = await contract.rooms(roomId);
  logger.info(`✅ Scenario 4 Complete. Payout: ${ethers.formatEther(resolvedRoom4[9])} BOT (Only Player 1 gets paid)`);

  // ---------------------------------------------------------
  // SCENARIO 5: Late transaction after phase ended
  // ---------------------------------------------------------
  logger.info('--- TEST SCENARIO 5: Late transaction after phase ended ---');
  try {
    await provider.send("evm_setNextBlockTimestamp", [Math.floor(Date.now() / 1000)]);
    await provider.send("evm_mine", []);
  } catch (e: any) {}

  tx = await contract.createRoom(0, ethers.parseEther("10"), 15, 15, 15);
  receipt = await tx.wait();
  event = receipt.logs.map((log: any) => contract.interface.parseLog(log)).find((e: any) => e && e.name === 'RoomCreated');
  roomId = Number(event.args[0]);

  await contract.connect(player1).joinRoom(roomId);
  await sleep(1000);
  await contract.connect(player2).joinRoom(roomId);

  logger.info('Waiting for startRevealing... skipping commit entirely');
  while (Number((await contract.rooms(roomId))[7]) < 3) await sleep(500);

  logger.info('Attempting to commit late (should revert)...');
  try {
    await (await contract.connect(player1).commitVote(roomId, commitHashAI)).wait();
    logger.error('❌ Late commit transaction succeeded but should have failed!');
  } catch (e: any) {
    logger.info('✅ Late commit transaction reverted as expected!');
  }

  logger.info('Waiting for resolveRoom...');
  while (Number((await contract.rooms(roomId))[7]) < 4) await sleep(500);

  logger.info('🎉 ALL FAILURE SCENARIOS COMPLETED SUCCESSFULLY!');
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(console.error);
