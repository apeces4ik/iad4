// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ReferralProgram
 * @dev MLM-style referral system with multi-level commissions
 */
contract ReferralProgram is Ownable {
    IERC20 public aethToken;
    
    // Referral commission percentages (in basis points, 100 = 1%)
    uint256 public level1Commission = 500; // 5%
    uint256 public level2Commission = 300; // 3%
    uint256 public level3Commission = 200; // 2%
    
    struct ReferralInfo {
        address referrer;
        uint256 totalReferred;
        uint256 totalEarned;
        uint256 level1Referrals;
        uint256 level2Referrals;
        uint256 level3Referrals;
        bool isActive;
    }
    
    struct ReferralStats {
        uint256 pendingRewards;
        uint256 claimedRewards;
        uint256 totalVolume; // Total spending by referrals
    }
    
    mapping(address => ReferralInfo) public referralInfo;
    mapping(address => ReferralStats) public referralStats;
    mapping(address => address[]) public directReferrals; // Level 1
    mapping(address => bool) public hasJoined;
    
    uint256 public totalReferrals;
    uint256 public totalRewardsPaid;
    
    event ReferralRegistered(address indexed user, address indexed referrer);
    event ReferralRewardEarned(address indexed referrer, address indexed user, uint256 amount, uint256 level);
    event RewardsClaimed(address indexed user, uint256 amount);
    event CommissionUpdated(uint256 level, uint256 newCommission);
    
    constructor(address _aethToken) Ownable(msg.sender) {
        aethToken = IERC20(_aethToken);
    }
    
    /**
     * @dev Register user with referral code
     */
    function register(address referrer) external {
        require(!hasJoined[msg.sender], "Already registered");
        require(msg.sender != referrer, "Cannot refer yourself");
        require(hasJoined[referrer] || referrer == owner(), "Invalid referrer");
        
        hasJoined[msg.sender] = true;
        referralInfo[msg.sender].referrer = referrer;
        referralInfo[msg.sender].isActive = true;
        
        // Track referrals at each level
        directReferrals[referrer].push(msg.sender);
        referralInfo[referrer].totalReferred++;
        referralInfo[referrer].level1Referrals++;
        
        // Level 2
        address level2Ref = referralInfo[referrer].referrer;
        if (level2Ref != address(0)) {
            referralInfo[level2Ref].level2Referrals++;
        }
        
        // Level 3
        if (level2Ref != address(0)) {
            address level3Ref = referralInfo[level2Ref].referrer;
            if (level3Ref != address(0)) {
                referralInfo[level3Ref].level3Referrals++;
            }
        }
        
        totalReferrals++;
        emit ReferralRegistered(msg.sender, referrer);
    }
    
    /**
     * @dev Record referral reward when user makes a purchase
     * Called by other contracts when user spends tokens
     */
    function recordPurchase(address user, uint256 amount) external onlyOwner {
        if (!hasJoined[user]) return;
        
        address level1Ref = referralInfo[user].referrer;
        if (level1Ref != address(0) && referralInfo[level1Ref].isActive) {
            uint256 reward1 = (amount * level1Commission) / 10000;
            referralStats[level1Ref].pendingRewards += reward1;
            referralStats[level1Ref].totalVolume += amount;
            referralInfo[level1Ref].totalEarned += reward1;
            emit ReferralRewardEarned(level1Ref, user, reward1, 1);
            
            // Level 2
            address level2Ref = referralInfo[level1Ref].referrer;
            if (level2Ref != address(0) && referralInfo[level2Ref].isActive) {
                uint256 reward2 = (amount * level2Commission) / 10000;
                referralStats[level2Ref].pendingRewards += reward2;
                referralStats[level2Ref].totalVolume += amount;
                referralInfo[level2Ref].totalEarned += reward2;
                emit ReferralRewardEarned(level2Ref, user, reward2, 2);
                
                // Level 3
                address level3Ref = referralInfo[level2Ref].referrer;
                if (level3Ref != address(0) && referralInfo[level3Ref].isActive) {
                    uint256 reward3 = (amount * level3Commission) / 10000;
                    referralStats[level3Ref].pendingRewards += reward3;
                    referralStats[level3Ref].totalVolume += amount;
                    referralInfo[level3Ref].totalEarned += reward3;
                    emit ReferralRewardEarned(level3Ref, user, reward3, 3);
                }
            }
        }
    }
    
    /**
     * @dev Claim pending referral rewards
     */
    function claimRewards() external {
        uint256 pending = referralStats[msg.sender].pendingRewards;
        require(pending > 0, "No rewards to claim");
        
        referralStats[msg.sender].pendingRewards = 0;
        referralStats[msg.sender].claimedRewards += pending;
        totalRewardsPaid += pending;
        
        require(aethToken.transfer(msg.sender, pending), "Transfer failed");
        emit RewardsClaimed(msg.sender, pending);
    }
    
    /**
     * @dev Get referral chain (up to 3 levels)
     */
    function getReferralChain(address user) external view returns (
        address level1,
        address level2,
        address level3
    ) {
        level1 = referralInfo[user].referrer;
        if (level1 != address(0)) {
            level2 = referralInfo[level1].referrer;
            if (level2 != address(0)) {
                level3 = referralInfo[level2].referrer;
            }
        }
    }
    
    /**
     * @dev Get complete referral info
     */
    function getReferralInfo(address user) external view returns (
        address referrer,
        uint256 totalReferred,
        uint256 totalEarned,
        uint256 pendingRewards,
        uint256 claimedRewards,
        uint256 level1Count,
        uint256 level2Count,
        uint256 level3Count,
        bool isActive
    ) {
        ReferralInfo memory info = referralInfo[user];
        ReferralStats memory stats = referralStats[user];
        return (
            info.referrer,
            info.totalReferred,
            info.totalEarned,
            stats.pendingRewards,
            stats.claimedRewards,
            info.level1Referrals,
            info.level2Referrals,
            info.level3Referrals,
            info.isActive
        );
    }
    
    /**
     * @dev Get direct referrals (level 1)
     */
    function getDirectReferrals(address user) external view returns (address[] memory) {
        return directReferrals[user];
    }
    
    /**
     * @dev Calculate potential earnings for a referrer
     */
    function calculatePotentialEarnings(address referrer, uint256 userSpending) external view returns (
        uint256 level1Earnings,
        uint256 level2Earnings,
        uint256 level3Earnings,
        uint256 totalEarnings
    ) {
        level1Earnings = (userSpending * level1Commission) / 10000;
        level2Earnings = (userSpending * level2Commission) / 10000;
        level3Earnings = (userSpending * level3Commission) / 10000;
        totalEarnings = level1Earnings + level2Earnings + level3Earnings;
    }
    
    /**
     * @dev Deactivate referrer (for violations)
     */
    function deactivateReferrer(address user) external onlyOwner {
        referralInfo[user].isActive = false;
    }
    
    /**
     * @dev Reactivate referrer
     */
    function reactivateReferrer(address user) external onlyOwner {
        referralInfo[user].isActive = true;
    }
    
    /**
     * @dev Update commission rates
     */
    function updateCommissions(
        uint256 _level1,
        uint256 _level2,
        uint256 _level3
    ) external onlyOwner {
        require(_level1 + _level2 + _level3 <= 2000, "Total commission too high"); // Max 20%
        
        level1Commission = _level1;
        level2Commission = _level2;
        level3Commission = _level3;
        
        emit CommissionUpdated(1, _level1);
        emit CommissionUpdated(2, _level2);
        emit CommissionUpdated(3, _level3);
    }
    
    /**
     * @dev Get global statistics
     */
    function getGlobalStats() external view returns (
        uint256 _totalReferrals,
        uint256 _totalRewardsPaid,
        uint256 _level1Rate,
        uint256 _level2Rate,
        uint256 _level3Rate
    ) {
        return (
            totalReferrals,
            totalRewardsPaid,
            level1Commission,
            level2Commission,
            level3Commission
        );
    }
    
    /**
     * @dev Emergency withdraw (owner only)
     */
    function emergencyWithdraw(uint256 amount) external onlyOwner {
        require(aethToken.transfer(owner(), amount), "Transfer failed");
    }
    
    /**
     * @dev Fund contract with AETH tokens for rewards
     */
    function fundContract(uint256 amount) external {
        require(aethToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }
}
