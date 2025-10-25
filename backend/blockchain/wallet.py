"""
Backend Wallet for Blockchain Transactions

This module provides a backend wallet using Hardhat's first account (deployer)
for executing transactions like recordDataShared on MinerNode contract.
"""

from web3 import Web3
from eth_account import Account
import os
import logging

logger = logging.getLogger(__name__)

# Hardhat default accounts private keys (from Hardhat documentation)
# These are test accounts with pre-funded ETH on Hardhat localhost
HARDHAT_ACCOUNTS = [
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",  # Account 0 (deployer)
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",  # Account 1
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",  # Account 2
]

class BackendWallet:
    """
    Backend wallet for executing blockchain transactions
    Uses Hardhat deployer account (first account) which has owner privileges
    """
    
    def __init__(self, rpc_url: str = "http://127.0.0.1:8545", account_index: int = 0):
        """
        Initialize backend wallet
        
        Args:
            rpc_url: Blockchain RPC URL
            account_index: Index of Hardhat account to use (0 = deployer/owner)
        """
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        if not self.w3.is_connected():
            raise ConnectionError(f"Failed to connect to blockchain at {rpc_url}")
        
        # Load account from private key
        private_key = HARDHAT_ACCOUNTS[account_index]
        self.account = Account.from_key(private_key)
        self.address = self.account.address
        
        logger.info(f"Backend wallet initialized: {self.address}")
        
        # Check balance
        balance_wei = self.w3.eth.get_balance(self.address)
        balance_eth = self.w3.from_wei(balance_wei, 'ether')
        logger.info(f"Backend wallet balance: {balance_eth} ETH")
    
    def get_address(self) -> str:
        """Get wallet address"""
        return self.address
    
    def get_balance(self) -> float:
        """Get wallet balance in ETH"""
        balance_wei = self.w3.eth.get_balance(self.address)
        return float(self.w3.from_wei(balance_wei, 'ether'))
    
    def send_transaction(self, contract_function, gas_limit: int = 200000) -> str:
        """
        Send a transaction to a contract function
        
        Args:
            contract_function: Web3 contract function to call
            gas_limit: Gas limit for transaction
            
        Returns:
            Transaction hash
        """
        try:
            # Build transaction
            nonce = self.w3.eth.get_transaction_count(self.address)
            
            transaction = contract_function.build_transaction({
                'from': self.address,
                'nonce': nonce,
                'gas': gas_limit,
                'gasPrice': self.w3.eth.gas_price,
            })
            
            # Sign transaction
            signed_txn = self.w3.eth.account.sign_transaction(transaction, self.account.key)
            
            # Send transaction
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.raw_transaction)
            
            logger.info(f"Transaction sent: {tx_hash.hex()}")
            
            # Wait for transaction receipt
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
            
            if receipt['status'] == 1:
                logger.info(f"Transaction successful: {tx_hash.hex()}")
                return tx_hash.hex()
            else:
                logger.error(f"Transaction failed: {tx_hash.hex()}")
                raise Exception("Transaction failed")
                
        except Exception as e:
            logger.error(f"Error sending transaction: {e}")
            raise

# Global backend wallet instance
_backend_wallet = None

def get_backend_wallet() -> BackendWallet:
    """
    Get or create backend wallet singleton
    """
    global _backend_wallet
    if _backend_wallet is None:
        rpc_url = os.environ.get('BLOCKCHAIN_RPC_URL', 'http://127.0.0.1:8545')
        _backend_wallet = BackendWallet(rpc_url=rpc_url)
    return _backend_wallet
