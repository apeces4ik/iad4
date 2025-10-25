// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/**
 * @title AETHTokenV2
 * @dev Enhanced Aetherium Token with burn mechanism for VPN access, advanced staking, and vesting
 */
contract AETHTokenV2 is ERC20, ERC20Burnable, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 * 10**18; // 1 billion tokens
    uint256 public constant SECONDS_PER_YEAR = 365 days;
    uint256 public constant MIN_STAKE_AMOUNT = 100 * 10**18; // 100 AETH minimum
    
    // Burn rates for VPN access (per minute)
    uint256 public burnRatePerMinute = 0.001 ether; // 0.001 AETH per minute
    
    // Staking tiers with different APY
    uint256 public constant TIER1_APY = 50; // 50% APY for 6+ months lock
    uint256 public constant TIER2_APY = 75; // 75% APY for 12+ months lock
    uint256 public constant TIER3_APY = 100; // 100% APY for 24+ months lock
    
    struct StakeInfo {
        uint256 amount;
        uint256 startTime;
        uint256 lockUntil; // Timestamp when unlock is available
        uint256 lastClaimTime;
        uint8 tier; // 1, 2, or 3
    }
    
    struct VestingSchedule {
        uint256 totalAmount;
        uint256 releasedAmount;
        uint256 startTime;
        uint256 duration;
    }

    mapping(address => StakeInfo) public stakes;
    mapping(address => VestingSchedule) public vestingSchedules;
    mapping(address => uint256) public totalBurned; // Track burned amount per user
    
    uint256 public totalStaked;
    uint256 public totalBurnedGlobal;
    uint256 public transactionFeePercent = 5; // 5% fee on transfers
    address public feeCollector;

    event Staked(address indexed user, uint256 amount, uint8 tier, uint256 lockUntil);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);
    event BurnedForAccess(address indexed user, uint256 amount, uint256 durationMinutes);
    event VestingCreated(address indexed user, uint256 amount, uint256 duration);
    event VestingReleased(address indexed user, uint256 amount);
    event FeeCollected(address indexed from, address indexed to, uint256 amount);

    constructor(address _feeCollector) ERC20("Aetherium Token", "AETH") Ownable(msg.sender) {
        _mint(msg.sender, INITIAL_SUPPLY);
        feeCollector = _feeCollector;
    }

    /**
     * @dev Burn tokens to get VPN access
     * @param durationMinutes Number of minutes of VPN access
     */
    function burnForAccess(uint256 durationMinutes) external {
        require(durationMinutes > 0, "Minutes must be > 0");
        uint256 burnAmount = durationMinutes * burnRatePerMinute;
        require(balanceOf(msg.sender) >= burnAmount, "Insufficient balance");
        
        _burn(msg.sender, burnAmount);
        totalBurned[msg.sender] += burnAmount;
        totalBurnedGlobal += burnAmount;
        
        emit BurnedForAccess(msg.sender, burnAmount, durationMinutes);
    }

    /**
     * @dev Stake tokens with lock period
     * @param amount Amount to stake
     * @param lockMonths Lock period in months (6, 12, or 24)
     */
    function stakeWithLock(uint256 amount, uint256 lockMonths) external {
        require(amount >= MIN_STAKE_AMOUNT, "Amount below minimum");
        require(lockMonths == 6 || lockMonths == 12 || lockMonths == 24, "Invalid lock period");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");

        // Claim any pending rewards first
        if (stakes[msg.sender].amount > 0) {
            _claimRewards(msg.sender);
        }

        _transfer(msg.sender, address(this), amount);

        uint8 tier;
        if (lockMonths == 6) tier = 1;
        else if (lockMonths == 12) tier = 2;
        else tier = 3;

        uint256 lockUntil = block.timestamp + (lockMonths * 30 days);

        stakes[msg.sender].amount += amount;
        stakes[msg.sender].startTime = block.timestamp;
        stakes[msg.sender].lockUntil = lockUntil;
        stakes[msg.sender].lastClaimTime = block.timestamp;
        stakes[msg.sender].tier = tier;
        totalStaked += amount;

        emit Staked(msg.sender, amount, tier, lockUntil);
    }

    /**
     * @dev Unstake tokens (only after lock period)
     */
    function unstake(uint256 amount) external {
        require(amount > 0, "Cannot unstake 0");
        require(stakes[msg.sender].amount >= amount, "Insufficient staked amount");
        require(block.timestamp >= stakes[msg.sender].lockUntil, "Still locked");

        // Claim rewards before unstaking
        _claimRewards(msg.sender);

        stakes[msg.sender].amount -= amount;
        totalStaked -= amount;

        _transfer(address(this), msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    /**
     * @dev Claim staking rewards
     */
    function claimRewards() external {
        require(stakes[msg.sender].amount > 0, "No active stake");
        _claimRewards(msg.sender);
    }

    /**
     * @dev Internal function to calculate and distribute rewards
     */
    function _claimRewards(address user) internal {
        uint256 reward = calculateRewards(user);
        if (reward > 0) {
            stakes[user].lastClaimTime = block.timestamp;
            _mint(user, reward);
            emit RewardsClaimed(user, reward);
        }
    }

    /**
     * @dev Calculate pending rewards based on tier
     */
    function calculateRewards(address user) public view returns (uint256) {
        StakeInfo memory stakeInfo = stakes[user];
        if (stakeInfo.amount == 0) return 0;

        uint256 apy;
        if (stakeInfo.tier == 1) apy = TIER1_APY;
        else if (stakeInfo.tier == 2) apy = TIER2_APY;
        else apy = TIER3_APY;

        uint256 timeStaked = block.timestamp - stakeInfo.lastClaimTime;
        uint256 reward = (stakeInfo.amount * apy * timeStaked) / (100 * SECONDS_PER_YEAR);
        return reward;
    }

    /**
     * @dev Create vesting schedule (for team/advisors)
     */
    function createVesting(address beneficiary, uint256 amount, uint256 durationMonths) external onlyOwner {
        require(vestingSchedules[beneficiary].totalAmount == 0, "Vesting already exists");
        require(amount > 0, "Amount must be > 0");
        
        vestingSchedules[beneficiary] = VestingSchedule({
            totalAmount: amount,
            releasedAmount: 0,
            startTime: block.timestamp,
            duration: durationMonths * 30 days
        });
        
        _transfer(msg.sender, address(this), amount);
        emit VestingCreated(beneficiary, amount, durationMonths);
    }

    /**
     * @dev Release vested tokens
     */
    function releaseVesting() external {
        VestingSchedule storage vesting = vestingSchedules[msg.sender];
        require(vesting.totalAmount > 0, "No vesting schedule");
        
        uint256 releasable = calculateReleasableAmount(msg.sender);
        require(releasable > 0, "No tokens to release");
        
        vesting.releasedAmount += releasable;
        _transfer(address(this), msg.sender, releasable);
        
        emit VestingReleased(msg.sender, releasable);
    }

    /**
     * @dev Calculate releasable vested amount
     */
    function calculateReleasableAmount(address beneficiary) public view returns (uint256) {
        VestingSchedule memory vesting = vestingSchedules[beneficiary];
        if (vesting.totalAmount == 0) return 0;
        
        uint256 elapsed = block.timestamp - vesting.startTime;
        if (elapsed >= vesting.duration) {
            return vesting.totalAmount - vesting.releasedAmount;
        }
        
        uint256 vested = (vesting.totalAmount * elapsed) / vesting.duration;
        return vested - vesting.releasedAmount;
    }

    /**
     * @dev Override transfer to collect 5% fee
     */
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        address from = msg.sender;
        
        // Skip fee for staking/unstaking operations
        if (to == address(this) || from == address(this)) {
            return super.transfer(to, amount);
        }
        
        uint256 fee = (amount * transactionFeePercent) / 100;
        uint256 amountAfterFee = amount - fee;
        
        _transfer(from, to, amountAfterFee);
        _transfer(from, feeCollector, fee);
        
        emit FeeCollected(from, to, fee);
        return true;
    }

    /**
     * @dev Get complete stake info
     */
    function getStakeInfo(address user) external view returns (
        uint256 amount,
        uint256 startTime,
        uint256 lockUntil,
        uint256 pendingRewards,
        uint8 tier,
        bool isLocked
    ) {
        StakeInfo memory stakeInfo = stakes[user];
        return (
            stakeInfo.amount,
            stakeInfo.startTime,
            stakeInfo.lockUntil,
            calculateRewards(user),
            stakeInfo.tier,
            block.timestamp < stakeInfo.lockUntil
        );
    }

    /**
     * @dev Update burn rate (owner only)
     */
    function setBurnRate(uint256 newRate) external onlyOwner {
        burnRatePerMinute = newRate;
    }

    /**
     * @dev Update transaction fee (owner only)
     */
    function setTransactionFee(uint256 newFee) external onlyOwner {
        require(newFee <= 10, "Fee too high");
        transactionFeePercent = newFee;
    }

    /**
     * @dev Update fee collector (owner only)
     */
    function setFeeCollector(address newCollector) external onlyOwner {
        feeCollector = newCollector;
    }

    /**
     * @dev Get user statistics
     */
    function getUserStats(address user) external view returns (
        uint256 balance,
        uint256 stakedAmount,
        uint256 pendingRewards,
        uint256 burnedAmount,
        uint256 vestedAmount,
        uint256 releasableVested
    ) {
        return (
            balanceOf(user),
            stakes[user].amount,
            calculateRewards(user),
            totalBurned[user],
            vestingSchedules[user].totalAmount,
            calculateReleasableAmount(user)
        );
    }

    /**
     * @dev Mint new tokens (only owner - for rewards)
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
