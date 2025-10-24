import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wifi, Globe, Menu, X, TrendingUp, Network, Coins, LogOut } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VPNConnect = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionTime, setConnectionTime] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchLocations();
    fetchActiveSession();
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

  const fetchLocations = async () => {
    try {
      const response = await axios.get(`${API}/nodes/locations`);
      setLocations(response.data.locations);
      if (response.data.locations.length > 0) {
        setSelectedLocation(response.data.locations[0].code);
      }
    } catch (error) {
      toast.error("Failed to load locations");
    }
  };

  const fetchActiveSession = async () => {
    try {
      const response = await axios.get(`${API}/vpn/active-session`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data) {
        setActiveSession(response.data);
        setSelectedLocation(response.data.location);
      }
    } catch (error) {
      console.error("Error fetching active session:", error);
    }
  };

  const handleConnect = async () => {
    if (!selectedLocation) {
      toast.error("Please select a location");
      return;
    }

    setIsConnecting(true);
    try {
      const response = await axios.post(
        `${API}/vpn/connect`,
        { location: selectedLocation },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActiveSession(response.data);
      setConnectionTime(0);
      toast.success("Connected to VPN!");
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
      await axios.post(
        `${API}/vpn/disconnect/${activeSession.id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setActiveSession(null);
      setConnectionTime(0);
      toast.success("Disconnected from VPN");
    } catch (error) {
      toast.error("Failed to disconnect");
    } finally {
      setIsConnecting(false);
    }
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
              <div className="user-role">{user?.role || "User"}</div>
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
        </header>

        <div className="dashboard-content">
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
              </div>

              <Button
                onClick={activeSession ? handleDisconnect : handleConnect}
                disabled={isConnecting}
                className={`vpn-action-btn ${activeSession ? "disconnect" : "connect"}`}
                data-testid="vpn-action-btn"
              >
                {isConnecting ? "Processing..." : activeSession ? "Disconnect" : "Connect"}
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
                        <p>{location.nodes} nodes available</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VPNConnect;