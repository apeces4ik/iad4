// Simple deployment script using Web3
import { Web3 } from 'web3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const web3 = new Web3('http://127.0.0.1:8545');

// Hardhat default accounts
const DEPLOYER_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const account = web3.eth.accounts.privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);

async function deploy(contractName, ...args) {
  const artifactPath = path.join(__dirname, `artifacts/contracts/${contractName}.sol/${contractName}.json`);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  
  const contract = new web3.eth.Contract(artifact.abi);
  const deployTx = contract.deploy({
    data: artifact.bytecode,
    arguments: args
  });
  
  const gas = await deployTx.estimateGas({ from: account.address });
  const deployedContract = await deployTx.send({
    from: account.address,
    gas: gas.toString()
  });
  
  console.log(`✅ ${contractName} deployed to:`, deployedContract.options.address);
  return deployedContract.options.address;
}

async function main() {
  console.log("🚀 Deploying Aetherium Contracts...");
  console.log("📝 Deploying with account:", account.address);
  
  // Deploy contracts
  const aethToken = await deploy('AETHToken');
  const minerNode = await deploy('MinerNode', aethToken);
  const vpnSession = await deploy('VPNSession', aethToken, minerNode);
  const validator = await deploy('Validator', aethToken);
  const premiumVPN = await deploy('PremiumVPN', aethToken);
  
  // Update backend .env
  const backendEnvPath = path.join(__dirname, '../backend/.env');
  let envContent = fs.readFileSync(backendEnvPath, 'utf8');
  
  // Remove old blockchain addresses
  envContent = envContent.replace(/AETH_TOKEN_ADDRESS=.*/g, '');
  envContent = envContent.replace(/MINER_NODE_ADDRESS=.*/g, '');
  envContent = envContent.replace(/VPN_SESSION_ADDRESS=.*/g, '');
  envContent = envContent.replace(/VALIDATOR_ADDRESS=.*/g, '');
  envContent = envContent.replace(/PREMIUM_VPN_ADDRESS=.*/g, '');
  envContent = envContent.replace(/BLOCKCHAIN_RPC_URL=.*/g, '');
  envContent = envContent.replace(/\n\n+/g, '\n\n');
  
  // Add new addresses
  envContent += `\n# Blockchain Contract Addresses\n`;
  envContent += `AETH_TOKEN_ADDRESS="${aethToken}"\n`;
  envContent += `MINER_NODE_ADDRESS="${minerNode}"\n`;
  envContent += `VPN_SESSION_ADDRESS="${vpnSession}"\n`;
  envContent += `VALIDATOR_ADDRESS="${validator}"\n`;
  envContent += `PREMIUM_VPN_ADDRESS="${premiumVPN}"\n`;
  envContent += `BLOCKCHAIN_RPC_URL="http://127.0.0.1:8545"\n`;
  
  fs.writeFileSync(backendEnvPath, envContent);
  console.log("✅ Updated backend/.env with contract addresses");
  
  // Save deployment info
  const deploymentInfo = {
    network: 'localhost',
    chainId: '1337',
    deployer: account.address,
    timestamp: new Date().toISOString(),
    contracts: {
      AETHToken: aethToken,
      MinerNode: minerNode,
      VPNSession: vpnSession,
      Validator: validator,
      PremiumVPN: premiumVPN
    }
  };
  
  const deploymentsDir = path.join(__dirname, 'deployments');
  fs.writeFileSync(
    path.join(deploymentsDir, 'localhost.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n🎉 Deployment completed!");
  console.log("====================");
  console.log("AETH Token:", aethToken);
  console.log("Miner Node:", minerNode);
  console.log("VPN Session:", vpnSession);
  console.log("Validator:", validator);
  console.log("Premium VPN:", premiumVPN);
  console.log("====================\n");
}

main().catch(console.error);
