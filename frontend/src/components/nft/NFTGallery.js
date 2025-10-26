/**
 * NFTGallery Component
 * Display grid of NFT cards with lazy loading
 * Day 57-59: Marketplace UI (строки 500-600)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import NFTCard from './NFTCard';
import { Loader2, Grid3x3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NFTGallery({ 
  nfts, 
  loading, 
  onBuy, 
  onView,
  onLoadMore,
  hasMore = false 
}) {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const observerTarget = useRef(null);

  // Infinite scroll with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          onLoadMore?.();
        }
      },
      { threshold: 0.5 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, onLoadMore]);

  if (loading && nfts.length === 0) {
    return (
      <div className="nft-gallery-loading">
        <Loader2 size={48} className="animate-spin text-cyan-400" />
        <p>Loading NFTs...</p>
      </div>
    );
  }

  if (!loading && nfts.length === 0) {
    return (
      <div className="nft-gallery-empty">
        <Grid3x3 size={64} className="empty-icon" />
        <h3>No NFTs Found</h3>
        <p>Try adjusting your filters or check back later</p>
      </div>
    );
  }

  return (
    <div className="nft-gallery-container">
      {/* View mode toggle */}
      <div className="nft-gallery-header">
        <div className="nft-gallery-count">
          <span className="count-number">{nfts.length}</span>
          <span className="count-label">NFTs</span>
        </div>
        
        <div className="view-mode-toggle">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 size={16} />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List size={16} />
          </Button>
        </div>
      </div>

      {/* NFT Grid */}
      <div className={`nft-gallery ${viewMode === 'list' ? 'nft-gallery-list' : 'nft-gallery-grid'}`}>
        {nfts.map((nft) => (
          <NFTCard
            key={nft.tokenId}
            nft={nft}
            onBuy={onBuy}
            onView={onView}
          />
        ))}
      </div>

      {/* Loading more indicator */}
      {hasMore && (
        <div ref={observerTarget} className="nft-gallery-load-more">
          {loading ? (
            <>
              <Loader2 size={24} className="animate-spin" />
              <span>Loading more...</span>
            </>
          ) : (
            <span>Scroll for more</span>
          )}
        </div>
      )}

      {/* End message */}
      {!hasMore && nfts.length > 0 && (
        <div className="nft-gallery-end">
          <span>You've reached the end</span>
        </div>
      )}
    </div>
  );
}
