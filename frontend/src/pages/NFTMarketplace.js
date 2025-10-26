/**
 * NFT Marketplace Page
 * Main marketplace page with gallery, filters, and modals
 * Day 57-59: Marketplace UI (строки 500-600)
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import NFTGallery from '../components/nft/NFTGallery';
import FilterSidebar from '../components/nft/FilterSidebar';
import ListingModal from '../components/nft/ListingModal';
import BuyModal from '../components/nft/BuyModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, TrendingUp, Users, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function NFTMarketplace() {
  const { address, isConnected } = useAccount();
  
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  
  const [filters, setFilters] = useState({
    tiers: [],
    priceRange: { min: 0, max: 10000 },
    forSale: false,
    sortBy: 'newest'
  });

  const [selectedNFT, setSelectedNFT] = useState(null);
  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [balance, setBalance] = useState(1000); // Mock balance
  
  const [stats, setStats] = useState({
    totalVolume: 125430,
    floorPrice: 250,
    listed: 47,
    owners: 124
  });

  // Mock NFT data
  useEffect(() => {
    loadNFTs();
  }, [filters, page]);

  const loadNFTs = async () => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockNFTs = Array.from({ length: 12 }, (_, i) => ({
      tokenId: page * 12 + i,
      name: `Node NFT #${page * 12 + i}`,
      tier: ['bronze', 'silver', 'gold', 'diamond', 'legendary'][Math.floor(Math.random() * 5)],
      image: null,
      price: Math.floor(Math.random() * 5000) + 100,
      owner: '0x' + Math.random().toString(16).slice(2, 42),
      forSale: Math.random() > 0.3,
      multiplier: ['1.1x', '1.5x', '2.0x', '2.5x', '3.0x'][Math.floor(Math.random() * 5)],
      nodeId: Math.floor(Math.random() * 1000),
      isOwned: Math.random() > 0.9,
      suggestedPrice: Math.floor(Math.random() * 3000) + 500
    }));

    setNfts(prev => page === 1 ? mockNFTs : [...prev, ...mockNFTs]);
    setHasMore(page < 3); // Only 3 pages
    setLoading(false);
  };

  const handleLoadMore = () => {
    setPage(prev => prev + 1);
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
    setNfts([]);
  };

  const handleResetFilters = () => {
    setFilters({
      tiers: [],
      priceRange: { min: 0, max: 10000 },
      forSale: false,
      sortBy: 'newest'
    });
    setPage(1);
    setNfts([]);
  };

  const handleBuyClick = (nft) => {
    setSelectedNFT(nft);
    setBuyModalOpen(true);
  };

  const handleListClick = (nft) => {
    setSelectedNFT(nft);
    setListingModalOpen(true);
  };

  const handleViewDetails = (nft) => {
    toast.info('NFT Details Page - Coming Soon!');
    console.log('View NFT:', nft);
  };

  const handleBuy = async (buyData) => {
    setIsProcessing(true);
    
    // Simulate blockchain transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success(`Successfully purchased ${selectedNFT.name}!`);
    setBalance(prev => prev - buyData.price);
    setBuyModalOpen(false);
    setIsProcessing(false);
    
    // Refresh NFTs
    setPage(1);
    setNfts([]);
    loadNFTs();
  };

  const handleList = async (listingData) => {
    setIsProcessing(true);
    
    // Simulate blockchain transaction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.success(`${selectedNFT.name} listed for ${listingData.price} AETH!`);
    setListingModalOpen(false);
    setIsProcessing(false);
    
    // Refresh NFTs
    setPage(1);
    setNfts([]);
    loadNFTs();
  };

  if (!isConnected) {
    return (
      <div className="marketplace-connect-prompt">
        <ShoppingBag size={64} className="prompt-icon" />
        <h2>Connect Your Wallet</h2>
        <p>Please connect your wallet to access the NFT Marketplace</p>
      </div>
    );
  }

  return (
    <div className="nft-marketplace-page">
      <div className="marketplace-header">
        <div className="marketplace-title">
          <h1>NFT Marketplace</h1>
          <p>Buy, sell, and trade Node NFTs to boost your earnings</p>
        </div>

        {/* Stats */}
        <div className="marketplace-stats-grid">
          <Card className="marketplace-stat-card">
            <div className="stat-icon">
              <DollarSign size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Volume</span>
              <span className="stat-value">{(stats.totalVolume / 1000).toFixed(1)}K AETH</span>
            </div>
          </Card>

          <Card className="marketplace-stat-card">
            <div className="stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Floor Price</span>
              <span className="stat-value">{stats.floorPrice} AETH</span>
            </div>
          </Card>

          <Card className="marketplace-stat-card">
            <div className="stat-icon">
              <ShoppingBag size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Listed</span>
              <span className="stat-value">{stats.listed} NFTs</span>
            </div>
          </Card>

          <Card className="marketplace-stat-card">
            <div className="stat-icon">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Owners</span>
              <span className="stat-value">{stats.owners}</span>
            </div>
          </Card>
        </div>
      </div>

      <div className="marketplace-content">
        <FilterSidebar
          filters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleResetFilters}
        />

        <div className="marketplace-main">
          <NFTGallery
            nfts={nfts}
            loading={loading}
            onBuy={handleBuyClick}
            onView={handleViewDetails}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
          />
        </div>
      </div>

      {/* Modals */}
      <BuyModal
        isOpen={buyModalOpen}
        onClose={() => setBuyModalOpen(false)}
        nft={selectedNFT}
        balance={balance}
        onBuy={handleBuy}
        isProcessing={isProcessing}
      />

      <ListingModal
        isOpen={listingModalOpen}
        onClose={() => setListingModalOpen(false)}
        nft={selectedNFT}
        onList={handleList}
        isProcessing={isProcessing}
      />
    </div>
  );
}
