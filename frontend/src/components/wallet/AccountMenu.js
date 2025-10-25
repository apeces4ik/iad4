/**
 * AccountMenu Component
 * User account dropdown with balance, copy address, disconnect
 * Day 46-48: Wallet Integration (строки 417-432)
 */

import { useAccount, useDisconnect, useBalance } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Copy, LogOut, ExternalLink, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function AccountMenu({ showMenu, onClose }) {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const [copied, setCopied] = useState(false);

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openExplorer = () => {
    // Open address in block explorer
    console.log('Open explorer for:', address);
    toast.info('Block explorer not available for Hardhat');
  };

  const handleDisconnect = () => {
    disconnect();
    onClose();
    toast.success('Wallet disconnected');
  };

  if (!showMenu || !address) return null;

  return (
    <>
      <div className="account-menu-backdrop" onClick={onClose}></div>
      <Card className="account-menu">
        <div className="account-menu-header">
          <h3>Account</h3>
        </div>

        <div className="account-info">
          <div className="account-address">
            <span className="address-label">Address</span>
            <div className="address-value">
              {formatAddress(address)}
              <button onClick={copyAddress} className="icon-btn">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="account-balance">
            <span className="balance-label">Balance</span>
            <div className="balance-value">
              {balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : '0.0 ETH'}
            </div>
          </div>
        </div>

        <div className="account-actions">
          <Button
            variant="outline"
            size="sm"
            onClick={copyAddress}
            className="account-action-btn"
          >
            <Copy size={16} />
            Copy Address
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={openExplorer}
            className="account-action-btn"
          >
            <ExternalLink size={16} />
            View Explorer
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            className="account-action-btn disconnect"
          >
            <LogOut size={16} />
            Disconnect
          </Button>
        </div>
      </Card>
    </>
  );
}
