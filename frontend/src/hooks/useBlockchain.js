import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACTS, ABIS } from "../contracts";

/**
 * Hook for reading AETH Token data
 */
export function useAETHToken(address) {
  // Get balance
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.AETHToken,
    abi: ABIS.AETHToken,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  // Get stake info
  const { data: stakeInfo, refetch: refetchStakeInfo } = useReadContract({
    address: CONTRACTS.AETHToken,
    abi: ABIS.AETHToken,
    functionName: "getStakeInfo",
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  // Get total staked
  const { data: totalStaked } = useReadContract({
    address: CONTRACTS.AETHToken,
    abi: ABIS.AETHToken,
    functionName: "totalStaked",
  });

  return {
    balance: balance ? Number(balance) / 1e18 : 0,
    stakeInfo: stakeInfo
      ? {
          amount: Number(stakeInfo[0]) / 1e18,
          startTime: Number(stakeInfo[1]),
          pendingRewards: Number(stakeInfo[2]) / 1e18,
        }
      : { amount: 0, startTime: 0, pendingRewards: 0 },
    totalStaked: totalStaked ? Number(totalStaked) / 1e18 : 0,
    refetchBalance,
    refetchStakeInfo,
  };
}

/**
 * Hook for AETH Token write operations
 */
export function useAETHTokenWrite() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const stake = async (amount) => {
    const amountWei = BigInt(Math.floor(amount * 1e18));
    return writeContract({
      address: CONTRACTS.AETHToken,
      abi: ABIS.AETHToken,
      functionName: "stake",
      args: [amountWei],
    });
  };

  const unstake = async (amount) => {
    const amountWei = BigInt(Math.floor(amount * 1e18));
    return writeContract({
      address: CONTRACTS.AETHToken,
      abi: ABIS.AETHToken,
      functionName: "unstake",
      args: [amountWei],
    });
  };

  const claimRewards = async () => {
    return writeContract({
      address: CONTRACTS.AETHToken,
      abi: ABIS.AETHToken,
      functionName: "claimRewards",
    });
  };

  return {
    stake,
    unstake,
    claimRewards,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

/**
 * Hook for reading Miner Node data
 */
export function useMinerNode(address) {
  // Get owner nodes
  const { data: nodeIds, refetch: refetchNodes } = useReadContract({
    address: CONTRACTS.MinerNode,
    abi: ABIS.MinerNode,
    functionName: "getOwnerNodes",
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  // Get total nodes
  const { data: totalNodes } = useReadContract({
    address: CONTRACTS.MinerNode,
    abi: ABIS.MinerNode,
    functionName: "getTotalNodes",
  });

  return {
    nodeIds: nodeIds || [],
    totalNodes: totalNodes ? Number(totalNodes) : 0,
    refetchNodes,
  };
}

/**
 * Hook for reading specific node data
 */
export function useNodeInfo(nodeId) {
  const { data: nodeInfo, refetch } = useReadContract({
    address: CONTRACTS.MinerNode,
    abi: ABIS.MinerNode,
    functionName: "getNode",
    args: nodeId ? [nodeId] : undefined,
    enabled: !!nodeId,
  });

  return {
    nodeInfo: nodeInfo
      ? {
          owner: nodeInfo[0],
          location: nodeInfo[1],
          bandwidthMbps: Number(nodeInfo[2]),
          isActive: nodeInfo[3],
          totalDataShared: Number(nodeInfo[4]),
          totalEarnings: Number(nodeInfo[5]) / 1e18,
          reputation: Number(nodeInfo[6]),
        }
      : null,
    refetch,
  };
}

/**
 * Hook for Miner Node write operations
 */
export function useMinerNodeWrite() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const registerNode = async (location, bandwidthMbps) => {
    return writeContract({
      address: CONTRACTS.MinerNode,
      abi: ABIS.MinerNode,
      functionName: "registerNode",
      args: [location, bandwidthMbps],
    });
  };

  const deactivateNode = async (nodeId) => {
    return writeContract({
      address: CONTRACTS.MinerNode,
      abi: ABIS.MinerNode,
      functionName: "deactivateNode",
      args: [nodeId],
    });
  };

  return {
    registerNode,
    deactivateNode,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

/**
 * Hook for reading VPN Session data
 */
export function useVPNSession(address) {
  // Get user sessions
  const { data: sessionIds, refetch: refetchSessions } = useReadContract({
    address: CONTRACTS.VPNSession,
    abi: ABIS.VPNSession,
    functionName: "getUserSessions",
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  // Get active sessions
  const { data: activeSessionIds, refetch: refetchActiveSessions } = useReadContract({
    address: CONTRACTS.VPNSession,
    abi: ABIS.VPNSession,
    functionName: "getUserActiveSessions",
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  return {
    sessionIds: sessionIds || [],
    activeSessionIds: activeSessionIds || [],
    refetchSessions,
    refetchActiveSessions,
  };
}

/**
 * Hook for reading specific session data
 */
export function useSessionInfo(sessionId) {
  const { data: sessionInfo, refetch } = useReadContract({
    address: CONTRACTS.VPNSession,
    abi: ABIS.VPNSession,
    functionName: "getSession",
    args: sessionId ? [sessionId] : undefined,
    enabled: !!sessionId,
  });

  return {
    sessionInfo: sessionInfo
      ? {
          user: sessionInfo[0],
          nodeId: sessionInfo[1],
          startTime: Number(sessionInfo[2]),
          endTime: Number(sessionInfo[3]),
          dataUsedMB: Number(sessionInfo[4]),
          isActive: sessionInfo[5],
          totalPaid: Number(sessionInfo[6]) / 1e18,
        }
      : null,
    refetch,
  };
}

/**
 * Hook for VPN Session write operations
 */
export function useVPNSessionWrite() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const startSession = async (nodeId) => {
    return writeContract({
      address: CONTRACTS.VPNSession,
      abi: ABIS.VPNSession,
      functionName: "startSession",
      args: [nodeId],
    });
  };

  const endSession = async (sessionId, dataUsedMB) => {
    return writeContract({
      address: CONTRACTS.VPNSession,
      abi: ABIS.VPNSession,
      functionName: "endSession",
      args: [sessionId, dataUsedMB],
    });
  };

  return {
    startSession,
    endSession,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

/**
 * Hook for reading Validator data
 */
export function useValidator(address) {
  const { data: validatorInfo, refetch } = useReadContract({
    address: CONTRACTS.Validator,
    abi: ABIS.Validator,
    functionName: "getValidatorInfo",
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  const { data: activeValidators } = useReadContract({
    address: CONTRACTS.Validator,
    abi: ABIS.Validator,
    functionName: "getActiveValidators",
  });

  return {
    validatorInfo: validatorInfo
      ? {
          stakedAmount: Number(validatorInfo[0]) / 1e18,
          joinedAt: Number(validatorInfo[1]),
          isActive: validatorInfo[2],
          validatedSessions: Number(validatorInfo[3]),
          slashCount: Number(validatorInfo[4]),
          rewards: Number(validatorInfo[5]) / 1e18,
        }
      : null,
    activeValidators: activeValidators || [],
    refetch,
  };
}

/**
 * Hook for Validator write operations
 */
export function useValidatorWrite() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const joinValidator = async (amount) => {
    const amountWei = BigInt(Math.floor(amount * 1e18));
    return writeContract({
      address: CONTRACTS.Validator,
      abi: ABIS.Validator,
      functionName: "joinValidator",
      args: [amountWei],
    });
  };

  const leaveValidator = async () => {
    return writeContract({
      address: CONTRACTS.Validator,
      abi: ABIS.Validator,
      functionName: "leaveValidator",
    });
  };

  const claimRewards = async () => {
    return writeContract({
      address: CONTRACTS.Validator,
      abi: ABIS.Validator,
      functionName: "claimRewards",
    });
  };

  return {
    joinValidator,
    leaveValidator,
    claimRewards,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

/**
 * Hook for reading Premium VPN data
 */
export function usePremiumVPN(address) {
  // Check if user is premium
  const { data: isPremium, refetch: refetchPremium } = useReadContract({
    address: CONTRACTS.PremiumVPN,
    abi: ABIS.PremiumVPN,
    functionName: "isPremium",
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  // Get premium info
  const { data: premiumInfo, refetch: refetchPremiumInfo } = useReadContract({
    address: CONTRACTS.PremiumVPN,
    abi: ABIS.PremiumVPN,
    functionName: "getPremiumInfo",
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  // Get user stats
  const { data: userStats, refetch: refetchUserStats } = useReadContract({
    address: CONTRACTS.PremiumVPN,
    abi: ABIS.PremiumVPN,
    functionName: "getUserStats",
    args: address ? [address] : undefined,
    enabled: !!address,
  });

  // Get pricing
  const { data: monthlyPrice } = useReadContract({
    address: CONTRACTS.PremiumVPN,
    abi: ABIS.PremiumVPN,
    functionName: "premiumMonthlyPrice",
  });

  const { data: yearlyPrice } = useReadContract({
    address: CONTRACTS.PremiumVPN,
    abi: ABIS.PremiumVPN,
    functionName: "premiumYearlyPrice",
  });

  const { data: burnAmount } = useReadContract({
    address: CONTRACTS.PremiumVPN,
    abi: ABIS.PremiumVPN,
    functionName: "burnAmountPerConnection",
  });

  // Get global stats
  const { data: globalStats } = useReadContract({
    address: CONTRACTS.PremiumVPN,
    abi: ABIS.PremiumVPN,
    functionName: "getGlobalStats",
  });

  return {
    isPremium: isPremium || false,
    premiumInfo: premiumInfo
      ? {
          isActive: premiumInfo[0],
          expiryTime: Number(premiumInfo[1]),
          subscribedAt: Number(premiumInfo[2]),
          totalConnections: Number(premiumInfo[3]),
          daysRemaining: Number(premiumInfo[4]),
        }
      : null,
    userStats: userStats
      ? {
          totalConnections: Number(userStats[0]),
          totalBurned: Number(userStats[1]) / 1e18,
          lastConnectionTime: Number(userStats[2]),
        }
      : null,
    pricing: {
      monthly: monthlyPrice ? Number(monthlyPrice) / 1e18 : 1000,
      yearly: yearlyPrice ? Number(yearlyPrice) / 1e18 : 10000,
      burnPerConnection: burnAmount ? Number(burnAmount) / 1e18 : 10,
    },
    globalStats: globalStats
      ? {
          totalBurned: Number(globalStats[0]) / 1e18,
          totalConnections: Number(globalStats[1]),
          totalPremiumUsers: Number(globalStats[2]),
        }
      : null,
    refetchPremium,
    refetchPremiumInfo,
    refetchUserStats,
  };
}

/**
 * Hook for Premium VPN write operations
 */
export function usePremiumVPNWrite() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  // Subscribe premium monthly
  const subscribePremiumMonthly = async () => {
    return writeContract({
      address: CONTRACTS.PremiumVPN,
      abi: ABIS.PremiumVPN,
      functionName: "subscribePremiumMonthly",
    });
  };

  // Subscribe premium yearly
  const subscribePremiumYearly = async () => {
    return writeContract({
      address: CONTRACTS.PremiumVPN,
      abi: ABIS.PremiumVPN,
      functionName: "subscribePremiumYearly",
    });
  };

  return {
    subscribePremiumMonthly,
    subscribePremiumYearly,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

/**
 * Hook for AETH Token approval (needed before subscribing to premium)
 */
export function useAETHApproval() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const approve = async (spender, amount) => {
    const amountWei = BigInt(Math.floor(amount * 1e18));
    return writeContract({
      address: CONTRACTS.AETHToken,
      abi: ABIS.AETHToken,
      functionName: "approve",
      args: [spender, amountWei],
    });
  };

  return {
    approve,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}
