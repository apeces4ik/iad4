/**
 * FilterSidebar Component
 * Filter and sort NFTs by tier, price, status
 * Day 57-59: Marketplace UI (строки 500-600)
 */

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Filter, X, Award, DollarSign, TrendingUp } from 'lucide-react';

export default function FilterSidebar({ filters, onFilterChange, onReset }) {
  const [isOpen, setIsOpen] = useState(true);

  const tiers = [
    { value: 'bronze', label: 'Bronze', color: 'bg-amber-700' },
    { value: 'silver', label: 'Silver', color: 'bg-gray-400' },
    { value: 'gold', label: 'Gold', color: 'bg-yellow-500' },
    { value: 'diamond', label: 'Diamond', color: 'bg-cyan-400' },
    { value: 'legendary', label: 'Legendary', color: 'bg-purple-500' }
  ];

  const sortOptions = [
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'tier_asc', label: 'Tier: Low to High' },
    { value: 'tier_desc', label: 'Tier: High to Low' },
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' }
  ];

  const toggleTier = (tier) => {
    const currentTiers = filters.tiers || [];
    const newTiers = currentTiers.includes(tier)
      ? currentTiers.filter(t => t !== tier)
      : [...currentTiers, tier];
    onFilterChange({ ...filters, tiers: newTiers });
  };

  const handlePriceChange = (value) => {
    onFilterChange({
      ...filters,
      priceRange: { min: value[0], max: value[1] }
    });
  };

  const toggleForSale = () => {
    onFilterChange({
      ...filters,
      forSale: !filters.forSale
    });
  };

  return (
    <div className={`filter-sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="filter-sidebar-header">
        <div className="filter-header-title">
          <Filter size={20} />
          <h3>Filters</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="filter-toggle-btn"
        >
          {isOpen ? <X size={18} /> : <Filter size={18} />}
        </Button>
      </div>

      {isOpen && (
        <div className="filter-sidebar-content">
          {/* Status filter */}
          <Card className="filter-section">
            <div className="filter-section-header">
              <DollarSign size={16} />
              <h4>Status</h4>
            </div>
            <div className="filter-options">
              <label className="filter-checkbox-label">
                <input
                  type="checkbox"
                  checked={filters.forSale || false}
                  onChange={toggleForSale}
                  className="filter-checkbox"
                />
                <span>For Sale Only</span>
              </label>
            </div>
          </Card>

          {/* Tier filter */}
          <Card className="filter-section">
            <div className="filter-section-header">
              <Award size={16} />
              <h4>Tier</h4>
            </div>
            <div className="filter-tier-grid">
              {tiers.map((tier) => (
                <button
                  key={tier.value}
                  onClick={() => toggleTier(tier.value)}
                  className={`filter-tier-btn ${
                    filters.tiers?.includes(tier.value) ? 'active' : ''
                  }`}
                >
                  <div className={`tier-color-indicator ${tier.color}`}></div>
                  <span>{tier.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Price range */}
          <Card className="filter-section">
            <div className="filter-section-header">
              <TrendingUp size={16} />
              <h4>Price Range</h4>
            </div>
            <div className="filter-price-range">
              <div className="price-range-labels">
                <span>{filters.priceRange?.min || 0} AETH</span>
                <span>{filters.priceRange?.max || 10000} AETH</span>
              </div>
              <Slider
                value={[
                  filters.priceRange?.min || 0,
                  filters.priceRange?.max || 10000
                ]}
                onValueChange={handlePriceChange}
                min={0}
                max={10000}
                step={100}
                className="price-slider"
              />
            </div>
          </Card>

          {/* Sort options */}
          <Card className="filter-section">
            <div className="filter-section-header">
              <Filter size={16} />
              <h4>Sort By</h4>
            </div>
            <div className="filter-sort-options">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onFilterChange({ ...filters, sortBy: option.value })}
                  className={`filter-sort-btn ${
                    filters.sortBy === option.value ? 'active' : ''
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Active filters count */}
          {(filters.tiers?.length > 0 || filters.forSale) && (
            <div className="filter-active-count">
              <Badge variant="success">
                {(filters.tiers?.length || 0) + (filters.forSale ? 1 : 0)} Active
              </Badge>
            </div>
          )}

          {/* Reset button */}
          <Button
            variant="outline"
            onClick={onReset}
            className="filter-reset-btn"
          >
            <X size={16} />
            Reset Filters
          </Button>
        </div>
      )}
    </div>
  );
}
