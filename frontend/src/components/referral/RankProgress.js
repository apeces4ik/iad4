/**
 * RankProgress Component - Day 64-66
 * Display rank progression and requirements
 */
import React from 'react';
import { Trophy, Target, TrendingUp } from 'lucide-react';

const RankProgress = ({ rankInfo, referralData }) => {
  if (!rankInfo) {
    return null;
  }

  const ranks = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
  const currentIndex = ranks.indexOf(rankInfo.current);
  const nextRank = rankInfo.next;
  const progress = rankInfo.progress || 0;
  const requirements = rankInfo.requirements || {};

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

  const getRankIcon = (rank) => {
    return <Trophy size={24} style={{ color: getRankColor(rank) }} />;
  };

  return (
    <div className="rank-progress-container">
      <div className="current-rank-display">
        <div className="rank-icon-large">
          {getRankIcon(rankInfo.current)}
        </div>
        <div className="rank-info">
          <h3 className="current-rank-title">{rankInfo.current} Rank</h3>
          <p className="rank-bonus">Commission Bonus: +{(rankInfo.bonus * 100).toFixed(1)}%</p>
        </div>
      </div>

      {nextRank && (
        <div className="rank-progression">
          <div className="progression-header">
            <h4>Progress to {nextRank}</h4>
            <span className="progress-percentage">{progress.toFixed(1)}%</span>
          </div>

          <div className="rank-progress-bar">
            <div 
              className="rank-progress-fill"
              style={{ 
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${getRankColor(rankInfo.current)}, ${getRankColor(nextRank)})`
              }}
            ></div>
          </div>

          <div className="rank-requirements">
            <div className="requirement-item">
              <Target size={18} />
              <div className="requirement-content">
                <span className="requirement-label">Direct Referrals</span>
                <span className="requirement-progress">
                  {referralData?.direct_referrals || 0} / {requirements.direct_referrals || 0}
                </span>
              </div>
              <div className="requirement-bar">
                <div 
                  className="requirement-bar-fill"
                  style={{ 
                    width: `${Math.min(100, ((referralData?.direct_referrals || 0) / (requirements.direct_referrals || 1)) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>

            <div className="requirement-item">
              <TrendingUp size={18} />
              <div className="requirement-content">
                <span className="requirement-label">Team Volume</span>
                <span className="requirement-progress">
                  {(referralData?.team_volume || 0).toFixed(0)} / {requirements.team_volume || 0} AETH
                </span>
              </div>
              <div className="requirement-bar">
                <div 
                  className="requirement-bar-fill"
                  style={{ 
                    width: `${Math.min(100, ((referralData?.team_volume || 0) / (requirements.team_volume || 1)) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>

          <div className="next-rank-benefits">
            <h5>Unlock at {nextRank}:</h5>
            <ul>
              <li>+{((requirements.commission_bonus || 0) * 100).toFixed(1)}% Commission Bonus</li>
              <li>Higher priority in network</li>
              <li>Exclusive rewards</li>
            </ul>
          </div>
        </div>
      )}

      {!nextRank && (
        <div className="max-rank-achieved">
          <Trophy size={48} style={{ color: getRankColor(rankInfo.current) }} />
          <h4>Maximum Rank Achieved!</h4>
          <p>You've reached the highest rank in the referral program.</p>
        </div>
      )}

      <div className="ranks-timeline">
        <div className="timeline-track">
          {ranks.map((rank, index) => (
            <div 
              key={rank} 
              className={`timeline-node ${index <= currentIndex ? 'completed' : 'pending'} ${index === currentIndex ? 'current' : ''}`}
            >
              <div className="timeline-dot" style={{ 
                backgroundColor: index <= currentIndex ? getRankColor(rank) : 'rgba(255,255,255,0.2)'
              }}></div>
              <span className="timeline-label">{rank}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RankProgress;