import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "wagmi";
import { usePremiumVPN, usePremiumVPNWrite, useAETHToken, useAETHApproval } from "@/hooks/useBlockchain";
import { CONTRACTS } from "@/contracts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wifi, Globe, Menu, X, TrendingUp, Network, Coins, LogOut, Crown, Check, Zap } from "lucide-react";
import { toast } from "sonner";

const PremiumPage = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const { address, isConnected } = useAccount();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Blockchain hooks
  const { balance } = useAETHToken(address);
  const { isPremium, premiumInfo, userStats, pricing, globalStats, refetchPremium, refetchPremiumInfo } = usePremiumVPN(address);
  const { subscribePremiumMonthly, subscribePremiumYearly, hash, isPending, isConfirming, isConfirmed } = usePremiumVPNWrite();
  const { approve, hash: approvalHash, isPending: isApprovePending, isConfirming: isApproveConfirming, isConfirmed: isApproveConfirmed } = useAETHApproval();

  // Handle transaction confirmations
  useEffect(() => {
    if (isApproveConfirmed && selectedPlan) {
      toast.success("Approval confirmed! Now subscribing...");
      handleSubscribe();
    }
  }, [isApproveConfirmed]);

  useEffect(() => {
    if (isConfirmed) {
      toast.success("Premium subscription activated!");
      setSelectedPlan(null);
      setIsSubscribing(false);
      refetchPremium();
      refetchPremiumInfo();
    }
  }, [isConfirmed]);

  const handlePlanSelection = async (plan) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    const planPrice = plan === "monthly" ? pricing.monthly : pricing.yearly;

    if (balance < planPrice) {
      toast.error(`Insufficient balance. You need ${planPrice} AETH`);
      return;
    }

    setSelectedPlan(plan);
    setIsApproving(true);

    try {
      // First approve the Premium contract to spend AETH
      toast.info("Step 1/2: Approving AETH...");
      await approve(CONTRACTS.PremiumVPN, planPrice);
    } catch (error) {
      toast.error("Approval failed: " + (error.message || "Unknown error"));
      setIsApproving(false);
      setSelectedPlan(null);
    }
  };

  const handleSubscribe = async () => {
    setIsApproving(false);
    setIsSubscribing(true);

    try {
      toast.info("Step 2/2: Subscribing to Premium...");
      
      if (selectedPlan === "monthly") {
        await subscribePremiumMonthly();
      } else {
        await subscribePremiumYearly();
      }
    } catch (error) {
      toast.error("Subscription failed: " + (error.message || "Unknown error"));
      setIsSubscribing(false);
      setSelectedPlan(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp * 1000).toLocaleDateString();
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
              <div className="user-role">{isPremium ? "Premium User" : "Free User"}</div>
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
          <h1>Premium VPN</h1>
          {isPremium && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "6px 16px", borderRadius: "20px" }}>
              <Crown size={18} color="#ffd700" />
              <span style={{ color: "#fff", fontWeight: "600" }}>Premium Active</span>
            </div>
          )}
        </header>

        <div className="dashboard-content">
          {isPremium && premiumInfo ? (
            <div style={{ marginBottom: "30px" }}>
              <Card style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", padding: "30px", color: "#fff", border: "none" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Crown size={40} color="#ffd700" />
                    <div>
                      <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#fff" }}>Premium Member</h2>
                      <p style={{ margin: 0, opacity: 0.9 }}>Enjoy unlimited VPN access</p>
                    </div>
                  </div>
                  <Zap size={32} color="#ffd700" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "20px" }}>
                  <div>
                    <p style={{ opacity: 0.8, fontSize: "14px", margin: 0 }}>Expires On</p>
                    <p style={{ fontSize: "18px", fontWeight: "600", margin: "4px 0 0 0", color: "#fff" }}>{formatDate(premiumInfo.expiryTime)}</p>
                  </div>
                  <div>
                    <p style={{ opacity: 0.8, fontSize: "14px", margin: 0 }}>Days Remaining</p>
                    <p style={{ fontSize: "18px", fontWeight: "600", margin: "4px 0 0 0", color: "#fff" }}>{premiumInfo.daysRemaining} days</p>
                  </div>
                  <div>
                    <p style={{ opacity: 0.8, fontSize: "14px", margin: 0 }}>Total Connections</p>
                    <p style={{ fontSize: "18px", fontWeight: "600", margin: "4px 0 0 0", color: "#fff" }}>{premiumInfo.totalConnections}</p>
                  </div>
                  <div>
                    <p style={{ opacity: 0.8, fontSize: "14px", margin: 0 }}>Saved on Burns</p>
                    <p style={{ fontSize: "18px", fontWeight: "600", margin: "4px 0 0 0", color: "#fff" }}>{(premiumInfo.totalConnections * pricing.burnPerConnection).toFixed(2)} AETH</p>
                  </div>
                </div>
              </Card>
            </div>
          ) : null}

          <div style={{ marginBottom: "30px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "12px", color: "var(--text-primary)" }}>Choose Your Plan</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>Upgrade to Premium for unlimited VPN access without token burning</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
              {/* Free Plan */}
              <Card style={{ padding: "30px", position: "relative", border: "2px solid var(--border)", background: "var(--card-bg)" }}>
                <h3 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "8px", color: "var(--text-primary)" }}>Free</h3>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>Pay per connection</p>
                
                <div style={{ marginBottom: "24px" }}>
                  <span style={{ fontSize: "36px", fontWeight: "700", color: "var(--text-primary)" }}>{pricing.burnPerConnection}</span>
                  <span style={{ fontSize: "18px", color: "var(--text-secondary)" }}> AETH/connection</span>
                </div>

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0" }}>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--text-primary)" }}>
                    <Check size={20} color="#10b981" />
                    <span>Pay per VPN connection</span>
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--text-primary)" }}>
                    <Check size={20} color="#10b981" />
                    <span>Standard connection speed</span>
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--text-primary)" }}>
                    <Check size={20} color="#10b981" />
                    <span>Basic server access</span>
                  </li>
                </ul>

                <Button variant="outline" disabled style={{ width: "100%" }}>
                  Current Plan
                </Button>
              </Card>

              {/* Monthly Plan */}
              <Card style={{ padding: "30px", position: "relative", border: "2px solid #667eea", background: "var(--card-bg)" }}>
                <div style={{ position: "absolute", top: "-12px", right: "20px", background: "#667eea", color: "#fff", padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
                  POPULAR
                </div>
                
                <h3 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "8px", color: "var(--text-primary)" }}>Monthly</h3>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>Unlimited connections</p>
                
                <div style={{ marginBottom: "24px" }}>
                  <span style={{ fontSize: "36px", fontWeight: "700", color: "var(--text-primary)" }}>{pricing.monthly}</span>
                  <span style={{ fontSize: "18px", color: "var(--text-secondary)" }}> AETH/month</span>
                </div>

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0" }}>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--text-primary)" }}>
                    <Check size={20} color="#10b981" />
                    <span>Unlimited VPN connections</span>
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--text-primary)" }}>
                    <Check size={20} color="#10b981" />
                    <span>Priority connection speed</span>
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--text-primary)" }}>
                    <Check size={20} color="#10b981" />
                    <span>Access to premium servers</span>
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--text-primary)" }}>
                    <Check size={20} color="#10b981" />
                    <span>No token burning</span>
                  </li>
                </ul>

                <Button 
                  onClick={() => handlePlanSelection("monthly")}
                  disabled={isPremium || isApproving || isSubscribing || !isConnected}
                  style={{ width: "100%", background: "#667eea", color: "#fff" }}
                >
                  {isPremium ? "Already Premium" : isApproving || isSubscribing ? "Processing..." : "Subscribe Monthly"}
                </Button>
              </Card>

              {/* Yearly Plan */}
              <Card style={{ padding: "30px", position: "relative", border: "2px solid #10b981", background: "var(--card-bg)" }}>
                <div style={{ position: "absolute", top: "-12px", right: "20px", background: "#10b981", color: "#fff", padding: "4px 12px", borderRadius: "12px", fontSize: "12px", fontWeight: "600" }}>
                  BEST VALUE
                </div>
                
                <h3 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "8px", color: "var(--text-primary)" }}>Yearly</h3>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "20px" }}>Save 17% annually</p>
                
                <div style={{ marginBottom: "24px" }}>
                  <span style={{ fontSize: "36px", fontWeight: "700", color: "var(--text-primary)" }}>{pricing.yearly}</span>
                  <span style={{ fontSize: "18px", color: "var(--text-secondary)" }}> AETH/year</span>
                </div>

                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px 0" }}>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--text-primary)" }}>
                    <Check size={20} color="#10b981" />
                    <span>Everything in Monthly</span>
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--text-primary)" }}>
                    <Check size={20} color="#10b981" />
                    <span>Save 2,000 AETH per year</span>
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--text-primary)" }}>
                    <Check size={20} color="#10b981" />
                    <span>Priority support</span>
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px", color: "var(--text-primary)" }}>
                    <Check size={20} color="#10b981" />
                    <span>Early access to new features</span>
                  </li>
                </ul>

                <Button 
                  onClick={() => handlePlanSelection("yearly")}
                  disabled={isPremium || isApproving || isSubscribing || !isConnected}
                  style={{ width: "100%", background: "#10b981", color: "#fff" }}
                >
                  {isPremium ? "Already Premium" : isApproving || isSubscribing ? "Processing..." : "Subscribe Yearly"}
                </Button>
              </Card>
            </div>
          </div>

          {/* Stats Section */}
          {userStats && (
            <div style={{ marginTop: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "20px", color: "var(--text-primary)" }}>Your Statistics</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
                <Card style={{ padding: "24px", background: "var(--card-bg)" }}>
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>Total Connections</p>
                  <p style={{ fontSize: "32px", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>{userStats.totalConnections}</p>
                </Card>
                <Card style={{ padding: "24px", background: "var(--card-bg)" }}>
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>Total Burned</p>
                  <p style={{ fontSize: "32px", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>{userStats.totalBurned.toFixed(2)} AETH</p>
                </Card>
                <Card style={{ padding: "24px", background: "var(--card-bg)" }}>
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>Last Connection</p>
                  <p style={{ fontSize: "16px", fontWeight: "600", margin: 0, color: "var(--text-primary)" }}>
                    {userStats.lastConnectionTime > 0 ? formatDate(userStats.lastConnectionTime) : "Never"}
                  </p>
                </Card>
              </div>
            </div>
          )}

          {/* Global Stats */}
          {globalStats && (
            <div style={{ marginTop: "40px" }}>
              <h2 style={{ fontSize: "24px", fontWeight: "700", marginBottom: "20px", color: "var(--text-primary)" }}>Network Statistics</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
                <Card style={{ padding: "24px", background: "var(--card-bg)" }}>
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>Total AETH Burned</p>
                  <p style={{ fontSize: "32px", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>{globalStats.totalBurned.toFixed(2)}</p>
                </Card>
                <Card style={{ padding: "24px", background: "var(--card-bg)" }}>
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>Network Connections</p>
                  <p style={{ fontSize: "32px", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>{globalStats.totalConnections}</p>
                </Card>
                <Card style={{ padding: "24px", background: "var(--card-bg)" }}>
                  <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px" }}>Premium Users</p>
                  <p style={{ fontSize: "32px", fontWeight: "700", margin: 0, color: "var(--text-primary)" }}>{globalStats.totalPremiumUsers}</p>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PremiumPage;
