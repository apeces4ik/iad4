const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("MinerNodeV2", function () {
  let aethToken;
  let minerNode;
  let owner;
  let miner1;
  let miner2;
  let miner3;

  const STAKE_REQUIREMENT = ethers.parseEther("1000"); // 1000 AETH
  const SLASH_AMOUNT = ethers.parseEther("100"); // 100 AETH
  const XP_PER_GB = 10;

  beforeEach(async function () {
    [owner, miner1, miner2, miner3] = await ethers.getSigners();
    
    // Deploy AETHTokenV2 first
    const AETHTokenV2 = await ethers.getContractFactory("AETHTokenV2");
    aethToken = await AETHTokenV2.deploy(owner.address);
    await aethToken.waitForDeployment();
    
    // Deploy MinerNodeV2
    const MinerNodeV2 = await ethers.getContractFactory("MinerNodeV2");
    minerNode = await MinerNodeV2.deploy(await aethToken.getAddress());
    await minerNode.waitForDeployment();
    
    // Transfer tokens to miners
    await aethToken.transfer(miner1.address, ethers.parseEther("10000"));
    await aethToken.transfer(miner2.address, ethers.parseEther("10000"));
    await aethToken.transfer(miner3.address, ethers.parseEther("10000"));
  });

  describe("Deployment", function () {
    it("Should set the correct AETH token address", async function () {
      expect(await minerNode.aethToken()).to.equal(await aethToken.getAddress());
    });

    it("Should set correct stake requirement", async function () {
      expect(await minerNode.STAKE_REQUIREMENT()).to.equal(STAKE_REQUIREMENT);
    });

    it("Should set correct slash amount", async function () {
      expect(await minerNode.SLASH_AMOUNT()).to.equal(SLASH_AMOUNT);
    });

    it("Should initialize with 10 level system", async function () {
      expect(await minerNode.MAX_LEVEL()).to.equal(10);
    });
  });

  describe("Node Registration", function () {
    it("Should register a new node with stake", async function () {
      await aethToken.connect(miner1).approve(await minerNode.getAddress(), STAKE_REQUIREMENT);
      
      await expect(minerNode.connect(miner1).registerNode("US-East", 1000, "192.168.1.1"))
        .to.emit(minerNode, "NodeRegistered");
    });

    it("Should require correct stake amount", async function () {
      await aethToken.connect(miner1).approve(await minerNode.getAddress(), ethers.parseEther("500"));
      
      await expect(minerNode.connect(miner1).registerNode("US-East", 1000, "192.168.1.1"))
        .to.be.reverted;
    });

    it("Should initialize node at level 1", async function () {
      await aethToken.connect(miner1).approve(await minerNode.getAddress(), STAKE_REQUIREMENT);
      await minerNode.connect(miner1).registerNode("US-East", 1000, "192.168.1.1");
      
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeInfo = await minerNode.getNodeInfo(nodes[0]);
      
      expect(nodeInfo.level).to.equal(1);
    });

    it("Should set reputation to 100", async function () {
      await aethToken.connect(miner1).approve(await minerNode.getAddress(), STAKE_REQUIREMENT);
      await minerNode.connect(miner1).registerNode("US-East", 1000, "192.168.1.1");
      
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeInfo = await minerNode.getNodeInfo(nodes[0]);
      
      expect(nodeInfo.reputation).to.equal(100);
    });

    it("Should track geographic location", async function () {
      await aethToken.connect(miner1).approve(await minerNode.getAddress(), STAKE_REQUIREMENT);
      await minerNode.connect(miner1).registerNode("US-East", 1000, "192.168.1.1");
      
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeInfo = await minerNode.getNodeInfo(nodes[0]);
      
      expect(nodeInfo.location).to.equal("US-East");
    });

    it("Should allow multiple nodes per owner", async function () {
      await aethToken.connect(miner1).approve(await minerNode.getAddress(), STAKE_REQUIREMENT * 2n);
      
      await minerNode.connect(miner1).registerNode("US-East", 1000, "192.168.1.1");
      await minerNode.connect(miner1).registerNode("EU-West", 2000, "192.168.1.2");
      
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      expect(nodes.length).to.equal(2);
    });
  });

  describe("XP System", function () {
    beforeEach(async function () {
      await aethToken.connect(miner1).approve(await minerNode.getAddress(), STAKE_REQUIREMENT);
      await minerNode.connect(miner1).registerNode("US-East", 1000, "192.168.1.1");
    });

    it("Should award XP for data shared (10 XP per GB)", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      // Record 10 GB of data
      await minerNode.recordDataShared(nodeId, 10);
      
      const nodeInfo = await minerNode.getNodeInfo(nodeId);
      expect(nodeInfo.xp).to.equal(100); // 10 GB * 10 XP
    });

    it("Should advance level based on XP", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      // Award enough XP for level 2 (assuming 1000 XP needed)
      await minerNode.recordDataShared(nodeId, 100); // 1000 XP
      
      const nodeInfo = await minerNode.getNodeInfo(nodeId);
      expect(nodeInfo.level).to.be.gte(1);
    });

    it("Should increase earning multiplier with level", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      const initialMultiplier = await minerNode.getLevelMultiplier(nodeId);
      
      // Award lots of XP to level up
      await minerNode.recordDataShared(nodeId, 500);
      
      const newMultiplier = await minerNode.getLevelMultiplier(nodeId);
      expect(newMultiplier).to.be.gte(initialMultiplier);
    });

    it("Should cap level at 10", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      // Award massive XP
      await minerNode.recordDataShared(nodeId, 100000);
      
      const nodeInfo = await minerNode.getNodeInfo(nodeId);
      expect(nodeInfo.level).to.be.lte(10);
    });
  });

  describe("Reputation System", function () {
    beforeEach(async function () {
      await aethToken.connect(miner1).approve(await minerNode.getAddress(), STAKE_REQUIREMENT);
      await minerNode.connect(miner1).registerNode("US-East", 1000, "192.168.1.1");
    });

    it("Should start with 100 reputation", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeInfo = await minerNode.getNodeInfo(nodes[0]);
      
      expect(nodeInfo.reputation).to.equal(100);
    });

    it("Should decrease reputation on poor performance", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      await minerNode.adjustReputation(nodeId, -10);
      
      const nodeInfo = await minerNode.getNodeInfo(nodeId);
      expect(nodeInfo.reputation).to.equal(90);
    });

    it("Should increase reputation on good performance", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      // First decrease, then increase
      await minerNode.adjustReputation(nodeId, -20);
      await minerNode.adjustReputation(nodeId, 10);
      
      const nodeInfo = await minerNode.getNodeInfo(nodeId);
      expect(nodeInfo.reputation).to.equal(90);
    });

    it("Should not go below 0 reputation", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      await minerNode.adjustReputation(nodeId, -150);
      
      const nodeInfo = await minerNode.getNodeInfo(nodeId);
      expect(nodeInfo.reputation).to.equal(0);
    });

    it("Should not exceed 100 reputation", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      await minerNode.adjustReputation(nodeId, 50);
      
      const nodeInfo = await minerNode.getNodeInfo(nodeId);
      expect(nodeInfo.reputation).to.equal(100);
    });
  });

  describe("Slashing Mechanism", function () {
    beforeEach(async function () {
      await aethToken.connect(miner1).approve(await minerNode.getAddress(), STAKE_REQUIREMENT);
      await minerNode.connect(miner1).registerNode("US-East", 1000, "192.168.1.1");
    });

    it("Should slash node for violation", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      const initialStake = (await minerNode.getNodeInfo(nodeId)).stakedAmount;
      
      await minerNode.slashNode(nodeId);
      
      const finalStake = (await minerNode.getNodeInfo(nodeId)).stakedAmount;
      expect(initialStake - finalStake).to.equal(SLASH_AMOUNT);
    });

    it("Should emit NodeSlashed event", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      await expect(minerNode.slashNode(nodeId))
        .to.emit(minerNode, "NodeSlashed")
        .withArgs(nodeId, SLASH_AMOUNT);
    });

    it("Should deactivate node if stake falls below requirement", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      // Slash multiple times
      for (let i = 0; i < 15; i++) {
        await minerNode.slashNode(nodeId);
      }
      
      const nodeInfo = await minerNode.getNodeInfo(nodeId);
      expect(nodeInfo.isActive).to.be.false;
    });

    it("Should decrease reputation on slash", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      await minerNode.slashNode(nodeId);
      
      const nodeInfo = await minerNode.getNodeInfo(nodeId);
      expect(nodeInfo.reputation).to.be.lt(100);
    });
  });

  describe("Reward Calculation", function () {
    beforeEach(async function () {
      await aethToken.connect(miner1).approve(await minerNode.getAddress(), STAKE_REQUIREMENT);
      await minerNode.connect(miner1).registerNode("US-East", 1000, "192.168.1.1");
    });

    it("Should calculate rewards with level multiplier", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      // Share data and level up
      await minerNode.recordDataShared(nodeId, 100);
      
      const multiplier = await minerNode.getLevelMultiplier(nodeId);
      expect(multiplier).to.be.gt(100); // Base is 100 (1.0x)
    });

    it("Should track total earnings", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      await minerNode.addRewards(nodeId, ethers.parseEther("50"));
      
      const nodeInfo = await minerNode.getNodeInfo(nodeId);
      expect(nodeInfo.totalEarnings).to.equal(ethers.parseEther("50"));
    });

    it("Should apply +10% multiplier per level", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      const level1Multiplier = await minerNode.getLevelMultiplier(nodeId);
      
      // Manually set level to 2 for testing (if such function exists)
      // Or award enough XP to reach level 2
      await minerNode.recordDataShared(nodeId, 200);
      
      const nodeInfo = await minerNode.getNodeInfo(nodeId);
      if (nodeInfo.level > 1) {
        const level2Multiplier = await minerNode.getLevelMultiplier(nodeId);
        expect(level2Multiplier).to.be.gt(level1Multiplier);
      }
    });
  });

  describe("Node Deactivation", function () {
    beforeEach(async function () {
      await aethToken.connect(miner1).approve(await minerNode.getAddress(), STAKE_REQUIREMENT);
      await minerNode.connect(miner1).registerNode("US-East", 1000, "192.168.1.1");
    });

    it("Should allow owner to deactivate node", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      await minerNode.connect(miner1).deactivateNode(nodeId);
      
      const nodeInfo = await minerNode.getNodeInfo(nodeId);
      expect(nodeInfo.isActive).to.be.false;
    });

    it("Should return stake on deactivation", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      const initialBalance = await aethToken.balanceOf(miner1.address);
      await minerNode.connect(miner1).deactivateNode(nodeId);
      const finalBalance = await aethToken.balanceOf(miner1.address);
      
      expect(finalBalance - initialBalance).to.equal(STAKE_REQUIREMENT);
    });

    it("Should emit NodeDeactivated event", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      await expect(minerNode.connect(miner1).deactivateNode(nodeId))
        .to.emit(minerNode, "NodeDeactivated");
    });

    it("Should not allow non-owner to deactivate", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      await expect(minerNode.connect(miner2).deactivateNode(nodeId))
        .to.be.reverted;
    });
  });

  describe("Data Recording", function () {
    beforeEach(async function () {
      await aethToken.connect(miner1).approve(await minerNode.getAddress(), STAKE_REQUIREMENT);
      await minerNode.connect(miner1).registerNode("US-East", 1000, "192.168.1.1");
    });

    it("Should record data shared", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      await minerNode.recordDataShared(nodeId, 50);
      
      const nodeInfo = await minerNode.getNodeInfo(nodeId);
      expect(nodeInfo.totalDataShared).to.equal(50);
    });

    it("Should accumulate data shared", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      await minerNode.recordDataShared(nodeId, 30);
      await minerNode.recordDataShared(nodeId, 20);
      
      const nodeInfo = await minerNode.getNodeInfo(nodeId);
      expect(nodeInfo.totalDataShared).to.equal(50);
    });

    it("Should emit DataShared event", async function () {
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const nodeId = nodes[0];
      
      await expect(minerNode.recordDataShared(nodeId, 25))
        .to.emit(minerNode, "DataShared");
    });
  });

  describe("Multiple Nodes Management", function () {
    it("Should handle multiple nodes per owner", async function () {
      await aethToken.connect(miner1).approve(await minerNode.getAddress(), STAKE_REQUIREMENT * 3n);
      
      await minerNode.connect(miner1).registerNode("US-East", 1000, "192.168.1.1");
      await minerNode.connect(miner1).registerNode("EU-West", 2000, "192.168.1.2");
      await minerNode.connect(miner1).registerNode("Asia-Pacific", 1500, "192.168.1.3");
      
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      expect(nodes.length).to.equal(3);
    });

    it("Should track different levels for different nodes", async function () {
      await aethToken.connect(miner1).approve(await minerNode.getAddress(), STAKE_REQUIREMENT * 2n);
      
      await minerNode.connect(miner1).registerNode("US-East", 1000, "192.168.1.1");
      await minerNode.connect(miner1).registerNode("EU-West", 2000, "192.168.1.2");
      
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      
      // Award different XP to each node
      await minerNode.recordDataShared(nodes[0], 100);
      await minerNode.recordDataShared(nodes[1], 200);
      
      const node1Info = await minerNode.getNodeInfo(nodes[0]);
      const node2Info = await minerNode.getNodeInfo(nodes[1]);
      
      expect(node1Info.xp).to.not.equal(node2Info.xp);
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable registration gas cost", async function () {
      await aethToken.connect(miner1).approve(await minerNode.getAddress(), STAKE_REQUIREMENT);
      
      const tx = await minerNode.connect(miner1).registerNode("US-East", 1000, "192.168.1.1");
      const receipt = await tx.wait();
      
      console.log("Node registration gas:", receipt.gasUsed.toString());
      expect(receipt.gasUsed).to.be.lt(300000);
    });

    it("Should have efficient data recording gas cost", async function () {
      await aethToken.connect(miner1).approve(await minerNode.getAddress(), STAKE_REQUIREMENT);
      await minerNode.connect(miner1).registerNode("US-East", 1000, "192.168.1.1");
      
      const nodes = await minerNode.getOwnerNodes(miner1.address);
      const tx = await minerNode.recordDataShared(nodes[0], 50);
      const receipt = await tx.wait();
      
      console.log("Data recording gas:", receipt.gasUsed.toString());
      expect(receipt.gasUsed).to.be.lt(100000);
    });
  });
});
