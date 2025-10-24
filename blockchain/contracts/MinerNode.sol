// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./AETHToken.sol";

/**
 * @title MinerNode
 * @dev Manage VPN miner nodes and their rewards
 */
contract MinerNode is Ownable {
    AETHToken public aethToken;

    struct Node {
        address owner;
        string location;
        uint256 bandwidthMbps;
        uint256 registeredAt;
        bool isActive;
        uint256 totalDataShared; // in MB
        uint256 totalEarnings;
        uint256 reputation; // 0-100 score
    }

    mapping(bytes32 => Node) public nodes; // nodeId => Node
    mapping(address => bytes32[]) public ownerNodes; // owner => nodeIds
    bytes32[] public allNodeIds;

    uint256 public constant MIN_BANDWIDTH = 10; // 10 Mbps minimum
    uint256 public constant REWARD_PER_GB = 1 * 10**18; // 1 AETH per GB
    uint256 public constant MIN_REPUTATION = 50;

    event NodeRegistered(bytes32 indexed nodeId, address indexed owner, string location);
    event NodeDeactivated(bytes32 indexed nodeId);
    event DataShared(bytes32 indexed nodeId, uint256 dataMB, uint256 reward);
    event ReputationUpdated(bytes32 indexed nodeId, uint256 newReputation);

    constructor(address _aethToken) Ownable(msg.sender) {
        aethToken = AETHToken(_aethToken);
    }

    /**
     * @dev Register a new miner node
     */
    function registerNode(string memory location, uint256 bandwidthMbps) external returns (bytes32) {
        require(bandwidthMbps >= MIN_BANDWIDTH, "Bandwidth too low");

        bytes32 nodeId = keccak256(abi.encodePacked(msg.sender, block.timestamp, allNodeIds.length));
        
        nodes[nodeId] = Node({
            owner: msg.sender,
            location: location,
            bandwidthMbps: bandwidthMbps,
            registeredAt: block.timestamp,
            isActive: true,
            totalDataShared: 0,
            totalEarnings: 0,
            reputation: 100 // Start with perfect reputation
        });

        ownerNodes[msg.sender].push(nodeId);
        allNodeIds.push(nodeId);

        emit NodeRegistered(nodeId, msg.sender, location);
        return nodeId;
    }

    /**
     * @dev Record data shared by a node and distribute rewards
     */
    function recordDataShared(bytes32 nodeId, uint256 dataMB) external onlyOwner {
        require(nodes[nodeId].isActive, "Node not active");
        require(dataMB > 0, "Data must be greater than 0");

        Node storage node = nodes[nodeId];
        node.totalDataShared += dataMB;

        // Calculate reward: 1 AETH per GB
        uint256 reward = (dataMB * REWARD_PER_GB) / 1000;
        node.totalEarnings += reward;

        // Mint rewards to node owner
        aethToken.mint(node.owner, reward);

        emit DataShared(nodeId, dataMB, reward);
    }

    /**
     * @dev Update node reputation (based on uptime, quality, etc.)
     */
    function updateReputation(bytes32 nodeId, uint256 newReputation) external onlyOwner {
        require(nodes[nodeId].owner != address(0), "Node does not exist");
        require(newReputation <= 100, "Reputation must be 0-100");

        nodes[nodeId].reputation = newReputation;

        // Deactivate if reputation too low
        if (newReputation < MIN_REPUTATION) {
            nodes[nodeId].isActive = false;
            emit NodeDeactivated(nodeId);
        }

        emit ReputationUpdated(nodeId, newReputation);
    }

    /**
     * @dev Deactivate a node
     */
    function deactivateNode(bytes32 nodeId) external {
        require(nodes[nodeId].owner == msg.sender || msg.sender == owner(), "Not authorized");
        nodes[nodeId].isActive = false;
        emit NodeDeactivated(nodeId);
    }

    /**
     * @dev Get all nodes owned by an address
     */
    function getOwnerNodes(address owner) external view returns (bytes32[] memory) {
        return ownerNodes[owner];
    }

    /**
     * @dev Get active nodes by location
     */
    function getActiveNodesByLocation(string memory location) external view returns (bytes32[] memory) {
        uint256 count = 0;
        
        // Count matching nodes
        for (uint256 i = 0; i < allNodeIds.length; i++) {
            Node memory node = nodes[allNodeIds[i]];
            if (node.isActive && keccak256(bytes(node.location)) == keccak256(bytes(location))) {
                count++;
            }
        }

        // Create result array
        bytes32[] memory result = new bytes32[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allNodeIds.length; i++) {
            Node memory node = nodes[allNodeIds[i]];
            if (node.isActive && keccak256(bytes(node.location)) == keccak256(bytes(location))) {
                result[index] = allNodeIds[i];
                index++;
            }
        }

        return result;
    }

    /**
     * @dev Get node details
     */
    function getNode(bytes32 nodeId) external view returns (
        address owner,
        string memory location,
        uint256 bandwidthMbps,
        bool isActive,
        uint256 totalDataShared,
        uint256 totalEarnings,
        uint256 reputation
    ) {
        Node memory node = nodes[nodeId];
        return (
            node.owner,
            node.location,
            node.bandwidthMbps,
            node.isActive,
            node.totalDataShared,
            node.totalEarnings,
            node.reputation
        );
    }

    /**
     * @dev Get total number of nodes
     */
    function getTotalNodes() external view returns (uint256) {
        return allNodeIds.length;
    }
}