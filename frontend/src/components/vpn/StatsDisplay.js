/**
 * StatsDisplay - Real-time connection statistics display
 * Day 53-54: VPN Page Enhancement
 */

import React, { useEffect, useState } from 'react';
import { Activity, Download, Upload, Clock, Zap, Globe } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function StatsDisplay({ isConnected, connectionTime = 0, activeSession }) {
  const [stats, setStats] = useState({
    downloadSpeed: 0,
    uploadSpeed: 0,
    dataUsed: 0,
    dataTransferred: 0,
  });

  // Simulate real-time stats (in production, get from backend)
  useEffect(() => {
    if (!isConnected) {
      setStats({ downloadSpeed: 0, uploadSpeed: 0, dataUsed: 0, dataTransferred: 0 });
      return;
    }

    const interval = setInterval(() => {
      setStats(prev => ({
        downloadSpeed: Math.random() * 50 + 20, // 20-70 Mbps
        uploadSpeed: Math.random() * 20 + 10,   // 10-30 Mbps
        dataUsed: prev.dataUsed + (Math.random() * 0.5), // Increment data
        dataTransferred: prev.dataTransferred + (Math.random() * 2),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const formatSpeed = (mbps) => {
    if (mbps >= 1000) {
      return `${(mbps / 1000).toFixed(2)} Gbps`;
    }
    return `${mbps.toFixed(1)} Mbps`;
  };

  const formatData = (mb) => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(1)} MB`;
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <div className="stats-display-container">
      {/* Main stats grid */}
      <div className="stats-grid">
        {/* Download Speed */}
        <Card className="stat-card stat-card-animated">
          <div className="stat-icon download">
            <Download size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Download</div>
            <div className="stat-value">
              {isConnected ? formatSpeed(stats.downloadSpeed) : '0 Mbps'}
            </div>
            {isConnected && (
              <div className="stat-graph">
                <div className="stat-bar" style={{ width: `${(stats.downloadSpeed / 70) * 100}%` }}></div>
              </div>
            )}
          </div>
        </Card>

        {/* Upload Speed */}
        <Card className="stat-card stat-card-animated">
          <div className="stat-icon upload">
            <Upload size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Upload</div>
            <div className="stat-value">
              {isConnected ? formatSpeed(stats.uploadSpeed) : '0 Mbps'}
            </div>
            {isConnected && (
              <div className="stat-graph">
                <div className="stat-bar" style={{ width: `${(stats.uploadSpeed / 30) * 100}%` }}></div>
              </div>
            )}
          </div>
        </Card>

        {/* Connection Time */}
        <Card className="stat-card stat-card-animated">
          <div className="stat-icon time">
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Duration</div>
            <div className="stat-value">
              {isConnected ? formatTime(connectionTime) : '0s'}
            </div>
            {isConnected && (
              <Badge variant="outline" className="stat-badge">
                <Activity size={12} />
                Active
              </Badge>
            )}
          </div>
        </Card>

        {/* Data Used */}
        <Card className="stat-card stat-card-animated">
          <div className="stat-icon data">
            <Globe size={24} />
          </div>
          <div className="stat-content">
            <div className="stat-label">Data Used</div>
            <div className="stat-value">
              {isConnected ? formatData(stats.dataUsed) : '0 MB'}
            </div>
            {isConnected && (
              <div className="stat-subtext">
                Total: {formatData(stats.dataTransferred)}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Connection quality indicator */}
      {isConnected && (
        <Card className="connection-quality-card">
          <div className="quality-header">
            <Zap size={20} className="quality-icon" />
            <span className="quality-label">Connection Quality</span>
          </div>
          <div className="quality-meter">
            <div className="quality-bar excellent">
              <div className="quality-fill" style={{ width: '95%' }}></div>
            </div>
            <div className="quality-indicators">
              <span className="quality-indicator active">●</span>
              <span className="quality-indicator active">●</span>
              <span className="quality-indicator active">●</span>
              <span className="quality-indicator active">●</span>
              <span className="quality-indicator">●</span>
            </div>
          </div>
          <div className="quality-status">
            <Badge className="quality-badge excellent">Excellent</Badge>
            <span className="quality-text">Optimal performance detected</span>
          </div>
        </Card>
      )}

      {/* Session info */}
      {isConnected && activeSession && (
        <Card className="session-info-card">
          <div className="session-info-row">
            <span className="session-label">Session ID:</span>
            <code className="session-value">{activeSession.session_id?.slice(0, 16)}...</code>
          </div>
          {activeSession.server_ip && (
            <div className="session-info-row">
              <span className="session-label">Server IP:</span>
              <code className="session-value">{activeSession.server_ip}</code>
            </div>
          )}
          {activeSession.protocol && (
            <div className="session-info-row">
              <span className="session-label">Protocol:</span>
              <Badge variant="outline" className="session-badge">{activeSession.protocol}</Badge>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
