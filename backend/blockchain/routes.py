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
