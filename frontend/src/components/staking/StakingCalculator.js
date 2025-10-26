/**
 * StakingCalculator - APY calculator
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
  const [days, setDays] = useState('365');
  const tier = TIERS.find(t => t.id === selectedTier) || TIERS[0];

  const calc = useMemo(() => {
    const amt = parseFloat(amount) || 0;
    const d = parseInt(days) || 365;
    const apy = tier.apy / 100;
    const dailyRate = apy / 365;
    const daily = amt * dailyRate;
    const weekly = daily * 7;
    const monthly = daily * 30;
    const yearly = amt * apy;
    const custom = daily * d;
    const total = amt + custom;
    return { daily, weekly, monthly, yearly, custom, total, apy: tier.apy };
  }, [amount, days, tier]);

  const fmt = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n);

  return (
    <div className="staking-calculator-container">
      <div className="calculator-header"><Calculator size={24} /><h3>Calculator</h3></div>
      <Card className="calculator-inputs">
        <div className="input-group">
          <Label>Amount</Label>
          <div className="input-with-max">
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            <button onClick={() => setAmount(currentBalance.toString())} className="max-btn">MAX</button>
          </div>
          <div className="input-hint">Available: {fmt(currentBalance)} AETH</div>
        </div>
        <div className="input-group">
          <Label>Days</Label>
          <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} placeholder="365" />
        </div>
        <div className="selected-tier-info">
          <Badge>{tier.name}</Badge>
          <Badge variant="outline"><TrendingUp size={12} />{tier.apy}% APY</Badge>
        </div>
      </Card>
      <div className="calculator-results">
        <Card className="result-card"><div className="result-icon"><TrendingUp size={20} /></div><div className="result-content"><div className="result-label">Daily</div><div className="result-value">{fmt(calc.daily)}</div></div></Card>
        <Card className="result-card"><div className="result-icon"><Calendar size={20} /></div><div className="result-content"><div className="result-label">Weekly</div><div className="result-value">{fmt(calc.weekly)}</div></div></Card>
        <Card className="result-card"><div className="result-icon"><Calendar size={20} /></div><div className="result-content"><div className="result-label">Monthly</div><div className="result-value">{fmt(calc.monthly)}</div></div></Card>
        <Card className="result-card"><div className="result-icon"><TrendingUp size={20} /></div><div className="result-content"><div className="result-label">Yearly</div><div className="result-value">{fmt(calc.yearly)}</div></div></Card>
      </div>
      <Card className="projection-card">
        <div className="projection-header"><DollarSign size={20} />Projection ({days}d)</div>
        <div className="projection-content">
          <div className="projection-row"><span>Stake:</span><span>{fmt(parseFloat(amount)||0)}</span></div>
          <div className="projection-row"><span>Rewards:</span><span className="reward">+{fmt(calc.custom)}</span></div>
          <div className="projection-divider"></div>
          <div className="projection-row total"><span>Total:</span><span>{fmt(calc.total)}</span></div>
        </div>
        <div className="projection-disclaimer"><Info size={14} />Estimates only</div>
      </Card>
    </div>
  );
}
