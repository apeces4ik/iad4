/**
 * LocationMap - Interactive location selector with world map visualization
 * Day 53-54: VPN Page Enhancement
 */

import React, { useState } from 'react';
import { MapPin, Wifi, TrendingUp, Users, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const MOCK_LOCATIONS = [
  { code: 'US-NY', name: 'New York', country: 'USA', region: 'Americas', latency: 12, load: 45, users: 1250, coordinates: { x: 25, y: 40 } },
  { code: 'US-LA', name: 'Los Angeles', country: 'USA', region: 'Americas', latency: 35, load: 62, users: 890, coordinates: { x: 15, y: 45 } },
  { code: 'UK-LON', name: 'London', country: 'UK', region: 'Europe', latency: 28, load: 38, users: 2100, coordinates: { x: 50, y: 35 } },
  { code: 'DE-FRA', name: 'Frankfurt', country: 'Germany', region: 'Europe', latency: 25, load: 52, users: 1580, coordinates: { x: 52, y: 37 } },
  { code: 'SG-SIN', name: 'Singapore', country: 'Singapore', region: 'Asia', latency: 45, load: 68, users: 1820, coordinates: { x: 78, y: 55 } },
  { code: 'JP-TOK', name: 'Tokyo', country: 'Japan', region: 'Asia', latency: 50, load: 71, users: 1450, coordinates: { x: 85, y: 42 } },
  { code: 'AU-SYD', name: 'Sydney', country: 'Australia', region: 'Oceania', latency: 65, load: 55, users: 780, coordinates: { x: 88, y: 75 } },
  { code: 'BR-SAO', name: 'São Paulo', country: 'Brazil', region: 'Americas', latency: 120, load: 48, users: 650, coordinates: { x: 32, y: 72 } },
];

export default function LocationMap({ selectedLocation, onSelectLocation, disabled }) {
  const [hoveredLocation, setHoveredLocation] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('all');

  const regions = ['all', 'Americas', 'Europe', 'Asia', 'Oceania'];
  
  const filteredLocations = selectedRegion === 'all' 
    ? MOCK_LOCATIONS 
    : MOCK_LOCATIONS.filter(loc => loc.region === selectedRegion);

  const getLoadColor = (load) => {
    if (load < 50) return 'text-green-400';
    if (load < 75) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getLoadLabel = (load) => {
    if (load < 50) return 'Low';
    if (load < 75) return 'Medium';
    return 'High';
  };

  return (
    <div className="location-map-container">
      {/* Region filter */}
      <div className="region-filter">
        {regions.map(region => (
          <button
            key={region}
            onClick={() => setSelectedRegion(region)}
            className={`region-btn ${selectedRegion === region ? 'active' : ''}`}
          >
            {region}
          </button>
        ))}
      </div>

      {/* World map visualization */}
      <Card className="location-map-card">
        <div className="world-map">
          {/* Decorative world map background */}
          <div className="map-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`h-${i}`} className="grid-line horizontal" style={{ top: `${(i + 1) * 12.5}%` }} />
            ))}
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={`v-${i}`} className="grid-line vertical" style={{ left: `${(i + 1) * 8.33}%` }} />
            ))}
          </div>
          
          {/* Location markers */}
          {filteredLocations.map(location => {
            const isSelected = selectedLocation === location.code;
            const isHovered = hoveredLocation === location.code;
            
            return (
              <button
                key={location.code}
                className={`location-marker ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
                style={{
                  left: `${location.coordinates.x}%`,
                  top: `${location.coordinates.y}%`,
                }}
                onClick={() => !disabled && onSelectLocation(location.code)}
                onMouseEnter={() => setHoveredLocation(location.code)}
                onMouseLeave={() => setHoveredLocation(null)}
                disabled={disabled}
              >
                <div className="marker-ping"></div>
                <div className="marker-dot">
                  {isSelected && <Check size={12} />}
                </div>
                
                {/* Location tooltip */}
                {(isHovered || isSelected) && (
                  <div className="location-tooltip">
                    <div className="tooltip-header">
                      <MapPin size={14} />
                      <span className="tooltip-name">{location.name}</span>
                    </div>
                    <div className="tooltip-stats">
                      <div className="tooltip-stat">
                        <Wifi size={12} />
                        <span>{location.latency}ms</span>
                      </div>
                      <div className="tooltip-stat">
                        <TrendingUp size={12} className={getLoadColor(location.load)} />
                        <span>{getLoadLabel(location.load)}</span>
                      </div>
                      <div className="tooltip-stat">
                        <Users size={12} />
                        <span>{location.users}</span>
                      </div>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Location list */}
      <div className="location-list">
        {filteredLocations.map(location => {
          const isSelected = selectedLocation === location.code;
          
          return (
            <button
              key={location.code}
              onClick={() => !disabled && onSelectLocation(location.code)}
              className={`location-item ${isSelected ? 'selected' : ''}`}
              disabled={disabled}
            >
              <div className="location-item-main">
                <div className="location-item-icon">
                  <MapPin size={20} />
                </div>
                <div className="location-item-info">
                  <div className="location-item-name">{location.name}</div>
                  <div className="location-item-country">{location.country}</div>
                </div>
              </div>
              
              <div className="location-item-stats">
                <Badge variant="outline" className="location-stat">
                  <Wifi size={12} />
                  {location.latency}ms
                </Badge>
                <Badge variant="outline" className={`location-stat ${getLoadColor(location.load)}`}>
                  <TrendingUp size={12} />
                  {location.load}%
                </Badge>
              </div>
              
              {isSelected && (
                <div className="location-selected-indicator">
                  <Check size={16} />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
