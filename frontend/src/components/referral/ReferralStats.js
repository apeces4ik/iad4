/**
 * ReferralStats Component - Day 64-66
 * Display referral statistics and earnings
 */
import React from 'react';
import { Users, TrendingUp, DollarSign, Award } from 'lucide-react';

const ReferralStats = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="referral-stats-loading">
        <div className="spinner"></div>
        <p>Loading stats...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="referral-stats-empty">
        <p>No statistics available</p>
      </div>
    );
  }

  const referralData = stats.referral || {};
  const earnings = stats.earnings || {};

  const statsCards = [
    {
      icon: Users,
      label: 'Direct Referrals',
      value: referralData.direct_referrals || 0,
      color: 'cyan',
      trend: null
    },
    {
      icon: TrendingUp,
      label: 'Total Network',
      value: referralData.total_referrals || 0,
      color: 'purple',
      trend: null
    },
    {
      icon: DollarSign,
      label: 'Total Earnings',
      value: `${(earnings.total || 0).toFixed(2)} AETH`,
      color: 'green',
      trend: null
    },
    {
      icon: DollarSign,
      label: 'Pending',
      value: `${(earnings.pending || 0).toFixed(2)} AETH`,
      color: 'yellow',
      trend: null
    }
  ];

  return (
    <div className="referral-stats-container">
      <div className="referral-stats-grid">
        {statsCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <div key={index} className={`referral-stat-card stat-${card.color}`}>
              <div className="stat-icon-wrapper">
                <Icon size={24} />
              </div>
              <div className="stat-content">
                <p className="stat-label">{card.label}</p>
                <p className="stat-value">{card.value}</p>
                {card.trend && (
                  <p className="stat-trend">{card.trend}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="referral-earnings-breakdown">
        <h4>Earnings Breakdown</h4>
        <div className="earnings-list">
          <div className="earning-item">
            <span className="earning-label">Total Earned</span>
            <span className="earning-value">{(earnings.total || 0).toFixed(2)} AETH</span>
          </div>
          <div className="earning-item">
            <span className="earning-label">Already Claimed</span>
            <span className="earning-value claimed">{(earnings.claimed || 0).toFixed(2)} AETH</span>
          </div>
          <div className="earning-item">
            <span className="earning-label">Pending Claim</span>
            <span className="earning-value pending">{(earnings.pending || 0).toFixed(2)} AETH</span>
          </div>
          <div className="earning-item">
            <span className="earning-label">Last 30 Days</span>
            <span className="earning-value">{(earnings.last_30_days || 0).toFixed(2)} AETH</span>
          </div>
        </div>
      </div>

      <div className="referral-team-volume">
        <h4>Team Performance</h4>
        <div className="team-stat">
          <span className="team-label">Team Volume</span>
          <span className="team-value">{(referralData.team_volume || 0).toFixed(2)} AETH</span>
        </div>
        <div className="team-progress-bar">
          <div 
            className="team-progress-fill" 
            style={{ width: `${Math.min(100, (referralData.team_volume || 0) / 1000 * 100)}%` }}
          ></div>
        </div>
        <p className="team-progress-text">
          {(referralData.team_volume || 0).toFixed(0)} / 1,000 AETH to Silver rank
        </p>
      </div>
    </div>
  );
};

export default ReferralStats;