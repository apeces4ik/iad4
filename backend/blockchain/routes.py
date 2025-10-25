from fastapi import APIRouter, HTTPException, Depends
from .web3_client import blockchain_client

router = APIRouter(prefix="/blockchain", tags=["blockchain"])

@router.get("/status")
async def get_blockchain_status():
    """Get blockchain connection status"""
    return {
        "connected": blockchain_client.is_connected(),
        "contracts": blockchain_client.get_contract_addresses()
    }

@router.get("/balance/{address}")
async def get_balance(address: str):
    """Get AETH balance for an address"""
    try:
        balance = blockchain_client.get_aeth_balance(address)
        stake_info = blockchain_client.get_stake_info(address)
        return {
            "address": address,
            "balance": balance,
            "staked": stake_info["amount"],
            "pendingRewards": stake_info["pendingRewards"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/node/{node_id}")
async def get_node(node_id: str):
    """Get node information"""
    try:
        node_info = blockchain_client.get_node_info(node_id)
        if not node_info:
            raise HTTPException(status_code=404, detail="Node not found")
        return node_info
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/nodes/owner/{address}")
async def get_owner_nodes(address: str):
    """Get all nodes owned by an address"""
    try:
        node_ids = blockchain_client.get_owner_nodes(address)
        nodes = []
        for node_id in node_ids:
            node_info = blockchain_client.get_node_info(node_id)
            if node_info:
                node_info["nodeId"] = node_id
                nodes.append(node_info)
        return {"nodes": nodes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/session/{session_id}")
async def get_session(session_id: str):
    """Get session information"""
    try:
        session_info = blockchain_client.get_session_info(session_id)
        if not session_info:
            raise HTTPException(status_code=404, detail="Session not found")
        return session_info
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/user/{address}")
async def get_user_sessions(address: str):
    """Get all sessions for a user"""
    try:
        session_ids = blockchain_client.get_user_sessions(address)
        sessions = []
        for session_id in session_ids:
            session_info = blockchain_client.get_session_info(session_id)
            if session_info:
                session_info["sessionId"] = session_id
                sessions.append(session_info)
        return {"sessions": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/validator/{address}")
async def get_validator(address: str):
    """Get validator information"""
    try:
        validator_info = blockchain_client.get_validator_info(address)
        if not validator_info:
            return {"isValidator": False}
        return {"isValidator": True, **validator_info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/contracts")
async def get_contracts():
    """Get all contract addresses"""
    return blockchain_client.get_contract_addresses()


# NFT Endpoints
@router.get("/nft/user/{address}")
async def get_user_nfts(address: str):
    """Get all NFTs owned by a user"""
    try:
        nfts = blockchain_client.get_user_nfts(address)
        return {"nfts": nfts, "count": len(nfts)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/nft/{token_id}")
async def get_nft(token_id: int):
    """Get NFT information"""
    try:
        nft_info = blockchain_client.get_nft_info(token_id)
        if not nft_info:
            raise HTTPException(status_code=404, detail="NFT not found")
        return nft_info
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Referral Endpoints
@router.get("/referral/code/{address}")
async def get_referral_code(address: str):
    """Get referral code for an address"""
    try:
        code = blockchain_client.get_referral_code(address)
        return {"address": address, "referralCode": code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/referral/stats/{address}")
async def get_referral_stats(address: str):
    """Get referral statistics"""
    try:
        stats = blockchain_client.get_referral_stats(address)
        if not stats:
            stats = {
                "totalReferrals": 0,
                "level1Count": 0,
                "level2Count": 0,
                "level3Count": 0,
                "totalCommissions": 0.0,
                "rank": 0,
                "networkVolume": 0.0
            }
        referrer = blockchain_client.get_referrer(address)
        return {
            "address": address,
            "referrer": referrer,
            **stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/referral/referrer/{address}")
async def get_referrer(address: str):
    """Get the referrer for a user"""
    try:
        referrer = blockchain_client.get_referrer(address)
        return {"address": address, "referrer": referrer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Premium VPN Endpoints
@router.get("/premium/status/{address}")
async def get_premium_status(address: str):
    """Check if address has premium membership"""
    try:
        is_premium = blockchain_client.is_premium_member(address)
        info = blockchain_client.get_premium_info(address) if is_premium else None
        return {
            "address": address,
            "isPremium": is_premium,
            "info": info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/premium/info/{address}")
async def get_premium_info(address: str):
    """Get premium membership information"""
    try:
        info = blockchain_client.get_premium_info(address)
        return {"address": address, **info}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# V2 Contract Addresses
@router.get("/contracts/v2")
async def get_contracts_v2():
    """Get all V2 contract addresses"""
    return blockchain_client.get_all_contract_addresses()
