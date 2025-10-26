/**
 * TransactionModal Usage Examples
 * Demonstrates all states and transaction types
 */

import React, { useState } from 'react';
import TransactionModal from '../components/wallet/TransactionModal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function TransactionModalExample() {
  const [modalState, setModalState] = useState({
    open: false,
    transaction: {}
  });

  const examples = [
    {
      title: 'Stake Tokens - Idle',
      transaction: {
        type: 'stake',
        status: 'idle',
        details: {
          amount: '1000',
          symbol: 'AETH',
          apy: '100',
          lockPeriod: '24 months',
          gasEstimate: '0.0021',
          info: 'Tokens will be locked for the selected period'
        }
      }
    },
    {
      title: 'Transfer - Pending',
      transaction: {
        type: 'transfer',
        status: 'pending',
        details: {
          amount: '500',
          symbol: 'AETH',
          to: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
        }
      }
    },
    {
      title: 'Claim Rewards - Confirming',
      transaction: {
        type: 'claim',
        status: 'confirming',
        hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        details: {
          amount: '125.50',
          symbol: 'AETH'
        }
      }
    },
    {
      title: 'Register Node - Confirmed',
      transaction: {
        type: 'register',
        status: 'confirmed',
        hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        details: {
          amount: '10000',
          symbol: 'AETH',
          info: 'Node registered successfully!'
        }
      }
    },
    {
      title: 'Unstake - Error',
      transaction: {
        type: 'unstake',
        status: 'error',
        hash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
        error: 'Tokens are still locked. Lock period ends in 15 days.',
        details: {
          amount: '1000',
          symbol: 'AETH',
          lockPeriod: '6 months'
        }
      }
    },
    {
      title: 'Burn Tokens - Idle',
      transaction: {
        type: 'burn',
        status: 'idle',
        details: {
          amount: '0.001',
          symbol: 'AETH',
          info: 'Burn tokens to activate 1 minute of VPN access'
        }
      }
    },
    {
      title: 'Mint NFT - Confirmed',
      transaction: {
        type: 'mint',
        status: 'confirmed',
        hash: '0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc',
        details: {
          info: 'Bronze Node NFT minted successfully!',
          from: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
        }
      }
    },
    {
      title: 'Approve Tokens - Idle',
      transaction: {
        type: 'approve',
        status: 'idle',
        details: {
          amount: 'Unlimited',
          symbol: 'AETH',
          to: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
          info: 'Approve contract to spend your tokens'
        }
      }
    }
  ];

  const openExample = (example) => {
    setModalState({
      open: true,
      transaction: example.transaction
    });
  };

  const closeModal = () => {
    setModalState({ ...modalState, open: false });
  };

  const handleConfirm = () => {
    console.log('Transaction confirmed:', modalState.transaction);
    
    // Simulate transaction flow
    setModalState({
      ...modalState,
      transaction: { ...modalState.transaction, status: 'pending' }
    });

    setTimeout(() => {
      const hash = '0x' + Math.random().toString(16).slice(2, 66);
      setModalState({
        ...modalState,
        transaction: { 
          ...modalState.transaction, 
          status: 'confirming',
          hash 
        }
      });

      setTimeout(() => {
        setModalState({
          ...modalState,
          transaction: { 
            ...modalState.transaction, 
            status: 'confirmed'
          }
        });
      }, 2000);
    }, 1500);
  };

  const handleCancel = () => {
    console.log('Transaction cancelled');
    closeModal();
  };

  return (
    <div className="container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          TransactionModal Examples
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Click any button to see the TransactionModal in different states
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: '1rem' 
      }}>
        {examples.map((example, index) => (
          <Card key={index} style={{ 
            padding: '1.5rem', 
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)'
          }}>
            <h3 style={{ 
              fontSize: '1rem', 
              fontWeight: '600', 
              marginBottom: '0.5rem',
              color: 'var(--text-primary)'
            }}>
              {example.title}
            </h3>
            <p style={{ 
              fontSize: '0.875rem', 
              color: 'var(--text-secondary)', 
              marginBottom: '1rem' 
            }}>
              Type: <strong>{example.transaction.type}</strong><br />
              Status: <strong>{example.transaction.status}</strong>
            </p>
            <Button 
              onClick={() => openExample(example)}
              style={{ width: '100%' }}
            >
              Open Modal
            </Button>
          </Card>
        ))}
      </div>

      <TransactionModal
        open={modalState.open}
        transaction={modalState.transaction}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onClose={closeModal}
      />

      <div style={{ 
        marginTop: '3rem', 
        padding: '1.5rem', 
        background: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
          Usage in Your Component
        </h2>
        <pre style={{ 
          background: 'rgba(0,0,0,0.3)', 
          padding: '1rem', 
          borderRadius: '8px',
          overflow: 'auto',
          fontSize: '0.875rem',
          color: 'var(--text-primary)'
        }}>
{`import TransactionModal from '@/components/wallet/TransactionModal';

const [txModal, setTxModal] = useState({
  open: false,
  transaction: {
    type: 'stake',
    status: 'idle',
    details: {
      amount: '1000',
      symbol: 'AETH',
      apy: '100',
      lockPeriod: '24 months'
    }
  }
});

const handleStake = async () => {
  // Update to pending
  setTxModal({
    ...txModal,
    transaction: { ...txModal.transaction, status: 'pending' }
  });

  try {
    const tx = await stakeContract.stake(amount);
    
    // Update to confirming with hash
    setTxModal({
      ...txModal,
      transaction: { 
        ...txModal.transaction, 
        status: 'confirming',
        hash: tx.hash 
      }
    });

    await tx.wait();
    
    // Update to confirmed
    setTxModal({
      ...txModal,
      transaction: { ...txModal.transaction, status: 'confirmed' }
    });
  } catch (error) {
    // Update to error
    setTxModal({
      ...txModal,
      transaction: { 
        ...txModal.transaction, 
        status: 'error',
        error: error.message 
      }
    });
  }
};

<TransactionModal
  open={txModal.open}
  transaction={txModal.transaction}
  onConfirm={handleStake}
  onCancel={() => setTxModal({ ...txModal, open: false })}
  onClose={() => setTxModal({ ...txModal, open: false })}
/>`}
        </pre>
      </div>
    </div>
  );
}
