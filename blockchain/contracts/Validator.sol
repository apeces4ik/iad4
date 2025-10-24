// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./AETHToken.sol";

/**
 * @title Validator
 * @dev Manage network validators with staking and slashing
 */
contract Validator is Ownable {
    AETHToken public aethToken;

    struct ValidatorInfo {
        address validatorAddress;
        uint256 stakedAmount;
        uint256 joinedAt;
        bool isActive;
        uint256 validatedSessions;
        uint256 slashCount;
        uint256 rewards;
    }

    mapping(address => ValidatorInfo) public validators;
    address[] public validatorList;

    uint256 public constant MIN_STAKE = 10000 * 10**18; // 10,000 AETH
    uint256 public constant SLASH_AMOUNT = 1000 * 10**18; // 1,000 AETH
    uint256 public constant VALIDATION_REWARD = 10 * 10**18; // 10 AETH per validation
    uint256 public constant MAX_SLASH_COUNT = 3;

    event ValidatorJoined(address indexed validator, uint256 stakedAmount);
    event ValidatorLeft(address indexed validator);
    event SessionValidated(address indexed validator, bytes32 sessionId, uint256 reward);
    event ValidatorSlashed(address indexed validator, uint256 amount, string reason);

    constructor(address _aethToken) Ownable(msg.sender) {
        aethToken = AETHToken(_aethToken);
    }

    /**
     * @dev Join as a validator by staking tokens
     */
    function joinValidator(uint256 amount) external {
        require(amount >= MIN_STAKE, "Insufficient stake amount");
        require(!validators[msg.sender].isActive, "Already a validator");
        require(aethToken.balanceOf(msg.sender) >= amount, "Insufficient token balance");

        // Transfer stake to contract
        require(aethToken.transferFrom(msg.sender, address(this), amount), "Stake transfer failed");

        validators[msg.sender] = ValidatorInfo({
            validatorAddress: msg.sender,
            stakedAmount: amount,
            joinedAt: block.timestamp,
            isActive: true,
            validatedSessions: 0,
            slashCount: 0,
            rewards: 0
        });

        validatorList.push(msg.sender);

        emit ValidatorJoined(msg.sender, amount);
    }

    /**
     * @dev Leave validator role and withdraw stake
     */
    function leaveValidator() external {
        ValidatorInfo storage validator = validators[msg.sender];
        require(validator.isActive, "Not an active validator");
        require(validator.slashCount < MAX_SLASH_COUNT, "Too many slashes");

        uint256 totalReturn = validator.stakedAmount + validator.rewards;
        validator.isActive = false;

        // Return stake and rewards
        require(aethToken.transfer(msg.sender, totalReturn), "Withdrawal failed");

        emit ValidatorLeft(msg.sender);
    }

    /**
     * @dev Validate a session (called by contract owner/oracle)
     */
    function validateSession(address validatorAddress, bytes32 sessionId) external onlyOwner {
        ValidatorInfo storage validator = validators[validatorAddress];
        require(validator.isActive, "Validator not active");

        validator.validatedSessions++;
        validator.rewards += VALIDATION_REWARD;

        // Mint validation reward
        aethToken.mint(address(this), VALIDATION_REWARD);

        emit SessionValidated(validatorAddress, sessionId, VALIDATION_REWARD);
    }

    /**
     * @dev Slash a validator for misbehavior
     */
    function slashValidator(address validatorAddress, string memory reason) external onlyOwner {
        ValidatorInfo storage validator = validators[validatorAddress];
        require(validator.isActive, "Validator not active");
        require(validator.stakedAmount >= SLASH_AMOUNT, "Insufficient stake to slash");

        validator.stakedAmount -= SLASH_AMOUNT;
        validator.slashCount++;

        // Burn slashed amount
        aethToken.burn(SLASH_AMOUNT);

        // Deactivate if too many slashes
        if (validator.slashCount >= MAX_SLASH_COUNT) {
            validator.isActive = false;
        }

        emit ValidatorSlashed(validatorAddress, SLASH_AMOUNT, reason);
    }

    /**
     * @dev Get active validators
     */
    function getActiveValidators() external view returns (address[] memory) {
        uint256 activeCount = 0;

        // Count active validators
        for (uint256 i = 0; i < validatorList.length; i++) {
            if (validators[validatorList[i]].isActive) {
                activeCount++;
            }
        }

        // Create result array
        address[] memory activeValidators = new address[](activeCount);
        uint256 index = 0;

        for (uint256 i = 0; i < validatorList.length; i++) {
            if (validators[validatorList[i]].isActive) {
                activeValidators[index] = validatorList[i];
                index++;
            }
        }

        return activeValidators;
    }

    /**
     * @dev Get validator info
     */
    function getValidatorInfo(address validatorAddress) external view returns (
        uint256 stakedAmount,
        uint256 joinedAt,
        bool isActive,
        uint256 validatedSessions,
        uint256 slashCount,
        uint256 rewards
    ) {
        ValidatorInfo memory validator = validators[validatorAddress];
        return (
            validator.stakedAmount,
            validator.joinedAt,
            validator.isActive,
            validator.validatedSessions,
            validator.slashCount,
            validator.rewards
        );
    }

    /**
     * @dev Get total number of validators
     */
    function getTotalValidators() external view returns (uint256) {
        return validatorList.length;
    }

    /**
     * @dev Claim accumulated rewards
     */
    function claimRewards() external {
        ValidatorInfo storage validator = validators[msg.sender];
        require(validator.rewards > 0, "No rewards to claim");

        uint256 rewardAmount = validator.rewards;
        validator.rewards = 0;

        require(aethToken.transfer(msg.sender, rewardAmount), "Reward transfer failed");
    }
}