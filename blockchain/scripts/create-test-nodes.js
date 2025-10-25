// Create test nodes in MinerNode contract for testing
const hre = require("hardhat");

async function main() {
  const [owner, addr1, addr2, addr3] = await hre.ethers.getSigners();
  
  console.log("Creating test nodes...");
  
  // Load contract addresses
  const MINER_NODE_ADDRESS = process.env.MINER_NODE_ADDRESS;
  
  if (!MINER_NODE_ADDRESS) {
    throw new Error("MINER_NODE_ADDRESS not set in .env");
  }
  
  // Get contract instance
  const MinerNode = await hre.ethers.getContractAt("MinerNode", MINER_NODE_ADDRESS);
  
  // Create nodes with different reputation levels
  const locations = ["us-east", "us-east", "eu-west", "eu-west", "asia-pacific"];
  const bandwidths = [1000, 950, 900, 500, 450];
  const signers = [addr1, addr1, addr2, addr3, addr3];
  
  const nodeIds = [];
  
  for (let i = 0; i < locations.length; i++) {
    const tx = await MinerNode.connect(signers[i]).registerNode(
      locations[i],
      bandwidths[i]
    );
    const receipt = await tx.wait();
    
    // Get node ID from event
    const event = receipt.logs.find(log => {
      try {
        const parsed = MinerNode.interface.parseLog(log);
        return parsed.name === "NodeRegistered";
      } catch {
        return false;
      }
    });
    
    if (event) {
      const parsed = MinerNode.interface.parseLog(event);
      const nodeId = parsed.args.nodeId;
      nodeIds.push(nodeId);
      console.log(`✅ Node ${i+1} created: ${locations[i]}, ${bandwidths[i]} Mbps`);
    }
  }
  
  // Set different reputation levels
  // Premium nodes: reputation > 90
  await MinerNode.updateReputation(nodeIds[0], 98);
  console.log(`✅ Node 1 reputation set to 98 (Premium)`);
  
  await MinerNode.updateReputation(nodeIds[1], 96);
  console.log(`✅ Node 2 reputation set to 96 (Premium)`);
  
  await MinerNode.updateReputation(nodeIds[2], 94);
  console.log(`✅ Node 3 reputation set to 94 (Premium)`);
  
  // Standard nodes: reputation 50-89
  await MinerNode.updateReputation(nodeIds[3], 75);
  console.log(`✅ Node 4 reputation set to 75 (Standard)`);
  
  await MinerNode.updateReputation(nodeIds[4], 68);
  console.log(`✅ Node 5 reputation set to 68 (Standard)`);
  
  console.log("\n🎉 Test nodes created successfully!");
  console.log("Premium nodes (reputation > 90): 3 nodes");
  console.log("Standard nodes (reputation 50-89): 2 nodes");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
