import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Wifi, Shield, Coins, Network, ChevronRight, Zap, Sparkles } from "lucide-react";
import ParticlesBackground from "@/components/ParticlesBackground";

const LandingPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleGetStarted = async () => {
    if (!isConnected) {
      const connector = connectors[0];
      if (connector) {
        setIsConnecting(true);
        try {
          await connect({ connector });
          setTimeout(async () => {
            const success = await login();
            if (success) {
              navigate("/dashboard");
            }
            setIsConnecting(false);
          }, 500);
        } catch (error) {
          console.error("Connection error:", error);
          setIsConnecting(false);
        }
      }
    } else if (!isAuthenticated) {
      setIsConnecting(true);
      const success = await login();
      if (success) {
        navigate("/dashboard");
      }
      setIsConnecting(false);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="landing-page">
      <ParticlesBackground />
      <div className="hero-section">
        <nav className="nav-bar">
          <div className="logo" data-testid="logo">
            <Zap className="logo-icon" />
            <span>Aetherium Proxy</span>
          </div>
          <div className="nav-actions">
            {isConnected && (
              <div className="wallet-info" data-testid="wallet-info">
                <span className="wallet-address">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
            )}
            <Button
              data-testid="get-started-btn"
              onClick={handleGetStarted}
              disabled={isConnecting}
              className="cta-button"
            >
              {isConnecting ? (
                <>
                  <Sparkles size={18} />
                  Connecting...
                </>
              ) : isAuthenticated ? (
                <>
                  Go to Dashboard
                  <ChevronRight size={18} />
                </>
              ) : isConnected ? (
                <>
                  Sign to Continue
                  <ChevronRight size={18} />
                </>
              ) : (
                <>
                  Connect Wallet
                  <ChevronRight size={18} />
                </>
              )}
            </Button>
          </div>
        </nav>

        <div className="hero-content">
          <div className="hero-badge" data-testid="hero-badge">
            <span className="badge-dot"></span>
            Your Traffic is Your Treasure
          </div>
          <h1 className="hero-title" data-testid="hero-title">
            Decentralized VPN
            <br />
            <span className="gradient-text">Earn While You Browse</span>
          </h1>
          <p className="hero-description" data-testid="hero-description">
            Join the Web3 revolution. Share your bandwidth, earn $AETH tokens,
            and access a truly decentralized internet.
          </p>
          <div className="hero-stats">
            <div className="stat-card">
              <div className="stat-value">10K+</div>
              <div className="stat-label">Active Nodes</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">$2M+</div>
              <div className="stat-label">Earned by Miners</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">50+</div>
              <div className="stat-label">Countries</div>
            </div>
          </div>
        </div>
      </div>

      <div className="features-section" data-testid="features-section">
        <h2 className="section-title">How It Works</h2>
        <div className="features-grid">
          <div className="feature-card" data-testid="feature-vpn">
            <div className="feature-icon blue">
              <Wifi size={32} />
            </div>
            <h3>Secure VPN Access</h3>
            <p>
              Connect to our decentralized network of nodes for private,
              encrypted browsing across 50+ locations worldwide.
            </p>
          </div>

          <div className="feature-card" data-testid="feature-nodes">
            <div className="feature-icon cyan">
              <Network size={32} />
            </div>
            <h3>Become a Miner Node</h3>
            <p>
              Share your unused bandwidth and IP address. Earn $AETH tokens for
              every megabyte you contribute to the network.
            </p>
          </div>

          <div className="feature-card" data-testid="feature-staking">
            <div className="feature-icon purple">
              <Coins size={32} />
            </div>
            <h3>Stake & Earn</h3>
            <p>
              Stake your $AETH tokens to become a validator. Earn rewards and
              govern the future of the network with voting rights.
            </p>
          </div>

          <div className="feature-card" data-testid="feature-security">
            <div className="feature-icon green">
              <Shield size={32} />
            </div>
            <h3>Full Privacy</h3>
            <p>
              WireGuard protocol encryption. No logs, no tracking. Your data
              remains private and secure on the blockchain.
            </p>
          </div>
        </div>
      </div>

      <div className="cta-section" data-testid="cta-section">
        <div className="cta-content">
          <h2>Ready to Start Earning?</h2>
          <p>Join thousands of users already monetizing their internet connection.</p>
          <Button
            data-testid="cta-button"
            onClick={handleGetStarted}
            disabled={isConnecting}
            size="lg"
            className="cta-button-large"
          >
            {isConnecting ? (
              <>
                <Sparkles size={20} />
                Connecting...
              </>
            ) : (
              <>
                Get Started Now
                <ChevronRight size={20} />
              </>
            )}
          </Button>
        </div>
      </div>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-logo">
            <Zap size={24} />
            <span>Aetherium Proxy</span>
          </div>
          <p className="footer-text">
            © 2025 Aetherium Proxy. Built on Web3. Powered by the community.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;