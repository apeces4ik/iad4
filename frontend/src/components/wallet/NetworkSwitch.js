/**
 * NetworkSwitch Component  
 * Switch between different blockchain networks
 * Day 46-48: Wallet Integration (строки 417-432)
 */

import { useAccount, useSwitchChain, useChainId } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Network, ChevronDown, Check } from 'lucide-react';
import { useState } from 'react';

export default function NetworkSwitch() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { chains, switchChain } = useSwitchChain();
  const [showNetworks, setShowNetworks] = useState(false);

  const currentChain = chains.find(chain => chain.id === chainId);

  const getNetworkName = (chain) => {
    if (chain?.id === 1337) return 'Hardhat';
    return chain?.name || 'Unknown';
  };

  if (!isConnected) return null;

  return (
    <div className="network-switch-container">
      <Button
        onClick={() => setShowNetworks(!showNetworks)}
        className="network-button"
        variant="outline"
        size="sm"
      >
        <Network size={16} />
        {getNetworkName(currentChain)}
        <ChevronDown size={14} />
      </Button>

      {showNetworks && (
        <div className="networks-menu">
          {chains.map((chain) => (
            <button
              key={chain.id}
              onClick={() => {
                switchChain({ chainId: chain.id });
                setShowNetworks(false);
              }}
              className={`network-item ${chainId === chain.id ? 'active' : ''}`}
            >
              <span>{getNetworkName(chain)}</span>
              {chainId === chain.id && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
