import hre from "hardhat";
const { ethers } = hre;

async function main() {
  const BotBot = await ethers.getContractAt("BotBot", "0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1");
  const botToken = await BotBot.botToken();
  console.log("Existing botToken address:", botToken);
}

main().catch(console.error);
