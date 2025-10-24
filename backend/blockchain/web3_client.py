from web3 import Web3
import json
import os
from pathlib import Path

# Load contract ABIs
BLOCKCHAIN_DIR = Path(__file__).parent.parent.parent / "blockchain"
ARTIFACTS_DIR = BLOCKCHAIN_DIR / "artifacts" / "contracts"

def load_abi(contract_name: str):
    """Load ABI for a contract"""
    abi_path = ARTIFACTS_DIR / f"{contract_name}.sol" / f"{contract_name}.json"
    if not abi_path.exists():
        raise FileNotFoundError(f"ABI not found for {contract_name}")
    
    with open(abi_path) as f:
        contract_json = json.load(f)
    return contract_json["abi"]

class BlockchainClient:
    def __init__(self):
        self.rpc_url = os.environ.get("BLOCKCHAIN_RPC_URL", "http://127.0.0.1:8545")
        self.w3 = Web3(Web3.HTTPProvider(self.rpc_url))
        
        # Contract addresses
        self.aeth_token_address = os.environ.get("AETH_TOKEN_ADDRESS")
        self.miner_node_address = os.environ.get("MINER_NODE_ADDRESS")
        self.vpn_session_address = os.environ.get("VPN_SESSION_ADDRESS")
        self.validator_address = os.environ.get("VALIDATOR_ADDRESS")
        
        # Initialize contracts
        self.aeth_token = None
        self.miner_node = None
        self.vpn_session = None
        self.validator = None
        
        self._init_contracts()
    
    def _init_contracts(self):
        """Initialize contract instances"""
        try:
            if self.aeth_token_address:
                aeth_abi = load_abi("AETHToken")
                self.aeth_token = self.w3.eth.contract(
                    address=self.w3.to_checksum_address(self.aeth_token_address),
                    abi=aeth_abi
                )
            
            if self.miner_node_address:
                miner_abi = load_abi("MinerNode")
                self.miner_node = self.w3.eth.contract(
                    address=self.w3.to_checksum_address(self.miner_node_address),
                    abi=miner_abi
                )
            
            if self.vpn_session_address:
                vpn_abi = load_abi("VPNSession")
                self.vpn_session = self.w3.eth.contract(
                    address=self.w3.to_checksum_address(self.vpn_session_address),
                    abi=vpn_abi
                )
            
            if self.validator_address:
                validator_abi = load_abi("Validator")
                self.validator = self.w3.eth.contract(
                    address=self.w3.to_checksum_address(self.validator_address),
                    abi=validator_abi
                )
        except Exception as e:
            print(f"Warning: Could not initialize contracts: {e}")
    
    def is_connected(self) -> bool:
        """Check if connected to blockchain"""
        try:
            return self.w3.is_connected()
        except:
            return False
    
    # AETH Token Methods
    def get_aeth_balance(self, address: str) -> float:
        """Get AETH balance for an address"""
        if not self.aeth_token:
            return 0.0
        try:
            balance = self.aeth_token.functions.balanceOf(
                self.w3.to_checksum_address(address)
            ).call()
            return float(self.w3.from_wei(balance, 'ether'))
        except Exception as e:
            print(f"Error getting AETH balance: {e}")
            return 0.0
    
    def get_stake_info(self, address: str) -> dict:
        """Get staking info for an address"""
        if not self.aeth_token:
            return {"amount": 0.0, "startTime": 0, "pendingRewards": 0.0}
        try:
            stake_info = self.aeth_token.functions.getStakeInfo(
                self.w3.to_checksum_address(address)
            ).call()
            return {
                "amount": float(self.w3.from_wei(stake_info[0], 'ether')),
                "startTime": stake_info[1],
                "pendingRewards": float(self.w3.from_wei(stake_info[2], 'ether'))
            }
        except Exception as e:
            print(f"Error getting stake info: {e}")
            return {"amount": 0.0, "startTime": 0, "pendingRewards": 0.0}
    
    # Miner Node Methods
    def get_node_info(self, node_id: str) -> dict:
        """Get node information"""
        if not self.miner_node:
            return None
        try:
            # Convert node_id to bytes32
            node_id_bytes = bytes.fromhex(node_id.replace('0x', ''))
            node_info = self.miner_node.functions.getNode(node_id_bytes).call()
            return {
                "owner": node_info[0],
                "location": node_info[1],
                "bandwidthMbps": node_info[2],
                "isActive": node_info[3],
                "totalDataShared": node_info[4],
                "totalEarnings": float(self.w3.from_wei(node_info[5], 'ether')),
                "reputation": node_info[6]
            }
        except Exception as e:
            print(f"Error getting node info: {e}")
            return None
    
    def get_owner_nodes(self, address: str) -> list:
        """Get all nodes owned by an address"""
        if not self.miner_node:
            return []
        try:
            node_ids = self.miner_node.functions.getOwnerNodes(
                self.w3.to_checksum_address(address)
            ).call()
            return [f"0x{node_id.hex()}" for node_id in node_ids]
        except Exception as e:
            print(f"Error getting owner nodes: {e}")
            return []
    
    # VPN Session Methods
    def get_session_info(self, session_id: str) -> dict:
        """Get session information"""
        if not self.vpn_session:
            return None
        try:
            session_id_bytes = bytes.fromhex(session_id.replace('0x', ''))
            session_info = self.vpn_session.functions.getSession(session_id_bytes).call()
            return {
                "user": session_info[0],
                "nodeId": f"0x{session_info[1].hex()}",
                "startTime": session_info[2],
                "endTime": session_info[3],
                "dataUsedMB": session_info[4],
                "isActive": session_info[5],
                "totalPaid": float(self.w3.from_wei(session_info[6], 'ether'))
            }
        except Exception as e:
            print(f"Error getting session info: {e}")
            return None
    
    def get_user_sessions(self, address: str) -> list:
        """Get all sessions for a user"""
        if not self.vpn_session:
            return []
        try:
            session_ids = self.vpn_session.functions.getUserSessions(
                self.w3.to_checksum_address(address)
            ).call()
            return [f"0x{session_id.hex()}" for session_id in session_ids]
        except Exception as e:
            print(f"Error getting user sessions: {e}")
            return []
    
    # Validator Methods
    def get_validator_info(self, address: str) -> dict:
        """Get validator information"""
        if not self.validator:
            return None
        try:
            validator_info = self.validator.functions.getValidatorInfo(
                self.w3.to_checksum_address(address)
            ).call()
            return {
                "stakedAmount": float(self.w3.from_wei(validator_info[0], 'ether')),
                "joinedAt": validator_info[1],
                "isActive": validator_info[2],
                "validatedSessions": validator_info[3],
                "slashCount": validator_info[4],
                "rewards": float(self.w3.from_wei(validator_info[5], 'ether'))
            }
        except Exception as e:
            print(f"Error getting validator info: {e}")
            return None
    
    def get_contract_addresses(self) -> dict:
        """Get all contract addresses"""
        return {
            "aethToken": self.aeth_token_address,
            "minerNode": self.miner_node_address,
            "vpnSession": self.vpn_session_address,
            "validator": self.validator_address,
            "rpcUrl": self.rpc_url
        }

# Singleton instance
blockchain_client = BlockchainClient()
