/**
 * VPNConnect Enhanced - Improved VPN page with beautiful components
 * Day 53-54: VPN Page Enhancement (строки 467-482)
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "wagmi";
import { usePremiumVPN, useAETHToken } from "@/hooks/useBlockchain";
import axios from "axios";
import { Wifi, TrendingUp, Network, Coins, LogOut, Menu, X, Crown, Download, Settings as SettingsIcon, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

// Import new VPN components
import ConnectionButton from "@/components/vpn/ConnectionButton";
import LocationMap from "@/components/vpn/LocationMap";
import StatsDisplay from "@/components/vpn/StatsDisplay";
import BurnModal from "@/components/vpn/BurnModal";
import VPNSettings from "@/components/vpn/VPNSettings";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function VPNConnectEnhanced() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const { address, isConnected } = useAccount();

  // State
  const [selectedLocation, setSelectedLocation] = useState('US-NY');
  const [activeSession, setActiveSession] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionTime, setConnectionTime] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vpnConfig, setVpnConfig] = useState(null);
  const [showBurnModal, setShowBurnModal] = useState(false);
  const [activeTab, setActiveTab] = useState('connect');

  // Blockchain hooks
  const { balance } = useAETHToken(address);
  const { isPremium, pricing, refetchPremium } = usePremiumVPN(address);

  // Connection timer
  useEffect(() => {
    let interval;
    if (activeSession) {
      interval = setInterval(() => {
        setConnectionTime((prev) => prev + 1);
      }, 1000);
    } else {
      setConnectionTime(0);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleConnect = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isPremium) {
      // Show burn modal for non-premium users
      setShowBurnModal(true);
    } else {
      // Premium users connect directly
      await connectToVPN();
    }
  };

  const handleBurnAndConnect = async () => {
    setShowBurnModal(false);
    setIsConnecting(true);
    
    try {
      toast.info("Burning tokens and connecting...");
      await connectToVPN();
    } catch (error) {
      toast.error("Connection failed: " + (error.message || "Unknown error"));
      setIsConnecting(false);
    }
  };

  const connectToVPN = async () => {
    setIsConnecting(true);
    
    try {
      // Generate config
      const configResponse = await axios.post(
        `${API}/vpn/generate-config`,
        { wallet_address: address },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setVpnConfig(configResponse.data);
      
      // Connect
      const connectResponse = await axios.post(
        `${API}/vpn/connect`,
        { wallet_address: address },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setActiveSession(connectResponse.data);
      
      if (connectResponse.data.is_premium) {
        toast.success("Connected! 👑 Premium - No burn");
      } else {
        toast.success(`Connected! 🔥 Burned ${connectResponse.data.burned_amount} AETH`);
      }
      
      refetchPremium();
      
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to connect");
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!activeSession) return;

    setIsConnecting(true);
    try {
      const response = await axios.post(
        `${API}/vpn/disconnect`,
        { 
          wallet_address: address,
          session_id: activeSession.session_id 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.stats) {
        toast.success(`Disconnected! Used ${response.data.stats.total_mb.toFixed(2)} MB`);
      } else {
        toast.success("Disconnected from VPN");
      }
      
      setActiveSession(null);
      setVpnConfig(null);
    } catch (error) {
      toast.error("Failed to disconnect");
    } finally {
      setIsConnecting(false);
    }
  };

  const downloadConfig = () => {
    if (!vpnConfig) {
      toast.error("No config available");
      return;
    }
    
    const blob = new Blob([vpnConfig.config], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aetherium-vpn-${vpnConfig.peer_id.slice(0, 8)}.conf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("Config downloaded!");
  };

  const navigationItems = [
    { name: "Dashboard", path: "/dashboard", icon: TrendingUp },
    { name: "VPN Connect", path: "/vpn", icon: Wifi },
    { name: "My Nodes", path: "/nodes", icon: Network },
    { name: "Staking", path: "/staking", icon: Coins },
    { name: "Premium", path: "/premium", icon: Crown },
  ];

  return (
    <div className="dashboard-layout vpn-enhanced-layout">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Wifi className="logo-icon" />
            <span>Aetherium</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = window.location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setSidebarOpen(false);
                }}
                className={`nav-item ${isActive ? "active" : ""}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{user?.wallet_address?.slice(0, 2).toUpperCase()}</div>
            <div className="user-details">
              <div className="user-address">
                {user?.wallet_address?.slice(0, 6)}...{user?.wallet_address?.slice(-4)}
              </div>
              <div className="user-role">{isPremium ? "Premium" : "Free"}</div>
            </div>
          </div>
          <Button variant="outline" onClick={() => { logout(); navigate("/"); }} className="logout-btn">
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="dashboard-main vpn-main">
        <header className="dashboard-header vpn-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h1>VPN Connect</h1>
          
          {/* Premium badge */}
          {isPremium && (
            <Badge className="premium-badge">
              <Crown size={14} />
              Premium
            </Badge>
          )}
        </header>

        <div className="dashboard-content vpn-content">
          {!isConnected ? (
            <div className="loading-state">
              <div className="empty-icon">🔗</div>
              <h2>Connect Your Wallet</h2>
              <p>Please connect your MetaMask wallet to access VPN features</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="vpn-tabs">
              <TabsList className="vpn-tabs-list">
                <TabsTrigger value="connect">Connect</TabsTrigger>
                <TabsTrigger value="stats">Statistics</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* Connect Tab */}
              <TabsContent value="connect" className="vpn-tab-content">
                <div className="vpn-connect-grid">
                  {/* Left column - Connection */}
                  <div className="vpn-connect-main">
                    {/* Connection Button */}
                    <ConnectionButton
                      isConnected={!!activeSession}
                      isConnecting={isConnecting}
                      onConnect={handleConnect}
                      onDisconnect={handleDisconnect}
                      connectionTime={connectionTime}
                    />

                    {/* Quick actions */}
                    {activeSession && vpnConfig && (
                      <Card className="quick-actions-card">
                        <Button
                          variant="outline"
                          onClick={downloadConfig}
                          className="quick-action-btn"
                        >
                          <Download size={18} />
                          Download Config
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab('stats')}
                          className="quick-action-btn"
                        >
                          <TrendingUp size={18} />
                          View Stats
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setActiveTab('settings')}
                          className="quick-action-btn"
                        >
                          <SettingsIcon size={18} />
                          Settings
                        </Button>
                      </Card>
                    )}

                    {/* Account info */}
                    <Card className="vpn-account-card">
                      <div className="account-row">
                        <span className="account-label">Status:</span>
                        <Badge variant={isPremium ? "default" : "outline"}>
                          {isPremium ? (
                            <>
                              <Crown size={12} />
                              Premium
                            </>
                          ) : (
                            "Free Tier"
                          )}
                        </Badge>
                      </div>
                      <div className="account-row">
                        <span className="account-label">Balance:</span>
                        <span className="account-value">{balance?.toFixed(2)} AETH</span>
                      </div>
                      {!isPremium && (
                        <div className="account-row">
                          <span className="account-label">Burn per connect:</span>
                          <span className="account-value burn">{pricing?.burnPerConnection || 0.001} AETH</span>
                        </div>
                      )}
                      {!isPremium && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/premium')}
                          className="upgrade-btn"
                        >
                          <Crown size={14} />
                          Upgrade to Premium
                          <ChevronRight size={14} />
                        </Button>
                      )}
                    </Card>
                  </div>

                  {/* Right column - Location selection */}
                  <div className="vpn-connect-sidebar">
                    <LocationMap
                      selectedLocation={selectedLocation}
                      onSelectLocation={setSelectedLocation}
                      disabled={!!activeSession}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Stats Tab */}
              <TabsContent value="stats" className="vpn-tab-content">
                <StatsDisplay
                  isConnected={!!activeSession}
                  connectionTime={connectionTime}
                  activeSession={activeSession}
                />
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="vpn-tab-content">
                <VPNSettings
                  isConnected={!!activeSession}
                  onSettingsChange={(settings) => console.log('Settings:', settings)}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>

      {/* Burn Modal */}
      <BurnModal
        isOpen={showBurnModal}
        onClose={() => setShowBurnModal(false)}
        onConfirm={handleBurnAndConnect}
        balance={balance || 0}
        burnAmount={pricing?.burnPerConnection || 0.001}
        isProcessing={isConnecting}
      />
    </div>
  );
}
