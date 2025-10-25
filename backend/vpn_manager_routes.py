"""
VPN Manager API Endpoints
Согласно строкам 340-356 файла "цель"

Features:
- WireGuard config generation
- Node selection algorithm
- Connection tracking
- Traffic monitoring
- Kill switch logic
- Split tunneling support
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import random
import os

from rate_limiter import rate_limit, cache_response
from redis_client import get_redis_client

router = APIRouter(prefix="/api/vpn", tags=["VPN"])
redis_client = get_redis_client()


# ============= MODELS =============

class VPNConnectRequest(BaseModel):
    """Request to connect to VPN"""
    location: str = Field(..., description="Preferred location (US-East, EU-West, etc)")
    protocol: str = Field(default="wireguard", description="VPN protocol")
    kill_switch: bool = Field(default=True, description="Enable kill switch")
    split_tunneling: bool = Field(default=False, description="Enable split tunneling")
    split_apps: Optional[List[str]] = Field(default=None, description="Apps for split tunneling")


class VPNConnectResponse(BaseModel):
    """Response with VPN connection details"""
    session_id: str
    node_id: str
    node_location: str
    node_ip: str
    config: dict
    estimated_speed: int  # Mbps
    server_load: int  # percentage


class VPNStatus(BaseModel):
    """Current VPN connection status"""
    is_connected: bool
    session_id: Optional[str] = None
    node_location: Optional[str] = None
    connected_since: Optional[datetime] = None
    data_used_mb: float = 0.0
    current_speed: int = 0  # Mbps
    estimated_time_remaining: Optional[int] = None  # minutes


class BurnTokensRequest(BaseModel):
    """Request to burn tokens for VPN access"""
    duration_minutes: int = Field(..., ge=1, le=10080, description="Duration in minutes (max 1 week)")


class WireGuardConfig(BaseModel):
    """WireGuard configuration"""
    interface: dict
    peer: dict


# ============= NODE SELECTION ALGORITHM =============

def select_best_node(location: str, available_nodes: list) -> dict:
    """
    Advanced node selection algorithm
    Considers: location, load, reputation, speed, uptime
    """
    if not available_nodes:
        return None
    
    # Filter by location
    location_nodes = [n for n in available_nodes if n.get('location') == location]
    
    # Fallback to any available node if no location match
    if not location_nodes:
        location_nodes = available_nodes
    
    # Score each node
    scored_nodes = []
    for node in location_nodes:
        score = 0
        
        # Reputation (0-100) - 40% weight
        reputation = node.get('reputation', 50)
        score += reputation * 0.4
        
        # Load (0-100, lower is better) - 30% weight
        load = node.get('load', 50)
        score += (100 - load) * 0.3
        
        # Bandwidth (Mbps) - 20% weight
        bandwidth = node.get('bandwidth_mbps', 100)
        score += min(bandwidth / 10, 100) * 0.2
        
        # Uptime percentage - 10% weight
        uptime = node.get('uptime_percentage', 95)
        score += uptime * 0.1
        
        scored_nodes.append((node, score))
    
    # Sort by score (highest first)
    scored_nodes.sort(key=lambda x: x[1], reverse=True)
    
    # Return best node
    return scored_nodes[0][0]


def generate_wireguard_config(node_ip: str, client_private_key: str = None, 
                               kill_switch: bool = True, split_tunneling: bool = False,
                               split_apps: list = None) -> dict:
    """
    Generate WireGuard configuration
    """
    import secrets
    import base64
    
    # Generate keys if not provided (for demo)
    if not client_private_key:
        client_private_key = base64.b64encode(secrets.token_bytes(32)).decode()
    
    server_public_key = base64.b64encode(secrets.token_bytes(32)).decode()
    
    config = {
        "interface": {
            "private_key": client_private_key,
            "address": f"10.8.0.{random.randint(2, 254)}/24",
            "dns": "1.1.1.1, 1.0.0.1",
            "mtu": 1420
        },
        "peer": {
            "public_key": server_public_key,
            "endpoint": f"{node_ip}:51820",
            "allowed_ips": "0.0.0.0/0, ::/0" if not split_tunneling else "10.0.0.0/8",
            "persistent_keepalive": 25
        },
        "features": {
            "kill_switch": kill_switch,
            "split_tunneling": split_tunneling,
            "split_apps": split_apps or []
        }
    }
    
    return config


# ============= ENDPOINTS =============

@router.post("/connect", response_model=VPNConnectResponse)
@rate_limit(requests=20, window=60)  # 20 connections per minute
async def connect_vpn(request: VPNConnectRequest):
    """
    Connect to VPN
    
    - Selects best available node
    - Generates WireGuard configuration
    - Creates VPN session
    - Returns connection details
    """
    # Check cached available nodes
    cached_nodes = redis_client.get_available_nodes(request.location)
    
    if not cached_nodes:
        # Fetch from database/blockchain (mock for now)
        available_nodes = [
            {
                "id": "node-1",
                "location": request.location,
                "ip": f"45.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",
                "bandwidth_mbps": random.randint(500, 2000),
                "load": random.randint(10, 60),
                "reputation": random.randint(80, 100),
                "uptime_percentage": random.randint(95, 100)
            }
            for i in range(5)
        ]
        
        # Cache for 30 seconds
        redis_client.cache_available_nodes(request.location, available_nodes, expire=30)
        cached_nodes = available_nodes
    
    # Select best node
    best_node = select_best_node(request.location, cached_nodes)
    
    if not best_node:
        raise HTTPException(status_code=404, detail="No available nodes in requested location")
    
    # Generate WireGuard config
    config = generate_wireguard_config(
        node_ip=best_node['ip'],
        kill_switch=request.kill_switch,
        split_tunneling=request.split_tunneling,
        split_apps=request.split_apps
    )
    
    # Create session
    session_id = str(uuid.uuid4())
    
    # Cache session info
    session_data = {
        "session_id": session_id,
        "node_id": best_node['id'],
        "location": request.location,
        "connected_at": datetime.now(timezone.utc).isoformat(),
        "data_used_mb": 0.0
    }
    redis_client.cache_user_session(session_id, session_data, expire=3600)
    
    return VPNConnectResponse(
        session_id=session_id,
        node_id=best_node['id'],
        node_location=request.location,
        node_ip=best_node['ip'],
        config=config,
        estimated_speed=best_node['bandwidth_mbps'],
        server_load=best_node['load']
    )


@router.post("/disconnect")
@rate_limit(requests=30, window=60)
async def disconnect_vpn(session_id: str):
    """
    Disconnect from VPN
    
    - Ends VPN session
    - Records data usage
    - Clears session cache
    """
    # Get session data
    session_data = redis_client.get_user_session(session_id)
    
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Calculate session duration
    connected_at = datetime.fromisoformat(session_data['connected_at'])
    duration_minutes = (datetime.now(timezone.utc) - connected_at).total_seconds() / 60
    
    # Clear session cache
    redis_client.clear_user_session(session_id)
    
    return {
        "message": "Disconnected successfully",
        "session_id": session_id,
        "duration_minutes": round(duration_minutes, 2),
        "data_used_mb": session_data.get('data_used_mb', 0.0)
    }


@router.get("/status", response_model=VPNStatus)
@rate_limit(requests=60, window=60)
async def get_vpn_status(session_id: Optional[str] = None):
    """
    Get current VPN connection status
    
    - Connection status
    - Data usage
    - Current speed
    - Remaining time
    """
    if not session_id:
        return VPNStatus(is_connected=False)
    
    # Get session data
    session_data = redis_client.get_user_session(session_id)
    
    if not session_data:
        return VPNStatus(is_connected=False)
    
    connected_at = datetime.fromisoformat(session_data['connected_at'])
    
    return VPNStatus(
        is_connected=True,
        session_id=session_id,
        node_location=session_data['location'],
        connected_since=connected_at,
        data_used_mb=session_data.get('data_used_mb', 0.0),
        current_speed=random.randint(50, 200),  # Mock speed
        estimated_time_remaining=120  # Mock remaining time
    )


@router.post("/burn-tokens")
@rate_limit(requests=10, window=60)
async def burn_tokens_for_access(request: BurnTokensRequest, wallet_address: str):
    """
    Burn AETH tokens for VPN access
    
    - Calculates burn amount (0.001 AETH/minute)
    - Calls smart contract burn function
    - Records burn transaction
    """
    burn_amount = request.duration_minutes * 0.001
    
    # TODO: Call smart contract burnForAccess()
    # For now, return mock response
    
    return {
        "message": "Tokens burned successfully",
        "wallet_address": wallet_address,
        "duration_minutes": request.duration_minutes,
        "burn_amount_aeth": burn_amount,
        "transaction_hash": f"0x{uuid.uuid4().hex}",
        "expires_at": (datetime.now(timezone.utc).timestamp() + request.duration_minutes * 60)
    }


@router.get("/config")
@cache_response(expire=300, key_prefix="vpn_config")
async def get_vpn_config(location: str = "US-East"):
    """
    Get VPN configuration file
    
    - Returns WireGuard config
    - Cached for 5 minutes
    """
    # Mock node IP
    node_ip = f"45.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"
    
    config = generate_wireguard_config(node_ip)
    
    # Convert to WireGuard .conf format
    conf_text = f"""[Interface]
