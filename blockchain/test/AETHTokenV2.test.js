const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("AETHTokenV2", function () {
  let aethToken;
  let owner;
  let feeCollector;
  let user1;
  let user2;
  let user3;

  const INITIAL_SUPPLY = ethers.parseEther("1000000000"); // 1 billion
  const MIN_STAKE = ethers.parseEther("100"); // 100 AETH
  const BURN_RATE_PER_MINUTE = ethers.parseEther("0.001"); // 0.001 AETH/min

  beforeEach(async function () {
    [owner, feeCollector, user1, user2, user3] = await ethers.getSigners();
    
    const AETHTokenV2 = await ethers.getContractFactory("AETHTokenV2");
    aethToken = await AETHTokenV2.deploy(feeCollector.address);
    await aethToken.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await aethToken.name()).to.equal("Aetherium Token");
      expect(await aethToken.symbol()).to.equal("AETH");
    });

    it("Should mint initial supply to owner", async function () {
      const ownerBalance = await aethToken.balanceOf(owner.address);
      expect(ownerBalance).to.equal(INITIAL_SUPPLY);
    });

    it("Should set the correct fee collector", async function () {
      expect(await aethToken.feeCollector()).to.equal(feeCollector.address);
    });

    it("Should initialize with correct constants", async function () {
      expect(await aethToken.INITIAL_SUPPLY()).to.equal(INITIAL_SUPPLY);
      expect(await aethToken.MIN_STAKE_AMOUNT()).to.equal(MIN_STAKE);
      expect(await aethToken.burnRatePerMinute()).to.equal(BURN_RATE_PER_MINUTE);
    });

    it("Should have correct APY tiers", async function () {
      expect(await aethToken.TIER1_APY()).to.equal(50);
      expect(await aethToken.TIER2_APY()).to.equal(75);
      expect(await aethToken.TIER3_APY()).to.equal(100);
    });
  });

  describe("Burn for Access", function () {
    beforeEach(async function () {
      // Transfer tokens to user1
      await aethToken.transfer(user1.address, ethers.parseEther("10000"));
    });

    it("Should burn tokens for VPN access", async function () {
      const burnAmount = BURN_RATE_PER_MINUTE * 60n; // 60 minutes
      const initialBalance = await aethToken.balanceOf(user1.address);
      
      await aethToken.connect(user1).burnForAccess(60);
      
      const finalBalance = await aethToken.balanceOf(user1.address);
      expect(initialBalance - finalBalance).to.equal(burnAmount);
    });

    it("Should track total burned per user", async function () {
      await aethToken.connect(user1).burnForAccess(100);
      
      const userBurned = await aethToken.totalBurned(user1.address);
      expect(userBurned).to.equal(BURN_RATE_PER_MINUTE * 100n);
    });

    it("Should track global total burned", async function () {
      await aethToken.connect(user1).burnForAccess(50);
      await aethToken.transfer(user2.address, ethers.parseEther("1000"));
      await aethToken.connect(user2).burnForAccess(30);
      
      const globalBurned = await aethToken.totalBurnedGlobal();
      expect(globalBurned).to.equal(BURN_RATE_PER_MINUTE * 80n);
    });

    it("Should emit BurnedForAccess event", async function () {
      await expect(aethToken.connect(user1).burnForAccess(100))
        .to.emit(aethToken, "BurnedForAccess")
        .withArgs(user1.address, BURN_RATE_PER_MINUTE * 100n, 100);
    });

    it("Should revert if duration is 0", async function () {
      await expect(aethToken.connect(user1).burnForAccess(0))
        .to.be.revertedWith("Minutes must be > 0");
    });

    it("Should revert if insufficient balance", async function () {
      const user1Balance = await aethToken.balanceOf(user1.address);
      const excessiveMinutes = (user1Balance / BURN_RATE_PER_MINUTE) + 1n;
      
      await expect(aethToken.connect(user1).burnForAccess(excessiveMinutes))
        .to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Staking - Tier 1 (6 months, 50% APY)", function () {
    beforeEach(async function () {
      await aethToken.transfer(user1.address, ethers.parseEther("10000"));
    });

    it("Should stake tokens with 6-month lock", async function () {
      const stakeAmount = ethers.parseEther("1000");
      
      await aethToken.connect(user1).stakeWithLock(stakeAmount, 6);
      
      const stake = await aethToken.stakes(user1.address);
      expect(stake.amount).to.equal(stakeAmount);
      expect(stake.tier).to.equal(1);
    });

    it("Should lock tokens for 6 months", async function () {
      await aethToken.connect(user1).stakeWithLock(ethers.parseEther("1000"), 6);
      
      const stake = await aethToken.stakes(user1.address);
      const currentTime = await time.latest();
      const expectedLockTime = currentTime + (6 * 30 * 24 * 60 * 60);
      
      expect(stake.lockUntil).to.be.closeTo(expectedLockTime, 10);
    });

    it("Should emit Staked event", async function () {
      const stakeAmount = ethers.parseEther("1000");
      
      await expect(aethToken.connect(user1).stakeWithLock(stakeAmount, 6))
        .to.emit(aethToken, "Staked");
    });

    it("Should revert if amount below minimum", async function () {
      await expect(aethToken.connect(user1).stakeWithLock(ethers.parseEther("50"), 6))
        .to.be.revertedWith("Amount below minimum");
    });

    it("Should revert if invalid lock period", async function () {
      await expect(aethToken.connect(user1).stakeWithLock(ethers.parseEther("1000"), 3))
        .to.be.revertedWith("Invalid lock period");
    });

    it("Should calculate rewards for Tier 1 (50% APY)", async function () {
      const stakeAmount = ethers.parseEther("1000");
      await aethToken.connect(user1).stakeWithLock(stakeAmount, 6);
      
      // Fast forward 1 year
      await time.increase(365 * 24 * 60 * 60);
      
      const rewards = await aethToken.calculateRewards(user1.address);
      const expectedRewards = (stakeAmount * 50n) / 100n; // 50% APY
      
      expect(rewards).to.be.closeTo(expectedRewards, ethers.parseEther("10"));
    });
  });

  describe("Staking - Tier 2 (12 months, 75% APY)", function () {
    beforeEach(async function () {
      await aethToken.transfer(user1.address, ethers.parseEther("10000"));
    });

    it("Should stake tokens with 12-month lock", async function () {
      const stakeAmount = ethers.parseEther("2000");
      
      await aethToken.connect(user1).stakeWithLock(stakeAmount, 12);
      
      const stake = await aethToken.stakes(user1.address);
      expect(stake.amount).to.equal(stakeAmount);
      expect(stake.tier).to.equal(2);
    });

    it("Should calculate rewards for Tier 2 (75% APY)", async function () {
      const stakeAmount = ethers.parseEther("2000");
      await aethToken.connect(user1).stakeWithLock(stakeAmount, 12);
      
      // Fast forward 1 year
      await time.increase(365 * 24 * 60 * 60);
      
      const rewards = await aethToken.calculateRewards(user1.address);
      const expectedRewards = (stakeAmount * 75n) / 100n; // 75% APY
      
      expect(rewards).to.be.closeTo(expectedRewards, ethers.parseEther("20"));
    });
  });

  describe("Staking - Tier 3 (24 months, 100% APY)", function () {
    beforeEach(async function () {
      await aethToken.transfer(user1.address, ethers.parseEther("10000"));
    });

    it("Should stake tokens with 24-month lock", async function () {
      const stakeAmount = ethers.parseEther("3000");
      
      await aethToken.connect(user1).stakeWithLock(stakeAmount, 24);
      
      const stake = await aethToken.stakes(user1.address);
      expect(stake.amount).to.equal(stakeAmount);
      expect(stake.tier).to.equal(3);
    });

    it("Should calculate rewards for Tier 3 (100% APY)", async function () {
      const stakeAmount = ethers.parseEther("3000");
      await aethToken.connect(user1).stakeWithLock(stakeAmount, 24);
      
      // Fast forward 1 year
      await time.increase(365 * 24 * 60 * 60);
      
      const rewards = await aethToken.calculateRewards(user1.address);
      const expectedRewards = stakeAmount; // 100% APY = doubling
      
      expect(rewards).to.be.closeTo(expectedRewards, ethers.parseEther("30"));
    });
  });

  describe("Unstaking", function () {
    beforeEach(async function () {
      await aethToken.transfer(user1.address, ethers.parseEther("10000"));
      await aethToken.connect(user1).stakeWithLock(ethers.parseEther("1000"), 6);
    });

    it("Should allow unstaking after lock period", async function () {
      // Fast forward 6 months
      await time.increase(6 * 30 * 24 * 60 * 60);
      
      const initialBalance = await aethToken.balanceOf(user1.address);
      await aethToken.connect(user1).unstake();
      const finalBalance = await aethToken.balanceOf(user1.address);
      
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should revert if trying to unstake before lock period", async function () {
      await expect(aethToken.connect(user1).unstake())
        .to.be.revertedWith("Tokens are locked");
    });

    it("Should claim rewards on unstake", async function () {
      // Fast forward 6 months
      await time.increase(6 * 30 * 24 * 60 * 60);
      
      const initialBalance = await aethToken.balanceOf(user1.address);
      await aethToken.connect(user1).unstake();
      const finalBalance = await aethToken.balanceOf(user1.address);
      
      // Should receive staked amount + rewards
      expect(finalBalance).to.be.gt(initialBalance + ethers.parseEther("1000"));
    });

    it("Should emit Unstaked event", async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      
      await expect(aethToken.connect(user1).unstake())
        .to.emit(aethToken, "Unstaked");
    });

    it("Should reset stake after unstaking", async function () {
      await time.increase(6 * 30 * 24 * 60 * 60);
      await aethToken.connect(user1).unstake();
      
      const stake = await aethToken.stakes(user1.address);
      expect(stake.amount).to.equal(0);
    });
  });

  describe("Claim Rewards", function () {
    beforeEach(async function () {
      await aethToken.transfer(user1.address, ethers.parseEther("10000"));
      await aethToken.connect(user1).stakeWithLock(ethers.parseEther("1000"), 12);
    });

    it("Should allow claiming rewards without unstaking", async function () {
      await time.increase(365 * 24 * 60 * 60);
      
      const initialBalance = await aethToken.balanceOf(user1.address);
      await aethToken.connect(user1).claimRewards();
      const finalBalance = await aethToken.balanceOf(user1.address);
      
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should emit RewardsClaimed event", async function () {
      await time.increase(365 * 24 * 60 * 60);
      
      await expect(aethToken.connect(user1).claimRewards())
        .to.emit(aethToken, "RewardsClaimed");
    });

    it("Should keep stake active after claiming", async function () {
      await time.increase(365 * 24 * 60 * 60);
      await aethToken.connect(user1).claimRewards();
      
      const stake = await aethToken.stakes(user1.address);
      expect(stake.amount).to.equal(ethers.parseEther("1000"));
    });

    it("Should update lastClaimTime", async function () {
      await time.increase(365 * 24 * 60 * 60);
      
      const beforeClaim = await aethToken.stakes(user1.address);
      await aethToken.connect(user1).claimRewards();
      const afterClaim = await aethToken.stakes(user1.address);
      
      expect(afterClaim.lastClaimTime).to.be.gt(beforeClaim.lastClaimTime);
    });
  });

  describe("Vesting", function () {
    it("Should create vesting schedule", async function () {
      const vestAmount = ethers.parseEther("100000");
      const duration = 365 * 24 * 60 * 60; // 1 year
      
      await aethToken.createVesting(user1.address, vestAmount, duration);
      
      const vesting = await aethToken.vestingSchedules(user1.address);
      expect(vesting.totalAmount).to.equal(vestAmount);
      expect(vesting.duration).to.equal(duration);
    });

    it("Should emit VestingCreated event", async function () {
      const vestAmount = ethers.parseEther("100000");
      const duration = 365 * 24 * 60 * 60;
      
      await expect(aethToken.createVesting(user1.address, vestAmount, duration))
        .to.emit(aethToken, "VestingCreated")
        .withArgs(user1.address, vestAmount, duration);
    });

    it("Should allow releasing vested tokens gradually", async function () {
      const vestAmount = ethers.parseEther("100000");
      const duration = 365 * 24 * 60 * 60;
      
      await aethToken.createVesting(user1.address, vestAmount, duration);
      
      // Fast forward 6 months (50%)
      await time.increase(duration / 2);
      
      const releasable = await aethToken.releasableAmount(user1.address);
      expect(releasable).to.be.closeTo(vestAmount / 2n, ethers.parseEther("1000"));
    });

    it("Should release vested tokens", async function () {
      const vestAmount = ethers.parseEther("100000");
      const duration = 365 * 24 * 60 * 60;
      
      await aethToken.createVesting(user1.address, vestAmount, duration);
      await time.increase(duration / 2);
      
      const initialBalance = await aethToken.balanceOf(user1.address);
      await aethToken.connect(user1).releaseVesting();
      const finalBalance = await aethToken.balanceOf(user1.address);
      
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should emit VestingReleased event", async function () {
      const vestAmount = ethers.parseEther("100000");
      const duration = 365 * 24 * 60 * 60;
      
      await aethToken.createVesting(user1.address, vestAmount, duration);
      await time.increase(duration / 2);
      
      await expect(aethToken.connect(user1).releaseVesting())
        .to.emit(aethToken, "VestingReleased");
    });

    it("Should not allow releasing more than vested", async function () {
      const vestAmount = ethers.parseEther("100000");
      const duration = 365 * 24 * 60 * 60;
      
      await aethToken.createVesting(user1.address, vestAmount, duration);
      await time.increase(duration);
      
      await aethToken.connect(user1).releaseVesting();
      
      const vesting = await aethToken.vestingSchedules(user1.address);
      expect(vesting.releasedAmount).to.be.lte(vesting.totalAmount);
    });
  });

  describe("Total Staked Tracking", function () {
    it("Should track total staked amount", async function () {
      await aethToken.transfer(user1.address, ethers.parseEther("10000"));
      await aethToken.transfer(user2.address, ethers.parseEther("10000"));
      
      await aethToken.connect(user1).stakeWithLock(ethers.parseEther("1000"), 6);
      await aethToken.connect(user2).stakeWithLock(ethers.parseEther("2000"), 12);
      
      const totalStaked = await aethToken.totalStaked();
      expect(totalStaked).to.equal(ethers.parseEther("3000"));
    });

    it("Should decrease total staked on unstake", async function () {
      await aethToken.transfer(user1.address, ethers.parseEther("10000"));
      await aethToken.connect(user1).stakeWithLock(ethers.parseEther("1000"), 6);
      
      await time.increase(6 * 30 * 24 * 60 * 60);
      await aethToken.connect(user1).unstake();
      
      const totalStaked = await aethToken.totalStaked();
      expect(totalStaked).to.equal(0);
    });
  });

  describe("Gas Optimization Tests", function () {
    it("Should have efficient transfer gas cost", async function () {
      await aethToken.transfer(user1.address, ethers.parseEther("1000"));
      
      const tx = await aethToken.transfer(user2.address, ethers.parseEther("100"));
      const receipt = await tx.wait();
      
      // Should be less than 50K gas as per requirement (строка 143)
      expect(receipt.gasUsed).to.be.lt(50000);
    });

    it("Should have reasonable stake gas cost", async function () {
      await aethToken.transfer(user1.address, ethers.parseEther("10000"));
      
      const tx = await aethToken.connect(user1).stakeWithLock(ethers.parseEther("1000"), 6);
      const receipt = await tx.wait();
      
      console.log("Stake gas used:", receipt.gasUsed.toString());
      expect(receipt.gasUsed).to.be.lt(200000);
    });

    it("Should have reasonable burn gas cost", async function () {
      await aethToken.transfer(user1.address, ethers.parseEther("1000"));
      
      const tx = await aethToken.connect(user1).burnForAccess(100);
      const receipt = await tx.wait();
      
      console.log("Burn gas used:", receipt.gasUsed.toString());
      expect(receipt.gasUsed).to.be.lt(100000);
    });
  });
});
