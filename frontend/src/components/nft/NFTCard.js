/**
 * NFTCard Component
 * Display individual NFT with image, stats, and price
 * Day 57-59: Marketplace UI (строки 500-600)
 */

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, TrendingUp, Zap, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function NFTCard({ nft, onBuy, onView }) {
  const getTierColor = (tier) => {
    const colors = {
      bronze: 'bg-amber-700 text-amber-100',
      silver: 'bg-gray-400 text-gray-900',
      gold: 'bg-yellow-500 text-yellow-900',
      diamond: 'bg-cyan-400 text-cyan-900',
      legendary: 'bg-purple-500 text-purple-100'
    };
    return colors[tier?.toLowerCase()] || 'bg-gray-600';
  };

  const getTierMultiplier = (tier) => {
    const multipliers = {
      bronze: '1.1x',
      silver: '1.5x',
      gold: '2.0x',
      diamond: '2.5x',
      legendary: '3.0x'
    };
    return multipliers[tier?.toLowerCase()] || '1.0x';
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price);
  };

  return (
    <Card className="nft-card">
      <div className="nft-card-image-container">
        <img
          src={nft.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${nft.tokenId}`}
          alt={nft.name}
          className="nft-card-image"
          loading="lazy"
        />
        
        {nft.forSale && (
          <div className="nft-sale-badge">
            <Badge variant="success">For Sale</Badge>
          </div>
        )}

        <div className="nft-tier-badge">
          <Badge className={getTierColor(nft.tier)}>
            <Award size={12} />
            {nft.tier}
          </Badge>
        </div>
      </div>

      <div className="nft-card-content">
        <div className="nft-card-header">
          <h3 className="nft-card-title">{nft.name}</h3>
          <span className="nft-card-id">#{nft.tokenId}</span>
        </div>

        <div className="nft-card-stats">
          <div className="nft-stat">
            <TrendingUp size={14} />
            <span className="nft-stat-label">Earnings</span>
            <span className="nft-stat-value">{getTierMultiplier(nft.tier)}</span>
          </div>
          
          {nft.nodeId && (
            <div className="nft-stat">
              <Zap size={14} />
              <span className="nft-stat-label">Node</span>
              <span className="nft-stat-value">#{nft.nodeId}</span>
            </div>
          )}
        </div>

        {nft.owner && (
          <div className="nft-owner">
            <span className="nft-owner-label">Owner:</span>
            <span className="nft-owner-address">
              {`${nft.owner.slice(0, 6)}...${nft.owner.slice(-4)}`}
            </span>
          </div>
        )}

        <div className="nft-card-footer">
          {nft.forSale ? (
            <>
              <div className="nft-price">
                <span className="nft-price-label">Price</span>
                <span className="nft-price-value">
                  {formatPrice(nft.price)} AETH
                </span>
              </div>
              <div className="nft-card-actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onView(nft)}
                  className="nft-view-btn"
                >
                  <ExternalLink size={14} />
                  View
                </Button>
                <Button
                  size="sm"
                  onClick={() => onBuy(nft)}
                  className="nft-buy-btn"
                  disabled={nft.isOwned}
                >
                  {nft.isOwned ? 'Owned' : 'Buy Now'}
                </Button>
              </div>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onView(nft)}
              className="w-full"
            >
              <ExternalLink size={14} />
              View Details
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
