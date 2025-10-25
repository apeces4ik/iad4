"""
VPN Routes with WireGuard Integration and Burn Mechanism
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional, List
import logging
import os
from datetime import datetime
from web3 import Web3
import json
from pathlib import Path

# Import WireGuard manager
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from vpn.wireguard_manager import WireGuardManager

# Import blockchain utilities
from blockchain.wallet import get_backend_wallet
from blockchain.web3_client import BlockchainClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/vpn", tags=["VPN"])

# Initialize blockchain client and backend wallet
blockchain_client = BlockchainClient()
backend_wallet = None

try:
    backend_wallet = get_backend_wallet()
    logger.info(f"✅ Backend wallet initialized: {backend_wallet.get_address()}")
    logger.info(f"✅ Backend wallet balance: {backend_wallet.get_balance()} ETH")
except Exception as e:
    logger.error(f"❌ Failed to initialize backend wallet: {e}")

# Initialize Web3
BLOCKCHAIN_RPC_URL = os.environ.get('BLOCKCHAIN_RPC_URL', 'http://127.0.0.1:8545')
w3 = Web3(Web3.HTTPProvider(BLOCKCHAIN_RPC_URL))

# Contract addresses
AETH_TOKEN_ADDRESS = os.environ.get('AETH_TOKEN_ADDRESS')
PREMIUM_VPN_ADDRESS = os.environ.get('PREMIUM_VPN_ADDRESS')

# Load contract ABIs
def load_contract_abi(contract_name: str):
    abi_path = f"/app/blockchain/artifacts/contracts/{contract_name}.sol/{contract_name}.json"
    try:
        with open(abi_path, 'r') as f:
            contract_json = json.load(f)
            return contract_json['abi']
    except Exception as e:
        logger.error(f"Failed to load ABI for {contract_name}: {e}")
        return None

# Initialize contracts
aethToken_abi = load_contract_abi('AETHToken')
premiumVPN_abi = load_contract_abi('PremiumVPN')

if AETH_TOKEN_ADDRESS and aethToken_abi:
    aethToken_contract = w3.eth.contract(address=AETH_TOKEN_ADDRESS, abi=aethToken_abi)
else:
    aethToken_contract = None
    logger.warning("AETH Token contract not initialized")

if PREMIUM_VPN_ADDRESS and premiumVPN_abi:
    premiumVPN_contract = w3.eth.contract(address=PREMIUM_VPN_ADDRESS, abi=premiumVPN_abi)
else:
    premiumVPN_contract = None
    logger.warning("PremiumVPN contract not initialized")

# Initialize WireGuard Manager
# TODO: Replace with actual server public endpoint
SERVER_PUBLIC_ENDPOINT = os.environ.get('VPN_SERVER_ENDPOINT', '127.0.0.1')
wg_manager = WireGuardManager()

# Request/Response Models
class VPNConfigRequest(BaseModel):
    wallet_address: str

class VPNConfigResponse(BaseModel):
    config: str
    peer_id: str
    ip_address: str
    server_endpoint: str

class VPNConnectRequest(BaseModel):
    wallet_address: str
    transaction_hash: Optional[str] = None  # Optional: for tracking burn tx

class VPNConnectResponse(BaseModel):
    success: bool
    message: str
    session_id: str
    is_premium: bool
    burned_amount: float = 0.0

class VPNDisconnectRequest(BaseModel):
    wallet_address: str
    session_id: str

class VPNStatsResponse(BaseModel):
    wallet_address: str
    total_connections: int
    total_burned: float
    is_premium: bool
    premium_expiry: Optional[int] = None
    mb_sent: float
    mb_received: float
    total_mb: float

class PremiumSubscribeRequest(BaseModel):
    wallet_address: str
    duration: str  # "monthly" or "yearly"
    transaction_hash: str  # Hash of the subscription transaction

# ============= ENDPOINTS =============

@router.post("/generate-config", response_model=VPNConfigResponse)
async def generate_vpn_config(request: VPNConfigRequest):
    """
    Generate WireGuard configuration for a user
    This should be called AFTER burning tokens
    """
    try:
        wallet_address = request.wallet_address.lower()
        
        # Check if peer already exists
        peer_info_path = f"/app/backend/vpn/peers/{wallet_address}.json"
        
        if os.path.exists(peer_info_path):
            # Peer exists, regenerate config
            logger.info(f"Peer {wallet_address} already exists, regenerating config")
            peer_info = json.loads(open(peer_info_path).read())
        else:
            # Add new peer
            logger.info(f"Creating new peer for {wallet_address}")
            peer_info = wg_manager.add_peer(wallet_address)
        
        # Generate client config
        config = wg_manager.generate_client_config(wallet_address, SERVER_PUBLIC_ENDPOINT)
        
        return VPNConfigResponse(
            config=config,
            peer_id=wallet_address,
            ip_address=peer_info['allowed_ips'].split('/')[0],
            server_endpoint=f"{SERVER_PUBLIC_ENDPOINT}:{wg_manager.server_port}"
        )
        
    except Exception as e:
        logger.error(f"Failed to generate VPN config: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate config: {str(e)}")

@router.post("/connect", response_model=VPNConnectResponse)
async def connect_vpn(request: VPNConnectRequest):
    """
    Connect to VPN - handles burn mechanism via smart contract
    
    Flow:
    1. Check if user is premium
    2. If premium, select best nodes (reputation > 90) from blockchain
    3. If not premium, select standard nodes (reputation > 50) from blockchain
    4. Generate session and track node assignment
    5. Return success
    """
    try:
        wallet_address = request.wallet_address.lower()
        
        # Check WireGuard server status
        server_status = wg_manager.get_server_status()
        if not server_status.get('running'):
            raise HTTPException(status_code=503, detail="VPN server is not running")
        
        # Check premium status from smart contract
        is_premium = False
        if premiumVPN_contract:
            try:
                is_premium = premiumVPN_contract.functions.isPremium(
                    Web3.to_checksum_address(wallet_address)
                ).call()
            except Exception as e:
                logger.error(f"Failed to check premium status: {e}")
        
        # Select node based on premium status from REAL blockchain data
        selected_node = None
        
        try:
            if is_premium:
                # Premium users get best nodes (reputation > 90)
                premium_nodes = blockchain_client.get_active_nodes_by_reputation(min_reputation=90)
                
                if premium_nodes:
                    # Select first available premium node
                    best_node = premium_nodes[0]
                    selected_node = {
                        "node_id": best_node['nodeId'],
                        "reputation": best_node['reputation'],
                        "bandwidth_mbps": best_node['bandwidthMbps'],
                        "location": best_node['location'],
                        "tier": "premium",
                        "owner": best_node['owner']
                    }
                    logger.info(f"Premium user {wallet_address} assigned to premium node {selected_node['node_id']} (reputation: {selected_node['reputation']})")
                else:
                    logger.warning("No premium nodes available, falling back to standard nodes")
                    is_premium = False  # Fallback to standard selection
            
            if not is_premium or selected_node is None:
                # Standard users get regular nodes (reputation > 50)
                standard_nodes = blockchain_client.get_active_nodes_by_reputation(min_reputation=50)
                
                if standard_nodes:
                    # Select first available standard node
                    std_node = standard_nodes[0]
                    selected_node = {
                        "node_id": std_node['nodeId'],
                        "reputation": std_node['reputation'],
                        "bandwidth_mbps": std_node['bandwidthMbps'],
                        "location": std_node['location'],
                        "tier": "standard",
                        "owner": std_node['owner']
                    }
                    logger.info(f"Standard user {wallet_address} assigned to standard node {selected_node['node_id']} (reputation: {selected_node['reputation']})")
                else:
                    # No nodes available - use fallback
                    selected_node = {
                        "node_id": "fallback",
                        "reputation": 60,
                        "bandwidth_mbps": 100,
                        "location": "default",
                        "tier": "fallback",
                        "owner": "system"
                    }
                    logger.warning("No blockchain nodes available, using fallback node")
        
        except Exception as e:
            logger.error(f"Error selecting node from blockchain: {e}")
            # Fallback node selection
            selected_node = {
                "node_id": "fallback",
                "reputation": 60,
                "bandwidth_mbps": 100,
                "location": "default",
                "tier": "fallback",
                "owner": "system"
            }
        
        # For non-premium users, burn should be handled by frontend
        # calling PremiumVPN.burnOnConnect() before this endpoint
        # Here we just verify and create session
        
        burned_amount = 0.0
        if not is_premium:
            # Non-premium user - should have burned tokens
            # Get burn amount from contract
            if premiumVPN_contract:
                try:
                    burn_amount_wei = premiumVPN_contract.functions.burnAmountPerConnection().call()
                    burned_amount = float(w3.from_wei(burn_amount_wei, 'ether'))
                except Exception as e:
                    logger.error(f"Failed to get burn amount: {e}")
                    burned_amount = 10.0  # Default
        
        # Generate session ID
        import uuid
        session_id = str(uuid.uuid4())
        
        # Store session info (in production, use database)
        session_info = {
            "session_id": session_id,
            "wallet_address": wallet_address,
            "is_premium": is_premium,
            "connected_at": datetime.utcnow().isoformat(),
            "burned_amount": burned_amount,
            "assigned_node": selected_node,  # Track which node user is connected to
            "connection_tier": "premium" if is_premium else "standard"
        }
        
        # Save session
        sessions_dir = "/app/backend/vpn/sessions"
        os.makedirs(sessions_dir, exist_ok=True)
        session_path = f"{sessions_dir}/{session_id}.json"
        with open(session_path, 'w') as f:
            json.dump(session_info, f, indent=2)
        
        message = "Connected to VPN successfully!"
        if is_premium:
            message += f" (Premium - connected to node with reputation {selected_node['reputation']})"
        else:
            message += f" (Standard - burned {burned_amount} AETH)"
        
        return VPNConnectResponse(
            success=True,
            message=message,
            session_id=session_id,
            is_premium=is_premium,
            burned_amount=burned_amount
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to connect VPN: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to connect: {str(e)}")

@router.post("/disconnect")
async def disconnect_vpn(request: VPNDisconnectRequest):
    """
    Disconnect from VPN and calculate rewards for nodes
    Automatically records data shared on blockchain for node rewards
    """
    try:
        wallet_address = request.wallet_address.lower()
        session_id = request.session_id
        
        # Load session info
        session_path = f"/app/backend/vpn/sessions/{session_id}.json"
        if not os.path.exists(session_path):
            raise HTTPException(status_code=404, detail="Session not found")
        
        with open(session_path, 'r') as f:
            session_info = json.load(f)
        
        # Get traffic stats
        stats = wg_manager.get_peer_stats(wallet_address)
        
        if stats:
            total_mb = stats['total_mb']
            
            # Calculate rewards for node (0.001 AETH per MB = 1 AETH per GB as per contract)
            rewards_aeth = total_mb * 0.001
            
            # Get assigned node from session
            assigned_node = session_info.get('assigned_node', {})
            node_id = assigned_node.get('node_id')
            
            # Update session with stats
            session_info['disconnected_at'] = datetime.utcnow().isoformat()
            session_info['mb_sent'] = stats['mb_sent']
            session_info['mb_received'] = stats['mb_received']
            session_info['total_mb'] = total_mb
            session_info['node_rewards'] = rewards_aeth
            session_info['rewards_recorded_on_chain'] = False
            
            # Record data shared on blockchain (MinerNode.recordDataShared)
            if node_id and node_id != "fallback" and total_mb > 0:
                try:
                    if backend_wallet is None:
                        logger.error("Backend wallet not initialized")
                        session_info['note'] = f"Node {node_id} earned {rewards_aeth:.4f} AETH but rewards NOT recorded (backend wallet error)"
                    else:
                        logger.info(f"Recording {total_mb:.2f} MB on blockchain for node {node_id}")
                        
                        # Call recordDataShared on MinerNode contract
                        tx_hash = blockchain_client.record_data_shared(
                            backend_wallet=backend_wallet,
                            node_id_hex=node_id,
                            data_mb=int(total_mb)  # Convert to int for contract
                        )
                        
                        session_info['rewards_recorded_on_chain'] = True
                        session_info['blockchain_tx_hash'] = tx_hash
                        session_info['note'] = f"✅ Node {node_id} earned {rewards_aeth:.4f} AETH - recorded on blockchain"
                        
                        logger.info(f"✅ Rewards recorded on blockchain: tx {tx_hash}")
                
                except Exception as e:
                    logger.error(f"Failed to record rewards on blockchain: {e}")
                    session_info['rewards_recorded_on_chain'] = False
                    session_info['blockchain_error'] = str(e)
                    session_info['note'] = f"⚠️ Node {node_id} earned {rewards_aeth:.4f} AETH but blockchain recording failed: {str(e)}"
            else:
                logger.info(f"Skipping blockchain recording: node_id={node_id}, total_mb={total_mb}")
                if node_id == "fallback":
                    session_info['note'] = "Fallback node - no blockchain recording"
                elif total_mb == 0:
                    session_info['note'] = "No data transferred - no rewards"
            
            # Save updated session
            with open(session_path, 'w') as f:
                json.dump(session_info, f, indent=2)
            
            return {
                "success": True,
                "message": "Disconnected successfully",
                "stats": {
                    "mb_sent": stats['mb_sent'],
                    "mb_received": stats['mb_received'],
                    "total_mb": total_mb,
                    "node_rewards": rewards_aeth,
                    "node_id": node_id,
                    "rewards_recorded": session_info.get('rewards_recorded_on_chain', False),
                    "blockchain_tx": session_info.get('blockchain_tx_hash', None)
                }
            }
        else:
            return {
                "success": True,
                "message": "Disconnected (no stats available)",
                "stats": None
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to disconnect VPN: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to disconnect: {str(e)}")

@router.get("/stats/{wallet_address}", response_model=VPNStatsResponse)
async def get_vpn_stats(wallet_address: str):
    """
    Get VPN usage statistics for a user
    """
    try:
        wallet_address = wallet_address.lower()
        
        # Get stats from smart contract
        total_connections = 0
        total_burned = 0.0
        is_premium = False
        premium_expiry = None
        
        if premiumVPN_contract:
            try:
                # Get user stats
                checksum_address = Web3.to_checksum_address(wallet_address)
                user_stats = premiumVPN_contract.functions.getUserStats(checksum_address).call()
                total_connections = user_stats[0]
                total_burned_wei = user_stats[1]
                total_burned = float(w3.from_wei(total_burned_wei, 'ether'))
                
                # Get premium info
                premium_info = premiumVPN_contract.functions.getPremiumInfo(checksum_address).call()
                is_premium = premium_info[0]
                premium_expiry = premium_info[1] if is_premium else None
                
            except Exception as e:
                logger.error(f"Failed to get contract stats: {e}")
        
        # Get WireGuard stats
        wg_stats = wg_manager.get_peer_stats(wallet_address)
        
        mb_sent = 0.0
        mb_received = 0.0
        total_mb = 0.0
        
        if wg_stats:
            mb_sent = wg_stats['mb_sent']
            mb_received = wg_stats['mb_received']
            total_mb = wg_stats['total_mb']
        
        return VPNStatsResponse(
            wallet_address=wallet_address,
            total_connections=total_connections,
            total_burned=total_burned,
            is_premium=is_premium,
            premium_expiry=premium_expiry,
            mb_sent=mb_sent,
            mb_received=mb_received,
            total_mb=total_mb
        )
        
    except Exception as e:
        logger.error(f"Failed to get VPN stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@router.get("/server-status")
async def get_server_status():
    """Get WireGuard server status"""
    try:
        status = wg_manager.get_server_status()
        return status
    except Exception as e:
        logger.error(f"Failed to get server status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get status: {str(e)}")

@router.get("/rewards/pending")
async def get_pending_rewards():
    """
    Get total pending rewards across all sessions (not yet recorded on blockchain)
    Used for monitoring and batch processing
    """
    try:
        sessions_dir = "/app/backend/vpn/sessions"
        if not os.path.exists(sessions_dir):
            return {
                "total_pending_rewards": 0.0,
                "sessions_count": 0,
                "total_traffic_mb": 0.0
            }
        
        total_rewards = 0.0
        total_traffic = 0.0
        sessions_count = 0
        rewards_by_node = {}
        
        for session_file in Path(sessions_dir).glob("*.json"):
            try:
                with open(session_file, 'r') as f:
                    session = json.load(f)
                
                # Only count sessions that haven't been recorded on chain
                if not session.get('rewards_recorded_on_chain', False) and session.get('node_rewards'):
                    node_id = session.get('assigned_node', {}).get('node_id')
                    rewards = session.get('node_rewards', 0.0)
                    traffic_mb = session.get('total_mb', 0.0)
                    
                    total_rewards += rewards
                    total_traffic += traffic_mb
                    sessions_count += 1
                    
                    if node_id:
                        if node_id not in rewards_by_node:
                            rewards_by_node[node_id] = {'rewards': 0.0, 'traffic_mb': 0.0, 'sessions': 0}
                        rewards_by_node[node_id]['rewards'] += rewards
                        rewards_by_node[node_id]['traffic_mb'] += traffic_mb
                        rewards_by_node[node_id]['sessions'] += 1
                        
            except Exception as e:
                logger.warning(f"Failed to process session {session_file}: {e}")
        
        return {
            "total_pending_rewards": round(total_rewards, 4),
            "sessions_count": sessions_count,
            "total_traffic_mb": round(total_traffic, 2),
            "rewards_by_node": rewards_by_node,
            "note": "These rewards are pending blockchain recording via MinerNode.recordDataShared()"
        }
        
    except Exception as e:
        logger.error(f"Failed to get pending rewards: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get pending rewards: {str(e)}")

@router.get("/premium/prices")
async def get_premium_prices():
    """Get premium subscription prices"""
    try:
        if not premiumVPN_contract:
            return {
                "monthly": 1000.0,
                "yearly": 10000.0,
                "burn_per_connection": 10.0
            }
        
        monthly_wei = premiumVPN_contract.functions.premiumMonthlyPrice().call()
        yearly_wei = premiumVPN_contract.functions.premiumYearlyPrice().call()
        burn_wei = premiumVPN_contract.functions.burnAmountPerConnection().call()
        
        return {
            "monthly": float(w3.from_wei(monthly_wei, 'ether')),
            "yearly": float(w3.from_wei(yearly_wei, 'ether')),
            "burn_per_connection": float(w3.from_wei(burn_wei, 'ether'))
        }
        
    except Exception as e:
        logger.error(f"Failed to get premium prices: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get prices: {str(e)}")

@router.get("/locations")
async def get_locations():
    """
    Get available VPN server locations with node quality information
    Premium users get access to priority nodes with higher reputation
    """
    try:
        # Get all active nodes from MinerNode contract
        nodes_by_location = {}
        total_peers = wg_manager.get_server_status().get('total_peers', 0)
        
        # For MVP, we simulate node data from blockchain
        # In production, this would query MinerNode contract for all active nodes
        locations = [
            {
                "code": "us-east",
                "name": "United States (East)",
                "flag": "🇺🇸",
                "total_nodes": max(5, total_peers),
                "premium_nodes": max(2, total_peers // 2),  # Top 40% are premium quality
                "avg_speed": 950,  # Mbps
                "avg_reputation": 85,
                "endpoint": SERVER_PUBLIC_ENDPOINT
            },
            {
                "code": "eu-west",
                "name": "Europe (West)",
                "flag": "🇪🇺",
                "total_nodes": max(4, total_peers),
                "premium_nodes": max(2, total_peers // 2),
                "avg_speed": 920,
                "avg_reputation": 82,
                "endpoint": SERVER_PUBLIC_ENDPOINT
            },
            {
                "code": "asia-pacific",
                "name": "Asia Pacific",
                "flag": "🌏",
                "total_nodes": max(3, total_peers),
                "premium_nodes": max(1, total_peers // 3),
                "avg_speed": 880,
                "avg_reputation": 78,
                "endpoint": SERVER_PUBLIC_ENDPOINT
            }
        ]
        
        return {"locations": locations}
        
    except Exception as e:
        logger.error(f"Failed to get locations: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get locations: {str(e)}")

@router.get("/nodes/best")
async def get_best_nodes(location: str = "us-east", limit: int = 3):
    """
    Get best performing nodes for a location (for Premium users)
    Sorted by reputation, bandwidth, and uptime
    """
    try:
        # For MVP, return simulated premium nodes
        # In production, query MinerNode contract and sort by reputation
        
        premium_nodes = [
            {
                "node_id": 1,
                "location": location,
                "reputation": 98,
                "bandwidth_mbps": 1000,
                "uptime_percent": 99.9,
                "total_data_shared_gb": 5420,
                "is_premium_tier": True,
                "earnings": 128.5
            },
            {
                "node_id": 2,
                "location": location,
                "reputation": 96,
                "bandwidth_mbps": 950,
                "uptime_percent": 99.5,
                "total_data_shared_gb": 4280,
                "is_premium_tier": True,
                "earnings": 102.3
            },
            {
                "node_id": 3,
                "location": location,
                "reputation": 94,
                "bandwidth_mbps": 900,
                "uptime_percent": 98.8,
                "total_data_shared_gb": 3650,
                "is_premium_tier": True,
                "earnings": 89.7
            }
        ]
        
        return {
            "location": location,
            "nodes": premium_nodes[:limit],
            "total_premium_nodes": len(premium_nodes)
        }
        
    except Exception as e:
        logger.error(f"Failed to get best nodes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get best nodes: {str(e)}")

# ============= INITIALIZATION =============

@router.on_event("startup")
async def startup_vpn():
    """Initialize VPN server on startup"""
    try:
        logger.info("Initializing WireGuard VPN server...")
        
        # Setup server
        server_info = wg_manager.setup_server(SERVER_PUBLIC_ENDPOINT)
        logger.info(f"WireGuard server configured: {server_info}")
        
        # Start server
        wg_manager.start_server()
        logger.info("WireGuard server started successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize VPN server: {e}")
        # Don't fail the entire app if VPN fails to start
        logger.warning("VPN server initialization failed, but API will continue")
