/**
 * StakingEnhanced - Improved staking page with beautiful components
 * Day 55-56: Staking Page Enhancement (строки 484-499)
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "wagmi";
import { useAETHToken, useAETHTokenWrite } from "@/hooks/useBlockchain";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wifi, TrendingUp, Network, Coins, LogOut, Menu, X, Crown, RefreshCw, ArrowUpRight, ArrowDownRight, Award } from "lucide-react";
import { toast } from "sonner";

// Import new staking components
import TierSelector, { TIERS } from "@/components/staking/TierSelector";
import StakingCalculator from "@/components/staking/StakingCalculator";
import StakeModal from "@/components/staking/StakeModal";
import RewardsHistory from "@/components/staking/RewardsHistory";

export default function StakingEnhanced() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { address, isConnected } = useAccount();
  
  // Blockchain hooks
  const { balance, stakeInfo, totalStaked, refetchBalance, refetchStakeInfo } = useAETHToken(address);
  const { stake, unstake, claimRewards, isPending, isConfirming, isConfirmed, error } = useAETHTokenWrite();
  
  // State
  const [selectedTier, setSelectedTier] = useState('tier1');
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);
  const [modalType, setModalType] = useState('stake');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('stake');

  // Get selected tier data
  const tierData = TIERS.find(t => t.id === selectedTier) || TIERS[0];

  // Watch for transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      toast.success("Transaction confirmed!");
      handleRefresh();
      setShowStakeModal(false);
      setShowUnstakeModal(false);
    }
  }, [isConfirmed]);

  // Watch for errors
  useEffect(() => {
    if (error) {
      toast.error(error.message || "Transaction failed");
    }
  }, [error]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refetchBalance(), refetchStakeInfo()]);
    setRefreshing(false);
  };

  const handleStake = async (amount) => {
    if (!isConnected) {
      toast.error("Connect wallet first");
      return;
    }

    try {
      await stake(amount);
      toast.info("Transaction submitted!");
    } catch (err) {
      console.error("Stake error:", err);
      toast.error(err.message || "Failed to stake");
    }
  };

  const handleUnstake = async (amount) => {
    if (!isConnected) {
      toast.error("Connect wallet first");
      return;
    }

    try {
      await unstake(amount);
      toast.info("Transaction submitted!");
    } catch (err) {
      console.error("Unstake error:", err);
      toast.error(err.message || "Failed to unstake");
    }
  };

  const handleClaimRewards = async () => {
    if (!isConnected) {
      toast.error("Connect wallet first");
      return;
    }

    if (stakeInfo.pendingRewards <= 0) {
      toast.error("No rewards to claim");
      return;
    }

    try {
      await claimRewards();
      toast.info("Claiming rewards...");
    } catch (err) {
      console.error("Claim error:", err);
      toast.error(err.message || "Failed to claim");
    }
  };

  const navigationItems = [
    { name: "Dashboard", path: "/dashboard", icon: TrendingUp },
    { name: "VPN Connect", path: "/vpn", icon: Wifi },
    { name: "My Nodes", path: "/nodes", icon: Network },
    { name: "Staking", path: "/staking", icon: Coins },
    { name: "Premium", path: "/premium", icon: Crown },
  ];

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(num);
  };

  return (
    <div className="dashboard-layout staking-enhanced-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Wifi className="logo-icon" />
            <span>Aetherium</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = window.location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`nav-item ${isActive ? "active" : ""}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.wallet_address?.slice(0, 2).toUpperCase()}</div>
            <div className="user-details">
              <div className="user-address">
                {user?.wallet_address?.slice(0, 6)}...{user?.wallet_address?.slice(-4)}
              </div>
              <div className="user-role">{user?.role || "User"}</div>
            </div>
          </div>
          <Button variant="outline" onClick={() => { logout(); navigate("/"); }} className="logout-btn">
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="dashboard-main staking-main">
        <header className="dashboard-header staking-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h1>Staking</h1>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="refresh-btn"
          >
            <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
          </Button>
        </header>

        <div className="dashboard-content staking-content">
          {!isConnected ? (
            <div className="loading-state">
              <div className="empty-icon">🔗</div>
              <h2>Connect Your Wallet</h2>
              <p>Please connect your MetaMask wallet to access staking</p>
            </div>
          ) : (
            <>
              {/* Stats overview */}
              <div className="staking-stats-grid">
                <Card className="stat-card primary">
                  <div className="stat-icon">
                    <Coins size={28} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">Available Balance</div>
                    <div className="stat-value">{formatNumber(balance || 0)}</div>
                    <div className="stat-unit">AETH</div>
                  </div>
                </Card>

                <Card className="stat-card success">
                  <div className="stat-icon">
                    <TrendingUp size={28} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">Staked Amount</div>
                    <div className="stat-value">{formatNumber(stakeInfo?.amount || 0)}</div>
                    <div className="stat-unit">AETH</div>
                  </div>
                </Card>

                <Card className="stat-card reward">
                  <div className="stat-icon">
                    <Award size={28} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">Pending Rewards</div>
                    <div className="stat-value">{formatNumber(stakeInfo?.pendingRewards || 0)}</div>
                    <div className="stat-unit">AETH</div>
                  </div>
                </Card>

                <Card className="stat-card info">
                  <div className="stat-icon">
                    <Network size={28} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-label">Total Network Staked</div>
                    <div className="stat-value">{formatNumber(totalStaked || 0)}</div>
                    <div className="stat-unit">AETH</div>
                  </div>
                </Card>
              </div>

              {/* Quick actions */}
              <Card className="quick-actions-card">
                <div className="quick-actions-header">
                  <h3>Quick Actions</h3>
                  <Badge variant="outline" className="tier-badge-display">
                    {tierData.name} Tier • {tierData.apy}% APY
                  </Badge>
                </div>
                <div className="quick-actions-buttons">
                  <Button
                    onClick={() => {
                      setModalType('stake');
                      setShowStakeModal(true);
                    }}
                    className="action-btn stake"
                    disabled={isPending || isConfirming}
                  >
                    <ArrowUpRight size={20} />
                    Stake Tokens
                  </Button>
                  <Button
                    onClick={() => {
                      setModalType('unstake');
                      setShowUnstakeModal(true);
                    }}
                    className="action-btn unstake"
                    disabled={isPending || isConfirming || !stakeInfo?.amount}
                  >
                    <ArrowDownRight size={20} />
                    Unstake Tokens
                  </Button>
                  <Button
                    onClick={handleClaimRewards}
                    className="action-btn claim"
                    disabled={isPending || isConfirming || !stakeInfo?.pendingRewards}
                  >
                    <Award size={20} />
                    Claim Rewards
                    {stakeInfo?.pendingRewards > 0 && (
                      <Badge className="reward-amount">
                        +{formatNumber(stakeInfo.pendingRewards)}
                      </Badge>
                    )}
                  </Button>
                </div>
              </Card>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="staking-tabs">
                <TabsList className="staking-tabs-list">
                  <TabsTrigger value="stake">Stake</TabsTrigger>
                  <TabsTrigger value="calculator">Calculator</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>

                {/* Stake Tab */}
                <TabsContent value="stake" className="staking-tab-content">
                  <TierSelector
                    selectedTier={selectedTier}
                    onSelectTier={setSelectedTier}
                    disabled={isPending || isConfirming}
                  />
                </TabsContent>

                {/* Calculator Tab */}
                <TabsContent value="calculator" className="staking-tab-content">
                  <StakingCalculator
                    selectedTier={selectedTier}
                    currentBalance={balance || 0}
                  />
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="staking-tab-content">
                  <RewardsHistory />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <StakeModal
        isOpen={showStakeModal}
        onClose={() => setShowStakeModal(false)}
        type="stake"
        balance={balance || 0}
        staked={stakeInfo?.amount || 0}
        onConfirm={handleStake}
        isProcessing={isPending || isConfirming}
        selectedTier={tierData}
      />

      <StakeModal
        isOpen={showUnstakeModal}
        onClose={() => setShowUnstakeModal(false)}
        type="unstake"
        balance={balance || 0}
        staked={stakeInfo?.amount || 0}
        onConfirm={handleUnstake}
        isProcessing={isPending || isConfirming}
        selectedTier={tierData}
      />
    </div>
  );
}
