import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "wagmi";
import { useMinerNode, useMinerNodeWrite, useNodeInfo } from "@/hooks/useBlockchain";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wifi, TrendingUp, Network, Coins, LogOut, Menu, X, Plus, Server, RefreshCw, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const NodeManagement = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { address, isConnected } = useAccount();
  
  // Blockchain hooks
  const { nodeIds, refetchNodes } = useMinerNode(address);
  const { registerNode, deactivateNode, isPending, isConfirming, isConfirmed, error } = useMinerNodeWrite();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [formData, setFormData] = useState({
    location: "us-east",
    bandwidth_mbps: 100,
  });

  // Watch for transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      toast.success("Transaction confirmed!");
      handleRefresh();
      setFormData({ location: "us-east", bandwidth_mbps: 100 });
      setDialogOpen(false);
    }
  }, [isConfirmed]);

  // Watch for errors
  useEffect(() => {
    if (error) {
      toast.error(error.message || "Transaction failed");
    }
  }, [error]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetchNodes();
    setRefreshing(false);
  };

  const handleRegisterNode = async (e) => {
    e.preventDefault();
    
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      await registerNode(formData.location, formData.bandwidth_mbps);
      toast.info("Transaction submitted! Registering node...");
    } catch (err) {
      console.error("Register node error:", err);
      toast.error(err.message || "Failed to register node");
    }
  };

  const handleDeactivateNode = async (nodeId) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    try {
      await deactivateNode(nodeId);
      toast.info("Deactivating node...");
    } catch (err) {
      console.error("Deactivate node error:", err);
      toast.error(err.message || "Failed to deactivate node");
    }
  };

  const navigationItems = [
    { name: "Dashboard", path: "/dashboard", icon: TrendingUp },
    { name: "VPN Connect", path: "/vpn", icon: Wifi },
    { name: "My Nodes", path: "/nodes", icon: Network },
    { name: "Staking", path: "/staking", icon: Coins },
  ];

  // Component to display individual node
  const NodeCard = ({ nodeId, index }) => {
    const { nodeInfo } = useNodeInfo(nodeId);

    if (!nodeInfo) {
      return (
        <Card className="node-card" data-testid={`node-loading-${index}`}>
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading node...</p>
          </div>
        </Card>
      );
    }

    return (
      <Card key={nodeId.toString()} className="node-card blockchain-card" data-testid={`node-${nodeId.toString()}`}>
        <div className="node-header">
          <div className="node-icon">
            <Server size={24} />
          </div>
          <div className={`node-status ${nodeInfo.isActive ? "active" : "inactive"}`}>
            <span className="status-dot"></span>
            {nodeInfo.isActive ? "Active" : "Inactive"}
          </div>
          <span className="blockchain-badge">⛓️</span>
        </div>
        <div className="node-details">
          <h3>{nodeInfo.location.replace("-", " ").toUpperCase()}</h3>
          <div className="node-stat">
            <span>Node ID:</span>
            <span>#{nodeId.toString()}</span>
          </div>
          <div className="node-stat">
            <span>Bandwidth:</span>
            <span>{nodeInfo.bandwidthMbps} Mbps</span>
          </div>
          <div className="node-stat">
            <span>Data Shared:</span>
            <span>{(nodeInfo.totalDataShared / 1024).toFixed(2)} GB</span>
          </div>
          <div className="node-stat">
            <span>Reputation:</span>
            <span>{nodeInfo.reputation}/100</span>
          </div>
          <div className="node-earnings">
            <span>Total Earnings</span>
            <span className="earnings-value">{nodeInfo.totalEarnings.toFixed(4)} $AETH</span>
          </div>
          {nodeInfo.isActive && (
            <Button
              onClick={() => handleDeactivateNode(nodeId)}
              disabled={isPending || isConfirming}
              variant="outline"
              size="sm"
              className="mt-3 w-full"
            >
              {isPending || isConfirming ? "Processing..." : "Deactivate Node"}
            </Button>
          )}
        </div>
      </Card>
    );
  };

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
          <h1 data-testid="nodes-title">My Nodes</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="register-node-btn" data-testid="register-node-btn">
                <Plus size={18} />
                Register Node
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="register-dialog">
              <DialogHeader>
                <DialogTitle>Register New Node</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleRegisterNode} className="node-form">
                <div className="form-field">
                  <Label htmlFor="location">Location</Label>
                  <Select
                    value={formData.location}
                    onValueChange={(value) => setFormData({ ...formData, location: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us-east">United States (East)</SelectItem>
                      <SelectItem value="eu-west">Europe (West)</SelectItem>
                      <SelectItem value="asia-pacific">Asia Pacific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="form-field">
                  <Label htmlFor="bandwidth">Bandwidth (Mbps)</Label>
                  <Input
                    id="bandwidth"
                    type="number"
                    min="10"
                    value={formData.bandwidth_mbps}
                    onChange={(e) => setFormData({ ...formData, bandwidth_mbps: parseInt(e.target.value) })}
                    data-testid="bandwidth-input"
                  />
                </div>
                <Button type="submit" className="w-full" data-testid="submit-node-btn">
                  Register Node
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </header>

        <div className="dashboard-content">
          {!isConnected ? (
            <div className="empty-state" data-testid="wallet-connect-prompt">
              <Server size={64} className="empty-icon" />
              <h2>Connect Your Wallet</h2>
              <p>Please connect your MetaMask wallet to manage your nodes</p>
            </div>
          ) : nodeIds.length === 0 ? (
            <div className="empty-state" data-testid="empty-state">
              <Server size={64} className="empty-icon" />
              <h2>No Nodes Yet</h2>
              <p>Register your first node to start earning $AETH tokens</p>
              <Button onClick={() => setDialogOpen(true)} disabled={isPending || isConfirming}>
                <Plus size={18} />
                Register Your First Node
              </Button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">🖥️ Your Nodes ({nodeIds.length})</h2>
                <Button 
                  onClick={handleRefresh} 
                  disabled={refreshing}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={refreshing ? "animate-spin" : ""} size={16} />
                  Refresh
                </Button>
              </div>
              <div className="nodes-grid" data-testid="nodes-grid">
                {nodeIds.map((nodeId, index) => (
                  <NodeCard key={nodeId.toString()} nodeId={nodeId} index={index} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NodeManagement;