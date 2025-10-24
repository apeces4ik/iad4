import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "wagmi";
import { usePremiumVPN, useAETHToken, useAETHApproval } from "@/hooks/useBlockchain";
import { CONTRACTS } from "@/contracts";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wifi, Globe, Menu, X, TrendingUp, Network, Coins, LogOut, Crown, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VPNConnectNew = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const { address, isConnected } = useAccount();
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionTime, setConnectionTime] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vpnConfig, setVpnConfig] = useState(null);
  const [serverStatus, setServerStatus] = useState(null);

  // Blockchain hooks
  const { balance } = useAETHToken(address);
  const { isPremium, premiumInfo, pricing, userStats, refetchPremium } = usePremiumVPN(address);
  const { approve, isPending: isApprovePending, isConfirming: isApproveConfirming, isConfirmed: isApproveConfirmed } = useAETHApproval();

  useEffect(() => {
    fetchLocations();
    fetchServerStatus();
  }, []);

  useEffect(() => {
    let interval;
    if (activeSession) {
      interval = setInterval(() => {
        setConnectionTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSession]);

  // Handle approval confirmation
  useEffect(() => {
    if (isApproveConfirmed) {
      toast.success("Approval confirmed! Now connecting...");
      // After approval, proceed with connection
      handleConnectAfterApproval();
    }
  }, [isApproveConfirmed]);

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API}/vpn/locations`);
      setLocations(response.data.locations);
      if (response.data.locations.length > 0) {
        setSelectedLocation(response.data.locations[0].code);
      }
    } catch (error) {
      toast.error("Failed to load locations");
    }
  };

  const fetchServerStatus = async () => {
    try {
      const response = await axios.get(`${API}/vpn/server-status`);
      setServerStatus(response.data);
    } catch (error) {
      console.error("Failed to fetch server status:", error);
    }
  };

  const handleConnect = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!selectedLocation) {
      toast.error("Please select a location");
      return;
    }

    // Check if user is premium
    if (!isPremium) {
      // Non-premium user needs to approve and burn tokens
      const burnAmount = pricing.burnPerConnection;
      
      if (balance < burnAmount) {
        toast.error(`Insufficient balance. You need ${burnAmount} AETH to connect`);
        return;
      }

      setIsConnecting(true);
      
      try {
        toast.info(`Step 1/2: Approving ${burnAmount} AETH for burn...`);
        // Approve PremiumVPN contract to burn tokens
        await approve(CONTRACTS.PremiumVPN, burnAmount);
        // handleConnectAfterApproval will be called via useEffect
      } catch (error) {
        toast.error("Approval failed: " + (error.message || "Unknown error"));
        setIsConnecting(false);
      }
    } else {
      // Premium user - connect directly
      await connectToVPN();
    }
  };

  const handleConnectAfterApproval = async () => {
    toast.info("Step 2/2: Connecting to VPN...");
    await connectToVPN();
  };

  const connectToVPN = async () => {
    setIsConnecting(true);
    
    try {
      // Step 1: Generate VPN config
      const configResponse = await axios.post(
        `${API}/vpn/generate-config`,
        { wallet_address: address },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setVpnConfig(configResponse.data);
      
      // Step 2: Connect (this will call burnOnConnect on smart contract if not premium)
      const connectResponse = await axios.post(
        `${API}/vpn/connect`,
        { wallet_address: address },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setActiveSession(connectResponse.data);
      setConnectionTime(0);
      
      if (connectResponse.data.is_premium) {
        toast.success("Connected to VPN! (Premium - No burn)");
      } else {
        toast.success(`Connected to VPN! Burned ${connectResponse.data.burned_amount} AETH`);
      }
      
      // Refresh premium status
      refetchPremium();
      
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to connect");
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
      setConnectionTime(0);
      setVpnConfig(null);
    } catch (error) {
      toast.error("Failed to disconnect");
    } finally {
      setIsConnecting(false);
    }
  };

  const downloadConfig = () => {
    if (!vpnConfig) return;
    
    const blob = new Blob([vpnConfig.config], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aetherium-vpn-${vpnConfig.peer_id.slice(0, 8)}.conf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast.success("VPN config downloaded!");
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const navigationItems = [
    { name: "Dashboard", path: "/dashboard", icon: TrendingUp },
    { name: "VPN Connect", path: "/vpn", icon: Wifi },
    { name: "My Nodes", path: "/nodes", icon: Network },
    { name: "Staking", path: "/staking", icon: Coins },
    { name: "Premium", path: "/premium", icon: Crown },
  ];

  return (
    <div className="dashboard-layout">
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
              <div className="user-role">{isPremium ? "Premium User" : user?.role || "User"}</div>
            </div>
          </div>
          <Button variant="outline" onClick={() => { logout(); navigate("/"); }} className="logout-btn">
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
          <h1 data-testid="vpn-title">VPN Connect</h1>
          {isPremium && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "6px 16px", borderRadius: "20px" }}>
              <Crown size={18} color="#ffd700" />
              <span style={{ color: "#fff", fontWeight: "600" }}>Premium</span>
            </div>
          )}
        </header>

        <div className="dashboard-content">
          {/* Premium Upgrade Banner */}
          {!isPremium && isConnected && (
            <Card style={{ padding: "20px", marginBottom: "24px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <AlertCircle size={24} color="#ffd700" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "#fff" }}>Upgrade to Premium</h3>
                    <p style={{ margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.9)" }}>
                      Save {pricing.burnPerConnection} AETH per connection. Current burn cost: {pricing.burnPerConnection} AETH
                    </p>
                  </div>
                </div>
                <Button onClick={() => navigate("/premium")} style={{ background: "#fff", color: "#667eea", fontWeight: "600" }}>
                  View Plans
                </Button>
              </div>
            </Card>
          )}

          <div className="vpn-container">
            <Card className="vpn-status-card" data-testid="vpn-status-card">
              <div className="vpn-status-header">
                <div className={`status-indicator ${activeSession ? "connected" : "disconnected"}`}>
                  <span className="status-dot"></span>
                  {activeSession ? "Connected" : "Disconnected"}
                </div>
                {activeSession && (
                  <div className="connection-time" data-testid="connection-time">
                    {formatTime(connectionTime)}
                  </div>
                )}
              </div>

              <div className="vpn-globe-container">
                <Globe className={`vpn-globe ${activeSession ? "spinning" : ""}`} size={120} />
                {activeSession && <div className="pulse-ring"></div>}
              </div>

              <div className="vpn-info">
                <h3 data-testid="vpn-status-text">
                  {activeSession ? "Secured Connection" : "No Active Connection"}
                </h3>
                <p>
                  {activeSession
                    ? `Connected to ${locations.find((loc) => loc.code === selectedLocation)?.name || selectedLocation}`
                    : "Select a location and connect to secure your browsing"}
                </p>
                
                {!isPremium && !activeSession && (
                  <p style={{ marginTop: "12px", padding: "12px", background: "rgba(255, 193, 7, 0.1)", borderRadius: "8px", fontSize: "14px", color: "var(--text-primary)" }}>
                    💡 Connection will burn <strong>{pricing.burnPerConnection} AETH</strong> tokens
                  </p>
                )}
                
                {isPremium && !activeSession && (
                  <div style={{ marginTop: "12px", padding: "16px", background: "linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15))", borderRadius: "12px", border: "1px solid rgba(102, 126, 234, 0.3)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <Crown size={18} color="#667eea" />
                      <strong style={{ color: "var(--text-primary)", fontSize: "14px" }}>Premium Benefits Active</strong>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "24px", fontSize: "13px", color: "var(--text-primary)" }}>
                      <li>✨ No token burning</li>
                      <li>🚀 Priority connection to best nodes (reputation &gt; 90)</li>
                      <li>⚡ Higher bandwidth allocation</li>
                      <li>🎯 Lower latency routing</li>
                    </ul>
                  </div>
                )}
              </div>

              {vpnConfig && activeSession && (
                <div style={{ marginBottom: "16px" }}>
                  <Button
                    onClick={downloadConfig}
                    variant="outline"
                    style={{ width: "100%", marginBottom: "12px" }}
                  >
                    <Download size={18} style={{ marginRight: "8px" }} />
                    Download WireGuard Config
                  </Button>
                  <p style={{ fontSize: "12px", textAlign: "center", color: "var(--text-secondary)" }}>
                    Import this config into WireGuard app to establish VPN connection
                  </p>
                </div>
              )}

              <Button
                onClick={activeSession ? handleDisconnect : handleConnect}
                disabled={isConnecting || isApprovePending || isApproveConfirming}
                className={`vpn-action-btn ${activeSession ? "disconnect" : "connect"}`}
                data-testid="vpn-action-btn"
              >
                {isConnecting || isApprovePending || isApproveConfirming
                  ? "Processing..."
                  : activeSession
                  ? "Disconnect"
                  : "Connect"}
              </Button>
            </Card>

            {!activeSession && (
              <div className="locations-section" data-testid="locations-section">
                <h2>Select Location</h2>
                <div className="locations-grid">
                  {locations.map((location) => (
                    <Card
                      key={location.code}
                      onClick={() => setSelectedLocation(location.code)}
                      className={`location-card ${selectedLocation === location.code ? "selected" : ""}`}
                      data-testid={`location-${location.code}`}
                    >
                      <div className="location-flag">{location.flag}</div>
                      <div className="location-info">
                        <h4>{location.name}</h4>
                        <p>{location.nodes} node{location.nodes !== 1 ? 's' : ''} available</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* User Stats */}
            {userStats && isConnected && (
              <div style={{ marginTop: "40px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px", color: "var(--text-primary)" }}>Your VPN Statistics</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
                  <Card style={{ padding: "20px", background: "var(--card-bg)" }}>
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>Total Connections</p>
                    <p style={{ fontSize: "28px", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>{userStats.totalConnections}</p>
                  </Card>
                  <Card style={{ padding: "20px", background: "var(--card-bg)" }}>
                    <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>AETH Burned</p>
                    <p style={{ fontSize: "28px", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>{userStats.totalBurned.toFixed(2)}</p>
                  </Card>
                  {isPremium && premiumInfo && (
                    <Card style={{ padding: "20px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", border: "none" }}>
                      <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.9)", marginBottom: "8px" }}>Premium Savings</p>
                      <p style={{ fontSize: "28px", fontWeight: "700", margin: 0, color: "#fff" }}>
                        {(premiumInfo.totalConnections * pricing.burnPerConnection).toFixed(2)} AETH
                      </p>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* Server Status */}
            {serverStatus && (
              <div style={{ marginTop: "40px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: "700", marginBottom: "16px", color: "var(--text-primary)" }}>Server Status</h2>
                <Card style={{ padding: "20px", background: "var(--card-bg)" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "20px" }}>
                    <div>
                      <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "4px" }}>Status</p>
                      <p style={{ fontSize: "16px", fontWeight: "600", color: serverStatus.running ? "#10b981" : "#ef4444", margin: 0 }}>
                        {serverStatus.running ? "Online" : "Offline"}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "4px" }}>Total Peers</p>
                      <p style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>{serverStatus.total_peers}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "4px" }}>Mode</p>
                      <p style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)", margin: 0 }}>
                        {serverStatus.mode === "mvp_simulation" ? "MVP Demo" : "Production"}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VPNConnectNew;
