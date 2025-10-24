import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wifi, TrendingUp, Network, Coins, LogOut, Menu, X, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Staking = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [stakingData, setStakingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchStakingData();
  }, []);

  const fetchStakingData = async () => {
    try {
      const response = await axios.get(`${API}/staking/balance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStakingData(response.data);
    } catch (error) {
      toast.error("Failed to load staking data");
    } finally {
      setLoading(false);
    }
  };

  const handleStake = async (e) => {
    e.preventDefault();
    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setProcessing(true);
    try {
      await axios.post(
        `${API}/staking/stake`,
        { amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Successfully staked ${amount} $AETH!`);
      setStakeAmount("");
      fetchStakingData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to stake tokens");
    } finally {
      setProcessing(false);
    }
  };

  const handleUnstake = async (e) => {
    e.preventDefault();
    const amount = parseFloat(unstakeAmount);
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setProcessing(true);
    try {
      const response = await axios.post(
        `${API}/staking/unstake`,
        { amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Unstaked ${amount} $AETH + ${response.data.rewards.toFixed(2)} rewards!`);
      setUnstakeAmount("");
      fetchStakingData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to unstake tokens");
    } finally {
      setProcessing(false);
    }
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
          <h1 data-testid="staking-title">Staking</h1>
        </header>

        <div className="dashboard-content">
          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading staking data...</p>
            </div>
          ) : (
            <div className="staking-container">
              <div className="staking-overview" data-testid="staking-overview">
                <Card className="staking-stat-card">
                  <CardHeader>
                    <CardTitle>Total Staked</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="stat-value-large">
                      {stakingData?.staked_aeth?.toFixed(2) || "0.00"}
                    </div>
                    <div className="stat-label">$AETH</div>
                  </CardContent>
                </Card>

                <Card className="staking-stat-card">
                  <CardHeader>
                    <CardTitle>Available Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="stat-value-large">
                      {user?.aeth_balance?.toFixed(2) || "0.00"}
                    </div>
                    <div className="stat-label">$AETH</div>
                  </CardContent>
                </Card>

                <Card className="staking-stat-card">
                  <CardHeader>
                    <CardTitle>Est. APY</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="stat-value-large apy">{stakingData?.estimated_apy || "10%"}</div>
                    <div className="stat-label">Annual Percentage Yield</div>
                  </CardContent>
                </Card>
              </div>

              <div className="staking-actions">
                <Card className="staking-form-card" data-testid="stake-card">
                  <CardHeader>
                    <div className="form-header">
                      <ArrowUpRight className="form-icon stake" size={24} />
                      <CardTitle>Stake $AETH</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleStake}>
                      <div className="form-field">
                        <Label htmlFor="stake-amount">Amount to Stake</Label>
                        <Input
                          id="stake-amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          placeholder="0.00"
                          data-testid="stake-input"
                        />
                        <div className="balance-info">
                          Available: {user?.aeth_balance?.toFixed(2) || "0.00"} $AETH
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={processing}
                        className="w-full stake-btn"
                        data-testid="stake-submit-btn"
                      >
                        {processing ? "Processing..." : "Stake Tokens"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="staking-form-card" data-testid="unstake-card">
                  <CardHeader>
                    <div className="form-header">
                      <ArrowDownRight className="form-icon unstake" size={24} />
                      <CardTitle>Unstake $AETH</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUnstake}>
                      <div className="form-field">
                        <Label htmlFor="unstake-amount">Amount to Unstake</Label>
                        <Input
                          id="unstake-amount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={unstakeAmount}
                          onChange={(e) => setUnstakeAmount(e.target.value)}
                          placeholder="0.00"
                          data-testid="unstake-input"
                        />
                        <div className="balance-info">
                          Staked: {stakingData?.staked_aeth?.toFixed(2) || "0.00"} $AETH
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={processing}
                        className="w-full unstake-btn"
                        data-testid="unstake-submit-btn"
                      >
                        {processing ? "Processing..." : "Unstake Tokens"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              <Card className="staking-info" data-testid="staking-info">
                <CardHeader>
                  <CardTitle>About Staking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="info-grid">
                    <div className="info-item">
                      <h4>Earn Rewards</h4>
                      <p>Stake your $AETH tokens and earn 10% APY. Rewards are calculated and distributed automatically.</p>
                    </div>
                    <div className="info-item">
                      <h4>Flexible Unstaking</h4>
                      <p>Unstake your tokens anytime. When you unstake, you'll receive your principal plus accumulated rewards.</p>
                    </div>
                    <div className="info-item">
                      <h4>Become a Validator</h4>
                      <p>Stake 10,000+ $AETH to become a validator node and earn additional rewards from network fees.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Staking;