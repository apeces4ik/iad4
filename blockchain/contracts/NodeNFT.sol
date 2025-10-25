// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NodeNFT
 * @dev NFT contract for elite miner nodes with enhanced earning multipliers
 */
contract NodeNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;
    
    // NFT Tiers with earning multipliers
    enum Tier { Bronze, Silver, Gold, Diamond, Legendary }
    
    struct NodeNFTInfo {
        Tier tier;
        uint256 earningMultiplier; // Multiplier in basis points (10000 = 1x, 15000 = 1.5x)
        uint256 mintedAt;
        uint256 lastUpgradeAt;
        bytes32 linkedNodeId; // Associated miner node ID
        bool isActive;
    }
    
    mapping(uint256 => NodeNFTInfo) public nftInfo;
    mapping(bytes32 => uint256) public nodeIdToNFT; // Link node ID to NFT token ID
    mapping(address => uint256[]) public userNFTs;
    
    // Tier requirements and multipliers
    mapping(Tier => uint256) public tierMultiplier;
    mapping(Tier => uint256) public tierRequiredUptime; // In days
    mapping(Tier => uint256) public tierRequiredData; // In GB
    
    // Marketplace
    struct Listing {
        uint256 price;
        address seller;
        bool isActive;
    }
    mapping(uint256 => Listing) public listings;
    
    uint256 public marketplaceFee = 250; // 2.5% fee in basis points
    address public feeCollector;
    
    event NFTMinted(address indexed to, uint256 indexed tokenId, Tier tier, bytes32 nodeId);
    event NFTUpgraded(uint256 indexed tokenId, Tier oldTier, Tier newTier);
    event NFTListed(uint256 indexed tokenId, uint256 price);
    event NFTSold(uint256 indexed tokenId, address indexed from, address indexed to, uint256 price);
    event NFTUnlisted(uint256 indexed tokenId);
    
    constructor(address _feeCollector) ERC721("Aetherium Node NFT", "ANFT") Ownable(msg.sender) {
        feeCollector = _feeCollector;
        
        // Initialize tier multipliers
        tierMultiplier[Tier.Bronze] = 11000; // 1.1x
        tierMultiplier[Tier.Silver] = 12500; // 1.25x
        tierMultiplier[Tier.Gold] = 15000; // 1.5x
        tierMultiplier[Tier.Diamond] = 20000; // 2x
        tierMultiplier[Tier.Legendary] = 30000; // 3x
        
        // Initialize tier requirements (uptime in days)
        tierRequiredUptime[Tier.Bronze] = 30;
        tierRequiredUptime[Tier.Silver] = 90;
        tierRequiredUptime[Tier.Gold] = 180;
        tierRequiredUptime[Tier.Diamond] = 365;
        tierRequiredUptime[Tier.Legendary] = 730;
        
        // Initialize tier requirements (data shared in GB)
        tierRequiredData[Tier.Bronze] = 100;
        tierRequiredData[Tier.Silver] = 500;
        tierRequiredData[Tier.Gold] = 2000;
        tierRequiredData[Tier.Diamond] = 10000;
        tierRequiredData[Tier.Legendary] = 50000;
    }
    
    /**
     * @dev Mint NFT for a qualified node (only owner/minter)
     */
    function mintNodeNFT(
        address to,
        bytes32 nodeId,
        Tier tier,
        string memory tokenURI
    ) external onlyOwner returns (uint256) {
        require(nodeIdToNFT[nodeId] == 0, "Node already has NFT");
        
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        nftInfo[tokenId] = NodeNFTInfo({
            tier: tier,
            earningMultiplier: tierMultiplier[tier],
            mintedAt: block.timestamp,
            lastUpgradeAt: block.timestamp,
            linkedNodeId: nodeId,
            isActive: true
        });
        
        nodeIdToNFT[nodeId] = tokenId;
        userNFTs[to].push(tokenId);
        
        emit NFTMinted(to, tokenId, tier, nodeId);
        return tokenId;
    }
    
    /**
     * @dev Upgrade NFT tier based on node performance
     */
    function upgradeNFT(uint256 tokenId, Tier newTier) external onlyOwner {
        require(_ownerOf(tokenId) != address(0), "NFT does not exist");
        NodeNFTInfo storage info = nftInfo[tokenId];
        require(uint8(newTier) > uint8(info.tier), "Can only upgrade to higher tier");
        
        Tier oldTier = info.tier;
        info.tier = newTier;
        info.earningMultiplier = tierMultiplier[newTier];
        info.lastUpgradeAt = block.timestamp;
        
        emit NFTUpgraded(tokenId, oldTier, newTier);
    }
    
    /**
     * @dev List NFT for sale on marketplace
     */
    function listNFT(uint256 tokenId, uint256 price) external {
        require(ownerOf(tokenId) == msg.sender, "Not NFT owner");
        require(price > 0, "Price must be > 0");
        require(!listings[tokenId].isActive, "Already listed");
        
        listings[tokenId] = Listing({
            price: price,
            seller: msg.sender,
            isActive: true
        });
        
        emit NFTListed(tokenId, price);
    }
    
    /**
     * @dev Unlist NFT from marketplace
     */
    function unlistNFT(uint256 tokenId) external {
        require(listings[tokenId].seller == msg.sender, "Not seller");
        require(listings[tokenId].isActive, "Not listed");
        
        delete listings[tokenId];
        emit NFTUnlisted(tokenId);
    }
    
    /**
     * @dev Buy NFT from marketplace
     */
    function buyNFT(uint256 tokenId) external payable {
        Listing memory listing = listings[tokenId];
        require(listing.isActive, "NFT not for sale");
        require(msg.value >= listing.price, "Insufficient payment");
        
        address seller = listing.seller;
        uint256 price = listing.price;
        
        // Calculate fees
        uint256 fee = (price * marketplaceFee) / 10000;
        uint256 sellerAmount = price - fee;
        
        // Transfer NFT
        _transfer(seller, msg.sender, tokenId);
        
        // Transfer funds
        payable(seller).transfer(sellerAmount);
        payable(feeCollector).transfer(fee);
        
        // Remove listing
        delete listings[tokenId];
        
        // Update user NFT tracking
        _removeFromUserNFTs(seller, tokenId);
        userNFTs[msg.sender].push(tokenId);
        
        emit NFTSold(tokenId, seller, msg.sender, price);
        
        // Refund excess payment
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }
    }
    
    /**
     * @dev Get earning multiplier for a node
     */
    function getNodeMultiplier(bytes32 nodeId) external view returns (uint256) {
        uint256 tokenId = nodeIdToNFT[nodeId];
        if (tokenId == 0 || !nftInfo[tokenId].isActive) {
            return 10000; // 1x default multiplier
        }
        return nftInfo[tokenId].earningMultiplier;
    }
    
    /**
     * @dev Check if node is eligible for NFT upgrade
     */
    function checkUpgradeEligibility(
        bytes32 nodeId,
        uint256 uptimeDays,
        uint256 dataSharedGB
    ) external view returns (bool eligible, Tier nextTier) {
        uint256 tokenId = nodeIdToNFT[nodeId];
        if (tokenId == 0) return (false, Tier.Bronze);
        
        NodeNFTInfo memory info = nftInfo[tokenId];
        Tier currentTier = info.tier;
        
        // Can't upgrade Legendary
        if (currentTier == Tier.Legendary) return (false, Tier.Legendary);
        
        Tier next = Tier(uint8(currentTier) + 1);
        
        if (uptimeDays >= tierRequiredUptime[next] && dataSharedGB >= tierRequiredData[next]) {
            return (true, next);
        }
        
        return (false, next);
    }
    
    /**
     * @dev Get all NFTs owned by an address
     */
    function getUserNFTs(address user) external view returns (uint256[] memory) {
        return userNFTs[user];
    }
    
    /**
     * @dev Get NFT info
     */
    function getNFTInfo(uint256 tokenId) external view returns (
        Tier tier,
        uint256 earningMultiplier,
        uint256 mintedAt,
        uint256 lastUpgradeAt,
        bytes32 linkedNodeId,
        bool isActive,
        string memory uri
    ) {
        NodeNFTInfo memory info = nftInfo[tokenId];
        return (
            info.tier,
            info.earningMultiplier,
            info.mintedAt,
            info.lastUpgradeAt,
            info.linkedNodeId,
            info.isActive,
            tokenURI(tokenId)
        );
    }
    
    /**
     * @dev Get active marketplace listings
     */
    function getActiveListing(uint256 tokenId) external view returns (
        uint256 price,
        address seller,
        bool isActive
    ) {
        Listing memory listing = listings[tokenId];
        return (listing.price, listing.seller, listing.isActive);
    }
    
    /**
     * @dev Internal: Remove token from user's NFT array
     */
    function _removeFromUserNFTs(address user, uint256 tokenId) internal {
        uint256[] storage nfts = userNFTs[user];
        for (uint256 i = 0; i < nfts.length; i++) {
            if (nfts[i] == tokenId) {
                nfts[i] = nfts[nfts.length - 1];
                nfts.pop();
                break;
            }
        }
    }
    
    /**
     * @dev Update marketplace fee (owner only)
     */
    function setMarketplaceFee(uint256 newFee) external onlyOwner {
        require(newFee <= 1000, "Fee too high"); // Max 10%
        marketplaceFee = newFee;
    }
    
    /**
     * @dev Update fee collector (owner only)
     */
    function setFeeCollector(address newCollector) external onlyOwner {
        feeCollector = newCollector;
    }
    
    // Override required functions
    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
