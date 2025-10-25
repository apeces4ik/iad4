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
        
        # Contract addresses (V2)
        self.aeth_token_v2_address = os.environ.get("AETH_TOKEN_V2_ADDRESS")
        self.miner_node_v2_address = os.environ.get("MINER_NODE_V2_ADDRESS")
        self.node_nft_address = os.environ.get("NODE_NFT_ADDRESS")
        self.referral_program_address = os.environ.get("REFERRAL_PROGRAM_ADDRESS")
        self.vpn_session_address = os.environ.get("VPN_SESSION_ADDRESS")
        self.validator_address = os.environ.get("VALIDATOR_ADDRESS")
        self.premium_vpn_address = os.environ.get("PREMIUM_VPN_ADDRESS")
        
        # Initialize contracts
        self.aeth_token_v2 = None
        self.miner_node_v2 = None
        self.node_nft = None
        self.referral_program = None
        self.vpn_session = None
        self.validator = None
        self.premium_vpn = None
        
        self._init_contracts()
    
    def _init_contracts(self):
        """Initialize contract instances"""
        try:
            if self.aeth_token_v2_address:
                aeth_abi = load_abi("AETHTokenV2")
                self.aeth_token_v2 = self.w3.eth.contract(
                    address=self.w3.to_checksum_address(self.aeth_token_v2_address),
                    abi=aeth_abi
                )
            
            if self.miner_node_v2_address:
                miner_abi = load_abi("MinerNodeV2")
                self.miner_node_v2 = self.w3.eth.contract(
                    address=self.w3.to_checksum_address(self.miner_node_v2_address),
                    abi=miner_abi
                )
            
            if self.node_nft_address:
                nft_abi = load_abi("NodeNFT")
                self.node_nft = self.w3.eth.contract(
                    address=self.w3.to_checksum_address(self.node_nft_address),
                    abi=nft_abi
                )
            
            if self.referral_program_address:
                referral_abi = load_abi("ReferralProgram")
                self.referral_program = self.w3.eth.contract(
                    address=self.w3.to_checksum_address(self.referral_program_address),
                    abi=referral_abi
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
            
            if self.premium_vpn_address:
                premium_abi = load_abi("PremiumVPN")
                self.premium_vpn = self.w3.eth.contract(
                    address=self.w3.to_checksum_address(self.premium_vpn_address),
                    abi=premium_abi
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
        if not self.aeth_token_v2:
            return 0.0
        try:
            balance = self.aeth_token_v2.functions.balanceOf(
                self.w3.to_checksum_address(address)
            ).call()
            return float(self.w3.from_wei(balance, 'ether'))
        except Exception as e:
            print(f"Error getting AETH balance: {e}")
            return 0.0
    
    def get_stake_info(self, address: str) -> dict:
        """Get staking info for an address"""
        if not self.aeth_token_v2:
            return {"amount": 0.0, "startTime": 0, "pendingRewards": 0.0}
        try:
            stake_info = self.aeth_token_v2.functions.getStakeInfo(
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
        if not self.miner_node_v2:
            return None
        try:
            # Convert node_id to bytes32
            node_id_bytes = bytes.fromhex(node_id.replace('0x', ''))
            node_info = self.miner_node_v2.functions.getNode(node_id_bytes).call()
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
        if not self.miner_node_v2:
            return []
        try:
            node_ids = self.miner_node_v2.functions.getOwnerNodes(
                self.w3.to_checksum_address(address)
            ).call()
            return [f"0x{node_id.hex()}" for node_id in node_ids]
        except Exception as e:
            print(f"Error getting owner nodes: {e}")
            return []
    
    def get_all_nodes(self) -> list:
        """Get all registered nodes"""
        if not self.miner_node_v2:
            return []
        try:
            # Get total nodes count
            total_nodes = self.miner_node_v2.functions.getTotalNodes().call()
            
            # Get all node IDs
            all_nodes = []
            for i in range(total_nodes):
                node_id = self.miner_node_v2.functions.allNodeIds(i).call()
                node_id_hex = f"0x{node_id.hex()}"
                node_info = self.get_node_info(node_id_hex)
                if node_info:
                    node_info['nodeId'] = node_id_hex
                    all_nodes.append(node_info)
            
            return all_nodes
        except Exception as e:
            print(f"Error getting all nodes: {e}")
            return []
    
    def get_active_nodes_by_reputation(self, min_reputation: int = 50) -> list:
        """
        Get active nodes filtered by minimum reputation, sorted by reputation descending
        
        Args:
            min_reputation: Minimum reputation score (0-100)
            
        Returns:
            List of node info dicts sorted by reputation (highest first)
        """
        if not self.miner_node_v2:
            return []
        try:
            all_nodes = self.get_all_nodes()
            
            # Filter active nodes with reputation >= min_reputation
            active_nodes = [
                node for node in all_nodes
                if node.get('isActive', False) and node.get('reputation', 0) >= min_reputation
            ]
            
            # Sort by reputation descending
            active_nodes.sort(key=lambda x: x.get('reputation', 0), reverse=True)
            
            return active_nodes
        except Exception as e:
            print(f"Error getting nodes by reputation: {e}")
            return []
    
    def record_data_shared(self, backend_wallet, node_id_hex: str, data_mb: int) -> str:
        """
        Record data shared by a node and distribute rewards (owner only)
        
        Args:
            backend_wallet: BackendWallet instance for signing transaction
            node_id_hex: Node ID in hex format (0x...)
            data_mb: Data shared in megabytes
            
        Returns:
            Transaction hash
        """
        if not self.miner_node_v2:
            raise Exception("MinerNode contract not initialized")
        
        try:
            # Convert node_id to bytes32
            node_id_bytes = bytes.fromhex(node_id_hex.replace('0x', ''))
            
            # Build contract function call
            contract_function = self.miner_node_v2.functions.recordDataShared(
                node_id_bytes,
                data_mb
            )
            
            # Send transaction using backend wallet
            tx_hash = backend_wallet.send_transaction(contract_function)
            
            return tx_hash
        except Exception as e:
            print(f"Error recording data shared: {e}")
            raise
    
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
            "aethTokenV2": self.aeth_token_v2_address,
            "minerNodeV2": self.miner_node_v2_address,
            "nodeNFT": self.node_nft_address,
            "referralProgram": self.referral_program_address,
            "vpnSession": self.vpn_session_address,
            "validator": self.validator_address,
            "rpcUrl": self.rpc_url
        }
    
    # NodeNFT Methods
    def get_user_nfts(self, address: str) -> list:
        """Get all NFTs owned by an address"""
        if not self.node_nft:
            return []
        try:
            balance = self.node_nft.functions.balanceOf(
                self.w3.to_checksum_address(address)
            ).call()
            
            nfts = []
            for i in range(balance):
                try:
                    token_id = self.node_nft.functions.tokenOfOwnerByIndex(
                        self.w3.to_checksum_address(address),
                        i
                    ).call()
                    
                    # Get NFT details
                    nft_info = self.get_nft_info(token_id)
                    if nft_info:
                        nfts.append(nft_info)
                except:
                    continue
            
            return nfts
        except Exception as e:
            print(f"Error getting user NFTs: {e}")
            return []
    
    def get_nft_info(self, token_id: int) -> dict:
        """Get NFT information"""
        if not self.node_nft:
            return None
        try:
            # Get basic NFT data
            owner = self.node_nft.functions.ownerOf(token_id).call()
            
            # Try to get token details if contract has this function
            try:
                nft_data = self.node_nft.functions.tokenDetails(token_id).call()
                return {
                    "tokenId": token_id,
                    "owner": owner,
                    "tier": nft_data[0],  # 0=Bronze, 1=Silver, 2=Gold, 3=Diamond, 4=Legendary
                    "multiplier": float(nft_data[1]) / 10,  # Convert from stored value
                    "nodeId": f"0x{nft_data[2].hex()}" if len(nft_data) > 2 else "0x0",
                    "mintedAt": nft_data[3] if len(nft_data) > 3 else 0,
                    "isListed": nft_data[4] if len(nft_data) > 4 else False,
                    "price": float(self.w3.from_wei(nft_data[5], 'ether')) if len(nft_data) > 5 else 0.0
                }
            except:
                # Fallback if tokenDetails doesn't exist
                return {
                    "tokenId": token_id,
                    "owner": owner,
                    "tier": 0,
                    "multiplier": 1.0
                }
        except Exception as e:
            print(f"Error getting NFT info: {e}")
            return None
    
    # ReferralProgram Methods
    def get_referral_code(self, address: str) -> str:
        """Get referral code for an address"""
        if not self.referral_program:
            return ""
        try:
            code = self.referral_program.functions.getReferralCode(
                self.w3.to_checksum_address(address)
            ).call()
            return code
        except Exception as e:
            print(f"Error getting referral code: {e}")
            return ""
    
    def get_referral_stats(self, address: str) -> dict:
        """Get referral statistics for an address"""
        if not self.referral_program:
            return {
                "totalReferrals": 0,
                "level1Count": 0,
                "level2Count": 0,
                "level3Count": 0,
                "totalCommissions": 0.0,
                "rank": 0,
                "networkVolume": 0.0
            }
        try:
            stats = self.referral_program.functions.getReferralStats(
                self.w3.to_checksum_address(address)
            ).call()
            return {
                "totalReferrals": stats[0],
                "level1Count": stats[1],
                "level2Count": stats[2],
                "level3Count": stats[3],
                "totalCommissions": float(self.w3.from_wei(stats[4], 'ether')),
                "rank": stats[5],  # 0=Associate, 1=Bronze, 2=Silver, 3=Gold, 4=Diamond
                "networkVolume": float(self.w3.from_wei(stats[6], 'ether'))
            }
        except Exception as e:
            print(f"Error getting referral stats: {e}")
            return {
                "totalReferrals": 0,
                "level1Count": 0,
                "level2Count": 0,
                "level3Count": 0,
                "totalCommissions": 0.0,
                "rank": 0,
                "networkVolume": 0.0
            }
    
    def get_referrer(self, address: str) -> str:
        """Get the referrer address for a user"""
        if not self.referral_program:
            return "0x0000000000000000000000000000000000000000"
        try:
            referrer = self.referral_program.functions.referrer(
                self.w3.to_checksum_address(address)
            ).call()
            return referrer
        except Exception as e:
            print(f"Error getting referrer: {e}")
            return "0x0000000000000000000000000000000000000000"
    
    # PremiumVPN Methods
    def is_premium_member(self, address: str) -> bool:
        """Check if address has premium membership"""
        if not self.premium_vpn:
            return False
        try:
            is_premium = self.premium_vpn.functions.isPremiumActive(
                self.w3.to_checksum_address(address)
            ).call()
            return is_premium
        except Exception as e:
            print(f"Error checking premium status: {e}")
            return False
    
    def get_premium_info(self, address: str) -> dict:
        """Get premium membership information"""
        if not self.premium_vpn:
            return {
                "isActive": False,
                "startTime": 0,
                "expiresAt": 0,
                "dataUsedGB": 0,
                "plan": 0
            }
        try:
            info = self.premium_vpn.functions.getMembershipInfo(
                self.w3.to_checksum_address(address)
            ).call()
            return {
                "isActive": info[0],
                "startTime": info[1],
                "expiresAt": info[2],
                "dataUsedGB": info[3],
                "plan": info[4]  # 0=None, 1=Monthly, 2=Quarterly, 3=Yearly
            }
        except Exception as e:
            print(f"Error getting premium info: {e}")
            return {
                "isActive": False,
                "startTime": 0,
                "expiresAt": 0,
                "dataUsedGB": 0,
                "plan": 0
            }
    
    def get_all_contract_addresses(self) -> dict:
        """Get all V2 contract addresses"""
        return {
            "aethTokenV2": self.aeth_token_v2_address,
            "minerNodeV2": self.miner_node_v2_address,
            "nodeNFT": self.node_nft_address,
            "referralProgram": self.referral_program_address,
            "vpnSession": self.vpn_session_address,
            "validator": self.validator_address,
            "premiumVPN": self.premium_vpn_address,
            "rpcUrl": self.rpc_url
        }

            "premiumVPN": self.premium_vpn_address,
            "rpcUrl": self.rpc_url
        }
    
    # NodeNFT Methods
    def get_user_nfts(self, address: str) -> list:
        """Get all NFTs owned by an address"""
        if not self.node_nft:
            return []
        try:
            balance = self.node_nft.functions.balanceOf(
                self.w3.to_checksum_address(address)
            ).call()
            
            nfts = []
            for i in range(balance):
                token_id = self.node_nft.functions.tokenOfOwnerByIndex(
                    self.w3.to_checksum_address(address),
                    i
                ).call()
                
                # Get NFT details
                nft_info = self.get_nft_info(token_id)
                if nft_info:
                    nfts.append(nft_info)
            
            return nfts
        except Exception as e:
            print(f"Error getting user NFTs: {e}")
            return []
    
    def get_nft_info(self, token_id: int) -> dict:
        """Get NFT information"""
        if not self.node_nft:
            return None
        try:
            nft_data = self.node_nft.functions.tokenDetails(token_id).call()
            return {
                "tokenId": token_id,
                "tier": nft_data[0],  # 0=Bronze, 1=Silver, 2=Gold, 3=Diamond, 4=Legendary
                "multiplier": float(nft_data[1]) / 10,  # Convert from 1.1x stored as 11
                "nodeId": f"0x{nft_data[2].hex()}",
                "mintedAt": nft_data[3],
                "isListed": nft_data[4],
                "price": float(self.w3.from_wei(nft_data[5], 'ether'))
            }
        except Exception as e:
            print(f"Error getting NFT info: {e}")
            return None
    
    def get_nft_marketplace_listings(self) -> list:
        """Get all NFTs listed for sale"""
        if not self.node_nft:
            return []
        try:
            # This would need to be implemented by scanning events
            # For now, return empty list
            return []
        except Exception as e:
            print(f"Error getting marketplace listings: {e}")
            return []
    
    # ReferralProgram Methods
    def get_referral_code(self, address: str) -> str:
        """Get referral code for an address"""
        if not self.referral_program:
            return ""
        try:
            code = self.referral_program.functions.getReferralCode(
                self.w3.to_checksum_address(address)
            ).call()
            return code
        except Exception as e:
            print(f"Error getting referral code: {e}")
            return ""
    
    def get_referral_stats(self, address: str) -> dict:
        """Get referral statistics for an address"""
        if not self.referral_program:
            return None
        try:
            stats = self.referral_program.functions.getReferralStats(
                self.w3.to_checksum_address(address)
            ).call()
            return {
                "totalReferrals": stats[0],
                "level1Count": stats[1],
                "level2Count": stats[2],
                "level3Count": stats[3],
                "totalCommissions": float(self.w3.from_wei(stats[4], 'ether')),
                "rank": stats[5],  # 0=Associate, 1=Bronze, 2=Silver, 3=Gold, 4=Diamond
                "networkVolume": float(self.w3.from_wei(stats[6], 'ether'))
            }
        except Exception as e:
            print(f"Error getting referral stats: {e}")
            return None
    
    def get_referrer(self, address: str) -> str:
        """Get the referrer address for a user"""
        if not self.referral_program:
            return "0x0000000000000000000000000000000000000000"
        try:
            referrer = self.referral_program.functions.referrer(
                self.w3.to_checksum_address(address)
            ).call()
            return referrer
        except Exception as e:
            print(f"Error getting referrer: {e}")
            return "0x0000000000000000000000000000000000000000"
    
    # PremiumVPN Methods
    def is_premium_member(self, address: str) -> bool:
        """Check if address has premium membership"""
        if not self.premium_vpn:
            return False
        try:
            is_premium = self.premium_vpn.functions.isPremiumActive(
                self.w3.to_checksum_address(address)
            ).call()
            return is_premium
        except Exception as e:
            print(f"Error checking premium status: {e}")
            return False
    
    def get_premium_info(self, address: str) -> dict:
        """Get premium membership information"""
        if not self.premium_vpn:
            return None
        try:
            info = self.premium_vpn.functions.getMembershipInfo(
                self.w3.to_checksum_address(address)
            ).call()
            return {
                "isActive": info[0],
                "startTime": info[1],
                "expiresAt": info[2],
                "dataUsedGB": info[3],
                "plan": info[4]  # 0=None, 1=Monthly, 2=Quarterly, 3=Yearly
            }
        except Exception as e:
            print(f"Error getting premium info: {e}")
            return None

# Singleton instance
blockchain_client = BlockchainClient()
