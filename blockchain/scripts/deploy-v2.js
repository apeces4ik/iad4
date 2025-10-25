const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying Aetherium V2 Contracts (Full Stack)...");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.utils.formatEther(balance), "ETH\n");

  // 1. Deploy AETHTokenV2
  console.log("1️⃣  Deploying AETHTokenV2...");
  const AETHTokenV2 = await hre.ethers.getContractFactory("AETHTokenV2");
  const aethToken = await AETHTokenV2.deploy(deployer.address); // fee collector
  await aethToken.deployed();
  console.log("✅ AETHTokenV2 deployed to:", aethToken.address);

  // 2. Deploy MinerNodeV2
  console.log("\n2️⃣  Deploying MinerNodeV2...");
  const MinerNodeV2 = await hre.ethers.getContractFactory("MinerNodeV2");
  const minerNode = await MinerNodeV2.deploy(aethToken.address, deployer.address);
  await minerNode.deployed();
  console.log("✅ MinerNodeV2 deployed to:", minerNode.address);

  // 3. Deploy VPNSession (reuse existing)
  console.log("\n3️⃣  Deploying VPNSession...");
  const VPNSession = await hre.ethers.getContractFactory("VPNSession");
  const vpnSession = await VPNSession.deploy(aethToken.address, minerNode.address);
  await vpnSession.deployed();
  console.log("✅ VPNSession deployed to:", vpnSession.address);

  // 4. Deploy Validator (reuse existing)
  console.log("\n4️⃣  Deploying Validator...");
  const Validator = await hre.ethers.getContractFactory("Validator");
  const validator = await Validator.deploy(aethToken.address);
  await validator.deployed();
  console.log("✅ Validator deployed to:", validator.address);

  // 5. Deploy PremiumVPN (reuse existing)
  console.log("\n5️⃣  Deploying PremiumVPN...");
  const PremiumVPN = await hre.ethers.getContractFactory("PremiumVPN");
  const premiumVPN = await PremiumVPN.deploy(aethToken.address);
  await premiumVPN.deployed();
  console.log("✅ PremiumVPN deployed to:", premiumVPN.address);

  // 6. Deploy NodeNFT
  console.log("\n6️⃣  Deploying NodeNFT...");
  const NodeNFT = await hre.ethers.getContractFactory("NodeNFT");
  const nodeNFT = await NodeNFT.deploy(deployer.address);
  await nodeNFT.deployed();
  console.log("✅ NodeNFT deployed to:", nodeNFT.address);

  // 7. Deploy ReferralProgram
  console.log("\n7️⃣  Deploying ReferralProgram...");
  const ReferralProgram = await hre.ethers.getContractFactory("ReferralProgram");
  const referralProgram = await ReferralProgram.deploy(aethToken.address);
  await referralProgram.deployed();
  console.log("✅ ReferralProgram deployed to:", referralProgram.address);

  // Configure contracts
  console.log("\n⚙️  Configuring contracts...");
  
  // Set NFT contract in MinerNode
  await minerNode.setNodeNFTContract(nodeNFT.address);
  console.log("✅ Linked NodeNFT to MinerNode");

  // Fund referral program with 10M AETH for rewards
  const fundAmount = hre.ethers.utils.parseEther("10000000");
  await aethToken.approve(referralProgram.address, fundAmount);
  await referralProgram.fundContract(fundAmount);
  console.log("✅ Funded ReferralProgram with 10M AETH");

  // Save deployment addresses
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      AETHTokenV2: aethToken.address,
      MinerNodeV2: minerNode.address,
      VPNSession: vpnSession.address,
      Validator: validator.address,
      PremiumVPN: premiumVPN.address,
      NodeNFT: nodeNFT.address,
      ReferralProgram: referralProgram.address
    }
  };

  // Save to backend .env
  const backendEnvPath = path.join(__dirname, "../../backend/.env");
  let envContent = fs.readFileSync(backendEnvPath, "utf8");
  
  // Remove old blockchain addresses
  envContent = envContent.replace(/AETH_TOKEN_ADDRESS=.*/g, "");
  envContent = envContent.replace(/MINER_NODE_ADDRESS=.*/g, "");
  envContent = envContent.replace(/VPN_SESSION_ADDRESS=.*/g, "");
  envContent = envContent.replace(/VALIDATOR_ADDRESS=.*/g, "");
  envContent = envContent.replace(/PREMIUM_VPN_ADDRESS=.*/g, "");
  envContent = envContent.replace(/NODE_NFT_ADDRESS=.*/g, "");
  envContent = envContent.replace(/REFERRAL_PROGRAM_ADDRESS=.*/g, "");
  envContent = envContent.replace(/BLOCKCHAIN_RPC_URL=.*/g, "");
  envContent = envContent.replace(/\n\n+/g, "\n\n");
  
  // Add new addresses
  envContent += `\n# Blockchain Contract Addresses (V2)\n`;
  envContent += `AETH_TOKEN_ADDRESS="${aethToken.address}"\n`;
  envContent += `MINER_NODE_ADDRESS="${minerNode.address}"\n`;
  envContent += `VPN_SESSION_ADDRESS="${vpnSession.address}"\n`;
  envContent += `VALIDATOR_ADDRESS="${validator.address}"\n`;
  envContent += `PREMIUM_VPN_ADDRESS="${premiumVPN.address}"\n`;
  envContent += `NODE_NFT_ADDRESS="${nodeNFT.address}"\n`;
  envContent += `REFERRAL_PROGRAM_ADDRESS="${referralProgram.address}"\n`;
  envContent += `BLOCKCHAIN_RPC_URL="http://127.0.0.1:8545"\n`;
  
  fs.writeFileSync(backendEnvPath, envContent);
  console.log("✅ Updated backend/.env with contract addresses");

  // Save deployment info as JSON
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(deploymentsDir, `${hre.network.name}-v2.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("✅ Saved deployment info to deployments/");

  console.log("\n🎉 Deployment completed successfully!\n");
  console.log("📋 Summary:");
  console.log("====================");
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", deploymentInfo.chainId);
  console.log("AETH Token V2:", aethToken.address);
  console.log("Miner Node V2:", minerNode.address);
  console.log("VPN Session:", vpnSession.address);
  console.log("Validator:", validator.address);
  console.log("Premium VPN:", premiumVPN.address);
  console.log("Node NFT:", nodeNFT.address);
  console.log("Referral Program:", referralProgram.address);
  console.log("====================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
