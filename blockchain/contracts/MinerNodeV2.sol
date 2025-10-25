// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./AETHToken.sol";

/**
 * @title MinerNodeV2
 * @dev Enhanced Miner Node contract with levels, slashing, and progressive rewards
 */
contract MinerNodeV2 is Ownable {
    AETHToken public aethToken;
    address public nodeNFTContract;
    
    // Node levels with increasing benefits
    uint256 public constant MAX_LEVEL = 10;
    
    struct Node {
        address owner;
        string location;
        uint256 bandwidthMbps;
        uint256 registeredAt;
        bool isActive;
        uint256 totalDataShared; // in MB
        uint256 totalEarnings;
        uint256 reputation; // 0-100 score
        uint256 level; // 1-10
        uint256 experiencePoints; // XP for leveling up
        uint256 consecutiveUptimeDays;
        uint256 lastActiveTimestamp;
        uint256 totalDowntime; // in seconds
        uint256 slashedAmount; // Total amount slashed for violations
    }
    
    struct LevelRequirements {
        uint256 xpRequired;
        uint256 dataSharedGB;
        uint256 minUptime;
    }
    
    mapping(bytes32 => Node) public nodes;
    mapping(address => bytes32[]) public ownerNodes;
    mapping(uint256 => LevelRequirements) public levelRequirements;
    mapping(bytes32 => uint256) public nodeStake; // Required stake per node
    
    bytes32[] public allNodeIds;
    
    uint256 public constant MIN_BANDWIDTH = 10; // 10 Mbps
    uint256 public constant BASE_REWARD_PER_GB = 1 * 10**18; // 1 AETH per GB base
    uint256 public constant MIN_REPUTATION = 50;
    uint256 public constant REQUIRED_STAKE = 1000 * 10**18; // 1000 AETH stake
    uint256 public constant SLASH_AMOUNT = 100 * 10**18; // 100 AETH per violation
    uint256 public constant XP_PER_GB = 10; // 10 XP per GB shared
    
    // Commission for platform (basis points)
    uint256 public platformCommission = 500; // 5%
    address public platformFeeCollector;
    
    event NodeRegistered(bytes32 indexed nodeId, address indexed owner, string location);
    event NodeDeactivated(bytes32 indexed nodeId);
    event DataShared(bytes32 indexed nodeId, uint256 dataMB, uint256 reward, uint256 commission);
    event ReputationUpdated(bytes32 indexed nodeId, uint256 oldReputation, uint256 newReputation);
    event NodeLevelUp(bytes32 indexed nodeId, uint256 newLevel);
    event NodeSlashed(bytes32 indexed nodeId, uint256 amount, string reason);
    event StakeDeposited(bytes32 indexed nodeId, uint256 amount);
    event StakeWithdrawn(bytes32 indexed nodeId, uint256 amount);
    
    constructor(address _aethToken, address _feeCollector) Ownable(msg.sender) {
        aethToken = AETHToken(_aethToken);
        platformFeeCollector = _feeCollector;
        
        // Initialize level requirements
        levelRequirements[1] = LevelRequirements(0, 0, 0);
        levelRequirements[2] = LevelRequirements(100, 10, 90);
        levelRequirements[3] = LevelRequirements(300, 50, 95);
        levelRequirements[4] = LevelRequirements(600, 100, 97);
        levelRequirements[5] = LevelRequirements(1000, 250, 98);
        levelRequirements[6] = LevelRequirements(1500, 500, 99);
        levelRequirements[7] = LevelRequirements(2200, 1000, 99);
        levelRequirements[8] = LevelRequirements(3000, 2500, 99);
        levelRequirements[9] = LevelRequirements(4000, 5000, 99);
        levelRequirements[10] = LevelRequirements(5500, 10000, 100);
    }
    
    /**
     * @dev Register a new miner node with stake
     */
    function registerNode(string memory location, uint256 bandwidthMbps) external returns (bytes32) {
        require(bandwidthMbps >= MIN_BANDWIDTH, "Bandwidth too low");
        
        // Require stake deposit
        require(
            aethToken.transferFrom(msg.sender, address(this), REQUIRED_STAKE),
            "Stake transfer failed"
        );
        
        bytes32 nodeId = keccak256(abi.encodePacked(msg.sender, block.timestamp, allNodeIds.length));
        
        nodes[nodeId] = Node({
            owner: msg.sender,
            location: location,
            bandwidthMbps: bandwidthMbps,
            registeredAt: block.timestamp,
            isActive: true,
            totalDataShared: 0,
            totalEarnings: 0,
            reputation: 100,
            level: 1,
            experiencePoints: 0,
            consecutiveUptimeDays: 0,
            lastActiveTimestamp: block.timestamp,
            totalDowntime: 0,
            slashedAmount: 0
        });
        
        nodeStake[nodeId] = REQUIRED_STAKE;
        ownerNodes[msg.sender].push(nodeId);
        allNodeIds.push(nodeId);
        
        emit NodeRegistered(nodeId, msg.sender, location);
        emit StakeDeposited(nodeId, REQUIRED_STAKE);
        return nodeId;
    }
    
    /**
     * @dev Record data shared and distribute rewards with level multipliers
     */
    function recordDataShared(bytes32 nodeId, uint256 dataMB) external onlyOwner {
        require(nodes[nodeId].isActive, "Node not active");
        require(dataMB > 0, "Data must be > 0");
        
        Node storage node = nodes[nodeId];
        node.totalDataShared += dataMB;
        node.lastActiveTimestamp = block.timestamp;
        
        // Calculate base reward
        uint256 baseReward = (dataMB * BASE_REWARD_PER_GB) / 1000;
        
        // Apply level multiplier (10% per level)
        uint256 levelMultiplier = 100 + (node.level * 10);
        uint256 rewardWithLevel = (baseReward * levelMultiplier) / 100;
        
        // Apply NFT multiplier if exists
        if (nodeNFTContract != address(0)) {
            // This would call NodeNFT.getNodeMultiplier(nodeId)
            // For now, use base multiplier
        }
        
        // Calculate platform commission
        uint256 commission = (rewardWithLevel * platformCommission) / 10000;
        uint256 nodeReward = rewardWithLevel - commission;
        
        node.totalEarnings += nodeReward;
        
        // Add experience points
        uint256 xpGained = dataMB * XP_PER_GB / 1000;
        node.experiencePoints += xpGained;
        
        // Check for level up
        _checkLevelUp(nodeId);
        
        // Mint rewards
        aethToken.mint(node.owner, nodeReward);
        aethToken.mint(platformFeeCollector, commission);
        
        emit DataShared(nodeId, dataMB, nodeReward, commission);
    }
    
    /**
     * @dev Internal function to check and process level up
     */
    function _checkLevelUp(bytes32 nodeId) internal {
        Node storage node = nodes[nodeId];
        if (node.level >= MAX_LEVEL) return;
        
        uint256 nextLevel = node.level + 1;
        LevelRequirements memory req = levelRequirements[nextLevel];
        
        uint256 uptimePercent = calculateUptimePercent(nodeId);
        uint256 dataSharedGB = node.totalDataShared / 1000;
        
        if (
            node.experiencePoints >= req.xpRequired &&
            dataSharedGB >= req.dataSharedGB &&
            uptimePercent >= req.minUptime
        ) {
            node.level = nextLevel;
            emit NodeLevelUp(nodeId, nextLevel);
        }
    }
    
    /**
     * @dev Slash node for violations (downtime, fraud, etc.)
     */
    function slashNode(bytes32 nodeId, string memory reason) external onlyOwner {
        require(nodes[nodeId].isActive, "Node not active");
        require(nodeStake[nodeId] >= SLASH_AMOUNT, "Insufficient stake");
        
        Node storage node = nodes[nodeId];
        nodeStake[nodeId] -= SLASH_AMOUNT;
        node.slashedAmount += SLASH_AMOUNT;
        
        // Reduce reputation
        if (node.reputation >= 10) {
            uint256 oldReputation = node.reputation;
            node.reputation -= 10;
            emit ReputationUpdated(nodeId, oldReputation, node.reputation);
        }
        
        // Transfer slashed amount to platform
        require(aethToken.transfer(platformFeeCollector, SLASH_AMOUNT), "Slash transfer failed");
        
        emit NodeSlashed(nodeId, SLASH_AMOUNT, reason);
        
        // Deactivate if stake too low
        if (nodeStake[nodeId] < REQUIRED_STAKE / 2) {
            node.isActive = false;
            emit NodeDeactivated(nodeId);
        }
    }
    
    /**
     * @dev Deposit additional stake
     */
    function depositStake(bytes32 nodeId, uint256 amount) external {
        require(nodes[nodeId].owner == msg.sender, "Not node owner");
        require(amount > 0, "Amount must be > 0");
        
        require(aethToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        nodeStake[nodeId] += amount;
        
        // Reactivate if was deactivated
        if (!nodes[nodeId].isActive && nodeStake[nodeId] >= REQUIRED_STAKE) {
            nodes[nodeId].isActive = true;
        }
        
        emit StakeDeposited(nodeId, amount);
    }
    
    /**
     * @dev Withdraw stake (only if node is deactivated)
     */
    function withdrawStake(bytes32 nodeId) external {
        require(nodes[nodeId].owner == msg.sender, "Not node owner");
        require(!nodes[nodeId].isActive, "Node still active");
        
        uint256 stake = nodeStake[nodeId];
        require(stake > 0, "No stake to withdraw");
        
        nodeStake[nodeId] = 0;
        require(aethToken.transfer(msg.sender, stake), "Transfer failed");
        
        emit StakeWithdrawn(nodeId, stake);
    }
    
    /**
     * @dev Update node reputation (only owner)
     */
    function updateReputation(bytes32 nodeId, uint256 newReputation) external onlyOwner {
        require(newReputation <= 100, "Reputation max 100");
        uint256 oldReputation = nodes[nodeId].reputation;
        nodes[nodeId].reputation = newReputation;
        emit ReputationUpdated(nodeId, oldReputation, newReputation);
    }
    
    /**
     * @dev Calculate uptime percentage
     */
    function calculateUptimePercent(bytes32 nodeId) public view returns (uint256) {
        Node memory node = nodes[nodeId];
        uint256 totalTime = block.timestamp - node.registeredAt;
        if (totalTime == 0) return 100;
        
        uint256 activeTime = totalTime - node.totalDowntime;
        return (activeTime * 100) / totalTime;
    }
    
    /**
     * @dev Deactivate node
     */
    function deactivateNode(bytes32 nodeId) external {
        require(nodes[nodeId].owner == msg.sender, "Not node owner");
        nodes[nodeId].isActive = false;
        emit NodeDeactivated(nodeId);
    }
    
    /**
     * @dev Get node info
     */
    function getNodeInfo(bytes32 nodeId) external view returns (
        address owner,
        string memory location,
        uint256 bandwidthMbps,
        bool isActive,
        uint256 totalDataShared,
        uint256 totalEarnings,
        uint256 reputation,
        uint256 level,
        uint256 experiencePoints,
        uint256 uptimePercent,
        uint256 stake
    ) {
        Node memory node = nodes[nodeId];
        return (
            node.owner,
            node.location,
            node.bandwidthMbps,
            node.isActive,
            node.totalDataShared,
            node.totalEarnings,
            node.reputation,
            node.level,
            node.experiencePoints,
            calculateUptimePercent(nodeId),
            nodeStake[nodeId]
        );
    }
    
    /**
     * @dev Get nodes by owner
     */
    function getNodesByOwner(address owner) external view returns (bytes32[] memory) {
        return ownerNodes[owner];
    }
    
    /**
     * @dev Get all node IDs
     */
    function getAllNodes() external view returns (bytes32[] memory) {
        return allNodeIds;
    }
    
    /**
     * @dev Get active nodes by reputation
     */
    function getActiveNodesByReputation(uint256 minReputation) external view returns (bytes32[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < allNodeIds.length; i++) {
            if (nodes[allNodeIds[i]].isActive && nodes[allNodeIds[i]].reputation >= minReputation) {
                count++;
            }
        }
        
        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < allNodeIds.length; i++) {
            if (nodes[allNodeIds[i]].isActive && nodes[allNodeIds[i]].reputation >= minReputation) {
                result[index] = allNodeIds[i];
                index++;
            }
        }
        
        return result;
    }
    
    /**
     * @dev Set NFT contract address
     */
    function setNodeNFTContract(address _nodeNFT) external onlyOwner {
        nodeNFTContract = _nodeNFT;
    }
    
    /**
     * @dev Update platform commission
     */
    function setPlatformCommission(uint256 newCommission) external onlyOwner {
        require(newCommission <= 1000, "Commission too high"); // Max 10%
        platformCommission = newCommission;
    }
    
    /**
     * @dev Update fee collector
     */
    function setFeeCollector(address newCollector) external onlyOwner {
        platformFeeCollector = newCollector;
    }
}
