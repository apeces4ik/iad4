/**
 * VPNSettings - Kill switch and split tunneling configuration
 * Day 53-54: VPN Page Enhancement
 */

import React, { useState } from 'react';
import { Shield, Globe, Settings, Info, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function VPNSettings({ isConnected, onSettingsChange }) {
  const [settings, setSettings] = useState({
    killSwitch: true,
    splitTunneling: false,
    autoConnect: false,
    dnsLeak: true,
    ipv6: true,
  });

  const [splitTunnelApps, setSplitTunnelApps] = useState([
    { name: 'Chrome', icon: '🌐', enabled: false },
    { name: 'Telegram', icon: '💬', enabled: false },
    { name: 'Discord', icon: '🎮', enabled: false },
    { name: 'Spotify', icon: '🎵', enabled: false },
  ]);

  const handleSettingToggle = (key) => {
    if (isConnected && key === 'killSwitch') {
      toast.warning('Cannot disable kill switch while connected');
      return;
    }

    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
    toast.success(`${key} ${newSettings[key] ? 'enabled' : 'disabled'}`);
  };

  const toggleSplitTunnelApp = (appName) => {
    if (!settings.splitTunneling) {
      toast.info('Enable Split Tunneling first');
      return;
    }

    setSplitTunnelApps(apps =>
      apps.map(app =>
        app.name === appName ? { ...app, enabled: !app.enabled } : app
      )
    );
  };

  return (
    <div className="vpn-settings-container">
      <div className="settings-header">
        <Settings size={24} />
        <h3>VPN Settings</h3>
      </div>

      {/* Main settings */}
      <div className="settings-grid">
        {/* Kill Switch */}
        <Card className="setting-card">
          <div className="setting-content">
            <div className="setting-icon kill-switch">
              <Shield size={24} />
            </div>
            <div className="setting-info">
              <div className="setting-title">
                Kill Switch
                <Badge variant={settings.killSwitch ? 'default' : 'outline'} className="setting-badge">
                  {settings.killSwitch ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="setting-description">
                Blocks all internet traffic if VPN connection drops, preventing data leaks.
              </div>
            </div>
            <Switch
              checked={settings.killSwitch}
              onCheckedChange={() => handleSettingToggle('killSwitch')}
              disabled={isConnected}
            />
          </div>
          {isConnected && settings.killSwitch && (
            <div className="setting-status active">
              <Shield size={14} />
              <span>Protection Active</span>
            </div>
          )}
        </Card>

        {/* DNS Leak Protection */}
        <Card className="setting-card">
          <div className="setting-content">
            <div className="setting-icon dns">
              <Globe size={24} />
            </div>
            <div className="setting-info">
              <div className="setting-title">
                DNS Leak Protection
                <Badge variant={settings.dnsLeak ? 'default' : 'outline'} className="setting-badge">
                  {settings.dnsLeak ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="setting-description">
                Prevents DNS queries from leaking outside the VPN tunnel.
              </div>
            </div>
            <Switch
              checked={settings.dnsLeak}
              onCheckedChange={() => handleSettingToggle('dnsLeak')}
            />
          </div>
        </Card>

        {/* IPv6 Protection */}
        <Card className="setting-card">
          <div className="setting-content">
            <div className="setting-icon ipv6">
              <Shield size={24} />
            </div>
            <div className="setting-info">
              <div className="setting-title">
                IPv6 Leak Protection
                <Badge variant={settings.ipv6 ? 'default' : 'outline'} className="setting-badge">
                  {settings.ipv6 ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="setting-description">
                Blocks IPv6 traffic to prevent IP address leaks.
              </div>
            </div>
            <Switch
              checked={settings.ipv6}
              onCheckedChange={() => handleSettingToggle('ipv6')}
            />
          </div>
        </Card>

        {/* Auto Connect */}
        <Card className="setting-card">
          <div className="setting-content">
            <div className="setting-icon auto-connect">
              <Settings size={24} />
            </div>
            <div className="setting-info">
              <div className="setting-title">
                Auto Connect
                <Badge variant={settings.autoConnect ? 'default' : 'outline'} className="setting-badge">
                  {settings.autoConnect ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <div className="setting-description">
                Automatically connect to VPN when the app starts.
              </div>
            </div>
            <Switch
              checked={settings.autoConnect}
              onCheckedChange={() => handleSettingToggle('autoConnect')}
            />
          </div>
        </Card>
      </div>

      {/* Split Tunneling */}
      <Card className="split-tunneling-card">
        <div className="split-tunneling-header">
          <div className="split-tunneling-title">
            <Globe size={20} />
            <span>Split Tunneling</span>
            <Info size={16} className="info-icon" />
          </div>
          <Switch
            checked={settings.splitTunneling}
            onCheckedChange={() => handleSettingToggle('splitTunneling')}
          />
        </div>

        <div className="split-tunneling-description">
          Choose which apps bypass the VPN connection and use your regular internet.
        </div>

        {settings.splitTunneling && (
          <div className="split-tunnel-apps">
            {splitTunnelApps.map(app => (
              <button
                key={app.name}
                onClick={() => toggleSplitTunnelApp(app.name)}
                className={`split-tunnel-app ${app.enabled ? 'enabled' : ''}`}
              >
                <div className="app-info">
                  <span className="app-icon">{app.icon}</span>
                  <span className="app-name">{app.name}</span>
                </div>
                <div className="app-status">
                  {app.enabled ? (
                    <>
                      <Check size={16} className="check-icon" />
                      <span className="status-text">Bypass VPN</span>
                    </>
                  ) : (
                    <>
                      <X size={16} className="x-icon" />
                      <span className="status-text">Use VPN</span>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {settings.splitTunneling && (
          <div className="split-tunnel-summary">
            <Info size={14} />
            <span>
              {splitTunnelApps.filter(a => a.enabled).length} apps will bypass VPN
            </span>
          </div>
        )}
      </Card>

      {/* Security status */}
      <Card className="security-status-card">
        <div className="security-status-header">
          <Shield size={20} className="shield-icon" />
          <span>Security Status</span>
        </div>
        <div className="security-checklist">
          <div className={`security-item ${settings.killSwitch ? 'active' : ''}`}>
            {settings.killSwitch ? <Check size={16} /> : <X size={16} />}
            <span>Kill Switch</span>
          </div>
          <div className={`security-item ${settings.dnsLeak ? 'active' : ''}`}>
            {settings.dnsLeak ? <Check size={16} /> : <X size={16} />}
            <span>DNS Protection</span>
          </div>
          <div className={`security-item ${settings.ipv6 ? 'active' : ''}`}>
            {settings.ipv6 ? <Check size={16} /> : <X size={16} />}
            <span>IPv6 Protection</span>
          </div>
        </div>
        <div className="security-rating">
          <Badge className={`rating-badge ${
            settings.killSwitch && settings.dnsLeak && settings.ipv6 ? 'excellent' :
            (settings.killSwitch || settings.dnsLeak) ? 'good' : 'warning'
          }`}>
            {
              settings.killSwitch && settings.dnsLeak && settings.ipv6 ? 'Excellent Security' :
              (settings.killSwitch || settings.dnsLeak) ? 'Good Security' : 'Basic Security'
            }
          </Badge>
        </div>
      </Card>
    </div>
  );
}
