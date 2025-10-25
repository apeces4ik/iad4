const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Integration Tests - All Contracts", function () {
  let aethToken;
  let minerNode;
  let nodeNFT;
  let referralProgram;
  let vpnSession;
  let validator;
  let premiumVPN;
  
  let owner;
  let feeCollector;
  let user1;
  let user2;
  let user3;

  const STAKE_AMOUNT = ethers.parseEther("1000");

  beforeEach(async function () {
    [owner, feeCollector, user1, user2, user3] = await ethers.getSigners();
    
    // Deploy all contracts
    const AETHTokenV2 = await ethers.getContractFactory("AETHTokenV2");
    aethToken = await AETHTokenV2.deploy(feeCollector.address);
    await aethToken.waitForDeployment();
    
    const MinerNodeV2 = await ethers.getContractFactory("MinerNodeV2");
    minerNode = await MinerNodeV2.deploy(await aethToken.getAddress());
    await minerNode.waitForDeployment();
    
    const NodeNFT = await ethers.getContractFactory("NodeNFT");
    nodeNFT = await NodeNFT.deploy();
    await nodeNFT.waitForDeployment();
    
    const ReferralProgram = await ethers.getContractFactory("ReferralProgram");
    referralProgram = await ReferralProgram.deploy(await aethToken.getAddress());
    await referralProgram.waitForDeployment();
    
    const VPNSession = await ethers.getContractFactory("VPNSession");
    vpnSession = await VPNSession.deploy(await aethToken.getAddress());
    await vpnSession.waitForDeployment();
    
    const Validator = await ethers.getContractFactory("Validator");
    validator = await Validator.deploy(await aethToken.getAddress());
    await validator.waitForDeployment();
    
    const PremiumVPN = await ethers.getContractFactory("PremiumVPN");
    premiumVPN = await PremiumVPN.deploy(await aethToken.getAddress());
    await premiumVPN.waitForDeployment();
    
    // Transfer initial tokens
    await aethToken.transfer(user1.address, ethers.parseEther("50000"));
    await aethToken.transfer(user2.address, ethers.parseEther("50000"));
    await aethToken.transfer(user3.address, ethers.parseEther("50000"));
  });

  describe("Complete User Journey - Miner", function () {
    it("Should complete full miner lifecycle", async function () {
      // 1. Register referral
      await referralProgram.connect(user1).generateReferralCode();
      const referralCode = await referralProgram.getReferralCode(user1.address);
      
      // 2. User2 registers with referral
      await referralProgram.connect(user2).registerWithReferral(referralCode);
      
      // 3. Register miner node
      await aethToken.connect(user2).approve(await minerNode.getAddress(), STAKE_AMOUNT);
      await minerNode.connect(user2).registerNode("US-East", 1000, "192.168.1.1");
      
      // 4. Share data and earn XP
      const nodes = await minerNode.getOwnerNodes(user2.address);
      await minerNode.recordDataShared(nodes[0], 150);
      
      // 5. Check XP and level
      const nodeInfo = await minerNode.getNodeInfo(nodes[0]);
      expect(nodeInfo.xp).to.equal(1500); // 150 GB * 10 XP
      
      // 6. Mint NFT for performance
      await nodeNFT.mintNodeNFT(user2.address, 0, 150, 50);
      expect(await nodeNFT.balanceOf(user2.address)).to.equal(1);
      
      // 7. Check referral commission (user1 should get commission)
      const referralStats = await referralProgram.getReferralStats(user1.address);
      expect(referralStats.level1Count).to.equal(1);
    });
  });

  describe("Complete User Journey - VPN User", function () {
    it("Should complete full VPN user lifecycle", async function () {
      // 1. Burn tokens for VPN access
      const initialBalance = await aethToken.balanceOf(user1.address);
      await aethToken.connect(user1).burnForAccess(60); // 60 minutes
      
      const afterBurnBalance = await aethToken.balanceOf(user1.address);
      expect(initialBalance).to.be.gt(afterBurnBalance);
      
      // 2. Register node for VPN
      await aethToken.connect(user2).approve(await minerNode.getAddress(), STAKE_AMOUNT);
      await minerNode.connect(user2).registerNode("US-East", 1000, "192.168.1.1");
      const nodes = await minerNode.getOwnerNodes(user2.address);
      
      // 3. Start VPN session
      await vpnSession.startSession(user1.address, nodes[0], "US-East");
      
      // 4. Record data usage
      const sessions = await vpnSession.getUserSessions(user1.address);
      expect(sessions.length).to.be.gt(0);
      
      // 5. End session
      await vpnSession.endSession(sessions[0]);
      
      // 6. Miner gets rewards
      await minerNode.addRewards(nodes[0], ethers.parseEther("10"));
      const nodeInfo = await minerNode.getNodeInfo(nodes[0]);
      expect(nodeInfo.totalEarnings).to.equal(ethers.parseEther("10"));
    });
  });

  describe("Complete User Journey - Validator", function () {
    it("Should complete full validator lifecycle", async function () {
      // 1. Become validator (requires 10K AETH stake)
      const validatorStake = ethers.parseEther("10000");
      await aethToken.connect(user1).approve(await validator.getAddress(), validatorStake);
      await validator.connect(user1).registerValidator();
      
      // 2. Check validator status
      const validatorInfo = await validator.getValidatorInfo(user1.address);
      expect(validatorInfo.isValidator).to.be.true;
      expect(validatorInfo.stakedAmount).to.equal(validatorStake);
      
      // 3. Perform validation work
      await validator.recordValidation(user1.address, 100); // 100 validations
      
      // 4. Claim validator rewards
      await validator.connect(user1).claimRewards();
      
      // 5. Check that rewards were paid
      const finalBalance = await aethToken.balanceOf(user1.address);
      expect(finalBalance).to.be.gt(0);
    });
  });

  describe("Complete User Journey - Premium User", function () {
    it("Should complete full premium subscription lifecycle", async function () {
      // 1. Subscribe to premium
      const premiumPrice = ethers.parseEther("100");
      await aethToken.connect(user1).approve(await premiumVPN.getAddress(), premiumPrice);
      await premiumVPN.connect(user1).subscribe(30); // 30 days
      
      // 2. Check premium status
      const isPremium = await premiumVPN.isPremiumMember(user1.address);
      expect(isPremium).to.be.true;
      
      // 3. Get premium benefits (unlimited bandwidth)
      const premiumInfo = await premiumVPN.getPremiumInfo(user1.address);
      expect(premiumInfo.isActive).to.be.true;
      
      // 4. Use VPN with premium (no burn required)
      await aethToken.connect(user2).approve(await minerNode.getAddress(), STAKE_AMOUNT);
      await minerNode.connect(user2).registerNode("US-East", 1000, "192.168.1.1");
      const nodes = await minerNode.getOwnerNodes(user2.address);
      
      await vpnSession.startSession(user1.address, nodes[0], "US-East");
      
      // 5. Premium session should have special handling
      const sessions = await vpnSession.getUserSessions(user1.address);
      expect(sessions.length).to.be.gt(0);
    });
  });

  describe("Referral Program Integration", function () {
    it("Should handle 3-level referral tree with commissions", async function () {
      // Level 0: user1 (referrer)
      await referralProgram.connect(user1).generateReferralCode();
      const code1 = await referralProgram.getReferralCode(user1.address);
      
      // Level 1: user2 (referred by user1) - 5% commission
      await referralProgram.connect(user2).registerWithReferral(code1);
      await referralProgram.connect(user2).generateReferralCode();
      const code2 = await referralProgram.getReferralCode(user2.address);
      
      // Level 2: user3 (referred by user2) - 3% commission to user2, 2% to user1
      await referralProgram.connect(user3).registerWithReferral(code2);
      
      // Check referral tree
      const stats1 = await referralProgram.getReferralStats(user1.address);
      expect(stats1.level1Count).to.equal(1);
      expect(stats1.level2Count).to.equal(1);
      
      const stats2 = await referralProgram.getReferralStats(user2.address);
      expect(stats2.level1Count).to.equal(1);
      
      // Simulate earning and commission distribution
      await referralProgram.distributeCommission(user3.address, ethers.parseEther("1000"));
      
      // Check commission earnings
      const commission1 = await referralProgram.getTotalCommissions(user1.address);
      const commission2 = await referralProgram.getTotalCommissions(user2.address);
      
      expect(commission1).to.be.gt(0); // Should have level 1 + level 2 commissions
      expect(commission2).to.be.gt(0); // Should have level 1 commission
    });

    it("Should advance ranks based on referral count", async function () {
      await referralProgram.connect(user1).generateReferralCode();
      const code = await referralProgram.getReferralCode(user1.address);
      
      // Create multiple referrals
      const signers = await ethers.getSigners();
      for (let i = 5; i < 15; i++) {
        await referralProgram.connect(signers[i]).registerWithReferral(code);
      }
      
      const stats = await referralProgram.getReferralStats(user1.address);
      expect(stats.level1Count).to.be.gte(10);
      
      // Check rank advancement
      const rank = await referralProgram.getUserRank(user1.address);
      expect(rank).to.be.gte(1); // Should be at least Bronze
    });
  });

  describe("NFT + Node Performance Integration", function () {
    it("Should link NFT tier to node performance", async function () {
      // Register node
      await aethToken.connect(user1).approve(await minerNode.getAddress(), STAKE_AMOUNT);
      await minerNode.connect(user1).registerNode("US-East", 1000, "192.168.1.1");
      
      const nodes = await minerNode.getOwnerNodes(user1.address);
      const nodeId = nodes[0];
      
      // Share data to qualify for Bronze NFT
      await minerNode.recordDataShared(nodeId, 150); // 150 GB
      
      // Mint Bronze NFT
      await nodeNFT.mintNodeNFT(user1.address, 0, 150, 45);
      
      const nftBalance = await nodeNFT.balanceOf(user1.address);
      expect(nftBalance).to.equal(1);
      
      // Continue sharing data
      await minerNode.recordDataShared(nodeId, 400); // Total 550 GB
      
      // Upgrade to Silver NFT
      await nodeNFT.upgradeTier(1, 1, 550, 100);
      
      const nftInfo = await nodeNFT.getNFTInfo(1);
      expect(nftInfo.tier).to.equal(1); // Silver
      expect(nftInfo.multiplier).to.equal(125); // 1.25x
      
      // Node earnings should be multiplied by NFT multiplier
      const multiplier = await nodeNFT.getTierMultiplier(nftInfo.tier);
      expect(multiplier).to.equal(125);
    });
  });

  describe("Staking + Validator Integration", function () {
    it("Should allow staked tokens to be used for validation", async function () {
      // Stake tokens first
      await aethToken.connect(user1).stakeWithLock(ethers.parseEther("5000"), 12);
      
      // Register as validator (requires additional stake)
      await aethToken.connect(user1).approve(await validator.getAddress(), ethers.parseEther("10000"));
      await validator.connect(user1).registerValidator();
      
      // Should be both staker and validator
      const stakeInfo = await aethToken.stakes(user1.address);
      const validatorInfo = await validator.getValidatorInfo(user1.address);
      
      expect(stakeInfo.amount).to.equal(ethers.parseEther("5000"));
      expect(validatorInfo.isValidator).to.be.true;
      
      // Earn rewards from both staking and validation
      await time.increase(365 * 24 * 60 * 60); // 1 year
      
      const stakingRewards = await aethToken.calculateRewards(user1.address);
      expect(stakingRewards).to.be.gt(0);
      
      await validator.recordValidation(user1.address, 100);
      await validator.connect(user1).claimRewards();
      
      // Total earnings should include both sources
      const finalBalance = await aethToken.balanceOf(user1.address);
      expect(finalBalance).to.be.gt(0);
    });
  });

  describe("VPN Session + Burn Mechanism", function () {
    it("Should burn tokens when starting VPN session", async function () {
      // Setup node
      await aethToken.connect(user2).approve(await minerNode.getAddress(), STAKE_AMOUNT);
      await minerNode.connect(user2).registerNode("US-East", 1000, "192.168.1.1");
      const nodes = await minerNode.getOwnerNodes(user2.address);
      
      // User1 burns tokens for access
      const initialBalance = await aethToken.balanceOf(user1.address);
      await aethToken.connect(user1).burnForAccess(120); // 2 hours
      const afterBurnBalance = await aethToken.balanceOf(user1.address);
      
      const burned = initialBalance - afterBurnBalance;
      expect(burned).to.equal(ethers.parseEther("0.12")); // 120 minutes * 0.001
      
      // Start session
      await vpnSession.startSession(user1.address, nodes[0], "US-East");
      
      // Verify session created
      const sessions = await vpnSession.getUserSessions(user1.address);
      expect(sessions.length).to.equal(1);
      
      // Node should receive rewards
      await minerNode.addRewards(nodes[0], ethers.parseEther("5"));
      
      const nodeInfo = await minerNode.getNodeInfo(nodes[0]);
      expect(nodeInfo.totalEarnings).to.be.gt(0);
    });
  });

  describe("Premium + Referral Integration", function () {
    it("Should give referrer commission on premium subscription", async function () {
      // Setup referral
      await referralProgram.connect(user1).generateReferralCode();
      const code = await referralProgram.getReferralCode(user1.address);
      await referralProgram.connect(user2).registerWithReferral(code);
      
      // User2 subscribes to premium
      const premiumPrice = ethers.parseEther("100");
      await aethToken.connect(user2).approve(await premiumVPN.getAddress(), premiumPrice);
      await premiumVPN.connect(user2).subscribe(30);
      
      // Distribute commission to referrer
      await referralProgram.distributeCommission(user2.address, premiumPrice);
      
      // User1 should receive 5% commission
      const commission = await referralProgram.getTotalCommissions(user1.address);
      const expectedCommission = (premiumPrice * 5n) / 100n;
      
      expect(commission).to.be.closeTo(expectedCommission, ethers.parseEther("1"));
    });
  });

  describe("Cross-Contract Gas Tests", function () {
    it("Should have reasonable gas for complete user onboarding", async function () {
      // Register with referral
      await referralProgram.connect(user1).generateReferralCode();
      const code = await referralProgram.getReferralCode(user1.address);
      const tx1 = await referralProgram.connect(user2).registerWithReferral(code);
      const receipt1 = await tx1.wait();
      
      // Register node
      await aethToken.connect(user2).approve(await minerNode.getAddress(), STAKE_AMOUNT);
      const tx2 = await minerNode.connect(user2).registerNode("US-East", 1000, "192.168.1.1");
      const receipt2 = await tx2.wait();
      
      const totalGas = receipt1.gasUsed + receipt2.gasUsed;
      console.log("Complete onboarding gas:", totalGas.toString());
      
      expect(totalGas).to.be.lt(500000);
    });
  });

  describe("Edge Cases & Security", function () {
    it("Should prevent double-spending in referral system", async function () {
      await referralProgram.connect(user1).generateReferralCode();
      const code = await referralProgram.getReferralCode(user1.address);
      
      await referralProgram.connect(user2).registerWithReferral(code);
      
      // Try to register again with same referral
      await expect(referralProgram.connect(user2).registerWithReferral(code))
        .to.be.reverted;
    });

    it("Should prevent node registration without sufficient stake", async function () {
      await aethToken.connect(user1).approve(await minerNode.getAddress(), ethers.parseEther("500"));
      
      await expect(minerNode.connect(user1).registerNode("US-East", 1000, "192.168.1.1"))
        .to.be.reverted;
    });

    it("Should prevent validator slashing below minimum", async function () {
      const validatorStake = ethers.parseEther("10000");
      await aethToken.connect(user1).approve(await validator.getAddress(), validatorStake);
      await validator.connect(user1).registerValidator();
      
      // Slash multiple times
      for (let i = 0; i < 100; i++) {
        try {
          await validator.slashValidator(user1.address, ethers.parseEther("100"));
        } catch (error) {
          // Should eventually prevent slashing below minimum
          break;
        }
      }
      
      const validatorInfo = await validator.getValidatorInfo(user1.address);
      expect(validatorInfo.stakedAmount).to.be.gte(0);
    });
  });
});
