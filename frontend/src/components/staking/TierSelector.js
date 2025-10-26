/**
 * TierSelector - Select staking tier (6/12/24 months)
 * Day 55-56: Staking Page Enhancement
 */

import React from 'react';
import { Check, TrendingUp, Lock, Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const TIERS = [
  {
    id: 'tier1',
    name: 'Flexible',
    duration: 0,
    lockMonths: 0,
    apy: 50,
    color: 'blue',
    icon: TrendingUp,
    features: ['No lock period', 'Unstake anytime', '50% APY', 'Daily rewards'],
    popular: false,
  },
  {
    id: 'tier2',
    name: 'Growth',
    duration: 6,
    lockMonths: 6,
    apy: 75,
    color: 'purple',
    icon: Lock,
    features: ['6 months lock', '75% APY', '25% bonus', 'Early unlock: 10%'],
    popular: true,
  },
  {
    id: 'tier3',
    name: 'Diamond',
    duration: 12,
    lockMonths: 12,
    apy: 100,
    color: 'cyan',
    icon: Crown,
    features: ['12 months lock', '100% APY', '50% bonus', 'Early unlock: 15%'],
    popular: false,
  },
];

export default function TierSelector({ selectedTier, onSelectTier, disabled }) {
  return (
    <div className="tier-selector-container">
      <div className="tier-selector-header">
        <h3>Choose Your Staking Tier</h3>
        <p>Lock your tokens for higher rewards</p>
      </div>

      <div className="tier-cards-grid">
        {TIERS.map((tier) => {
          const Icon = tier.icon;
          const isSelected = selectedTier === tier.id;
          
          return (
            <button
              key={tier.id}
              onClick={() => !disabled && onSelectTier(tier.id)}
              className={`tier-card ${tier.color} ${isSelected ? 'selected' : ''} ${tier.popular ? 'popular' : ''}`}
              disabled={disabled}
            >
              {tier.popular && <Badge className="popular-badge">⭐ Popular</Badge>}
              <div className="tier-icon-container"><Icon size={40} /></div>
              <div className="tier-info">
                <h4>{tier.name}</h4>
                {tier.lockMonths > 0 && <div className="tier-duration"><Lock size={14} />{tier.lockMonths}mo</div>}
              </div>
              <div className="tier-apy"><div className="apy-value">{tier.apy}%</div><div className="apy-label">APY</div></div>
              <ul className="tier-features">
                {tier.features.map((f, i) => <li key={i}><Check size={14} /><span>{f}</span></li>)}
              </ul>
              {isSelected && <div className="tier-selected-indicator"><Check size={20} />Selected</div>}
              <div className="tier-glow"></div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { TIERS };
