/**
 * ListingModal Component
 * Modal for listing NFT for sale
 * Day 57-59: Marketplace UI (строки 500-600)
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Tag, TrendingUp, Loader2, AlertCircle, Award } from 'lucide-react';
import { toast } from 'sonner';

export default function ListingModal({ 
  isOpen, 
  onClose, 
  nft, 
  onList, 
  isProcessing 
}) {
  const [price, setPrice] = useState('');
  const [listingDuration, setListingDuration] = useState('7'); // days

  const marketplaceFee = 2.5; // 2.5%
  const suggestedPrice = nft?.suggestedPrice || 1000;

  const calculateFees = () => {
    const priceNum = parseFloat(price) || 0;
    const fee = (priceNum * marketplaceFee) / 100;
    const youReceive = priceNum - fee;
    return { fee, youReceive };
  };

  const { fee, youReceive } = calculateFees();

  const handleList = () => {
    const priceNum = parseFloat(price);
    
    if (!priceNum || priceNum <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    if (priceNum < 10) {
      toast.error('Minimum price is 10 AETH');
      return;
    }

    onList({
      tokenId: nft.tokenId,
      price: priceNum,
      duration: parseInt(listingDuration)
    });
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="listing-modal">
        <DialogHeader>
          <DialogTitle>List NFT for Sale</DialogTitle>
          <DialogDescription>
            Set a price and list your NFT on the marketplace
          </DialogDescription>
        </DialogHeader>

        <div className="listing-modal-content">
          {/* NFT Preview */}
          <Card className="listing-nft-preview">
            <img
              src={nft?.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${nft?.tokenId}`}
              alt={nft?.name}
              className="listing-nft-image"
            />
            <div className="listing-nft-info">
              <h3>{nft?.name}</h3>
              <div className="listing-nft-badges">
                <Badge variant="secondary">
                  <Award size={12} />
                  {nft?.tier}
                </Badge>
                <Badge variant="outline">#{nft?.tokenId}</Badge>
              </div>
            </div>
          </Card>

          {/* Price Input */}
          <div className="listing-price-section">
            <label className="listing-label">
              <DollarSign size={16} />
              Listing Price (AETH)
            </label>
            <div className="listing-price-input-container">
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Enter price"
                min="10"
                step="10"
                className="listing-price-input"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPrice(suggestedPrice.toString())}
                className="listing-suggested-btn"
              >
                <TrendingUp size={14} />
                Suggested: {suggestedPrice}
              </Button>
            </div>
            <span className="listing-hint">Minimum: 10 AETH</span>
          </div>

          {/* Listing Duration */}
          <div className="listing-duration-section">
            <label className="listing-label">
              <Tag size={16} />
              Listing Duration
            </label>
            <div className="listing-duration-options">
              {['7', '14', '30'].map((days) => (
                <button
                  key={days}
                  onClick={() => setListingDuration(days)}
                  className={`listing-duration-btn ${
                    listingDuration === days ? 'active' : ''
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>

          {/* Fee Breakdown */}
          {price && parseFloat(price) > 0 && (
            <Card className="listing-fee-breakdown">
              <div className="fee-row">
                <span className="fee-label">Listing Price</span>
                <span className="fee-value">{formatNumber(parseFloat(price))} AETH</span>
              </div>
              <div className="fee-row">
                <span className="fee-label">
                  Marketplace Fee ({marketplaceFee}%)
                </span>
                <span className="fee-value text-red-400">-{formatNumber(fee)} AETH</span>
              </div>
              <div className="fee-row total">
                <span className="fee-label">You Receive</span>
                <span className="fee-value text-green-400">{formatNumber(youReceive)} AETH</span>
              </div>
            </Card>
          )}

          {/* Warning */}
          <Card className="listing-warning">
            <AlertCircle size={18} />
            <div className="listing-warning-text">
              <strong>Important</strong>
              <p>Once listed, the NFT will be transferred to the marketplace contract until sold or delisted.</p>
            </div>
          </Card>

          {/* Actions */}
          <div className="listing-modal-actions">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleList}
              disabled={!price || parseFloat(price) < 10 || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Listing...
                </>
              ) : (
                <>
                  <Tag size={18} />
                  List for Sale
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
