/**
 * StakeModal - Enhanced modal for staking/unstaking
 * Day 55-56: Staking Page Enhancement
 */

import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Lock, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function StakeModal({ isOpen, onClose, type = 'stake', balance, staked, onConfirm, isProcessing, selectedTier }) {
  const [amount, setAmount] = useState('');
  const isStake = type === 'stake';
  const maxAmount = isStake ? balance : staked;

  const handleConfirm = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error('Enter valid amount');
      return;
    }
    if (amt > maxAmount) {
      toast.error('Insufficient ' + (isStake ? 'balance' : 'staked amount'));
      return;
    }
    onConfirm(amt);
  };

  const fmt = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(n);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="stake-modal">
        <DialogHeader>
          <DialogTitle className="stake-modal-title">
            <div className={`stake-icon-container ${isStake ? 'stake' : 'unstake'}`}>
              {isStake ? <ArrowUpRight size={32} /> : <ArrowDownRight size={32} />}
            </div>
            {isStake ? 'Stake Tokens' : 'Unstake Tokens'}
          </DialogTitle>
        </DialogHeader>

        <div className="stake-modal-content">
          <Card className="stake-input-card">
            <Label>Amount</Label>
            <div className="input-with-max">
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="stake-input" />
              <button onClick={() => setAmount(maxAmount.toString())} className="max-btn">MAX</button>
            </div>
            <div className="input-hint">Available: {fmt(maxAmount)} AETH</div>
          </Card>

          {selectedTier && (
            <Card className="tier-info-card">
              <Lock size={16} />
              <div><strong>Tier:</strong> {selectedTier.name} ({selectedTier.apy}% APY)</div>
            </Card>
          )}

          {!isStake && (
            <Card className="warning-card">
              <AlertTriangle size={18} />
              <div><strong>Early Unstake Fee</strong><p>10% fee for unlocking before period ends</p></div>
            </Card>
          )}

          <Card className="info-card">
            <Info size={16} />
            <div>{isStake ? 'Staked tokens earn rewards daily' : 'Unstaking may incur fees'}</div>
          </Card>

          <div className="stake-modal-actions">
            <Button variant="outline" onClick={onClose} disabled={isProcessing}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={isProcessing} className={isStake ? 'stake-btn' : 'unstake-btn'}>
              {isProcessing ? <><Loader2 size={18} className="spin" />Processing...</> : <>{isStake ? <><ArrowUpRight size={18} />Stake</> : <><ArrowDownRight size={18} />Unstake</>}</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
