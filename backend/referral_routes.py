"""
Referral Program API Routes
Day 67-69: Backend Implementation
3-level MLM system with commission tracking
"""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import os
import secrets
import qrcode
import io
import base64
from motor.motor_asyncio import AsyncIOMotorClient
from blockchain.web3_client import web3_client

router = APIRouter(prefix="/api/referral", tags=["Referral Program"])

# Database connection
mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
db_name = os.getenv("DB_NAME", "aetherium_proxy")
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


# Pydantic Models
class ReferralRegistration(BaseModel):
    address: str = Field(..., description="User wallet address")
    referral_code: Optional[str] = Field(None, description="Referrer's code")


class ClaimCommission(BaseModel):
    address: str = Field(..., description="User wallet address")
    tx_hash: str = Field(..., description="Blockchain transaction hash")


# Referral Ranks and Requirements
RANKS = {
    "Bronze": {"direct_referrals": 0, "team_volume": 0, "commission_bonus": 0},
    "Silver": {"direct_referrals": 5, "team_volume": 1000, "commission_bonus": 0.005},
    "Gold": {"direct_referrals": 15, "team_volume": 5000, "commission_bonus": 0.01},
    "Platinum": {"direct_referrals": 50, "team_volume": 25000, "commission_bonus": 0.015},
    "Diamond": {"direct_referrals": 100, "team_volume": 100000, "commission_bonus": 0.02}
}


def generate_referral_code(address: str) -> str:
    """Generate a unique 8-character referral code"""
    return secrets.token_urlsafe(6)[:8].upper()


