/**
 * RewardsHistory - Display staking rewards history
 * Day 55-56: Staking Page Enhancement
 */

import React from 'react';
import { TrendingUp, Calendar, Award, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const MOCK_REWARDS = [
  { id: 1, date: '2025-01-20', amount: 125.50, type: 'Daily', status: 'claimed' },
  { id: 2, date: '2025-01-19', amount: 125.50, type: 'Daily', status: 'claimed' },
  { id: 3, date: '2025-01-18', amount: 125.50, type: 'Daily', status: 'claimed' },
  { id: 4, date: '2025-01-17', amount: 125.50, type: 'Daily', status: 'claimed' },
  { id: 5, date: '2025-01-16', amount: 125.50, type: 'Daily', status: 'claimed' },
  { id: 6, date: '2025-01-15', amount: 1250.00, type: 'Bonus', status: 'claimed' },
];

export default function RewardsHistory({ rewards = MOCK_REWARDS }) {
  const totalClaimed = rewards.reduce((sum, r) => sum + r.amount, 0);
  const thisMonth = rewards.filter(r => new Date(r.date).getMonth() === new Date().getMonth()).reduce((s, r) => s + r.amount, 0);

  const fmt = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

  return (
    <div className="rewards-history-container">
      <div className="rewards-header">
        <div className="rewards-title"><Award size={24} /><h3>Rewards History</h3></div>
        <Button variant="outline" size="sm"><Download size={16} />Export</Button>
      </div>

      <div className="rewards-stats">
        <Card className="reward-stat-card">
          <div className="stat-icon total"><TrendingUp size={20} /></div>
          <div className="stat-content">
            <div className="stat-label">Total Claimed</div>
            <div className="stat-value">{fmt(totalClaimed)} AETH</div>
          </div>
        </Card>
        <Card className="reward-stat-card">
          <div className="stat-icon month"><Calendar size={20} /></div>
          <div className="stat-content">
            <div className="stat-label">This Month</div>
            <div className="stat-value">{fmt(thisMonth)} AETH</div>
          </div>
        </Card>
        <Card className="reward-stat-card">
          <div className="stat-icon count"><Award size={20} /></div>
          <div className="stat-content">
            <div className="stat-label">Claims</div>
            <div className="stat-value">{rewards.length}</div>
          </div>
        </Card>
      </div>

      <Card className="rewards-table-card">
        <div className="rewards-table">
          <div className="table-header">
            <div>Date</div>
            <div>Type</div>
            <div>Amount</div>
            <div>Status</div>
          </div>
          {rewards.map(reward => (
            <div key={reward.id} className="table-row">
              <div className="table-cell date">{new Date(reward.date).toLocaleDateString()}</div>
              <div className="table-cell type"><Badge variant="outline">{reward.type}</Badge></div>
              <div className="table-cell amount"><span className="amount-value">+{fmt(reward.amount)}</span><span className="amount-symbol">AETH</span></div>
              <div className="table-cell status"><Badge className="status-claimed">✓ {reward.status}</Badge></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
