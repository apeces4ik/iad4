from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from web3 import Web3
import secrets
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Aetherium Proxy API")

# Create API router
api_router = APIRouter(prefix="/api")

# ============= MODELS =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    wallet_address: str
    email: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    aeth_balance: float = 1000.0  # Initial balance for testing
    staked_aeth: float = 0.0
    role: str = "user"  # user, miner, validator

class Node(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    owner_wallet: str
    location: str
    ip_address: str
    bandwidth_mbps: int
    status: str = "active"  # active, inactive, offline
    uptime_percentage: float = 0.0
    total_data_shared_gb: float = 0.0
    total_earnings_aeth: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_seen: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class VPNSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_wallet: str
    node_id: str
    location: str
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = None
    data_used_mb: float = 0.0
    status: str = "active"  # active, disconnected

class StakingRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    wallet_address: str
    amount: float
    start_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: str = "active"  # active, unstaked
    rewards_earned: float = 0.0

# ============= REQUEST/RESPONSE MODELS =============

class ConnectWalletRequest(BaseModel):
    wallet_address: str
    signature: str
    message: str

class ConnectWalletResponse(BaseModel):
    token: str
    user: User

class RegisterNodeRequest(BaseModel):
    location: str
    bandwidth_mbps: int

class VPNConnectRequest(BaseModel):
    location: str

class StakeRequest(BaseModel):
    amount: float

class DashboardStatsResponse(BaseModel):
    aeth_balance: float
    staked_aeth: float
    total_earnings: float
    active_nodes: int
    total_data_shared: float

# ============= AUTHENTICATION =============

def create_jwt_token(wallet_address: str) -> str:
    payload = {
        "wallet_address": wallet_address,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        wallet_address = payload.get("wallet_address")
        if not wallet_address:
            raise HTTPException(status_code=401, detail="Invalid token")
        return wallet_address
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============= AUTH ENDPOINTS =============

@api_router.post("/auth/connect-wallet", response_model=ConnectWalletResponse)
async def connect_wallet(request: ConnectWalletRequest):
    """Connect wallet and authenticate user"""
    try:
        logger.info(f"Authentication request received for wallet: {request.wallet_address}")
        
        # Verify signature (simplified for MVP - in production use proper signature verification)
        wallet_address = request.wallet_address.lower()
        
        # Check if user exists
        user_doc = await db.users.find_one({"wallet_address": wallet_address})
        
        if not user_doc:
            # Create new user
            new_user = User(wallet_address=wallet_address)
            user_dict = new_user.model_dump()
            user_dict['created_at'] = user_dict['created_at'].isoformat()
            await db.users.insert_one(user_dict)
            user = new_user
        else:
            # Load existing user
            if isinstance(user_doc['created_at'], str):
                user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
            user = User(**user_doc)
        
        # Generate JWT token
        token = create_jwt_token(wallet_address)
        
        logger.info(f"Authentication successful for wallet: {wallet_address}")
        return ConnectWalletResponse(token=token, user=user)
    
    except Exception as e:
        logger.error(f"Error connecting wallet: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/auth/me", response_model=User)
async def get_me(wallet_address: str = Depends(get_current_user)):
    """Get current user info"""
    user_doc = await db.users.find_one({"wallet_address": wallet_address})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

# ============= NODE ENDPOINTS =============

@api_router.post("/nodes/register", response_model=Node)
async def register_node(request: RegisterNodeRequest, wallet_address: str = Depends(get_current_user)):
    """Register a new miner node"""
    try:
        # Generate mock IP
        mock_ip = f"192.168.{random.randint(1, 255)}.{random.randint(1, 255)}"
        
        new_node = Node(
            owner_wallet=wallet_address,
            location=request.location,
            ip_address=mock_ip,
            bandwidth_mbps=request.bandwidth_mbps,
            uptime_percentage=random.uniform(85, 99)
        )
        
        node_dict = new_node.model_dump()
        node_dict['created_at'] = node_dict['created_at'].isoformat()
        node_dict['last_seen'] = node_dict['last_seen'].isoformat()
        
        await db.nodes.insert_one(node_dict)
        
        # Update user role to miner
        await db.users.update_one(
            {"wallet_address": wallet_address},
            {"$set": {"role": "miner"}}
        )
        
        return new_node
    
    except Exception as e:
        logger.error(f"Error registering node: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/nodes/list", response_model=List[Node])
async def list_nodes(location: Optional[str] = None):
    """List all available nodes"""
    query = {"status": "active"}
    if location:
        query["location"] = location
    
    nodes = await db.nodes.find(query, {"_id": 0}).to_list(100)
    
    for node in nodes:
        if isinstance(node['created_at'], str):
            node['created_at'] = datetime.fromisoformat(node['created_at'])
        if isinstance(node['last_seen'], str):
            node['last_seen'] = datetime.fromisoformat(node['last_seen'])
    
    return nodes

@api_router.get("/nodes/my-nodes", response_model=List[Node])
async def get_my_nodes(wallet_address: str = Depends(get_current_user)):
    """Get user's registered nodes"""
    nodes = await db.nodes.find({"owner_wallet": wallet_address}, {"_id": 0}).to_list(100)
    
    for node in nodes:
        if isinstance(node['created_at'], str):
            node['created_at'] = datetime.fromisoformat(node['created_at'])
        if isinstance(node['last_seen'], str):
            node['last_seen'] = datetime.fromisoformat(node['last_seen'])
    
    return nodes

@api_router.get("/nodes/locations")
async def get_locations():
    """Get available VPN locations"""
    return {
        "locations": [
            {"code": "us-east", "name": "United States (East)", "flag": "🇺🇸", "nodes": 42},
            {"code": "eu-west", "name": "Europe (West)", "flag": "🇪🇺", "nodes": 38},
            {"code": "asia-pacific", "name": "Asia Pacific", "flag": "🌏", "nodes": 31}
        ]
    }

# ============= VPN ENDPOINTS =============

@api_router.post("/vpn/connect", response_model=VPNSession)
async def connect_vpn(request: VPNConnectRequest, wallet_address: str = Depends(get_current_user)):
    """Connect to VPN through a node"""
    try:
        # Find an available node in the requested location
        node = await db.nodes.find_one({
            "location": request.location,
            "status": "active"
        })
        
        if not node:
            raise HTTPException(status_code=404, detail="No nodes available in this location")
        
        # Create VPN session
        session = VPNSession(
            user_wallet=wallet_address,
            node_id=node['id'],
            location=request.location
        )
        
        session_dict = session.model_dump()
        session_dict['start_time'] = session_dict['start_time'].isoformat()
        
        await db.vpn_sessions.insert_one(session_dict)
        
        return session
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error connecting to VPN: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/vpn/disconnect/{session_id}")
async def disconnect_vpn(session_id: str, wallet_address: str = Depends(get_current_user)):
    """Disconnect from VPN"""
    try:
        session = await db.vpn_sessions.find_one({
            "id": session_id,
            "user_wallet": wallet_address
        })
        
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Simulate data usage
        data_used = random.uniform(50, 500)  # MB
        
        await db.vpn_sessions.update_one(
            {"id": session_id},
            {
                "$set": {
                    "status": "disconnected",
                    "end_time": datetime.now(timezone.utc).isoformat(),
                    "data_used_mb": data_used
                }
            }
        )
        
        # Update node stats
        await db.nodes.update_one(
            {"id": session['node_id']},
            {
                "$inc": {
                    "total_data_shared_gb": data_used / 1024,
                    "total_earnings_aeth": data_used * 0.001  # 0.001 AETH per MB
                }
            }
        )
        
        return {"message": "Disconnected successfully", "data_used_mb": data_used}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error disconnecting VPN: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/vpn/active-session", response_model=Optional[VPNSession])
async def get_active_session(wallet_address: str = Depends(get_current_user)):
    """Get user's active VPN session"""
    session = await db.vpn_sessions.find_one({
        "user_wallet": wallet_address,
        "status": "active"
    }, {"_id": 0})
    
    if not session:
        return None
    
    if isinstance(session['start_time'], str):
        session['start_time'] = datetime.fromisoformat(session['start_time'])
    
    return VPNSession(**session)

# ============= STAKING ENDPOINTS =============

@api_router.post("/staking/stake")
async def stake_tokens(request: StakeRequest, wallet_address: str = Depends(get_current_user)):
    """Stake AETH tokens"""
    try:
        user = await db.users.find_one({"wallet_address": wallet_address})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if user['aeth_balance'] < request.amount:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        
        # Update user balance
        await db.users.update_one(
            {"wallet_address": wallet_address},
            {
                "$inc": {
                    "aeth_balance": -request.amount,
                    "staked_aeth": request.amount
                }
            }
        )
        
        # Create staking record
        staking_record = StakingRecord(
            wallet_address=wallet_address,
            amount=request.amount
        )
        
        record_dict = staking_record.model_dump()
        record_dict['start_date'] = record_dict['start_date'].isoformat()
        
        await db.staking_records.insert_one(record_dict)
        
        return {"message": "Tokens staked successfully", "amount": request.amount}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error staking tokens: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/staking/unstake")
async def unstake_tokens(request: StakeRequest, wallet_address: str = Depends(get_current_user)):
    """Unstake AETH tokens"""
    try:
        user = await db.users.find_one({"wallet_address": wallet_address})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        if user['staked_aeth'] < request.amount:
            raise HTTPException(status_code=400, detail="Insufficient staked balance")
        
        # Calculate rewards (simple 10% APY)
        rewards = request.amount * 0.10
        
        # Update user balance
        await db.users.update_one(
            {"wallet_address": wallet_address},
            {
                "$inc": {
                    "aeth_balance": request.amount + rewards,
                    "staked_aeth": -request.amount
                }
            }
        )
        
        return {
            "message": "Tokens unstaked successfully",
            "amount": request.amount,
            "rewards": rewards
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unstaking tokens: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/staking/balance")
async def get_staking_balance(wallet_address: str = Depends(get_current_user)):
    """Get user's staking balance"""
    user = await db.users.find_one({"wallet_address": wallet_address})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    records = await db.staking_records.find(
        {"wallet_address": wallet_address, "status": "active"},
        {"_id": 0}
    ).to_list(100)
    
    return {
        "staked_aeth": user['staked_aeth'],
        "estimated_apy": "10%",
        "records": records
    }

# ============= DASHBOARD ENDPOINTS =============

@api_router.get("/dashboard/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(wallet_address: str = Depends(get_current_user)):
    """Get user dashboard statistics"""
    user = await db.users.find_one({"wallet_address": wallet_address})
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's nodes
    nodes = await db.nodes.find({"owner_wallet": wallet_address}).to_list(100)
    
    total_earnings = sum(node.get('total_earnings_aeth', 0) for node in nodes)
    total_data_shared = sum(node.get('total_data_shared_gb', 0) for node in nodes)
    active_nodes = sum(1 for node in nodes if node.get('status') == 'active')
    
    return DashboardStatsResponse(
        aeth_balance=user['aeth_balance'],
        staked_aeth=user['staked_aeth'],
        total_earnings=total_earnings,
        active_nodes=active_nodes,
        total_data_shared=total_data_shared
    )

# ============= HEALTH CHECK =============

@api_router.get("/")
async def root():
    return {
        "message": "Aetherium Proxy API",
        "version": "1.0.0",
        "status": "operational"
    }

# Include routers
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add Rate Limiting Middleware (строки 292-295 файла "цель")
try:
    from rate_limiter import RateLimitMiddleware
    app.add_middleware(RateLimitMiddleware)
    logger.info("Rate limiting middleware enabled")
except Exception as e:
    logger.warning(f"Rate limiting disabled: {e}")

# Blockchain integration
try:
    from blockchain.routes import router as blockchain_router
    app.include_router(blockchain_router, prefix="/api")
    logger.info("Blockchain integration enabled")
except Exception as e:
    logger.warning(f"Blockchain integration disabled: {e}")

# VPN integration
try:
    from vpn_routes import router as vpn_router
    app.include_router(vpn_router, prefix="/api")
    logger.info("VPN integration enabled")
except Exception as e:
    logger.warning(f"VPN integration disabled: {e}")

# VPN Manager integration (строки 340-356 файла "цель")
try:
    from vpn_manager_routes import router as vpn_manager_router
    app.include_router(vpn_manager_router)
    logger.info("VPN Manager integration enabled")
except Exception as e:
    logger.warning(f"VPN Manager disabled: {e}")

# Node Management integration (строки 358-374 файла "цель")
try:
    from node_management_routes import router as node_mgmt_router
    app.include_router(node_mgmt_router)
    logger.info("Node Management integration enabled")
except Exception as e:
    logger.warning(f"Node Management disabled: {e}")

# NFT Marketplace integration (Day 60-62)
try:
    from nft_marketplace_routes import router as nft_marketplace_router
    app.include_router(nft_marketplace_router)
    logger.info("NFT Marketplace integration enabled")
except Exception as e:
    logger.warning(f"NFT Marketplace disabled: {e}")

# Referral Program integration (Day 67-69)
try:
    from referral_routes import router as referral_router
    app.include_router(referral_router)
    logger.info("Referral Program integration enabled")
except Exception as e:
    logger.warning(f"Referral Program disabled: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()