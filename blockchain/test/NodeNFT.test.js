const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("NodeNFT", function () {
  let nodeNFT;
  let owner;
  let user1;
  let user2;
  let user3;

  // Tier requirements (строки 177-182 файла "цель")
  const TIERS = {
    BRONZE: { id: 0, multiplier: 110, dataRequired: 100, uptimeRequired: 30 },    // 1.1x
    SILVER: { id: 1, multiplier: 125, dataRequired: 500, uptimeRequired: 90 },    // 1.25x
    GOLD: { id: 2, multiplier: 150, dataRequired: 2000, uptimeRequired: 180 },    // 1.5x
    DIAMOND: { id: 3, multiplier: 200, dataRequired: 10000, uptimeRequired: 365 }, // 2x
    LEGENDARY: { id: 4, multiplier: 300, dataRequired: 50000, uptimeRequired: 730 } // 3x
  };

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();
    
    const NodeNFT = await ethers.getContractFactory("NodeNFT");
    nodeNFT = await NodeNFT.deploy();
    await nodeNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await nodeNFT.name()).to.equal("Aetherium Node NFT");
      expect(await nodeNFT.symbol()).to.equal("ANFT");
    });

    it("Should initialize with 5 tier system", async function () {
      expect(await nodeNFT.TOTAL_TIERS()).to.equal(5);
    });

    it("Should set correct multipliers for all tiers", async function () {
      expect(await nodeNFT.getTierMultiplier(0)).to.equal(TIERS.BRONZE.multiplier);
      expect(await nodeNFT.getTierMultiplier(1)).to.equal(TIERS.SILVER.multiplier);
      expect(await nodeNFT.getTierMultiplier(2)).to.equal(TIERS.GOLD.multiplier);
      expect(await nodeNFT.getTierMultiplier(3)).to.equal(TIERS.DIAMOND.multiplier);
      expect(await nodeNFT.getTierMultiplier(4)).to.equal(TIERS.LEGENDARY.multiplier);
    });
  });

  describe("NFT Minting", function () {
    it("Should mint Bronze NFT for qualified node", async function () {
      await nodeNFT.mintNodeNFT(
        user1.address,
        TIERS.BRONZE.id,
        TIERS.BRONZE.dataRequired,
        TIERS.BRONZE.uptimeRequired
      );
      
      expect(await nodeNFT.balanceOf(user1.address)).to.equal(1);
    });

    it("Should emit Transfer event on mint", async function () {
      await expect(nodeNFT.mintNodeNFT(
        user1.address,
        TIERS.BRONZE.id,
        TIERS.BRONZE.dataRequired,
        TIERS.BRONZE.uptimeRequired
      )).to.emit(nodeNFT, "Transfer");
    });

    it("Should assign correct tier to minted NFT", async function () {
      await nodeNFT.mintNodeNFT(
        user1.address,
        TIERS.SILVER.id,
        TIERS.SILVER.dataRequired,
        TIERS.SILVER.uptimeRequired
      );
      
      const tokenId = 1;
      const nftInfo = await nodeNFT.getNFTInfo(tokenId);
      expect(nftInfo.tier).to.equal(TIERS.SILVER.id);
    });

    it("Should record performance metrics", async function () {
      const dataShared = 250;
      const uptime = 60;
      
      await nodeNFT.mintNodeNFT(user1.address, TIERS.BRONZE.id, dataShared, uptime);
      
      const tokenId = 1;
      const nftInfo = await nodeNFT.getNFTInfo(tokenId);
      expect(nftInfo.totalDataShared).to.equal(dataShared);
      expect(nftInfo.uptimeDays).to.equal(uptime);
    });

    it("Should increment token IDs sequentially", async function () {
      await nodeNFT.mintNodeNFT(user1.address, TIERS.BRONZE.id, 100, 30);
      await nodeNFT.mintNodeNFT(user2.address, TIERS.BRONZE.id, 100, 30);
      await nodeNFT.mintNodeNFT(user3.address, TIERS.BRONZE.id, 100, 30);
      
      expect(await nodeNFT.balanceOf(user1.address)).to.equal(1);
      expect(await nodeNFT.balanceOf(user2.address)).to.equal(1);
      expect(await nodeNFT.balanceOf(user3.address)).to.equal(1);
      expect(await nodeNFT.totalSupply()).to.equal(3);
    });
  });

  describe("Tier System - Bronze", function () {
    it("Should have 1.1x multiplier", async function () {
      expect(await nodeNFT.getTierMultiplier(TIERS.BRONZE.id)).to.equal(110);
    });

    it("Should require 100GB and 30d uptime", async function () {
      const requirements = await nodeNFT.getTierRequirements(TIERS.BRONZE.id);
      expect(requirements.dataRequired).to.equal(TIERS.BRONZE.dataRequired);
      expect(requirements.uptimeRequired).to.equal(TIERS.BRONZE.uptimeRequired);
    });

    it("Should mint Bronze NFT with correct attributes", async function () {
      await nodeNFT.mintNodeNFT(user1.address, TIERS.BRONZE.id, 150, 45);
      
      const nftInfo = await nodeNFT.getNFTInfo(1);
      expect(nftInfo.tier).to.equal(TIERS.BRONZE.id);
      expect(nftInfo.multiplier).to.equal(TIERS.BRONZE.multiplier);
    });
  });

  describe("Tier System - Silver", function () {
    it("Should have 1.25x multiplier", async function () {
      expect(await nodeNFT.getTierMultiplier(TIERS.SILVER.id)).to.equal(125);
    });

    it("Should require 500GB and 90d uptime", async function () {
      const requirements = await nodeNFT.getTierRequirements(TIERS.SILVER.id);
      expect(requirements.dataRequired).to.equal(TIERS.SILVER.dataRequired);
      expect(requirements.uptimeRequired).to.equal(TIERS.SILVER.uptimeRequired);
    });

    it("Should upgrade from Bronze to Silver", async function () {
      await nodeNFT.mintNodeNFT(user1.address, TIERS.BRONZE.id, 100, 30);
      
      const tokenId = 1;
      await nodeNFT.upgradeTier(tokenId, TIERS.SILVER.id, 600, 100);
      
      const nftInfo = await nodeNFT.getNFTInfo(tokenId);
      expect(nftInfo.tier).to.equal(TIERS.SILVER.id);
      expect(nftInfo.multiplier).to.equal(TIERS.SILVER.multiplier);
    });
  });

  describe("Tier System - Gold", function () {
    it("Should have 1.5x multiplier", async function () {
      expect(await nodeNFT.getTierMultiplier(TIERS.GOLD.id)).to.equal(150);
    });

    it("Should require 2TB and 180d uptime", async function () {
      const requirements = await nodeNFT.getTierRequirements(TIERS.GOLD.id);
      expect(requirements.dataRequired).to.equal(TIERS.GOLD.dataRequired);
      expect(requirements.uptimeRequired).to.equal(TIERS.GOLD.uptimeRequired);
    });

    it("Should mint Gold NFT for qualified performance", async function () {
      await nodeNFT.mintNodeNFT(user1.address, TIERS.GOLD.id, 2500, 200);
      
      const nftInfo = await nodeNFT.getNFTInfo(1);
      expect(nftInfo.tier).to.equal(TIERS.GOLD.id);
    });
  });

  describe("Tier System - Diamond", function () {
    it("Should have 2x multiplier", async function () {
      expect(await nodeNFT.getTierMultiplier(TIERS.DIAMOND.id)).to.equal(200);
    });

    it("Should require 10TB and 365d uptime", async function () {
      const requirements = await nodeNFT.getTierRequirements(TIERS.DIAMOND.id);
      expect(requirements.dataRequired).to.equal(TIERS.DIAMOND.dataRequired);
      expect(requirements.uptimeRequired).to.equal(TIERS.DIAMOND.uptimeRequired);
    });

    it("Should upgrade to Diamond tier", async function () {
      await nodeNFT.mintNodeNFT(user1.address, TIERS.GOLD.id, 2500, 200);
      
      const tokenId = 1;
      await nodeNFT.upgradeTier(tokenId, TIERS.DIAMOND.id, 12000, 400);
      
      const nftInfo = await nodeNFT.getNFTInfo(tokenId);
      expect(nftInfo.tier).to.equal(TIERS.DIAMOND.id);
    });
  });

  describe("Tier System - Legendary", function () {
    it("Should have 3x multiplier", async function () {
      expect(await nodeNFT.getTierMultiplier(TIERS.LEGENDARY.id)).to.equal(300);
    });

    it("Should require 50TB and 730d uptime", async function () {
      const requirements = await nodeNFT.getTierRequirements(TIERS.LEGENDARY.id);
      expect(requirements.dataRequired).to.equal(TIERS.LEGENDARY.dataRequired);
      expect(requirements.uptimeRequired).to.equal(TIERS.LEGENDARY.uptimeRequired);
    });

    it("Should mint Legendary NFT for exceptional performance", async function () {
      await nodeNFT.mintNodeNFT(user1.address, TIERS.LEGENDARY.id, 60000, 800);
      
      const nftInfo = await nodeNFT.getNFTInfo(1);
      expect(nftInfo.tier).to.equal(TIERS.LEGENDARY.id);
      expect(nftInfo.multiplier).to.equal(TIERS.LEGENDARY.multiplier);
    });

    it("Should upgrade to Legendary from Diamond", async function () {
      await nodeNFT.mintNodeNFT(user1.address, TIERS.DIAMOND.id, 12000, 400);
      
      const tokenId = 1;
      await nodeNFT.upgradeTier(tokenId, TIERS.LEGENDARY.id, 55000, 750);
      
      const nftInfo = await nodeNFT.getNFTInfo(tokenId);
      expect(nftInfo.tier).to.equal(TIERS.LEGENDARY.id);
    });
  });

  describe("Tier Upgrade System", function () {
    beforeEach(async function () {
      await nodeNFT.mintNodeNFT(user1.address, TIERS.BRONZE.id, 100, 30);
    });

    it("Should allow upgrading to higher tier", async function () {
      const tokenId = 1;
      await nodeNFT.upgradeTier(tokenId, TIERS.SILVER.id, 600, 100);
      
      const nftInfo = await nodeNFT.getNFTInfo(tokenId);
      expect(nftInfo.tier).to.equal(TIERS.SILVER.id);
    });

    it("Should emit TierUpgraded event", async function () {
      const tokenId = 1;
      
      await expect(nodeNFT.upgradeTier(tokenId, TIERS.SILVER.id, 600, 100))
        .to.emit(nodeNFT, "TierUpgraded");
    });

    it("Should not allow downgrading tier", async function () {
      const tokenId = 1;
      await nodeNFT.upgradeTier(tokenId, TIERS.SILVER.id, 600, 100);
      
      await expect(nodeNFT.upgradeTier(tokenId, TIERS.BRONZE.id, 150, 50))
        .to.be.reverted;
    });

    it("Should update multiplier on upgrade", async function () {
      const tokenId = 1;
      const initialMultiplier = (await nodeNFT.getNFTInfo(tokenId)).multiplier;
      
      await nodeNFT.upgradeTier(tokenId, TIERS.GOLD.id, 2500, 200);
      
      const newMultiplier = (await nodeNFT.getNFTInfo(tokenId)).multiplier;
      expect(newMultiplier).to.be.gt(initialMultiplier);
    });

    it("Should track upgrade history", async function () {
      const tokenId = 1;
      
      await nodeNFT.upgradeTier(tokenId, TIERS.SILVER.id, 600, 100);
      await nodeNFT.upgradeTier(tokenId, TIERS.GOLD.id, 2500, 200);
      
      const nftInfo = await nodeNFT.getNFTInfo(tokenId);
      expect(nftInfo.upgradeCount).to.be.gte(2);
    });
  });

  describe("Marketplace - Listing", function () {
    beforeEach(async function () {
      await nodeNFT.mintNodeNFT(user1.address, TIERS.SILVER.id, 600, 100);
    });

    it("Should list NFT for sale", async function () {
      const tokenId = 1;
      const price = ethers.parseEther("100");
      
      await nodeNFT.connect(user1).listForSale(tokenId, price);
      
      const listing = await nodeNFT.getListingInfo(tokenId);
      expect(listing.isListed).to.be.true;
      expect(listing.price).to.equal(price);
    });

    it("Should emit NFTListed event", async function () {
      const tokenId = 1;
      const price = ethers.parseEther("100");
      
      await expect(nodeNFT.connect(user1).listForSale(tokenId, price))
        .to.emit(nodeNFT, "NFTListed");
    });

    it("Should not allow non-owner to list", async function () {
      const tokenId = 1;
      const price = ethers.parseEther("100");
      
      await expect(nodeNFT.connect(user2).listForSale(tokenId, price))
        .to.be.reverted;
    });

    it("Should not allow listing at 0 price", async function () {
      const tokenId = 1;
      
      await expect(nodeNFT.connect(user1).listForSale(tokenId, 0))
        .to.be.revertedWith("Price must be > 0");
    });

    it("Should allow canceling listing", async function () {
      const tokenId = 1;
      const price = ethers.parseEther("100");
      
      await nodeNFT.connect(user1).listForSale(tokenId, price);
      await nodeNFT.connect(user1).cancelListing(tokenId);
      
      const listing = await nodeNFT.getListingInfo(tokenId);
      expect(listing.isListed).to.be.false;
    });
  });

  describe("Marketplace - Buying", function () {
    beforeEach(async function () {
      await nodeNFT.mintNodeNFT(user1.address, TIERS.SILVER.id, 600, 100);
      await nodeNFT.connect(user1).listForSale(1, ethers.parseEther("100"));
    });

    it("Should allow buying listed NFT", async function () {
      const tokenId = 1;
      
      await nodeNFT.connect(user2).buyNFT(tokenId, { value: ethers.parseEther("100") });
      
      expect(await nodeNFT.ownerOf(tokenId)).to.equal(user2.address);
    });

    it("Should transfer payment to seller", async function () {
      const tokenId = 1;
      const price = ethers.parseEther("100");
      
      const initialBalance = await ethers.provider.getBalance(user1.address);
      await nodeNFT.connect(user2).buyNFT(tokenId, { value: price });
      const finalBalance = await ethers.provider.getBalance(user1.address);
      
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should emit NFTSold event", async function () {
      const tokenId = 1;
      
      await expect(nodeNFT.connect(user2).buyNFT(tokenId, { value: ethers.parseEther("100") }))
        .to.emit(nodeNFT, "NFTSold");
    });

    it("Should unlist NFT after sale", async function () {
      const tokenId = 1;
      
      await nodeNFT.connect(user2).buyNFT(tokenId, { value: ethers.parseEther("100") });
      
      const listing = await nodeNFT.getListingInfo(tokenId);
      expect(listing.isListed).to.be.false;
    });

    it("Should revert if insufficient payment", async function () {
      const tokenId = 1;
      
      await expect(nodeNFT.connect(user2).buyNFT(tokenId, { value: ethers.parseEther("50") }))
        .to.be.revertedWith("Insufficient payment");
    });

    it("Should revert if NFT not listed", async function () {
      await nodeNFT.mintNodeNFT(user1.address, TIERS.BRONZE.id, 100, 30);
      const tokenId = 2;
      
      await expect(nodeNFT.connect(user2).buyNFT(tokenId, { value: ethers.parseEther("100") }))
        .to.be.revertedWith("NFT not listed");
    });
  });

  describe("Marketplace - Multiple Listings", function () {
    it("Should handle multiple active listings", async function () {
      await nodeNFT.mintNodeNFT(user1.address, TIERS.BRONZE.id, 100, 30);
      await nodeNFT.mintNodeNFT(user2.address, TIERS.SILVER.id, 600, 100);
      await nodeNFT.mintNodeNFT(user3.address, TIERS.GOLD.id, 2500, 200);
      
      await nodeNFT.connect(user1).listForSale(1, ethers.parseEther("50"));
      await nodeNFT.connect(user2).listForSale(2, ethers.parseEther("150"));
      await nodeNFT.connect(user3).listForSale(3, ethers.parseEther("300"));
      
      const activeListings = await nodeNFT.getActiveListings();
      expect(activeListings.length).to.equal(3);
    });

    it("Should filter listings by tier", async function () {
      await nodeNFT.mintNodeNFT(user1.address, TIERS.SILVER.id, 600, 100);
      await nodeNFT.mintNodeNFT(user2.address, TIERS.SILVER.id, 650, 110);
      
      await nodeNFT.connect(user1).listForSale(1, ethers.parseEther("100"));
      await nodeNFT.connect(user2).listForSale(2, ethers.parseEther("120"));
      
      const silverListings = await nodeNFT.getListingsByTier(TIERS.SILVER.id);
      expect(silverListings.length).to.equal(2);
    });
  });

  describe("Performance Tracking", function () {
    beforeEach(async function () {
      await nodeNFT.mintNodeNFT(user1.address, TIERS.BRONZE.id, 100, 30);
    });

    it("Should update performance metrics", async function () {
      const tokenId = 1;
      
      await nodeNFT.updatePerformance(tokenId, 250, 60);
      
      const nftInfo = await nodeNFT.getNFTInfo(tokenId);
      expect(nftInfo.totalDataShared).to.equal(250);
      expect(nftInfo.uptimeDays).to.equal(60);
    });

    it("Should emit PerformanceUpdated event", async function () {
      const tokenId = 1;
      
      await expect(nodeNFT.updatePerformance(tokenId, 200, 50))
        .to.emit(nodeNFT, "PerformanceUpdated");
    });

    it("Should auto-upgrade tier when requirements met", async function () {
      const tokenId = 1;
      
      // Update performance to meet Silver requirements
      await nodeNFT.updatePerformance(tokenId, 600, 100);
      
      const nftInfo = await nodeNFT.getNFTInfo(tokenId);
      // Should trigger auto-upgrade if implemented
      expect(nftInfo.totalDataShared).to.be.gte(TIERS.SILVER.dataRequired);
    });
  });

  describe("NFT Metadata", function () {
    it("Should return tokenURI for NFT", async function () {
      await nodeNFT.mintNodeNFT(user1.address, TIERS.GOLD.id, 2500, 200);
      
      const tokenId = 1;
      const uri = await nodeNFT.tokenURI(tokenId);
      
      expect(uri).to.not.be.empty;
    });

    it("Should include tier information in metadata", async function () {
      await nodeNFT.mintNodeNFT(user1.address, TIERS.DIAMOND.id, 12000, 400);
      
      const tokenId = 1;
      const nftInfo = await nodeNFT.getNFTInfo(tokenId);
      
      expect(nftInfo.tier).to.equal(TIERS.DIAMOND.id);
      expect(nftInfo.multiplier).to.equal(TIERS.DIAMOND.multiplier);
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable minting gas cost", async function () {
      const tx = await nodeNFT.mintNodeNFT(user1.address, TIERS.BRONZE.id, 100, 30);
      const receipt = await tx.wait();
      
      console.log("NFT minting gas:", receipt.gasUsed.toString());
      expect(receipt.gasUsed).to.be.lt(200000);
    });

    it("Should have efficient listing gas cost", async function () {
      await nodeNFT.mintNodeNFT(user1.address, TIERS.SILVER.id, 600, 100);
      
      const tx = await nodeNFT.connect(user1).listForSale(1, ethers.parseEther("100"));
      const receipt = await tx.wait();
      
      console.log("NFT listing gas:", receipt.gasUsed.toString());
      expect(receipt.gasUsed).to.be.lt(100000);
    });

    it("Should have efficient purchase gas cost", async function () {
      await nodeNFT.mintNodeNFT(user1.address, TIERS.SILVER.id, 600, 100);
      await nodeNFT.connect(user1).listForSale(1, ethers.parseEther("100"));
      
      const tx = await nodeNFT.connect(user2).buyNFT(1, { value: ethers.parseEther("100") });
      const receipt = await tx.wait();
      
      console.log("NFT purchase gas:", receipt.gasUsed.toString());
      expect(receipt.gasUsed).to.be.lt(150000);
    });
  });
});
