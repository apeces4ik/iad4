const fs = require("fs");
const path = require("path");

const contracts = ["AETHTokenV2", "MinerNodeV2", "NodeNFT", "ReferralProgram", "VPNSession", "Validator", "PremiumVPN"];
const artifactsDir = path.join(__dirname, "../artifacts/contracts");
const outputDir = path.join(__dirname, "../../frontend/src/contracts");

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Read deployment info
const deploymentPath = path.join(__dirname, "../deployments/deployment-localhost.json");
const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

contracts.forEach((contractName) => {
  const artifactPath = path.join(
    artifactsDir,
    `${contractName}.sol`,
    `${contractName}.json`
  );

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Get contract address from deployment
  const addressKey = `${contractName.replace(/([A-Z])/g, '_$1').toUpperCase().substring(1)}_ADDRESS`;
  
  const output = {
    address: deployment.contracts[addressKey],
    abi: artifact.abi,
  };

  const outputPath = path.join(outputDir, `${contractName}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`✅ Exported ${contractName} ABI to frontend`);
});

// Create index file with all addresses
const indexContent = `// Contract addresses and ABIs - V2
// Auto-generated at: ${new Date().toISOString()}

export const CONTRACTS = {
  AETHTokenV2: "${deployment.contracts.AETH_TOKEN_V2_ADDRESS}",
  MinerNodeV2: "${deployment.contracts.MINER_NODE_V2_ADDRESS}",
  NodeNFT: "${deployment.contracts.NODE_NFT_ADDRESS}",
  ReferralProgram: "${deployment.contracts.REFERRAL_PROGRAM_ADDRESS}",
  VPNSession: "${deployment.contracts.VPN_SESSION_ADDRESS}",
  Validator: "${deployment.contracts.VALIDATOR_ADDRESS}",
  PremiumVPN: "${deployment.contracts.PREMIUM_VPN_ADDRESS}",
};

export const CHAIN_ID = 31337; // Hardhat localhost
export const RPC_URL = "http://127.0.0.1:8545";

// Import ABIs
import AETHTokenV2ABI from "./AETHTokenV2.json";
import MinerNodeV2ABI from "./MinerNodeV2.json";
import NodeNFTABI from "./NodeNFT.json";
import ReferralProgramABI from "./ReferralProgram.json";
import VPNSessionABI from "./VPNSession.json";
import ValidatorABI from "./Validator.json";
import PremiumVPNABI from "./PremiumVPN.json";

export const ABIS = {
  AETHTokenV2: AETHTokenV2ABI.abi,
  MinerNodeV2: MinerNodeV2ABI.abi,
  NodeNFT: NodeNFTABI.abi,
  ReferralProgram: ReferralProgramABI.abi,
  VPNSession: VPNSessionABI.abi,
  Validator: ValidatorABI.abi,
  PremiumVPN: PremiumVPNABI.abi,
};
`;

fs.writeFileSync(path.join(outputDir, "index.js"), indexContent);
console.log("✅ Created contracts index file");

console.log("\n🎉 All ABIs exported successfully!");
