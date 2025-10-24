// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IAETHToken {
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function burn(uint256 amount) external;
    function transfer(address recipient, uint256 amount) external returns (bool);
}

/**
 * @title PremiumVPN
 * @dev Manages Premium VPN subscriptions and VPN connection burn mechanism
 */
contract PremiumVPN is Ownable {
    IAETHToken public aethToken;
    
    // Premium subscription durations (in seconds)
    uint256 public constant MONTH = 30 days;
    uint256 public constant YEAR = 365 days;
    
    // Pricing
    uint256 public premiumMonthlyPrice = 1000 * 10**18;  // 1000 AETH
    uint256 public premiumYearlyPrice = 10000 * 10**18;  // 10000 AETH (discount)
    uint256 public burnAmountPerConnection = 10 * 10**18;  // 10 AETH per connection
    
    // Premium users
    struct PremiumInfo {
        bool isActive;
        uint256 expiryTime;
        uint256 subscribedAt;
        uint256 totalConnections;  // Track connections for stats
    }
    
    mapping(address => PremiumInfo) public premiumUsers;
    
    // Connection stats
    struct ConnectionStats {
        uint256 totalConnections;
        uint256 totalBurned;
        uint256 lastConnectionTime;
    }
    
    mapping(address => ConnectionStats) public userStats;
    
    // Global stats
    uint256 public totalBurnedGlobal;
    uint256 public totalConnectionsGlobal;
    uint256 public totalPremiumUsers;
    
    // Events
    event PremiumSubscribed(address indexed user, uint256 duration, uint256 amount, uint256 expiryTime);
    event PremiumRenewed(address indexed user, uint256 newExpiryTime);
    event PremiumExpired(address indexed user);
    event ConnectionBurned(address indexed user, uint256 amount);
    event PriceUpdated(string priceType, uint256 newPrice);
    
    constructor(address _aethToken) Ownable(msg.sender) {
        aethToken = IAETHToken(_aethToken);
    }
    
    /**
     * @dev Subscribe to Premium (monthly)
     */
    function subscribePremiumMonthly() external {
        _subscribePremium(MONTH, premiumMonthlyPrice);
    }
    
    /**
     * @dev Subscribe to Premium (yearly)
     */
    function subscribePremiumYearly() external {
        _subscribePremium(YEAR, premiumYearlyPrice);
    }
    
    /**
     * @dev Internal function to handle premium subscription
     */
    function _subscribePremium(uint256 duration, uint256 price) internal {
        require(price > 0, "Invalid price");
        
        PremiumInfo storage userPremium = premiumUsers[msg.sender];
        
        // Transfer tokens from user
        require(aethToken.transferFrom(msg.sender, address(this), price), "Transfer failed");
        
        // Burn 50% of subscription fee
        uint256 burnAmount = price / 2;
        aethToken.burn(burnAmount);
        totalBurnedGlobal += burnAmount;
        
        // Calculate new expiry time
        uint256 newExpiryTime;
        if (userPremium.isActive && userPremium.expiryTime > block.timestamp) {
            // Extend existing subscription
            newExpiryTime = userPremium.expiryTime + duration;
            emit PremiumRenewed(msg.sender, newExpiryTime);
        } else {
            // New subscription
            newExpiryTime = block.timestamp + duration;
            if (!userPremium.isActive) {
                totalPremiumUsers++;
            }
            emit PremiumSubscribed(msg.sender, duration, price, newExpiryTime);
        }
        
        userPremium.isActive = true;
        userPremium.expiryTime = newExpiryTime;
        userPremium.subscribedAt = block.timestamp;
    }
    
    /**
     * @dev Burn AETH tokens when user connects to VPN (called by backend)
     */
    function burnOnConnect(address user) external onlyOwner returns (bool) {
        // Check if user is premium
        PremiumInfo storage userPremium = premiumUsers[user];
        
        // Check if premium expired
        if (userPremium.isActive && userPremium.expiryTime <= block.timestamp) {
            userPremium.isActive = false;
            totalPremiumUsers--;
            emit PremiumExpired(user);
        }
        
        // Premium users don't need to burn
        if (userPremium.isActive && userPremium.expiryTime > block.timestamp) {
            userPremium.totalConnections++;
            userStats[user].totalConnections++;
            userStats[user].lastConnectionTime = block.timestamp;
            totalConnectionsGlobal++;
            return true;  // No burn for premium
        }
        
        // Non-premium users must burn tokens
        require(aethToken.transferFrom(user, address(this), burnAmountPerConnection), "Burn transfer failed");
        aethToken.burn(burnAmountPerConnection);
        
        // Update stats
        userStats[user].totalConnections++;
        userStats[user].totalBurned += burnAmountPerConnection;
        userStats[user].lastConnectionTime = block.timestamp;
        totalBurnedGlobal += burnAmountPerConnection;
        totalConnectionsGlobal++;
        
        emit ConnectionBurned(user, burnAmountPerConnection);
        return true;
    }
    
    /**
     * @dev Check if user is premium
     */
    function isPremium(address user) external view returns (bool) {
        PremiumInfo memory userPremium = premiumUsers[user];
        return userPremium.isActive && userPremium.expiryTime > block.timestamp;
    }
    
    /**
     * @dev Get premium info for user
     */
    function getPremiumInfo(address user) external view returns (
        bool isActive,
        uint256 expiryTime,
        uint256 subscribedAt,
        uint256 totalConnections,
        uint256 daysRemaining
    ) {
        PremiumInfo memory userPremium = premiumUsers[user];
        uint256 remaining = 0;
        
        if (userPremium.isActive && userPremium.expiryTime > block.timestamp) {
            remaining = (userPremium.expiryTime - block.timestamp) / 1 days;
        }
        
        return (
            userPremium.isActive && userPremium.expiryTime > block.timestamp,
            userPremium.expiryTime,
            userPremium.subscribedAt,
            userPremium.totalConnections,
            remaining
        );
    }
    
    /**
     * @dev Get user connection stats
     */
    function getUserStats(address user) external view returns (
        uint256 totalConnections,
        uint256 totalBurned,
        uint256 lastConnectionTime
    ) {
        ConnectionStats memory stats = userStats[user];
        return (stats.totalConnections, stats.totalBurned, stats.lastConnectionTime);
    }
    
    /**
     * @dev Get global stats
     */
    function getGlobalStats() external view returns (
        uint256 _totalBurnedGlobal,
        uint256 _totalConnectionsGlobal,
        uint256 _totalPremiumUsers
    ) {
        return (totalBurnedGlobal, totalConnectionsGlobal, totalPremiumUsers);
    }
    
    /**
     * @dev Update monthly premium price (only owner)
     */
    function updateMonthlyPrice(uint256 newPrice) external onlyOwner {
        premiumMonthlyPrice = newPrice;
        emit PriceUpdated("monthly", newPrice);
    }
    
    /**
     * @dev Update yearly premium price (only owner)
     */
    function updateYearlyPrice(uint256 newPrice) external onlyOwner {
        premiumYearlyPrice = newPrice;
        emit PriceUpdated("yearly", newPrice);
    }
    
    /**
     * @dev Update burn amount per connection (only owner)
     */
    function updateBurnAmount(uint256 newAmount) external onlyOwner {
        burnAmountPerConnection = newAmount;
        emit PriceUpdated("burnAmount", newAmount);
    }
    
    /**
     * @dev Withdraw remaining AETH (only owner, for treasury)
     */
    function withdrawTreasury(address to, uint256 amount) external onlyOwner {
        require(aethToken.transfer(to, amount), "Withdraw failed");
    }
}
