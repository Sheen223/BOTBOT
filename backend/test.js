const { ethers } = require("ethers");
const BotBotArtifact = require("./src/config/BotBot.json");
const dotenv = require("dotenv");
dotenv.config();

async function main() {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, BotBotArtifact.abi, provider);
  const nextRoomId = await contract.nextRoomId();
  console.log("nextRoomId:", nextRoomId.toString());
}

main().catch(console.error);
