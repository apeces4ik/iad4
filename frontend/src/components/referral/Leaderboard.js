/**
 * Leaderboard Component - Day 64-66
 * Display top referrers
 */
import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Users, DollarSign } from 'lucide-react';
import axios from 'axios';

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('all');
  const [metric, setMetric] = useState('commissions');

  useEffect(() => {
    fetchLeaderboard();
  }, [timeframe, metric]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      const response = await axios.get(
        `${backendUrl}/api/referral/leaderboard?timeframe=${timeframe}&metric=${metric}&limit=50`
      );
      setLeaderboard(response.data.leaderboard || []);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (position) => {
    if (position === 1) return <Trophy size={20} style={{ color: '#ffd700' }} />;
    if (position === 2) return <Trophy size={20} style={{ color: '#c0c0c0' }} />;
    if (position === 3) return <Trophy size={20} style={{ color: '#cd7f32' }} />;
    return <span className="rank-number">#{position}</span>;
  };

  const getRankColor = (rank) => {
    const colors = {
      'Bronze': '#cd7f32',
      'Silver': '#c0c0c0',
      'Gold': '#ffd700',
      'Platinum': '#e5e4e2',
      'Diamond': '#b9f2ff'
    };
    return colors[rank] || '#06b6d4';
  };

  const getMetricValue = (user) => {
    switch (metric) {
      case 'commissions':
        return `${user.total_commissions} AETH`;
      case 'referrals':
        return user.direct_referrals;
      case 'volume':
        return `${user.team_volume} AETH`;
      default:
        return user.total_commissions;
    }
  };

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h3>Referral Leaderboard</h3>
        <p className="leaderboard-subtitle">Top performers in the network</p>
      </div>

      <div className="leaderboard-filters">
        <div className="filter-group">
          <label>Timeframe:</label>
          <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)}>
            <option value="all">All Time</option>
            <option value="30d">Last 30 Days</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sort By:</label>
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
            <option value="commissions">Commissions</option>
            <option value="referrals">Referrals</option>
            <option value="volume">Team Volume</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="leaderboard-loading">
          <div className="spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      ) : (
        <div className="leaderboard-list">
          {leaderboard.length === 0 ? (
            <div className="leaderboard-empty">
              <p>No data available</p>
            </div>
          ) : (
            leaderboard.map((user, index) => (
              <div key={index} className={`leaderboard-item ${index < 3 ? 'top-three' : ''}`}>
                <div className="leaderboard-rank">
                  {getRankIcon(user.rank)}
                </div>

                <div className="leaderboard-user">
                  <div className="user-address-display">
                    <span className="user-address">{user.short_address}</span>
                    <span 
                      className="user-rank-badge"
                      style={{ backgroundColor: getRankColor(user.rank_title) }}
                    >
                      {user.rank_title}
                    </span>
                  </div>
                  <div className="user-stats-mini">
                    <span><Users size={14} /> {user.direct_referrals} refs</span>
                    <span><TrendingUp size={14} /> {user.team_volume.toFixed(0)} vol</span>
                  </div>
                </div>

                <div className="leaderboard-metric">
                  <span className="metric-value">{getMetricValue(user)}</span>
                  <span className="metric-label">
                    {metric === 'commissions' && 'Earned'}
                    {metric === 'referrals' && 'Direct'}
                    {metric === 'volume' && 'Volume'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;