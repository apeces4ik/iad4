const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting deployment of all Aetherium Proxy contracts...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString(), "\n");

  const deployments = {};

  try {
    // Use deployer as fee collector for now
    const feeCollector = deployer.address;

    // ==================== DEPLOY 1: AETHTokenV2 ====================
    console.log("📦 1/7 Deploying AETHTokenV2...");
    const AETHTokenV2 = await hre.ethers.getContractFactory("AETHTokenV2");
    const aethToken = await AETHTokenV2.deploy(feeCollector);
    await aethToken.deployed();
    deployments.AETH_TOKEN_V2_ADDRESS = aethToken.address;
    console.log("✅ AETHTokenV2 deployed to:", aethToken.address);
    console.log("   Initial Supply: 1,000,000,000 AETH");
    console.log("   Fee Collector:", feeCollector, "\n");

    // ==================== DEPLOY 2: MinerNodeV2 ====================
    console.log("📦 2/7 Deploying MinerNodeV2...");
    const MinerNodeV2 = await hre.ethers.getContractFactory("MinerNodeV2");
    const minerNode = await MinerNodeV2.deploy(aethToken.address, feeCollector);
    await minerNode.deployed();
    deployments.MINER_NODE_V2_ADDRESS = minerNode.address;
    console.log("✅ MinerNodeV2 deployed to:", minerNode.address);
    console.log("   Linked to AETH Token:", aethToken.address, "\n");

    // ==================== DEPLOY 3: NodeNFT ====================
    console.log("📦 3/7 Deploying NodeNFT...");
    const NodeNFT = await hre.ethers.getContractFactory("NodeNFT");
    const nodeNFT = await NodeNFT.deploy(feeCollector);
    await nodeNFT.deployed();
    deployments.NODE_NFT_ADDRESS = nodeNFT.address;
    console.log("✅ NodeNFT deployed to:", nodeNFT.address);
    console.log("   5 Tiers: Bronze, Silver, Gold, Diamond, Legendary\n");

    // ==================== DEPLOY 4: ReferralProgram ====================
    console.log("📦 4/7 Deploying ReferralProgram...");
    const ReferralProgram = await hre.ethers.getContractFactory("ReferralProgram");
    const referralProgram = await ReferralProgram.deploy(aethToken.address);
    await referralProgram.deployed();
    deployments.REFERRAL_PROGRAM_ADDRESS = referralProgram.address;
    console.log("✅ ReferralProgram deployed to:", referralProgram.address);
    console.log("   3-Level MLM: 5% + 3% + 2% commissions\n");

    // ==================== DEPLOY 5: VPNSession ====================
    console.log("📦 5/7 Deploying VPNSession...");
    const VPNSession = await hre.ethers.getContractFactory("VPNSession");
    const vpnSession = await VPNSession.deploy(aethToken.address, minerNode.address);
    await vpnSession.deployed();
    deployments.VPN_SESSION_ADDRESS = vpnSession.address;
    console.log("✅ VPNSession deployed to:", vpnSession.address);
    console.log("   Burn rate: 0.001 AETH per minute\n");

    // ==================== DEPLOY 6: Validator ====================
    console.log("📦 6/7 Deploying Validator...");
    const Validator = await hre.ethers.getContractFactory("Validator");
    const validator = await Validator.deploy(aethToken.address);
    await validator.deployed();
    deployments.VALIDATOR_ADDRESS = validator.address;
    console.log("✅ Validator deployed to:", validator.address);
    console.log("   Minimum stake: 10,000 AETH\n");

    // ==================== DEPLOY 7: PremiumVPN ====================
    console.log("📦 7/7 Deploying PremiumVPN...");
    const PremiumVPN = await hre.ethers.getContractFactory("PremiumVPN");
    const premiumVPN = await PremiumVPN.deploy(
      aethToken.address,
      minerNode.address,
      vpnSession.address
    );
    await premiumVPN.deployed();
    deployments.PREMIUM_VPN_ADDRESS = premiumVPN.address;
    console.log("✅ PremiumVPN deployed to:", premiumVPN.address);
    console.log("   Premium tier: Unlimited bandwidth\n");

    // ==================== SAVE DEPLOYMENTS ====================
    console.log("💾 Saving deployment addresses...");
    
    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const deploymentData = {
      timestamp,
      network: hre.network.name,
      deployer: deployer.address,
      contracts: deployments
    };

    // Save to JSON
    fs.writeFileSync(
      path.join(deploymentsDir, `deployment-${hre.network.name}.json`),
      JSON.stringify(deploymentData, null, 2)
    );

    // Save to .env format
    let envContent = "# Blockchain Contract Addresses (V2 - All Contracts)\n";
    envContent += `# Deployed at: ${timestamp}\n`;
    envContent += `# Network: ${hre.network.name}\n\n`;
    envContent += `AETH_TOKEN_V2_ADDRESS="${deployments.AETH_TOKEN_V2_ADDRESS}"\n`;
    envContent += `MINER_NODE_V2_ADDRESS="${deployments.MINER_NODE_V2_ADDRESS}"\n`;
    envContent += `NODE_NFT_ADDRESS="${deployments.NODE_NFT_ADDRESS}"\n`;
    envContent += `REFERRAL_PROGRAM_ADDRESS="${deployments.REFERRAL_PROGRAM_ADDRESS}"\n`;
    envContent += `VPN_SESSION_ADDRESS="${deployments.VPN_SESSION_ADDRESS}"\n`;
    envContent += `VALIDATOR_ADDRESS="${deployments.VALIDATOR_ADDRESS}"\n`;
    envContent += `PREMIUM_VPN_ADDRESS="${deployments.PREMIUM_VPN_ADDRESS}"\n`;
    envContent += `BLOCKCHAIN_RPC_URL="http://127.0.0.1:8545"\n`;

    fs.writeFileSync(
      path.join(deploymentsDir, "contract-addresses.env"),
      envContent
    );

    console.log("✅ Saved to:", path.join(deploymentsDir, `deployment-${hre.network.name}.json`));
    console.log("✅ Saved to:", path.join(deploymentsDir, "contract-addresses.env"), "\n");

    // ==================== SUMMARY ====================
    console.log("═══════════════════════════════════════════════════════════");
    console.log("🎉 ALL 7 CONTRACTS DEPLOYED SUCCESSFULLY!");
    console.log("═══════════════════════════════════════════════════════════");
    console.log("\n📋 DEPLOYMENT SUMMARY:\n");
    console.log("1. AETHTokenV2:       ", deployments.AETH_TOKEN_V2_ADDRESS);
    console.log("2. MinerNodeV2:       ", deployments.MINER_NODE_V2_ADDRESS);
    console.log("3. NodeNFT:           ", deployments.NODE_NFT_ADDRESS);
    console.log("4. ReferralProgram:   ", deployments.REFERRAL_PROGRAM_ADDRESS);
    console.log("5. VPNSession:        ", deployments.VPN_SESSION_ADDRESS);
    console.log("6. Validator:         ", deployments.VALIDATOR_ADDRESS);
    console.log("7. PremiumVPN:        ", deployments.PREMIUM_VPN_ADDRESS);
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("🔗 Network:", hre.network.name);
    console.log("👤 Deployer:", deployer.address);
    console.log("⏰ Time:", timestamp);
    console.log("═══════════════════════════════════════════════════════════\n");

    console.log("🔄 Next steps:");
    console.log("1. Update backend/.env with new contract addresses");
    console.log("2. Update frontend config with new contracts");
    console.log("3. Export ABIs to frontend");
    console.log("4. Test all integrations\n");

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
