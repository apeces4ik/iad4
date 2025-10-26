"""
NFT Marketplace API Routes
Day 60-62: Backend Implementation
Endpoints for listing, buying, and managing NFTs
"""
from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import os
from motor.motor_asyncio import AsyncIOMotorClient
from services.ipfs_service import ipfs_service
from blockchain.web3_client import web3_client

router = APIRouter(prefix="/api/nft", tags=["NFT Marketplace"])

# Database connection
mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
db_name = os.getenv("DB_NAME", "aetherium_proxy")
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]


# Pydantic Models
class NFTListingCreate(BaseModel):
    token_id: int = Field(..., description="NFT Token ID")
    price: float = Field(..., gt=0, description="Price in AETH")
    duration_days: int = Field(7, ge=1, le=90, description="Listing duration")
    seller_address: str = Field(..., description="Seller wallet address")


class NFTPurchase(BaseModel):
    listing_id: str = Field(..., description="Listing ID")
    buyer_address: str = Field(..., description="Buyer wallet address")
    tx_hash: str = Field(..., description="Blockchain transaction hash")


class NFTMetadata(BaseModel):
    name: str
    description: str
    image: str
    tier: str
    attributes: List[Dict[str, any]]


# Endpoints

@router.get("/marketplace")
async def get_marketplace_listings(
    tier: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort_by: str = "price_asc",
    limit: int = 50,
    skip: int = 0
):
    """
    Get all NFTs listed for sale in the marketplace
    
    Query params:
    - tier: Filter by NFT tier (Bronze, Silver, Gold, Diamond, Legendary)
    - min_price, max_price: Price range filter
    - sort_by: price_asc, price_desc, tier_asc, tier_desc, newest, oldest
    - limit, skip: Pagination
    """
    try:
        # Build query
        query = {
            "status": "active",
            "expires_at": {"$gt": datetime.utcnow()}
        }
        
        if tier:
            query["tier"] = tier
        
        if min_price is not None or max_price is not None:
            query["price"] = {}
            if min_price is not None:
                query["price"]["$gte"] = min_price
            if max_price is not None:
                query["price"]["$lte"] = max_price
        
        # Build sort
        sort_map = {
            "price_asc": ("price", 1),
            "price_desc": ("price", -1),
            "tier_asc": ("tier_order", 1),
            "tier_desc": ("tier_order", -1),
            "newest": ("created_at", -1),
            "oldest": ("created_at", 1)
        }
        sort_field, sort_order = sort_map.get(sort_by, ("price", 1))
        
        # Query database
        listings = await db.nft_listings.find(query).sort(sort_field, sort_order).skip(skip).limit(limit).to_list(length=limit)
        
        # Convert ObjectId to string
        for listing in listings:
            listing["_id"] = str(listing["_id"])
        
        # Get total count
        total = await db.nft_listings.count_documents(query)
        
        # Get marketplace stats
        stats = await get_marketplace_stats_internal()
        
        return {
            "listings": listings,
            "total": total,
            "page": skip // limit + 1,
            "pages": (total + limit - 1) // limit,
            "stats": stats
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch marketplace: {str(e)}")


@router.get("/{token_id}")
async def get_nft_details(token_id: int):
    """
    Get detailed information about a specific NFT
    Includes blockchain data, metadata, and listing info (if listed)
    """
    try:
        # Get NFT info from blockchain
        nft_info = await web3_client.get_nft_info(token_id)
        
        if not nft_info or not nft_info.get("exists"):
            raise HTTPException(status_code=404, detail="NFT not found")
        
        # Get metadata from IPFS
        metadata_uri = nft_info.get("metadata_uri", "")
        metadata = {}
        if metadata_uri and metadata_uri.startswith("ipfs://"):
            cid = metadata_uri.replace("ipfs://", "")
            try:
                metadata = await ipfs_service.get_metadata(cid)
            except:
                metadata = {"error": "Failed to load metadata"}
        
        # Check if NFT is listed for sale
        listing = await db.nft_listings.find_one({
            "token_id": token_id,
            "status": "active",
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        if listing:
            listing["_id"] = str(listing["_id"])
        
        # Get transaction history
        history = await db.nft_transactions.find(
            {"token_id": token_id}
        ).sort("timestamp", -1).limit(10).to_list(length=10)
        
        for tx in history:
            tx["_id"] = str(tx["_id"])
        
        return {
            "nft": nft_info,
            "metadata": metadata,
            "listing": listing,
            "history": history
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch NFT: {str(e)}")


@router.post("/list")
async def list_nft_for_sale(listing: NFTListingCreate):
    """
    List an NFT for sale on the marketplace
    """
    try:
        # Verify NFT ownership via blockchain
        nft_info = await web3_client.get_nft_info(listing.token_id)
        
        if not nft_info or not nft_info.get("exists"):
            raise HTTPException(status_code=404, detail="NFT not found")
        
        if nft_info.get("owner", "").lower() != listing.seller_address.lower():
            raise HTTPException(status_code=403, detail="You don't own this NFT")
        
        # Check if already listed
        existing = await db.nft_listings.find_one({
            "token_id": listing.token_id,
            "status": "active"
        })
        
        if existing:
            raise HTTPException(status_code=400, detail="NFT already listed")
        
        # Calculate fees (2.5% marketplace fee)
        marketplace_fee = listing.price * 0.025
        seller_receives = listing.price - marketplace_fee
        
        # Create listing
        tier_order = {"Bronze": 1, "Silver": 2, "Gold": 3, "Diamond": 4, "Legendary": 5}
        
        new_listing = {
            "token_id": listing.token_id,
            "seller_address": listing.seller_address.lower(),
            "price": listing.price,
            "marketplace_fee": marketplace_fee,
            "seller_receives": seller_receives,
            "tier": nft_info.get("tier", "Bronze"),
            "tier_order": tier_order.get(nft_info.get("tier", "Bronze"), 1),
            "earnings_multiplier": nft_info.get("earnings_multiplier", 1.0),
            "node_id": nft_info.get("node_id"),
            "status": "active",
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=listing.duration_days),
            "views": 0,
            "favorites": 0
        }
        
        result = await db.nft_listings.insert_one(new_listing)
        
        # Record transaction
        await db.nft_transactions.insert_one({
            "token_id": listing.token_id,
            "type": "listed",
            "from_address": listing.seller_address.lower(),
            "price": listing.price,
            "timestamp": datetime.utcnow()
        })
        
        new_listing["_id"] = str(result.inserted_id)
        
        return {
            "success": True,
            "listing_id": str(result.inserted_id),
            "listing": new_listing,
            "message": "NFT successfully listed for sale"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list NFT: {str(e)}")


@router.post("/buy")
async def buy_nft(purchase: NFTPurchase):
    """
    Purchase an NFT from the marketplace
    """
    try:
        # Get listing
        from bson import ObjectId
        
        listing = await db.nft_listings.find_one({
            "_id": ObjectId(purchase.listing_id),
            "status": "active"
        })
        
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found or expired")
        
        # Check if listing expired
        if listing["expires_at"] < datetime.utcnow():
            await db.nft_listings.update_one(
                {"_id": ObjectId(purchase.listing_id)},
                {"$set": {"status": "expired"}}
            )
            raise HTTPException(status_code=400, detail="Listing has expired")
        
        # Verify buyer has enough balance
        balance_info = await web3_client.get_token_balance(purchase.buyer_address)
        if balance_info["balance"] < listing["price"]:
            raise HTTPException(status_code=400, detail="Insufficient AETH balance")
        
        # Mark listing as sold
        await db.nft_listings.update_one(
            {"_id": ObjectId(purchase.listing_id)},
            {
                "$set": {
                    "status": "sold",
                    "buyer_address": purchase.buyer_address.lower(),
                    "sold_at": datetime.utcnow(),
                    "tx_hash": purchase.tx_hash
                }
            }
        )
        
        # Record purchase transaction
        await db.nft_transactions.insert_one({
            "token_id": listing["token_id"],
            "type": "sale",
            "from_address": listing["seller_address"],
            "to_address": purchase.buyer_address.lower(),
            "price": listing["price"],
            "marketplace_fee": listing["marketplace_fee"],
            "tx_hash": purchase.tx_hash,
            "timestamp": datetime.utcnow()
        })
        
        # Update price analytics
        await update_price_analytics(listing["tier"], listing["price"])
        
        return {
            "success": True,
            "message": "NFT purchased successfully",
            "nft": {
                "token_id": listing["token_id"],
                "price": listing["price"],
                "seller": listing["seller_address"],
                "buyer": purchase.buyer_address,
                "tx_hash": purchase.tx_hash
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Purchase failed: {str(e)}")


@router.get("/my-nfts/{address}")
async def get_my_nfts(address: str):
    """
    Get all NFTs owned by a specific address
    Includes both listed and unlisted NFTs
    """
    try:
        # Get NFTs from blockchain
        nfts = await web3_client.get_user_nfts(address)
        
        # Enrich with listing info
        for nft in nfts:
            listing = await db.nft_listings.find_one({
                "token_id": nft["token_id"],
                "status": "active",
                "expires_at": {"$gt": datetime.utcnow()}
            })
            
            if listing:
                listing["_id"] = str(listing["_id"])
                nft["listing"] = listing
            else:
                nft["listing"] = None
        
        return {
            "address": address.lower(),
            "nfts": nfts,
            "total": len(nfts)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch NFTs: {str(e)}")


@router.delete("/listing/{listing_id}")
async def cancel_listing(listing_id: str, seller_address: str):
    """
    Cancel an active NFT listing
    """
    try:
        from bson import ObjectId
        
        listing = await db.nft_listings.find_one({"_id": ObjectId(listing_id)})
        
        if not listing:
            raise HTTPException(status_code=404, detail="Listing not found")
        
        if listing["seller_address"].lower() != seller_address.lower():
            raise HTTPException(status_code=403, detail="Not authorized")
        
        if listing["status"] != "active":
            raise HTTPException(status_code=400, detail="Listing is not active")
        
        # Cancel listing
        await db.nft_listings.update_one(
            {"_id": ObjectId(listing_id)},
            {
                "$set": {
                    "status": "cancelled",
                    "cancelled_at": datetime.utcnow()
                }
            }
        )
        
        # Record transaction
        await db.nft_transactions.insert_one({
            "token_id": listing["token_id"],
            "type": "cancelled",
            "from_address": seller_address.lower(),
            "timestamp": datetime.utcnow()
        })
        
        return {
            "success": True,
            "message": "Listing cancelled successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to cancel listing: {str(e)}")


@router.get("/stats")
async def get_marketplace_stats():
    """
    Get marketplace statistics
    - Total volume
    - Floor prices by tier
    - Listed NFTs count
    - Unique owners
    """
    return await get_marketplace_stats_internal()


async def get_marketplace_stats_internal():
    """Internal function to get marketplace stats"""
    try:
        # Total volume (all-time)
        volume_pipeline = [
            {"$match": {"type": "sale"}},
            {"$group": {"_id": None, "total": {"$sum": "$price"}}}
        ]
        volume_result = await db.nft_transactions.aggregate(volume_pipeline).to_list(length=1)
        total_volume = volume_result[0]["total"] if volume_result else 0
        
        # Floor prices by tier
        floor_prices = {}
        tiers = ["Bronze", "Silver", "Gold", "Diamond", "Legendary"]
        
        for tier in tiers:
            lowest = await db.nft_listings.find_one(
                {"tier": tier, "status": "active"},
                sort=[("price", 1)]
            )
            floor_prices[tier] = lowest["price"] if lowest else None
        
        # Listed NFTs count
        listed_count = await db.nft_listings.count_documents({
            "status": "active",
            "expires_at": {"$gt": datetime.utcnow()}
        })
        
        # Unique sellers
        unique_sellers = await db.nft_listings.distinct("seller_address", {"status": "active"})
        
        # 24h volume
        yesterday = datetime.utcnow() - timedelta(days=1)
        volume_24h_pipeline = [
            {"$match": {"type": "sale", "timestamp": {"$gte": yesterday}}},
            {"$group": {"_id": None, "total": {"$sum": "$price"}}}
        ]
        volume_24h_result = await db.nft_transactions.aggregate(volume_24h_pipeline).to_list(length=1)
        volume_24h = volume_24h_result[0]["total"] if volume_24h_result else 0
        
        return {
            "total_volume": round(total_volume, 2),
            "volume_24h": round(volume_24h, 2),
            "floor_prices": floor_prices,
            "listed_count": listed_count,
            "unique_sellers": len(unique_sellers)
        }
    
    except Exception as e:
        return {
            "total_volume": 0,
            "volume_24h": 0,
            "floor_prices": {},
            "listed_count": 0,
            "unique_sellers": 0,
            "error": str(e)
        }


async def update_price_analytics(tier: str, price: float):
    """Update price analytics for a tier"""
    try:
        today = datetime.utcnow().date()
        
        await db.price_analytics.update_one(
            {"tier": tier, "date": today},
            {
                "$inc": {"count": 1, "total": price},
                "$min": {"min_price": price},
                "$max": {"max_price": price},
                "$set": {"updated_at": datetime.utcnow()}
            },
            upsert=True
        )
    except:
        pass


@router.get("/analytics/{tier}")
async def get_price_analytics(tier: str, days: int = 30):
    """
    Get price analytics for a specific tier
    Shows price trends over time
    """
    try:
        from_date = datetime.utcnow().date() - timedelta(days=days)
        
        analytics = await db.price_analytics.find({
            "tier": tier,
            "date": {"$gte": from_date}
        }).sort("date", 1).to_list(length=days)
        
        for item in analytics:
            item["_id"] = str(item["_id"])
            item["date"] = item["date"].isoformat()
            item["avg_price"] = item["total"] / item["count"] if item["count"] > 0 else 0
        
        return {
            "tier": tier,
            "period_days": days,
            "data": analytics
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch analytics: {str(e)}")
