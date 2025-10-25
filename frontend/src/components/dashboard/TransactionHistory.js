/**
 * TransactionHistory Component
 * Displays recent blockchain transactions
 * Строки 450-465 файла "цель" (Day 50-52: Dashboard Page)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowUpRight, ArrowDownLeft, Clock, ExternalLink } from 'lucide-react';

export default function TransactionHistory({ walletAddress }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Generate sample transactions
  useEffect(() => {
    if (walletAddress) {
      generateSampleTransactions();
    }
  }, [walletAddress]);

  const generateSampleTransactions = () => {
    const types = ['stake', 'unstake', 'reward', 'burn', 'transfer'];
    const sample = [];
    
    for (let i = 0; i < 10; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      const date = new Date();
      date.setHours(date.getHours() - i * 3);
      
      sample.push({
        hash: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
        type,
        amount: (Math.random() * 100 + 10).toFixed(2),
        timestamp: date.toISOString(),
        status: 'confirmed',
      });
    }
    
    setTransactions(sample);
  };

  const getTransactionIcon = (type) => {
    switch (type) {
      case 'stake':
      case 'burn':
        return <ArrowUpRight className="tx-icon outgoing" />;
      case 'unstake':
      case 'reward':
        return <ArrowDownLeft className="tx-icon incoming" />;
      default:
        return <Clock className="tx-icon pending" />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case 'reward':
      case 'unstake':
        return 'tx-incoming';
      case 'stake':
      case 'burn':
        return 'tx-outgoing';
      default:
        return 'tx-neutral';
    }
  };

  const formatTimeAgo = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
  };

  const openBlockExplorer = (hash) => {
    // Open in block explorer (Hardhat doesn't have one, but structure is ready)
    console.log('Open transaction:', hash);
  };

  return (
    <Card className="transaction-history-card">
      <CardHeader>
        <div className="history-header">
          <CardTitle>Transaction History</CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={generateSampleTransactions}
          >
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="loading-state">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-state">
            <Clock size={48} className="empty-icon" />
            <p>No transactions yet</p>
            <p className="empty-subtext">Your transactions will appear here</p>
          </div>
        ) : (
          <div className="transactions-list">
            {transactions.map((tx, index) => (
              <div key={index} className={`transaction-item ${getTransactionColor(tx.type)}`}>
                <div className="tx-left">
                  {getTransactionIcon(tx.type)}
                  <div className="tx-info">
                    <div className="tx-type">{tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</div>
                    <div className="tx-hash" onClick={() => openBlockExplorer(tx.hash)}>
                      {tx.hash}
                      <ExternalLink size={12} />
                    </div>
                  </div>
                </div>
                <div className="tx-right">
                  <div className={`tx-amount ${tx.type === 'reward' || tx.type === 'unstake' ? 'positive' : 'negative'}`}>
                    {tx.type === 'reward' || tx.type === 'unstake' ? '+' : '-'}
                    {tx.amount} AETH
                  </div>
                  <div className="tx-time">{formatTimeAgo(tx.timestamp)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
