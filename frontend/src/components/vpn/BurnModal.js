/**
 * BurnModal - Modal for burning tokens to connect (non-premium users)
 * Day 53-54: VPN Page Enhancement
 */

import React, { useState } from 'react';
import { Flame, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function BurnModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  balance, 
  burnAmount,
  isProcessing 
}) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleConfirm = () => {
    if (!agreedToTerms) {
      toast.error('Please agree to the burn terms');
      return;
    }
    if (balance < burnAmount) {
      toast.error('Insufficient balance');
      return;
    }
    onConfirm();
  };

  const formatBalance = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="burn-modal">
        <DialogHeader>
          <DialogTitle className="burn-modal-title">
            <div className="burn-icon-container">
              <Flame size={32} className="burn-icon" />
            </div>
            Burn Tokens to Connect
          </DialogTitle>
          <DialogDescription>
            Connect to the VPN by burning AETH tokens. This is required for non-premium users.
          </DialogDescription>
        </DialogHeader>

        <div className="burn-modal-content">
          {/* Burn amount display */}
          <Card className="burn-amount-card">
            <div className="burn-amount-header">
              <span className="burn-amount-label">Amount to Burn</span>
              <Badge variant="destructive" className="burn-badge">
                <Flame size={12} />
                One-time fee
              </Badge>
            </div>
            <div className="burn-amount-value">
              <Flame size={24} className="burn-amount-icon" />
              <span className="burn-amount-number">{formatBalance(burnAmount)}</span>
              <span className="burn-amount-symbol">AETH</span>
            </div>
          </Card>

          {/* Balance check */}
          <div className="burn-balance-check">
            <div className="balance-row">
              <span className="balance-label">Your Balance:</span>
              <span className="balance-value">{formatBalance(balance)} AETH</span>
            </div>
            <div className="balance-row">
              <span className="balance-label">After Burn:</span>
              <span className={`balance-value ${balance - burnAmount < 0 ? 'insufficient' : ''}`}>
                {formatBalance(Math.max(0, balance - burnAmount))} AETH
              </span>
            </div>
          </div>

          {/* Warning message */}
          {balance < burnAmount && (
            <Card className="burn-warning-card error">
              <AlertTriangle size={20} />
              <div className="burn-warning-text">
                <strong>Insufficient Balance</strong>
                <p>You need {formatBalance(burnAmount - balance)} more AETH to connect.</p>
              </div>
            </Card>
          )}

          {/* Info message */}
          <Card className="burn-info-card">
            <Info size={18} />
            <div className="burn-info-text">
              <strong>What is token burning?</strong>
              <p>Burned tokens are permanently removed from circulation. This helps maintain network value and security.</p>
            </div>
          </Card>

          {/* Benefits */}
          <div className="burn-benefits">
            <div className="burn-benefit-title">Why burn tokens?</div>
            <ul className="burn-benefit-list">
              <li>
                <div className="benefit-icon">✓</div>
                <span>Reduces total token supply</span>
              </li>
              <li>
                <div className="benefit-icon">✓</div>
                <span>Increases scarcity and value</span>
              </li>
              <li>
                <div className="benefit-icon">✓</div>
                <span>Supports network sustainability</span>
              </li>
            </ul>
          </div>

          {/* Premium suggestion */}
          <Card className="premium-suggestion-card">
            <div className="premium-suggestion-content">
              <div className="premium-suggestion-icon">👑</div>
              <div className="premium-suggestion-text">
                <strong>Want unlimited connections?</strong>
                <p>Upgrade to Premium and never burn tokens again!</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => toast.info('Premium page coming soon!')}>
              Learn More
            </Button>
          </Card>

          {/* Terms agreement */}
          <div className="burn-terms">
            <label className="burn-terms-label">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="burn-terms-checkbox"
              />
              <span>
                I understand that burning tokens is irreversible and the tokens will be permanently removed from circulation.
              </span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="burn-modal-actions">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
              className="burn-cancel-btn"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!agreedToTerms || balance < burnAmount || isProcessing}
              className="burn-confirm-btn"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Flame size={18} />
                  Burn & Connect
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