PrivateKey = {config['interface']['private_key']}
Address = {config['interface']['address']}
DNS = {config['interface']['dns']}
MTU = {config['interface']['mtu']}

[Peer]
PublicKey = {config['peer']['public_key']}
Endpoint = {config['peer']['endpoint']}
AllowedIPs = {config['peer']['allowed_ips']}
PersistentKeepalive = {config['peer']['persistent_keepalive']}
"""
    
    return {
        "location": location,
        "config_text": conf_text,
        "config_json": config
    }


@router.get("/available-locations")
@cache_response(expire=60, key_prefix="vpn_locations")
async def get_available_locations():
    """
    Get list of available VPN locations
    
    - Returns locations with node count
    - Cached for 1 minute
    """
    locations = [
        {"location": "US-East", "city": "New York", "country": "USA", "nodes": 45, "flag": "🇺🇸"},
        {"location": "US-West", "city": "Los Angeles", "country": "USA", "nodes": 38, "flag": "🇺🇸"},
        {"location": "EU-West", "city": "London", "country": "UK", "nodes": 52, "flag": "🇬🇧"},
        {"location": "EU-Central", "city": "Frankfurt", "country": "Germany", "nodes": 47, "flag": "🇩🇪"},
        {"location": "Asia-Pacific", "city": "Singapore", "country": "Singapore", "nodes": 41, "flag": "🇸🇬"},
        {"location": "Asia-East", "city": "Tokyo", "country": "Japan", "nodes": 35, "flag": "🇯🇵"},
    ]
    
    return {
        "locations": locations,
        "total_locations": len(locations),
        "total_nodes": sum(loc['nodes'] for loc in locations)
    }


@router.get("/traffic/{session_id}")
async def get_traffic_stats(session_id: str):
    """
    Get real-time traffic statistics
    
    - Upload/download speeds
    - Total data used
    - Connection quality
    """
    session_data = redis_client.get_user_session(session_id)
    
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Mock traffic stats
    return {
        "session_id": session_id,
        "upload_speed_mbps": random.randint(10, 50),
        "download_speed_mbps": random.randint(50, 200),
        "data_uploaded_mb": random.uniform(10, 100),
        "data_downloaded_mb": random.uniform(100, 500),
        "total_data_mb": session_data.get('data_used_mb', 0.0),
        "latency_ms": random.randint(10, 50),
        "packet_loss": random.uniform(0, 2),
        "connection_quality": "excellent"  # excellent, good, fair, poor
    }


@router.post("/kill-switch")
async def configure_kill_switch(session_id: str, enabled: bool):
    """
    Configure VPN kill switch
    
    - Prevents internet access if VPN drops
    - Can be toggled during session
    """
    session_data = redis_client.get_user_session(session_id)
    
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Update session data
    session_data['kill_switch'] = enabled
    redis_client.cache_user_session(session_id, session_data, expire=3600)
    
    return {
        "message": f"Kill switch {'enabled' if enabled else 'disabled'}",
        "session_id": session_id,
        "kill_switch": enabled
    }


@router.post("/split-tunneling")
async def configure_split_tunneling(session_id: str, enabled: bool, apps: List[str] = None):
    """
    Configure split tunneling
    
    - Route specific apps through VPN
    - Others use regular connection
    """
    session_data = redis_client.get_user_session(session_id)
    
    if not session_data:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Update session data
    session_data['split_tunneling'] = enabled
    session_data['split_apps'] = apps or []
    redis_client.cache_user_session(session_id, session_data, expire=3600)
    
    return {
        "message": f"Split tunneling {'enabled' if enabled else 'disabled'}",
        "session_id": session_id,
        "split_tunneling": enabled,
        "apps": apps or []
    }
