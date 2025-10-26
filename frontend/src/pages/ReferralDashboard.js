/**
 * Referral Dashboard Page - Day 64-66
 * Complete referral program interface with tree visualization
 */
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import axios from 'axios';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import {
  ReferralTree,
  ReferralLink,
  ReferralStats,
  RankProgress,
  Leaderboard
} from '../components/referral';
import { Gift, Users, Award, DollarSign, RefreshCw } from 'lucide-react';

const ReferralDashboard = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [treeData, setTreeData] = useState(null);
  const [referralCode, setReferralCode] = useState(null);
  const [error, setError] = useState(null);
  const [claimLoading, setClaimLoading] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  useEffect(() => {
    if (isConnected && address) {
      fetchReferralData();
    }
  }, [address, isConnected]);

  const fetchReferralData = async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch user stats
      const statsResponse = await axios.get(`${backendUrl}/api/referral/my-stats/${address}`);
      setStats(statsResponse.data);
      setReferralCode(statsResponse.data.referral?.referral_code);

      // Fetch referral tree
      try {
        const treeResponse = await axios.get(`${backendUrl}/api/referral/tree/${address}?depth=3`);
        setTreeData(treeResponse.data.tree);
      } catch (err) {
        console.log('Tree data not available');
      }

    } catch (error) {
      console.error('Failed to fetch referral data:', error);
      
      // If user not registered, try to register
      if (error.response?.status === 404) {
        try {
          const registerResponse = await axios.post(`${backendUrl}/api/referral/register`, {
            address: address
          });
          
          if (registerResponse.data.success) {
            setReferralCode(registerResponse.data.referral_code);
            // Refetch data
            fetchReferralData();
          }
        } catch (regError) {
          setError('Failed to register in referral program');
        }
      } else {
        setError('Failed to load referral data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClaimCommissions = async () => {
    if (!address || !stats?.earnings?.pending || stats.earnings.pending <= 0) {
      return;
    }

    try {
      setClaimLoading(true);
      
      // In a real implementation, this would:
      // 1. Call smart contract to claim
      // 2. Wait for transaction confirmation
      // 3. Send tx_hash to backend
      
      // For now, mock transaction
      const mockTxHash = '0x' + Math.random().toString(16).substr(2);
      
      await axios.post(`${backendUrl}/api/referral/claim`, {
        address: address,
        tx_hash: mockTxHash
      });

      // Refresh data
      await fetchReferralData();
      
      alert(`Successfully claimed ${stats.earnings.pending.toFixed(2)} AETH!`);
    } catch (error) {
      console.error('Failed to claim commissions:', error);
      alert('Failed to claim commissions');
    } finally {
      setClaimLoading(false);
    }
  };

  const handleNodeClick = (nodeData) => {
    console.log('Node clicked:', nodeData);
    // Could show modal with detailed user info
  };

  if (!isConnected) {
    return (
      <div className="referral-dashboard-page">
        <div className="connect-wallet-prompt">
          <Gift size={64} className="prompt-icon" />
          <h2>Connect Your Wallet</h2>
          <p>Connect your wallet to access the referral program and start earning commissions.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="referral-dashboard-page">
        <div className="loading-state">
          <div className="spinner-large"></div>
          <p>Loading referral dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="referral-dashboard-page">
        <div className="error-state">
          <p>{error}</p>
          <Button onClick={fetchReferralData}>
            <RefreshCw size={16} />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const pendingCommissions = stats?.earnings?.pending || 0;
  const canClaim = pendingCommissions > 0;

  return (
    <div className="referral-dashboard-page">
      {/* Header */}
      <div className="referral-dashboard-header">
        <div className="header-content">
          <h1>Referral Dashboard</h1>
          <p className="header-subtitle">
            Earn up to 10% commission on 3 levels of referrals
          </p>
        </div>
        <div className="header-actions">
          <Button
            onClick={handleClaimCommissions}
            disabled={!canClaim || claimLoading}
            className="claim-btn"
          >
            <DollarSign size={18} />
            {claimLoading ? 'Claiming...' : `Claim ${pendingCommissions.toFixed(2)} AETH`}
          </Button>
          <Button
            onClick={fetchReferralData}
            variant="outline"
            className="refresh-btn"
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="referral-quick-stats">
        <div className="quick-stat-card">
          <Users size={24} />
          <div>
            <p className="quick-stat-value">{stats?.referral?.direct_referrals || 0}</p>
            <p className="quick-stat-label">Direct Referrals</p>
          </div>
        </div>
        <div className="quick-stat-card">
          <Award size={24} />
          <div>
            <p className="quick-stat-value">{stats?.rank?.current || 'Bronze'}</p>
            <p className="quick-stat-label">Current Rank</p>
          </div>
        </div>
        <div className="quick-stat-card">
          <DollarSign size={24} />
          <div>
            <p className="quick-stat-value">{(stats?.earnings?.total || 0).toFixed(2)} AETH</p>
            <p className="quick-stat-label">Total Earnings</p>
          </div>
        </div>
      </div>

      {/* Main Content - Tabs */}
      <Tabs defaultValue="overview" className="referral-tabs">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tree">Referral Tree</TabsTrigger>
          <TabsTrigger value="rank">Rank Progress</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="overview-grid">
            <div className="overview-left">
              {referralCode && (
                <ReferralLink
                  referralCode={referralCode}
                  referralUrl={`${window.location.origin}/register?ref=${referralCode}`}
                />
              )}
            </div>
            <div className="overview-right">
              <ReferralStats stats={stats} loading={false} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tree">
          <div className="tree-section">
            <div className="tree-header">
              <h3>Your Referral Network</h3>
              <p>Interactive 3-level tree visualization (click nodes for details)</p>
            </div>
            {treeData ? (
              <ReferralTree treeData={treeData} onNodeClick={handleNodeClick} />
            ) : (
              <div className="tree-empty">
                <Users size={64} />
                <h4>No Referrals Yet</h4>
                <p>Share your referral link to start building your network</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="rank">
          <div className="rank-section">
            <RankProgress
              rankInfo={stats?.rank}
              referralData={stats?.referral}
            />
          </div>
        </TabsContent>

        <TabsContent value="leaderboard">
          <Leaderboard />
        </TabsContent>
      </Tabs>

      {/* Commission Info Footer */}
      <div className="referral-info-footer">
        <h4>How It Works</h4>
        <div className="commission-structure">
          <div className="commission-level">
            <span className="level-badge level-1">Level 1</span>
            <p>5% commission on direct referrals' transactions</p>
          </div>
          <div className="commission-level">
            <span className="level-badge level-2">Level 2</span>
            <p>3% commission on second-level referrals' transactions</p>
          </div>
          <div className="commission-level">
            <span className="level-badge level-3">Level 3</span>
            <p>2% commission on third-level referrals' transactions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralDashboard;
