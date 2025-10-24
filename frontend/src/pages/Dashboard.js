import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "wagmi";
import { useAETHToken, useMinerNode } from "@/hooks/useBlockchain";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wifi, Network, Coins, TrendingUp, LogOut, Menu, X } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nodeStats, setNodeStats] = useState({ totalEarnings: 0, totalDataShared: 0 });
  
  // Blockchain hooks
  const { address } = useAccount();
  const walletAddress = address || user?.wallet_address;
  
  // Get AETH balance and staking info from blockchain
  const { balance, stakeInfo, refetchBalance, refetchStakeInfo } = useAETHToken(walletAddress);
  
  // Get user's nodes from blockchain
  const { nodeIds, refetchNodes } = useMinerNode(walletAddress);
  
  // Fetch additional node stats from backend
  useEffect(() => {
    if (walletAddress) {
      fetchNodeStats();
    }
  }, [walletAddress, nodeIds]);

  const fetchNodeStats = async () => {
    try {
      // Get detailed node stats from backend
      const response = await axios.get(`${API}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNodeStats({
        totalEarnings: response.data.total_earnings || 0,
        totalDataShared: response.data.total_data_shared || 0,
      });
    } catch (error) {
      console.error("Failed to load node stats:", error);
    }
  };

  // Refresh all blockchain data
  const refreshData = () => {
    refetchBalance();
    refetchStakeInfo();
    refetchNodes();
    fetchNodeStats();
  };

  const handleLogout = () => {
    logout();
    navigate("/");
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
          <div className="sidebar-logo" data-testid="sidebar-logo">
            <Wifi className="logo-icon" />
            <span>Aetherium</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} data-testid="close-sidebar-btn">
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
                data-testid={`nav-${item.name.toLowerCase().replace(" ", "-")}`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info" data-testid="user-info">
            <div className="user-avatar">
              {user?.wallet_address?.slice(0, 2).toUpperCase()}
            </div>
            <div className="user-details">
              <div className="user-address">
                {user?.wallet_address?.slice(0, 6)}...{user?.wallet_address?.slice(-4)}
              </div>
              <div className="user-role">{user?.role || "User"}</div>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="logout-btn" data-testid="logout-btn">
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-header">
          <button className="menu-toggle" onClick={() => setSidebarOpen(true)} data-testid="menu-toggle-btn">
            <Menu size={24} />
          </button>
          <h1 data-testid="dashboard-title">Dashboard</h1>
          <div className="header-actions"></div>
        </header>

        <div className="dashboard-content">
          {loading ? (
            <div className="loading-state" data-testid="loading-state">
              <div className="spinner"></div>
              <p>Loading dashboard...</p>
            </div>
          ) : (
            <>
              <div className="stats-grid">
                <Card className="stat-card" data-testid="balance-card">
                  <CardHeader>
                    <CardTitle>AETH Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="stat-value">{stats?.aeth_balance?.toFixed(2) || "0.00"}</div>
                    <div className="stat-label">$AETH</div>
                  </CardContent>
                </Card>

                <Card className="stat-card" data-testid="staked-card">
                  <CardHeader>
                    <CardTitle>Staked AETH</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="stat-value">{stats?.staked_aeth?.toFixed(2) || "0.00"}</div>
                    <div className="stat-label">Earning 10% APY</div>
                  </CardContent>
                </Card>

                <Card className="stat-card" data-testid="earnings-card">
                  <CardHeader>
                    <CardTitle>Total Earnings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="stat-value">{stats?.total_earnings?.toFixed(2) || "0.00"}</div>
                    <div className="stat-label">$AETH from nodes</div>
                  </CardContent>
                </Card>

                <Card className="stat-card" data-testid="nodes-card">
                  <CardHeader>
                    <CardTitle>Active Nodes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="stat-value">{stats?.active_nodes || 0}</div>
                    <div className="stat-label">{stats?.total_data_shared?.toFixed(2) || "0.00"} GB shared</div>
                  </CardContent>
                </Card>
              </div>

              <div className="quick-actions" data-testid="quick-actions">
                <h2>Quick Actions</h2>
                <div className="actions-grid">
                  <Card className="action-card" onClick={() => navigate("/vpn")} data-testid="action-vpn">
                    <div className="action-icon blue">
                      <Wifi size={32} />
                    </div>
                    <h3>Connect to VPN</h3>
                    <p>Secure your browsing with decentralized network</p>
                  </Card>

                  <Card className="action-card" onClick={() => navigate("/nodes")} data-testid="action-nodes">
                    <div className="action-icon cyan">
                      <Network size={32} />
                    </div>
                    <h3>Register Node</h3>
                    <p>Start earning by sharing your bandwidth</p>
                  </Card>

                  <Card className="action-card" onClick={() => navigate("/staking")} data-testid="action-staking">
                    <div className="action-icon purple">
                      <Coins size={32} />
                    </div>
                    <h3>Stake Tokens</h3>
                    <p>Earn 10% APY on your AETH holdings</p>
                  </Card>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;