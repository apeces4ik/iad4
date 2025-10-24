// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./AETHToken.sol";
import "./MinerNode.sol";

/**
 * @title VPNSession
 * @dev Manage VPN sessions and automatic payments
 */
contract VPNSession is Ownable {
    AETHToken public aethToken;
    MinerNode public minerNode;

    struct Session {
        address user;
        bytes32 nodeId;
        uint256 startTime;
        uint256 endTime;
        uint256 dataUsedMB;
        bool isActive;
        uint256 totalPaid;
    }

    mapping(bytes32 => Session) public sessions; // sessionId => Session
    mapping(address => bytes32[]) public userSessions; // user => sessionIds
    bytes32[] public allSessionIds;

    uint256 public constant COST_PER_GB = 5 * 10**17; // 0.5 AETH per GB
    uint256 public constant MIN_BALANCE = 10 * 10**18; // 10 AETH minimum

    event SessionStarted(bytes32 indexed sessionId, address indexed user, bytes32 indexed nodeId);
    event SessionEnded(bytes32 indexed sessionId, uint256 dataUsedMB, uint256 totalPaid);
    event PaymentProcessed(bytes32 indexed sessionId, uint256 amount, address nodeOwner);

    constructor(address _aethToken, address _minerNode) Ownable(msg.sender) {
        aethToken = AETHToken(_aethToken);
        minerNode = MinerNode(_minerNode);
    }

    /**
     * @dev Start a new VPN session
     */
    function startSession(bytes32 nodeId) external returns (bytes32) {
        require(aethToken.balanceOf(msg.sender) >= MIN_BALANCE, "Insufficient balance");
        
        (address nodeOwner,,,bool isActive,,,) = minerNode.getNode(nodeId);
        require(isActive, "Node not active");
        require(nodeOwner != address(0), "Node does not exist");

        bytes32 sessionId = keccak256(abi.encodePacked(msg.sender, nodeId, block.timestamp));
        
        sessions[sessionId] = Session({
            user: msg.sender,
            nodeId: nodeId,
            startTime: block.timestamp,
            endTime: 0,
            dataUsedMB: 0,
            isActive: true,
            totalPaid: 0
        });

        userSessions[msg.sender].push(sessionId);
        allSessionIds.push(sessionId);

        emit SessionStarted(sessionId, msg.sender, nodeId);
        return sessionId;
    }

    /**
     * @dev End a VPN session and process final payment
     */
    function endSession(bytes32 sessionId, uint256 dataUsedMB) external {
        Session storage session = sessions[sessionId];
        require(session.user == msg.sender || msg.sender == owner(), "Not authorized");
        require(session.isActive, "Session not active");

        session.dataUsedMB = dataUsedMB;
        session.endTime = block.timestamp;
        session.isActive = false;

        // Calculate and process payment
        uint256 payment = (dataUsedMB * COST_PER_GB) / 1000;
        if (payment > 0) {
            _processPayment(sessionId, payment);
        }

        emit SessionEnded(sessionId, dataUsedMB, payment);
    }

    /**
     * @dev Process payment for data usage
     */
    function _processPayment(bytes32 sessionId, uint256 amount) internal {
        Session storage session = sessions[sessionId];
        
        (address nodeOwner,,,,,, ) = minerNode.getNode(session.nodeId);
        require(nodeOwner != address(0), "Invalid node owner");

        // Transfer payment from user to node owner
        require(aethToken.transferFrom(session.user, nodeOwner, amount), "Payment failed");
        
        session.totalPaid += amount;

        // Record data shared for the node
        minerNode.recordDataShared(session.nodeId, session.dataUsedMB);

        emit PaymentProcessed(sessionId, amount, nodeOwner);
    }

    /**
     * @dev Get user's active sessions
     */
    function getUserActiveSessions(address user) external view returns (bytes32[] memory) {
        bytes32[] memory allUserSessions = userSessions[user];
        uint256 activeCount = 0;

        // Count active sessions
        for (uint256 i = 0; i < allUserSessions.length; i++) {
            if (sessions[allUserSessions[i]].isActive) {
                activeCount++;
            }
        }

        // Create result array
        bytes32[] memory activeSessions = new bytes32[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < allUserSessions.length; i++) {
            if (sessions[allUserSessions[i]].isActive) {
                activeSessions[index] = allUserSessions[i];
                index++;
            }
        }

        return activeSessions;
    }

    /**
     * @dev Get session details
     */
    function getSession(bytes32 sessionId) external view returns (
        address user,
        bytes32 nodeId,
        uint256 startTime,
        uint256 endTime,
        uint256 dataUsedMB,
        bool isActive,
        uint256 totalPaid
    ) {
        Session memory session = sessions[sessionId];
        return (
            session.user,
            session.nodeId,
            session.startTime,
            session.endTime,
            session.dataUsedMB,
            session.isActive,
            session.totalPaid
        );
    }

    /**
     * @dev Get all user sessions
     */
    function getUserSessions(address user) external view returns (bytes32[] memory) {
        return userSessions[user];
    }

    /**
     * @dev Update cost per GB (only owner)
     */
    function updateCostPerGB(uint256 newCost) external onlyOwner {
        // Note: This would require making COST_PER_GB non-constant
        // For MVP, cost is fixed
        revert("Cost is fixed for MVP");
    }
}