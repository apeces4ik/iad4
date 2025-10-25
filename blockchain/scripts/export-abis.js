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

  const output = {
    address: deployment.contracts[contractName],
    abi: artifact.abi,
  };

  const outputPath = path.join(outputDir, `${contractName}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`✅ Exported ${contractName} ABI to frontend`);
});

// Create index file with all addresses
const indexContent = `// Contract addresses and ABIs
export const CONTRACTS = {
  AETHToken: "${deployment.contracts.AETHToken}",
  MinerNode: "${deployment.contracts.MinerNode}",
  VPNSession: "${deployment.contracts.VPNSession}",
  Validator: "${deployment.contracts.Validator}",
  PremiumVPN: "${deployment.contracts.PremiumVPN}",
};

export const CHAIN_ID = ${deployment.chainId};
export const RPC_URL = "http://127.0.0.1:8545";

// Import ABIs
import AETHTokenABI from "./AETHToken.json";
import MinerNodeABI from "./MinerNode.json";
import VPNSessionABI from "./VPNSession.json";
import ValidatorABI from "./Validator.json";
import PremiumVPNABI from "./PremiumVPN.json";

export const ABIS = {
  AETHToken: AETHTokenABI.abi,
  MinerNode: MinerNodeABI.abi,
  VPNSession: VPNSessionABI.abi,
  Validator: ValidatorABI.abi,
  PremiumVPN: PremiumVPNABI.abi,
};
`;

fs.writeFileSync(path.join(outputDir, "index.js"), indexContent);
console.log("✅ Created contracts index file");

console.log("\n🎉 All ABIs exported successfully!");
