import hre from "hardhat";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("🚀 Deploying Aetherium Contracts...");

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // 1. Deploy AETH Token
  console.log("1️⃣  Deploying AETHToken...");
  const AETHToken = await hre.ethers.getContractFactory("AETHToken");
  const aethToken = await AETHToken.deploy();
  await aethToken.waitForDeployment();
  const aethAddress = await aethToken.getAddress();
  console.log("✅ AETHToken deployed to:", aethAddress);

  // 2. Deploy MinerNode
  console.log("\n2️⃣  Deploying MinerNode...");
  const MinerNode = await hre.ethers.getContractFactory("MinerNode");
  const minerNode = await MinerNode.deploy(aethAddress);
  await minerNode.waitForDeployment();
  const minerNodeAddress = await minerNode.getAddress();
  console.log("✅ MinerNode deployed to:", minerNodeAddress);

  // 3. Deploy VPNSession
  console.log("\n3️⃣  Deploying VPNSession...");
  const VPNSession = await hre.ethers.getContractFactory("VPNSession");
  const vpnSession = await VPNSession.deploy(aethAddress, minerNodeAddress);
  await vpnSession.waitForDeployment();
  const vpnSessionAddress = await vpnSession.getAddress();
  console.log("✅ VPNSession deployed to:", vpnSessionAddress);

  // 4. Deploy Validator
  console.log("\n4️⃣  Deploying Validator...");
  const Validator = await hre.ethers.getContractFactory("Validator");
  const validator = await Validator.deploy(aethAddress);
  await validator.waitForDeployment();
  const validatorAddress = await validator.getAddress();
  console.log("✅ Validator deployed to:", validatorAddress);

  // Configure contracts
  console.log("\n⚙️  Configuring contracts...");
  
  // Grant MinerNode permission to mint AETH (for rewards)
  await aethToken.transferOwnership(minerNodeAddress);
  console.log("✅ Transferred AETH ownership to MinerNode for minting");

  // Save deployment addresses
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      AETHToken: aethAddress,
      MinerNode: minerNodeAddress,
      VPNSession: vpnSessionAddress,
      Validator: validatorAddress
    }
  };

  // Save to backend .env
  const backendEnvPath = path.join(__dirname, "../../backend/.env");
  let envContent = fs.readFileSync(backendEnvPath, "utf8");
  
  // Remove old blockchain addresses if they exist
  envContent = envContent.replace(/AETH_TOKEN_ADDRESS=.*/g, "");
  envContent = envContent.replace(/MINER_NODE_ADDRESS=.*/g, "");
  envContent = envContent.replace(/VPN_SESSION_ADDRESS=.*/g, "");
  envContent = envContent.replace(/VALIDATOR_ADDRESS=.*/g, "");
  envContent = envContent.replace(/BLOCKCHAIN_RPC_URL=.*/g, "");
  
  // Add new addresses
  envContent += `\n# Blockchain Contract Addresses\n`;
  envContent += `AETH_TOKEN_ADDRESS="${aethAddress}"\n`;
  envContent += `MINER_NODE_ADDRESS="${minerNodeAddress}"\n`;
  envContent += `VPN_SESSION_ADDRESS="${vpnSessionAddress}"\n`;
  envContent += `VALIDATOR_ADDRESS="${validatorAddress}"\n`;
  envContent += `BLOCKCHAIN_RPC_URL="http://127.0.0.1:8545"\n`;
  
  fs.writeFileSync(backendEnvPath, envContent);
  console.log("✅ Updated backend/.env with contract addresses");

  // Save deployment info as JSON
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(deploymentsDir, `${hre.network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("✅ Saved deployment info to deployments/");

  console.log("\n🎉 Deployment completed successfully!\n");
  console.log("📋 Summary:");
  console.log("====================");
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", deploymentInfo.chainId);
  console.log("AETH Token:", aethAddress);
  console.log("Miner Node:", minerNodeAddress);
  console.log("VPN Session:", vpnSessionAddress);
  console.log("Validator:", validatorAddress);
  console.log("====================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
