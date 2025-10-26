/**
 * StakingCalculator - APY calculator with visual projections
 * Day 55-56: Staking Page Enhancement
 */

import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, Calendar, DollarSign, Info } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { TIERS } from './TierSelector';

export default function StakingCalculator({ selectedTier = 'tier1', currentBalance = 0 }) {
  const [amount, setAmount] = useState('');
  const [customDays, setCustomDays] = useState('365');

  const tier = TIERS.find(t => t.id === selectedTier) || TIERS[0];

  const calculations = useMemo(() => {
    const stakeAmount = parseFloat(amount) || 0;
    const days = parseInt(customDays) || 365;
    const apy = tier.apy / 100;
    
    // Daily rewards
    const dailyRate = apy / 365;
    const dailyReward = stakeAmount * dailyRate;
    
    // Period rewards
    const weeklyReward = dailyReward * 7;
    const monthlyReward = dailyReward * 30;
    const yearlyReward = stakeAmount * apy;
    
    // Custom period
    const customPeriodReward = dailyReward * days;
    const totalAfterPeriod = stakeAmount + customPeriodReward;
    
    return {
      dailyReward,
      weeklyReward,
      monthlyReward,
      yearlyReward,
      customPeriodReward,
      totalAfterPeriod,
      apy: tier.apy,
    };
  }, [amount, customDays, tier]);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(num);
  };

  const handleMaxClick = () => {
    setAmount(currentBalance.toString());
  };

  return (
    <div className="staking-calculator-container">
      <div className="calculator-header">
        <Calculator size={24} />
        <h3>Staking Calculator</h3>
      </div>

      {/* Input section */}
      <Card className="calculator-inputs">
        <div className="input-group">
          <Label htmlFor="stake-amount">Stake Amount</Label>
          <div className="input-with-max">
            <Input
              id="stake-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="calculator-input"
            />
            <button onClick={handleMaxClick} className="max-btn">
              MAX
            </button>
          </div>
          <div className="input-hint">
            Available: {formatNumber(currentBalance)} AETH
          </div>
        </div>

        <div className="input-group">
          <Label htmlFor="stake-days">Staking Period (days)</Label>
          <Input
            id="stake-days"
            type="number"
            value={customDays}
            onChange={(e) => setCustomDays(e.target.value)}
            placeholder="365"
            className="calculator-input"
          />
          <div className="input-hint">
            {tier.lockMonths > 0 && `Minimum: ${tier.lockMonths * 30} days (tier lock)`}
          </div>
        </div>

        {/* Selected tier info */}
        <div className="selected-tier-info">
          <Badge className="tier-badge">
            {tier.name} Tier
          </Badge>
          <Badge variant="outline" className="apy-badge">
            <TrendingUp size={12} />
            {tier.apy}% APY
          </Badge>
        </div>
      </Card>

      {/* Results grid */}
      <div className="calculator-results">
        <Card className="result-card primary">
          <div className="result-icon">
            <TrendingUp size={20} />
          </div>
          <div className="result-content">
            <div className="result-label">Daily Rewards</div>
            <div className="result-value">{formatNumber(calculations.dailyReward)} AETH</div>
            <div className="result-subtext">≈ ${(calculations.dailyReward * 0.5).toFixed(2)} USD</div>
          </div>
        </Card>

        <Card className="result-card">
          <div className="result-icon">
            <Calendar size={20} />
          </div>
          <div className="result-content">
            <div className="result-label">Weekly Rewards</div>
            <div className="result-value">{formatNumber(calculations.weeklyReward)} AETH</div>
            <div className="result-subtext">7 days</div>
          </div>
        </Card>

        <Card className="result-card">
          <div className="result-icon">
            <Calendar size={20} />
          </div>
          <div className="result-content">
            <div className="result-label">Monthly Rewards</div>
            <div className="result-value">{formatNumber(calculations.monthlyReward)} AETH</div>
            <div className="result-subtext">30 days</div>
          </div>
        </Card>

        <Card className="result-card">
          <div className="result-icon">
            <TrendingUp size={20} />
          </div>
          <div className="result-content">
            <div className="result-label">Yearly Rewards</div>
            <div className="result-value">{formatNumber(calculations.yearlyReward)} AETH</div>
            <div className="result-subtext">365 days</div>
          </div>
        </Card>
      </div>

      {/* Custom period projection */}
      <Card className="projection-card">
        <div className="projection-header">
          <DollarSign size={20} />
          <span>Your Projection ({customDays} days)</span>
        </div>
        <div className="projection-content">
          <div className="projection-row">
            <span className="projection-label">Initial Stake:</span>
            <span className="projection-value">{formatNumber(parseFloat(amount) || 0)} AETH</span>
          </div>
          <div className="projection-row">
            <span className="projection-label">Estimated Rewards:</span>
            <span className="projection-value reward">+{formatNumber(calculations.customPeriodReward)} AETH</span>
          </div>
          <div className="projection-divider"></div>
          <div className="projection-row total">
            <span className="projection-label">Total After Period:</span>
            <span className="projection-value">{formatNumber(calculations.totalAfterPeriod)} AETH</span>
          </div>
          <div className="projection-row">
            <span className="projection-label">Est. USD Value:</span>
            <span className="projection-value">≈ ${(calculations.totalAfterPeriod * 0.5).toFixed(2)} USD</span>
          </div>
        </div>
        <div className="projection-disclaimer">
          <Info size={14} />
          <span>Projections are estimates based on current APY. Actual rewards may vary.</span>
        </div>
      </Card>

      {/* Visualization */}
      <Card className="calculator-chart">
        <div className="chart-header">
          <span>Growth Visualization</span>
        </div>
        <div className="chart-content">
          {[0, 25, 50, 75, 100].map((percent) => {
            const days = Math.floor((parseInt(customDays) || 365) * (percent / 100));
            const reward = calculations.dailyReward * days;
            const total = (parseFloat(amount) || 0) + reward;
            const barHeight = total > 0 ? Math.min((total / calculations.totalAfterPeriod) * 100, 100) : 0;
            
            return (
              <div key={percent} className="chart-bar-container">
                <div className="chart-bar-wrapper">
                  <div 
                    className="chart-bar" 
                    style={{ height: `${barHeight}%` }}
                  >
                    <div className="chart-bar-value">{formatNumber(total)}</div>
                  </div>
                </div>
                <div className="chart-bar-label">{days}d</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
