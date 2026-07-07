import hre from "hardhat";
const { ethers } = hre;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  console.log("Deploying contracts with the account:", deployer.address);

  // Oracle Address (using deployer account so it has onlyOwner rights for injectAI)
  const oracleAddress = signers[0].address;
  console.log("Oracle Address (Deployer):", oracleAddress);

  // Deploy BotBot Contract
  const BotBot = await ethers.getContractFactory("BotBot");
  const botBot = await BotBot.deploy(oracleAddress);
  await botBot.waitForDeployment();
  const botBotAddress = await botBot.getAddress();
  console.log("BotBot deployed to:", botBotAddress);

  // Save the contract address to a JSON file so the backend can read it for testing
  const envPath = path.join(__dirname, "../..", "backend", ".env");
  let envContent = fs.readFileSync(envPath, "utf-8");
  
  // Replace CONTRACT_ADDRESS
  envContent = envContent.replace(
    /CONTRACT_ADDRESS=".*"/,
    `CONTRACT_ADDRESS="${botBotAddress}"`
  );
  
  fs.writeFileSync(envPath, envContent);
  console.log("Updated backend .env with CONTRACT_ADDRESS");

  // Save the contract address to the frontend .env.local
  const frontendEnvPath = path.join(__dirname, "../..", "frontend", ".env.local");
  let frontendEnvContent = fs.readFileSync(frontendEnvPath, "utf-8");
  frontendEnvContent = frontendEnvContent.replace(
    /NEXT_PUBLIC_CONTRACT_ADDRESS=".*"/,
    `NEXT_PUBLIC_CONTRACT_ADDRESS="${botBotAddress}"`
  );
  fs.writeFileSync(frontendEnvPath, frontendEnvContent);
  console.log("Updated frontend .env.local with NEXT_PUBLIC_CONTRACT_ADDRESS");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
