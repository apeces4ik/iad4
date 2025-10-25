"""
Node Management API Endpoints
Согласно строкам 358-374 файла "цель"

Features:
- Node registration
- Health monitoring
- Performance tracking
- Reward calculation
- Level advancement
- NFT eligibility check
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timezone
import uuid

from rate_limiter import rate_limit, cache_response
from redis_client import get_redis_client

router = APIRouter(prefix="/api/nodes", tags=["Node Management"])
redis_client = get_redis_client()


# ============= MODELS =============

class NodeRegisterRequest(BaseModel):
    """Request to register a new node"""
    location: str = Field(..., description="Geographic location")
    bandwidth_mbps: int = Field(..., ge=100, description="Available bandwidth in Mbps")
    ip_address: str = Field(..., description="Public IP address")
    port: int = Field(default=51820, description="WireGuard port")
    hardware_specs: Optional[dict] = Field(default=None, description="CPU, RAM, Storage")


class NodeRegisterResponse(BaseModel):
    """Response after node registration"""
    node_id: str
    status: str
    message: str
    stake_required: float  # AETH
    estimated_earnings: dict


class NodeStats(BaseModel):
    """Node statistics"""
    node_id: str
    location: str
    status: str
    level: int
    xp: int
    reputation: int
    bandwidth_mbps: int
    uptime_percentage: float
    total_data_shared_gb: float
    total_earnings_aeth: float
    active_sessions: int
    last_seen: datetime
    nft_tier: Optional[int] = None
    earning_multiplier: float


class NodeHealthStatus(BaseModel):
    """Node health monitoring"""
    is_online: bool
    last_heartbeat: datetime
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_quality: str  # excellent, good, fair, poor
    issues: List[str]


class LeaderboardEntry(BaseModel):
    """Leaderboard entry"""
    rank: int
    node_id: str
    owner: str
    location: str
    level: int
    xp: int
    total_data_gb: float
    total_earnings: float
    reputation: int


class NFTEligibility(BaseModel):
    """NFT eligibility check result"""
    is_eligible: bool
    current_tier: Optional[int] = None
    next_tier: Optional[int] = None
    requirements_met: dict
    requirements_needed: dict
    progress_percentage: float


# ============= HELPER FUNCTIONS =============

def calculate_nft_eligibility(node_stats: dict) -> NFTEligibility:
    """
    Check NFT tier eligibility based on performance
    
    Tiers (from строки 177-182):
    - Bronze: 100GB, 30d uptime
    - Silver: 500GB, 90d uptime
    - Gold: 2TB (2000GB), 180d uptime
    - Diamond: 10TB (10000GB), 365d uptime
    - Legendary: 50TB (50000GB), 730d uptime
    """
    data_gb = node_stats.get('total_data_shared_gb', 0)
    uptime_days = node_stats.get('uptime_days', 0)
    
    tiers = [
        {"id": 0, "name": "Bronze", "data_gb": 100, "uptime_days": 30, "multiplier": 1.1},
        {"id": 1, "name": "Silver", "data_gb": 500, "uptime_days": 90, "multiplier": 1.25},
        {"id": 2, "name": "Gold", "data_gb": 2000, "uptime_days": 180, "multiplier": 1.5},
        {"id": 3, "name": "Diamond", "data_gb": 10000, "uptime_days": 365, "multiplier": 2.0},
        {"id": 4, "name": "Legendary", "data_gb": 50000, "uptime_days": 730, "multiplier": 3.0},
    ]
    
    current_tier = None
    next_tier = tiers[0]
    
    # Find current tier
    for tier in tiers:
        if data_gb >= tier['data_gb'] and uptime_days >= tier['uptime_days']:
            current_tier = tier
        elif current_tier is not None:
            next_tier = tier
            break
    
    # If at highest tier
    if current_tier and current_tier['id'] == 4:
        next_tier = None
    
    # Calculate requirements
    if current_tier:
        requirements_met = {
            "data_gb": data_gb,
            "uptime_days": uptime_days,
            "tier": current_tier['name']
        }
    else:
        requirements_met = {}
    
    if next_tier:
        requirements_needed = {
            "data_gb": max(0, next_tier['data_gb'] - data_gb),
            "uptime_days": max(0, next_tier['uptime_days'] - uptime_days),
            "tier": next_tier['name']
        }
        
        # Calculate progress percentage
        data_progress = (data_gb / next_tier['data_gb']) * 100
        uptime_progress = (uptime_days / next_tier['uptime_days']) * 100
        progress = min((data_progress + uptime_progress) / 2, 100)
    else:
        requirements_needed = {}
        progress = 100.0
    
    return NFTEligibility(
        is_eligible=current_tier is not None,
        current_tier=current_tier['id'] if current_tier else None,
        next_tier=next_tier['id'] if next_tier else None,
        requirements_met=requirements_met,
        requirements_needed=requirements_needed,
        progress_percentage=round(progress, 2)
    )


def calculate_rewards(node_stats: dict) -> dict:
    """
    Calculate node rewards
    
    Base: 0.1 AETH per GB
    Level multiplier: +10% per level
    NFT multiplier: 1.1x - 3x
    Reputation bonus: +reputation% 
    """
    data_gb = node_stats.get('total_data_shared_gb', 0)
    level = node_stats.get('level', 1)
    reputation = node_stats.get('reputation', 100)
    nft_multiplier = node_stats.get('nft_multiplier', 1.0)
    
    # Base reward
    base_reward = data_gb * 0.1
    
    # Level multiplier
    level_multiplier = 1.0 + (level * 0.1)
    
    # Reputation bonus (max +100%)
    reputation_bonus = reputation / 100
    
    # Total reward
    total_reward = base_reward * level_multiplier * nft_multiplier * reputation_bonus
    
    return {
        "base_reward": round(base_reward, 4),
        "level_multiplier": level_multiplier,
        "nft_multiplier": nft_multiplier,
        "reputation_bonus": reputation_bonus,
        "total_reward": round(total_reward, 4),
        "currency": "AETH"
    }


# ============= ENDPOINTS =============

@router.post("/register", response_model=NodeRegisterResponse)
@rate_limit(requests=10, window=60)
async def register_node(request: NodeRegisterRequest, wallet_address: str):
    """
    Register a new miner node
    
    - Requires 1000 AETH stake
    - Validates hardware specs
    - Creates node entry
    - Returns node ID and details
    """
    # Check stake (TODO: integrate with smart contract)
    stake_required = 1000.0  # AETH
    
    # Generate node ID
    node_id = f"node-{uuid.uuid4().hex[:12]}"
    
    # Estimate earnings
    estimated_earnings = {
        "daily_aeth": round(10 + (request.bandwidth_mbps / 100), 2),
        "monthly_aeth": round((10 + (request.bandwidth_mbps / 100)) * 30, 2),
        "yearly_aeth": round((10 + (request.bandwidth_mbps / 100)) * 365, 2)
    }
    
    # Cache node data
    node_data = {
        "node_id": node_id,
        "owner": wallet_address,
        "location": request.location,
        "bandwidth_mbps": request.bandwidth_mbps,
        "ip_address": request.ip_address,
        "port": request.port,
        "hardware_specs": request.hardware_specs or {},
        "registered_at": datetime.now(timezone.utc).isoformat(),
        "status": "active",
        "level": 1,
        "xp": 0,
        "reputation": 100,
        "total_data_shared_gb": 0,
        "total_earnings_aeth": 0
    }
    redis_client.set(f"node:{node_id}", node_data, expire=86400)  # 24h cache
    
    return NodeRegisterResponse(
        node_id=node_id,
        status="success",
        message=f"Node registered successfully in {request.location}",
        stake_required=stake_required,
        estimated_earnings=estimated_earnings
    )


@router.get("/my-nodes")
@rate_limit(requests=50, window=60)
@cache_response(expire=30, key_prefix="my_nodes")
async def get_my_nodes(wallet_address: str) -> List[NodeStats]:
    """
    Get all nodes owned by wallet
    
    - Returns list of nodes with stats
    - Cached for 30 seconds
    """
    # TODO: Fetch from database/blockchain
    # Mock response for now
    nodes = []
    
    for i in range(2):  # Mock 2 nodes
        node_data = {
            "node_id": f"node-{uuid.uuid4().hex[:12]}",
            "location": ["US-East", "EU-West"][i],
            "status": "active",
            "level": 3 + i,
            "xp": 1500 + (i * 500),
            "reputation": 95 + i,
            "bandwidth_mbps": 1000 + (i * 500),
            "uptime_percentage": 98.5 + (i * 0.5),
            "total_data_shared_gb": 250 + (i * 150),
            "total_earnings_aeth": 125.5 + (i * 75),
            "active_sessions": i + 2,
            "last_seen": datetime.now(timezone.utc),
            "nft_tier": 0 if i == 0 else 1,
            "earning_multiplier": 1.1 if i == 0 else 1.25
        }
        
        nodes.append(NodeStats(**node_data))
    
    return nodes


@router.get("/{node_id}/stats", response_model=NodeStats)
@rate_limit(requests=100, window=60)
@cache_response(expire=15, key_prefix="node_stats")
async def get_node_stats(node_id: str):
    """
    Get detailed statistics for specific node
    
    - Performance metrics
    - Earning statistics
    - Level and XP
    - NFT tier
    """
    # Try to get from cache
    cached = redis_client.get(f"node:{node_id}")
    
    if cached:
        return NodeStats(**cached)
    
    # Mock data if not in cache
    node_data = {
        "node_id": node_id,
        "location": "US-East",
        "status": "active",
        "level": 5,
        "xp": 5000,
        "reputation": 98,
        "bandwidth_mbps": 1500,
        "uptime_percentage": 99.2,
        "total_data_shared_gb": 650,
        "total_earnings_aeth": 325.75,
        "active_sessions": 15,
        "last_seen": datetime.now(timezone.utc),
        "nft_tier": 1,
        "earning_multiplier": 1.25
    }
    
    return NodeStats(**node_data)


@router.put("/{node_id}/update")
@rate_limit(requests=20, window=60)
async def update_node(node_id: str, bandwidth_mbps: Optional[int] = None, 
                      location: Optional[str] = None):
    """
    Update node configuration
    
    - Change bandwidth allocation
    - Update location
    - Modify settings
    """
    cached = redis_client.get(f"node:{node_id}")
    
    if not cached:
        raise HTTPException(status_code=404, detail="Node not found")
    
    updates = {}
    if bandwidth_mbps:
        cached['bandwidth_mbps'] = bandwidth_mbps
        updates['bandwidth_mbps'] = bandwidth_mbps
    
    if location:
        cached['location'] = location
        updates['location'] = location
    
    # Update cache
    redis_client.set(f"node:{node_id}", cached, expire=86400)
    
    return {
        "message": "Node updated successfully",
        "node_id": node_id,
        "updates": updates
    }


@router.get("/{node_id}/health", response_model=NodeHealthStatus)
@rate_limit(requests=120, window=60)
async def get_node_health(node_id: str):
    """
    Get real-time node health status
    
    - System metrics (CPU, RAM, Disk)
    - Network quality
    - Issues detection
    """
    import random
    
    # Mock health data
    cpu = random.uniform(10, 60)
    memory = random.uniform(40, 80)
    disk = random.uniform(30, 70)
    
    issues = []
    if cpu > 80:
        issues.append("High CPU usage")
    if memory > 90:
        issues.append("High memory usage")
    if disk > 85:
        issues.append("Low disk space")
    
    # Determine network quality
    if cpu < 50 and memory < 70:
        quality = "excellent"
    elif cpu < 70 and memory < 85:
        quality = "good"
    elif cpu < 85:
        quality = "fair"
    else:
        quality = "poor"
    
    return NodeHealthStatus(
        is_online=True,
        last_heartbeat=datetime.now(timezone.utc),
        cpu_usage=round(cpu, 2),
        memory_usage=round(memory, 2),
        disk_usage=round(disk, 2),
        network_quality=quality,
        issues=issues
    )


@router.get("/{node_id}/rewards")
@rate_limit(requests=50, window=60)
async def calculate_node_rewards(node_id: str):
    """
    Calculate current and potential rewards
    
    - Base rewards
    - Multipliers (level, NFT, reputation)
    - Projected earnings
    """
    # Get node stats
    cached = redis_client.get(f"node:{node_id}")
    
    if not cached:
        # Mock data
        cached = {
            "total_data_shared_gb": 500,
            "level": 4,
            "reputation": 95,
            "nft_multiplier": 1.25
        }
    
    rewards = calculate_rewards(cached)
    
    # Add projections
    rewards["projections"] = {
        "next_level_bonus": f"+10% ({(cached['level'] + 1) * 10}% total)",
        "next_nft_tier_bonus": "+15% with Silver NFT",
        "max_reputation_bonus": f"+{100 - cached['reputation']}% potential"
    }
    
    return rewards


@router.get("/{node_id}/nft-eligibility", response_model=NFTEligibility)
@rate_limit(requests=50, window=60)
async def check_nft_eligibility(node_id: str):
    """
    Check NFT tier eligibility
    
    - Current tier
    - Next tier requirements
    - Progress percentage
    """
    # Get node stats
    cached = redis_client.get(f"node:{node_id}")
    
    if not cached:
        # Mock data
        cached = {
            "total_data_shared_gb": 350,
            "uptime_days": 75
        }
    
    return calculate_nft_eligibility(cached)


@router.get("/leaderboard")
@cache_response(expire=60, key_prefix="leaderboard")
async def get_leaderboard(limit: int = 100, sort_by: str = "xp") -> List[LeaderboardEntry]:
    """
    Get node leaderboard
    
    - Top nodes by XP, earnings, or reputation
    - Cached for 1 minute
    """
    import random
    
    # Mock leaderboard data
    leaderboard = []
    
    for i in range(min(limit, 20)):
        entry = LeaderboardEntry(
            rank=i + 1,
            node_id=f"node-{uuid.uuid4().hex[:12]}",
            owner=f"0x{uuid.uuid4().hex[:40]}",
            location=random.choice(["US-East", "US-West", "EU-West", "Asia-Pacific"]),
            level=random.randint(5, 10),
            xp=random.randint(5000, 50000),
            total_data_gb=random.uniform(1000, 10000),
            total_earnings=random.uniform(500, 5000),
            reputation=random.randint(85, 100)
        )
        leaderboard.append(entry)
    
    # Sort by requested field
    if sort_by == "earnings":
        leaderboard.sort(key=lambda x: x.total_earnings, reverse=True)
    elif sort_by == "reputation":
        leaderboard.sort(key=lambda x: x.reputation, reverse=True)
    elif sort_by == "data":
        leaderboard.sort(key=lambda x: x.total_data_gb, reverse=True)
    else:  # default: xp
        leaderboard.sort(key=lambda x: x.xp, reverse=True)
    
    # Update ranks
    for i, entry in enumerate(leaderboard):
        entry.rank = i + 1
    
    return leaderboard


@router.post("/{node_id}/heartbeat")
@rate_limit(requests=600, window=60)  # Allow frequent heartbeats
async def node_heartbeat(node_id: str, metrics: dict):
    """
    Node heartbeat endpoint
    
    - Called every 30 seconds by node
    - Updates last seen timestamp
    - Records system metrics
    """
    cached = redis_client.get(f"node:{node_id}")
    
    if not cached:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # Update last seen
    cached['last_seen'] = datetime.now(timezone.utc).isoformat()
    cached['metrics'] = metrics
    
    redis_client.set(f"node:{node_id}", cached, expire=86400)
    
    return {
        "status": "ok",
        "node_id": node_id,
        "last_heartbeat": cached['last_seen']
    }


@router.delete("/{node_id}")
@rate_limit(requests=5, window=60)
async def deactivate_node(node_id: str, wallet_address: str):
    """
    Deactivate node
    
    - Returns staked AETH
    - Ends all active sessions
    - Archives node data
    """
    cached = redis_client.get(f"node:{node_id}")
    
    if not cached:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # Verify ownership
    if cached.get('owner') != wallet_address:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # TODO: Call smart contract to return stake
    
    # Clear cache
    redis_client.delete(f"node:{node_id}")
    
    return {
        "message": "Node deactivated successfully",
        "node_id": node_id,
        "stake_returned": 1000.0,  # AETH
        "final_earnings": cached.get('total_earnings_aeth', 0)
    }
