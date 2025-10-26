/**
 * ConnectionButton - Beautiful large VPN connection button
 * Day 53-54: VPN Page Enhancement
 */

import React from 'react';
import { Power, Loader2, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ConnectionButton({ 
  isConnected, 
  isConnecting, 
  onConnect, 
  onDisconnect,
  connectionTime = 0 
}) {
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="connection-button-container">
      <div className={`connection-button-wrapper ${isConnected ? 'connected' : ''}`}>
        {/* Animated glow effect */}
        <div className="connection-glow"></div>
        
        {/* Main button */}
        <button
          onClick={isConnected ? onDisconnect : onConnect}
          disabled={isConnecting}
          className="connection-button-main"
        >
          <div className="connection-button-inner">
            {/* Icon */}
            <div className="connection-icon">
              {isConnecting ? (
                <Loader2 size={80} className="spin" />
              ) : isConnected ? (
                <Shield size={80} />
              ) : (
                <Power size={80} />
              )}
            </div>
            
            {/* Status text */}
            <div className="connection-status">
              {isConnecting ? (
                <span className="status-text">Connecting...</span>
              ) : isConnected ? (
                <>
                  <span className="status-text">Connected</span>
                  <span className="connection-time">{formatTime(connectionTime)}</span>
                </>
              ) : (
                <span className="status-text">Click to Connect</span>
              )}
            </div>
          </div>
          
          {/* Pulse animation for connected state */}
          {isConnected && (
            <div className="connection-pulse">
              <div className="pulse-ring"></div>
              <div className="pulse-ring pulse-ring-2"></div>
            </div>
          )}
        </button>
        
        {/* Connection quality indicator */}
        {isConnected && (
          <div className="connection-quality">
            <Zap size={16} />
            <span>Excellent Connection</span>
          </div>
        )}
      </div>
      
      {/* Action hint */}
      {!isConnected && !isConnecting && (
        <p className="connection-hint">
          One-click secure connection to the decentralized network
        </p>
      )}
    </div>
  );
}
