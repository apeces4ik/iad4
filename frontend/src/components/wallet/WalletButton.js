/**
 * WalletButton Component
 * Connect/Disconnect wallet with MetaMask & WalletConnect
 * Day 46-48: Wallet Integration (строки 417-432)
 */

import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Wallet, ChevronDown } from 'lucide-react';
import { useState } from 'react';

export default function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [showConnectors, setShowConnectors] = useState(false);

  const handleConnect = () => {
    if (isConnected) {
      disconnect();
    } else {
      setShowConnectors(!showConnectors);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="wallet-button-container">
      {!isConnected ? (
        <div className="wallet-connect-dropdown">
          <Button
            onClick={handleConnect}
            className="wallet-button"
            variant="default"
          >
            <Wallet size={18} />
            Connect Wallet
            <ChevronDown size={16} />
          </Button>
          
          {showConnectors && (
            <div className="connectors-menu">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => {
                    connect({ connector });
                    setShowConnectors(false);
                  }}
                  className="connector-item"
                >
                  {connector.name}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Button
          onClick={handleConnect}
          className="wallet-button connected"
          variant="outline"
        >
          <div className="wallet-status-dot"></div>
          {formatAddress(address)}
        </Button>
      )}
    </div>
  );
}
