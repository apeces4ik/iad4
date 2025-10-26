/**
 * TransactionModal Component
 * Display transaction confirmation and status
 * Day 46-48: Wallet Integration (строки 417-432)
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle, ExternalLink, Copy, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * TransactionModal - Modal for transaction confirmation and status
 * 
 * @param {boolean} open - Whether modal is open
 * @param {function} onClose - Close handler
 * @param {object} transaction - Transaction details
 * @param {string} transaction.type - Type of transaction (stake, unstake, transfer, approve, etc)
 * @param {string} transaction.status - Status (idle, pending, confirming, confirmed, error)
 * @param {string} transaction.hash - Transaction hash
 * @param {object} transaction.details - Transaction specific details
 * @param {string} transaction.error - Error message if failed
 * @param {function} onConfirm - Confirm transaction handler
 * @param {function} onCancel - Cancel transaction handler
 */
export default function TransactionModal({ 
  open, 
  onClose, 
  transaction = {},
  onConfirm,
  onCancel 
}) {
  const {
    type = 'transaction',
    status = 'idle',
    hash,
    details = {},
    error
  } = transaction;

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
      case 'confirming':
        return <Loader2 className="animate-spin text-cyan-400" size={48} />;
      case 'confirmed':
        return <CheckCircle2 className="text-green-400" size={48} />;
      case 'error':
        return <XCircle className="text-red-400" size={48} />;
      default:
        return <AlertCircle className="text-yellow-400" size={48} />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Waiting for signature...';
      case 'confirming':
        return 'Confirming transaction...';
      case 'confirmed':
        return 'Transaction confirmed!';
      case 'error':
        return 'Transaction failed';
      default:
        return 'Confirm transaction';
    }
  };

  const getStatusBadge = () => {
    const variants = {
      idle: 'default',
      pending: 'warning',
      confirming: 'info',
      confirmed: 'success',
      error: 'destructive'
    };
    return <Badge variant={variants[status] || 'default'}>{status.toUpperCase()}</Badge>;
  };

  const getTransactionTitle = () => {
    const titles = {
      stake: 'Stake Tokens',
      unstake: 'Unstake Tokens',
      transfer: 'Transfer Tokens',
      approve: 'Approve Tokens',
      claim: 'Claim Rewards',
      register: 'Register Node',
      deactivate: 'Deactivate Node',
      burn: 'Burn Tokens',
      mint: 'Mint NFT',
      transaction: 'Transaction'
    };
    return titles[type] || 'Transaction';
  };

  const copyHash = () => {
    if (hash) {
      navigator.clipboard.writeText(hash);
      toast.success('Transaction hash copied!');
    }
  };

  const openExplorer = () => {
    if (hash) {
      // For Hardhat localhost, we don't have an explorer
      // In production, this would open Etherscan or similar
      console.log('Open explorer for tx:', hash);
      toast.info('Block explorer not available for Hardhat');
    }
  };

  const formatHash = (txHash) => {
    if (!txHash) return '';
    return `${txHash.slice(0, 10)}...${txHash.slice(-8)}`;
  };

  const formatValue = (value, decimals = 4) => {
    if (!value) return '0';
    const num = parseFloat(value);
    return num.toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: decimals 
    });
  };

  const handleConfirm = () => {
    if (onConfirm && status === 'idle') {
      onConfirm();
    }
  };

  const handleCancel = () => {
    if (onCancel && status === 'idle') {
      onCancel();
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="transaction-modal sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {getTransactionTitle()}
            {getStatusBadge()}
          </DialogTitle>
          <DialogDescription>
            {status === 'idle' && 'Review transaction details before confirming'}
            {status === 'error' && 'Transaction failed. Please try again.'}
          </DialogDescription>
        </DialogHeader>

        <div className="transaction-content">
          {/* Status Icon */}
          <div className="status-icon-container">
            {getStatusIcon()}
            <p className="status-text">{getStatusText()}</p>
          </div>

          {/* Transaction Details */}
          {status !== 'pending' && status !== 'confirming' && (
            <Card className="transaction-details">
              {/* Amount */}
              {details.amount && (
                <div className="detail-row">
                  <span className="detail-label">Amount</span>
                  <span className="detail-value">
                    {formatValue(details.amount)} {details.symbol || 'AETH'}
                  </span>
                </div>
              )}

              {/* To Address */}
              {details.to && (
                <div className="detail-row">
                  <span className="detail-label">To</span>
                  <span className="detail-value mono">
                    {formatHash(details.to)}
                  </span>
                </div>
              )}

              {/* From Address */}
              {details.from && (
                <div className="detail-row">
                  <span className="detail-label">From</span>
                  <span className="detail-value mono">
                    {formatHash(details.from)}
                  </span>
                </div>
              )}

              {/* Gas Estimate */}
              {details.gasEstimate && status === 'idle' && (
                <div className="detail-row">
                  <span className="detail-label">Estimated Gas</span>
                  <span className="detail-value">
                    {formatValue(details.gasEstimate, 6)} ETH
                  </span>
                </div>
              )}

              {/* APY (for staking) */}
              {details.apy && (
                <div className="detail-row">
                  <span className="detail-label">APY</span>
                  <span className="detail-value text-green-400">
                    {details.apy}%
                  </span>
                </div>
              )}

              {/* Lock Period (for staking) */}
              {details.lockPeriod && (
                <div className="detail-row">
                  <span className="detail-label">Lock Period</span>
                  <span className="detail-value">
                    {details.lockPeriod}
                  </span>
                </div>
              )}

              {/* Additional Info */}
              {details.info && (
                <div className="detail-row">
                  <span className="detail-label">Note</span>
                  <span className="detail-value text-sm opacity-70">
                    {details.info}
                  </span>
                </div>
              )}
            </Card>
          )}

          {/* Transaction Hash */}
          {hash && status !== 'pending' && (
            <Card className="transaction-hash">
              <div className="hash-header">
                <span className="hash-label">Transaction Hash</span>
              </div>
              <div className="hash-value">
                <span className="hash-text mono">{formatHash(hash)}</span>
                <div className="hash-actions">
                  <button onClick={copyHash} className="icon-btn" title="Copy hash">
                    <Copy size={16} />
                  </button>
                  <button onClick={openExplorer} className="icon-btn" title="View on explorer">
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>
            </Card>
          )}

          {/* Error Message */}
          {error && status === 'error' && (
            <Card className="error-card">
              <div className="error-content">
                <XCircle className="error-icon" size={20} />
                <div>
                  <p className="error-title">Error</p>
                  <p className="error-message">{error}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Actions */}
          <div className="transaction-actions">
            {status === 'idle' && (
              <>
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  className="flex-1"
                >
                  Confirm
                </Button>
              </>
            )}

            {(status === 'pending' || status === 'confirming') && (
              <Button variant="outline" disabled className="w-full">
                <Loader2 className="animate-spin mr-2" size={16} />
                Processing...
              </Button>
            )}

            {status === 'confirmed' && (
              <Button onClick={onClose} className="w-full">
                Close
              </Button>
            )}

            {status === 'error' && (
              <div className="flex gap-2 w-full">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Close
                </Button>
                <Button onClick={handleConfirm} className="flex-1">
                  Try Again
                </Button>
              </div>
            )}
          </div>

          {/* Tips */}
          {status === 'pending' && (
            <div className="transaction-tip">
              <AlertCircle size={14} />
              <span>Please confirm the transaction in your wallet</span>
            </div>
          )}
          
          {status === 'confirming' && (
            <div className="transaction-tip">
              <Loader2 className="animate-spin" size={14} />
              <span>Transaction is being confirmed on the blockchain</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Usage Example:
 * 
 * const [txModal, setTxModal] = useState({
 *   open: false,
 *   transaction: {
 *     type: 'stake',
 *     status: 'idle',
 *     details: {
 *       amount: '1000',
 *       symbol: 'AETH',
 *       apy: '100',
 *       lockPeriod: '24 months',
 *       gasEstimate: '0.002'
 *     }
 *   }
 * });
 * 
 * <TransactionModal
 *   open={txModal.open}
 *   transaction={txModal.transaction}
 *   onConfirm={handleStake}
 *   onCancel={() => setTxModal({ ...txModal, open: false })}
 *   onClose={() => setTxModal({ ...txModal, open: false })}
 * />
 */
