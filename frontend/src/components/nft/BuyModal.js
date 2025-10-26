/**
 * BuyModal Component
 * Modal for purchasing NFT with confirmation
 * Day 57-59: Marketplace UI (строки 500-600)
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Wallet, TrendingUp, Loader2, CheckCircle2, Award } from 'lucide-react';
import { toast } from 'sonner';

export default function BuyModal({ 
  isOpen, 
  onClose, 
  nft, 
  balance,
  onBuy, 
  isProcessing 
}) {
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const hasEnoughBalance = balance >= (nft?.price || 0);
  const shortfall = Math.max(0, (nft?.price || 0) - balance);

  const handleBuy = () => {
    if (!agreedToTerms) {
      toast.error('Please agree to the terms');
      return;
    }

    if (!hasEnoughBalance) {
      toast.error('Insufficient balance');
      return;
    }

    onBuy({
      tokenId: nft.tokenId,
      price: nft.price
    });
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const getTierColor = (tier) => {
    const colors = {
      bronze: 'bg-amber-700',
      silver: 'bg-gray-400',
      gold: 'bg-yellow-500',
      diamond: 'bg-cyan-400',
      legendary: 'bg-purple-500'
    };
    return colors[tier?.toLowerCase()] || 'bg-gray-600';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="buy-modal">
        <DialogHeader>
          <DialogTitle>Purchase NFT</DialogTitle>
          <DialogDescription>
            Review the details and confirm your purchase
          </DialogDescription>
        </DialogHeader>

        <div className="buy-modal-content">
          {/* NFT Preview */}
          <Card className="buy-nft-preview">
            <div className="buy-nft-image-container">
              <img
                src={nft?.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${nft?.tokenId}`}
                alt={nft?.name}
                className="buy-nft-image"
              />
              <div className="buy-nft-tier-badge">
                <Badge className={getTierColor(nft?.tier)}>
                  <Award size={12} />
                  {nft?.tier}
                </Badge>
              </div>
            </div>
            
            <div className="buy-nft-info">
              <h3>{nft?.name}</h3>
              <span className="buy-nft-id">Token ID: #{nft?.tokenId}</span>
              
              <div className="buy-nft-stats">
                <div className="buy-stat">
                  <span className="buy-stat-label">Earnings Multiplier</span>
                  <span className="buy-stat-value">
                    <TrendingUp size={14} />
                    {nft?.multiplier || '1.1x'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Purchase Summary */}
          <Card className="buy-summary">
            <div className="buy-summary-header">
              <ShoppingCart size={18} />
              <h4>Purchase Summary</h4>
            </div>

            <div className="buy-summary-rows">
              <div className="buy-row">
                <span className="buy-row-label">NFT Price</span>
                <span className="buy-row-value">{formatNumber(nft?.price || 0)} AETH</span>
              </div>
              
              <div className="buy-row">
                <span className="buy-row-label">Your Balance</span>
                <span className={`buy-row-value ${hasEnoughBalance ? 'text-green-400' : 'text-red-400'}`}>
                  {formatNumber(balance)} AETH
                </span>
              </div>

              {!hasEnoughBalance && (
                <div className="buy-row error">
                  <span className="buy-row-label">Shortfall</span>
                  <span className="buy-row-value text-red-400">
                    -{formatNumber(shortfall)} AETH
                  </span>
                </div>
              )}

              <div className="buy-row total">
                <span className="buy-row-label">After Purchase</span>
                <span className="buy-row-value">
                  {formatNumber(Math.max(0, balance - (nft?.price || 0)))} AETH
                </span>
              </div>
            </div>
          </Card>

          {/* Seller Info */}
          <Card className="buy-seller-info">
            <div className="buy-seller-row">
              <span className="buy-seller-label">Seller</span>
              <span className="buy-seller-address">
                {nft?.owner ? `${nft.owner.slice(0, 6)}...${nft.owner.slice(-4)}` : 'Unknown'}
              </span>
            </div>
          </Card>

          {/* Benefits */}
          <Card className="buy-benefits">
            <h4>What You Get</h4>
            <ul className="buy-benefits-list">
              <li>
                <CheckCircle2 size={16} />
                <span>Full ownership of the NFT</span>
              </li>
              <li>
                <CheckCircle2 size={16} />
                <span>Enhanced node earnings ({nft?.multiplier || '1.1x'})</span>
              </li>
              <li>
                <CheckCircle2 size={16} />
                <span>Ability to resell on marketplace</span>
              </li>
            </ul>
          </Card>

          {/* Terms */}
          <div className="buy-terms">
            <label className="buy-terms-label">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="buy-terms-checkbox"
              />
              <span>
                I understand that this purchase is final and non-refundable. The NFT will be transferred to my wallet upon confirmation.
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="buy-modal-actions">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleBuy}
              disabled={!agreedToTerms || !hasEnoughBalance || isProcessing}
              className="buy-confirm-btn"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wallet size={18} />
                  Buy for {formatNumber(nft?.price || 0)} AETH
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