def generate_qr_code(data: str) -> str:
    """Generate QR code as base64 string"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    
    return base64.b64encode(buffer.getvalue()).decode()


@router.post("/register")
async def register_referral(registration: ReferralRegistration):
    """
    Register a new user with optional referral code
    Creates referral link and tracks referrer relationship
    """
    try:
        address = registration.address.lower()
        
        # Check if already registered
        existing = await db.referrals.find_one({"address": address})
        
        if existing:
            return {
                "success": True,
                "already_registered": True,
                "referral_code": existing["referral_code"],
                "message": "User already registered"
            }
        
        # Generate unique referral code
        referral_code = generate_referral_code(address)
        
        # Ensure code is unique
        while await db.referrals.find_one({"referral_code": referral_code}):
            referral_code = generate_referral_code(address)
        
        # Process referrer if code provided
        referrer_address = None
        referrer_level_1 = None
        referrer_level_2 = None
        
        if registration.referral_code:
            referrer = await db.referrals.find_one({"referral_code": registration.referral_code})
            
            if referrer:
                referrer_address = referrer["address"]
                referrer_level_1 = referrer.get("referrer_address")  # Level 2
                referrer_level_2 = referrer.get("referrer_level_1")  # Level 3
                
                # Update referrer's stats
                await db.referrals.update_one(
                    {"address": referrer_address},
                    {
                        "$inc": {"direct_referrals": 1},
                        "$push": {"referral_addresses": address}
                    }
                )
        
        # Create referral record
        new_referral = {
            "address": address,
            "referral_code": referral_code,
            "referrer_address": referrer_address,
            "referrer_level_1": referrer_level_1,
            "referrer_level_2": referrer_level_2,
            "direct_referrals": 0,
            "total_referrals": 0,
            "referral_addresses": [],
            "total_commissions": 0.0,
            "claimed_commissions": 0.0,
            "pending_commissions": 0.0,
            "team_volume": 0.0,
            "rank": "Bronze",
            "rank_progress": 0.0,
            "joined_at": datetime.utcnow(),
            "last_activity": datetime.utcnow()
        }
        
        await db.referrals.insert_one(new_referral)
        
        # Generate QR code
        referral_url = f"https://aetherium.app/register?ref={referral_code}"
        qr_code = generate_qr_code(referral_url)
        
        return {
            "success": True,
            "referral_code": referral_code,
            "referral_url": referral_url,
            "qr_code": qr_code,
            "referrer": referrer_address,
            "message": "Successfully registered in referral program"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")


@router.get("/my-stats/{address}")
async def get_my_referral_stats(address: str):
    """
    Get detailed referral statistics for a user
    Includes earnings, rank, team stats
    """
    try:
        address = address.lower()
        
        # Get referral record
        referral = await db.referrals.find_one({"address": address})
        
        if not referral:
            raise HTTPException(status_code=404, detail="User not registered in referral program")
        
        # Get blockchain referral stats
        blockchain_stats = await web3_client.get_referral_stats(address)
        
        # Calculate rank progress
        current_rank = referral["rank"]
        rank_keys = list(RANKS.keys())
        current_rank_index = rank_keys.index(current_rank)
        
        next_rank = None
        rank_progress = 100.0
        
        if current_rank_index < len(rank_keys) - 1:
            next_rank = rank_keys[current_rank_index + 1]
            next_rank_req = RANKS[next_rank]
            
            referral_progress = (referral["direct_referrals"] / next_rank_req["direct_referrals"] * 100) if next_rank_req["direct_referrals"] > 0 else 100
            volume_progress = (referral["team_volume"] / next_rank_req["team_volume"] * 100) if next_rank_req["team_volume"] > 0 else 100
            
            rank_progress = min(referral_progress, volume_progress)
        
        # Get recent commissions
        recent_commissions = await db.referral_commissions.find(
            {"recipient_address": address}
        ).sort("timestamp", -1).limit(10).to_list(length=10)
        
        for comm in recent_commissions:
            comm["_id"] = str(comm["_id"])
        
        # Calculate 30-day earnings
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        earnings_30d_pipeline = [
            {
                "$match": {
                    "recipient_address": address,
                    "timestamp": {"$gte": thirty_days_ago}
                }
            },
            {
                "$group": {
                    "_id": None,
                    "total": {"$sum": "$amount"}
                }
            }
        ]
        
        earnings_30d_result = await db.referral_commissions.aggregate(earnings_30d_pipeline).to_list(length=1)
        earnings_30d = earnings_30d_result[0]["total"] if earnings_30d_result else 0
        
        referral["_id"] = str(referral["_id"])
        
        return {
            "referral": referral,
            "blockchain": blockchain_stats,
            "rank": {
                "current": current_rank,
                "next": next_rank,
                "progress": round(rank_progress, 2),
                "requirements": RANKS.get(next_rank) if next_rank else None,
                "bonus": RANKS[current_rank]["commission_bonus"]
            },
            "earnings": {
                "total": referral["total_commissions"],
                "claimed": referral["claimed_commissions"],
                "pending": referral["pending_commissions"],
                "last_30_days": round(earnings_30d, 2)
            },
            "recent_commissions": recent_commissions
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@router.get("/tree/{address}")
async def get_referral_tree(address: str, depth: int = 3):
    """
    Get referral tree structure (3 levels)
    For D3.js visualization
    """
    try:
        address = address.lower()
        
        # Check if user exists
        root = await db.referrals.find_one({"address": address})
        
        if not root:
            raise HTTPException(status_code=404, detail="User not found")
        
        async def build_tree_node(user_address: str, current_depth: int = 0):
            """Recursively build tree structure"""
            user = await db.referrals.find_one({"address": user_address})
            
            if not user or current_depth >= depth:
                return None
            
            node = {
                "address": user_address,
                "short_address": f"{user_address[:6]}...{user_address[-4:]}",
                "referral_code": user["referral_code"],
                "direct_referrals": user["direct_referrals"],
                "total_commissions": user["total_commissions"],
                "rank": user["rank"],
                "joined_at": user["joined_at"].isoformat(),
                "children": []
            }
            
            # Get direct referrals
            if current_depth < depth - 1:
                direct_refs = user.get("referral_addresses", [])
                
                for ref_address in direct_refs[:20]:  # Limit to 20 per level
                    child = await build_tree_node(ref_address, current_depth + 1)
                    if child:
                        node["children"].append(child)
            
            return node
        
        tree = await build_tree_node(address)
        
        # Calculate tree stats
        total_nodes = await count_tree_nodes(tree)
        
        return {
            "root": address,
            "tree": tree,
            "stats": {
                "total_nodes": total_nodes,
                "depth": depth
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build tree: {str(e)}")


def count_tree_nodes(node: Dict) -> int:
    """Count total nodes in tree"""
    if not node:
        return 0
    
    count = 1
    for child in node.get("children", []):
        count += count_tree_nodes(child)
    
    return count


@router.post("/claim")
async def claim_commissions(claim: ClaimCommission):
    """
    Claim pending referral commissions
    Requires blockchain transaction
    """
    try:
        address = claim.address.lower()
        
        # Get referral record
        referral = await db.referrals.find_one({"address": address})
        
        if not referral:
            raise HTTPException(status_code=404, detail="User not registered")
        
        pending = referral.get("pending_commissions", 0)
        
        if pending <= 0:
            raise HTTPException(status_code=400, detail="No pending commissions")
        
        # Update referral record
        await db.referrals.update_one(
            {"address": address},
            {
                "$inc": {
                    "claimed_commissions": pending,
                    "pending_commissions": -pending
                },
                "$set": {"last_claim": datetime.utcnow()}
            }
        )
        
        # Record claim transaction
        await db.referral_claims.insert_one({
            "address": address,
            "amount": pending,
            "tx_hash": claim.tx_hash,
            "timestamp": datetime.utcnow()
        })
        
        return {
            "success": True,
            "amount_claimed": round(pending, 2),
            "tx_hash": claim.tx_hash,
            "message": f"Successfully claimed {pending:.2f} AETH"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Claim failed: {str(e)}")


@router.get("/leaderboard")
async def get_referral_leaderboard(
    timeframe: str = "all",
    metric: str = "commissions",
    limit: int = 100
):
    """
    Get referral program leaderboard
    
    Params:
    - timeframe: all, 30d, 7d
    - metric: commissions, referrals, volume
    - limit: number of results
    """
    try:
        query = {}
        
        # Filter by timeframe
        if timeframe == "30d":
            cutoff = datetime.utcnow() - timedelta(days=30)
            query["last_activity"] = {"$gte": cutoff}
        elif timeframe == "7d":
            cutoff = datetime.utcnow() - timedelta(days=7)
            query["last_activity"] = {"$gte": cutoff}
        
        # Sort by metric
        sort_field_map = {
            "commissions": "total_commissions",
            "referrals": "direct_referrals",
            "volume": "team_volume"
        }
        sort_field = sort_field_map.get(metric, "total_commissions")
        
        # Get leaderboard
        leaderboard = await db.referrals.find(query).sort(sort_field, -1).limit(limit).to_list(length=limit)
        
        # Format results
        results = []
        for i, user in enumerate(leaderboard):
            results.append({
                "rank": i + 1,
                "address": user["address"],
                "short_address": f"{user['address'][:6]}...{user['address'][-4:]}",
                "referral_code": user["referral_code"],
                "direct_referrals": user["direct_referrals"],
                "total_referrals": user["total_referrals"],
                "total_commissions": round(user["total_commissions"], 2),
                "team_volume": round(user["team_volume"], 2),
                "rank_title": user["rank"]
            })
        
        return {
            "timeframe": timeframe,
            "metric": metric,
            "leaderboard": results,
            "total": len(results)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch leaderboard: {str(e)}")


@router.post("/commission/record")
async def record_commission(
    from_address: str,
    amount: float,
    transaction_type: str,
    tx_hash: str
):
    """
    Record a commission from a transaction
    Distributes to 3 levels: 5%, 3%, 2%
    """
    try:
        from_address = from_address.lower()
        
        # Get user's referral info
        user = await db.referrals.find_one({"address": from_address})
        
        if not user:
            return {"success": False, "message": "User not in referral program"}
        
        commissions_distributed = []
        
        # Level 1: Direct referrer (5%)
        if user.get("referrer_address"):
            level_1_amount = amount * 0.05
            await distribute_commission(
                user["referrer_address"],
                from_address,
                level_1_amount,
                1,
                transaction_type,
                tx_hash
            )
            commissions_distributed.append({
                "level": 1,
                "address": user["referrer_address"],
                "amount": level_1_amount
            })
        
        # Level 2: Referrer's referrer (3%)
        if user.get("referrer_level_1"):
            level_2_amount = amount * 0.03
            await distribute_commission(
                user["referrer_level_1"],
                from_address,
                level_2_amount,
                2,
                transaction_type,
                tx_hash
            )
            commissions_distributed.append({
                "level": 2,
                "address": user["referrer_level_1"],
                "amount": level_2_amount
            })
        
        # Level 3: Referrer's referrer's referrer (2%)
        if user.get("referrer_level_2"):
            level_3_amount = amount * 0.02
            await distribute_commission(
                user["referrer_level_2"],
                from_address,
                level_3_amount,
                3,
                transaction_type,
                tx_hash
            )
            commissions_distributed.append({
                "level": 3,
                "address": user["referrer_level_2"],
                "amount": level_3_amount
            })
        
        return {
            "success": True,
            "commissions_distributed": commissions_distributed,
            "total_commission": sum(c["amount"] for c in commissions_distributed)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to record commission: {str(e)}")


async def distribute_commission(
    recipient_address: str,
    from_address: str,
    amount: float,
    level: int,
    transaction_type: str,
    tx_hash: str
):
    """Distribute commission to a referrer"""
    try:
        # Update referral stats
        await db.referrals.update_one(
            {"address": recipient_address},
            {
                "$inc": {
                    "total_commissions": amount,
                    "pending_commissions": amount,
                    "team_volume": amount if level == 1 else 0
                },
                "$set": {"last_activity": datetime.utcnow()}
            }
        )
        
        # Record commission
        await db.referral_commissions.insert_one({
            "recipient_address": recipient_address,
            "from_address": from_address,
            "amount": amount,
            "level": level,
            "transaction_type": transaction_type,
            "tx_hash": tx_hash,
            "timestamp": datetime.utcnow(),
            "status": "pending"
        })
        
        # Check rank update
        await update_rank(recipient_address)
    
    except:
        pass


async def update_rank(address: str):
    """Update user rank based on criteria"""
    try:
        user = await db.referrals.find_one({"address": address})
        
        if not user:
            return
        
        current_rank = user["rank"]
        new_rank = "Bronze"
        
        # Check from highest to lowest
        for rank_name in reversed(list(RANKS.keys())):
            requirements = RANKS[rank_name]
            
            if (user["direct_referrals"] >= requirements["direct_referrals"] and
                user["team_volume"] >= requirements["team_volume"]):
                new_rank = rank_name
                break
        
        # Update if rank changed
        if new_rank != current_rank:
            await db.referrals.update_one(
                {"address": address},
                {"$set": {"rank": new_rank}}
            )
    
    except:
        pass


@router.get("/code/{code}")
async def validate_referral_code(code: str):
    """
    Validate a referral code and get referrer info
    """
    try:
        referrer = await db.referrals.find_one({"referral_code": code})
        
        if not referrer:
            raise HTTPException(status_code=404, detail="Invalid referral code")
        
        return {
            "valid": True,
            "referrer_address": referrer["address"],
            "referrer_rank": referrer["rank"],
            "referral_count": referrer["direct_referrals"]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")
