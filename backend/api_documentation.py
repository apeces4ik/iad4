"""
API Documentation Generator
Согласно строкам 376-379 файла "цель"
"""

from fastapi.openapi.utils import get_openapi


def custom_openapi_schema(app):
    """
    Generate comprehensive OpenAPI schema with custom descriptions
    """
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="Aetherium Proxy API",
        version="1.0.0",
        description="""
# 🚀 Aetherium Proxy API Documentation

## Overview
Comprehensive REST API for Aetherium Proxy - Decentralized VPN with blockchain integration.

## Features
- 🔐 **Authentication**: Wallet-based auth with JWT
- ⛓️ **Blockchain**: 7 smart contracts integration
- 🌐 **VPN**: WireGuard-based decentralized VPN
- 💰 **Staking**: Multi-tier staking with rewards
- 🏆 **NFT**: Performance-based NFT system
- 👥 **Referral**: 3-level MLM referral program
- ⚡ **Rate Limiting**: Intelligent rate limiting per endpoint

## Architecture
```
Frontend (React) → API Gateway → FastAPI Backend → MongoDB + Redis
                                      ↓
                              Blockchain (Hardhat)
```

## Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

Get token via `/api/auth/connect-wallet` endpoint.

## Rate Limits
- **Auth endpoints**: 10 req/min
- **Blockchain endpoints**: 30 req/min
- **VPN endpoints**: 20 req/min
- **Node endpoints**: 50 req/min
- **General**: 100 req/min

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Remaining requests in window
- `X-RateLimit-Window`: Time window in seconds

## Smart Contracts
### AETHTokenV2
- **Address**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Functions**: Burn, Stake, Vesting, Rewards
- **Features**: 3-tier staking (50%/75%/100% APY)

### MinerNodeV2
- **Address**: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`
- **Functions**: Register, XP tracking, Slashing
- **Features**: 10-level system, reputation (0-100)

### NodeNFT
- **Address**: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
- **Functions**: Mint, Upgrade, Marketplace
- **Features**: 5 tiers (1.1x - 3x multipliers)

### ReferralProgram
- **Address**: `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9`
- **Functions**: Generate code, Register, Commissions
- **Features**: 3-level MLM (5%+3%+2%)

### VPNSession
- **Address**: `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9`
- **Functions**: Start/End session, Track data
- **Features**: Auto rewards, Node assignment

### Validator
- **Address**: `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707`
- **Functions**: Register, Validate, Rewards
- **Features**: 10K AETH stake, slashing

### PremiumVPN
- **Address**: `0x0165878A594ca255338adfa4d48449f69242Eb8F`
- **Functions**: Subscribe, Check status
- **Features**: Unlimited bandwidth, priority

## Error Codes
- `400`: Bad Request - Invalid input
- `401`: Unauthorized - Missing/invalid token
- `403`: Forbidden - Insufficient permissions
- `404`: Not Found - Resource doesn't exist
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server issue

## Best Practices
1. **Always cache responses** when possible (use ETags)
2. **Batch requests** for multiple resources
3. **Use pagination** for large datasets
4. **Handle rate limits** gracefully with exponential backoff
5. **Validate inputs** on client side before API calls

## Support
- Documentation: `/docs` (Swagger UI)
- Alternative docs: `/redoc` (ReDoc)
- API Schema: `/openapi.json`
- Health Check: `/health`

## Contact
- GitHub: https://github.com/aetherium-proxy
- Discord: [Coming Soon]
- Email: support@aetheriumproxy.io
        """,
        routes=app.routes,
        tags=[
            {
                "name": "Authentication",
                "description": "Wallet authentication and JWT management"
            },
            {
                "name": "Dashboard",
                "description": "User dashboard statistics and overview"
            },
            {
                "name": "Blockchain",
                "description": "Smart contract interactions and blockchain data"
            },
            {
                "name": "VPN",
                "description": "VPN connection and configuration"
            },
            {
                "name": "Node Management",
                "description": "Miner node registration and management"
            },
            {
                "name": "Staking",
                "description": "Token staking and rewards"
            },
            {
                "name": "NFT",
                "description": "Node NFT marketplace and management"
            },
            {
                "name": "Referral",
                "description": "Referral program and commissions"
            }
        ]
    )
    
    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter JWT token obtained from /api/auth/connect-wallet"
        }
    }
    
    # Add examples for common responses
    openapi_schema["components"]["examples"] = {
        "UnauthorizedError": {
            "value": {
                "detail": "Invalid token or token expired"
            }
        },
        "RateLimitError": {
            "value": {
                "error": "Rate limit exceeded",
                "message": "Too many requests. Please try again in 45 seconds.",
                "retry_after": 45,
                "limit": 10,
                "window": 60
            }
        },
        "ValidationError": {
            "value": {
                "detail": [
                    {
                        "loc": ["body", "duration_minutes"],
                        "msg": "field required",
                        "type": "value_error.missing"
                    }
                ]
            }
        }
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


# Enhanced API metadata
tags_metadata = [
    {
        "name": "Authentication",
        "description": """
        Wallet-based authentication system.
        
        **Flow:**
        1. Request nonce: `POST /api/auth/nonce`
        2. Sign message with wallet
        3. Connect: `POST /api/auth/connect-wallet`
        4. Receive JWT token
        5. Use token for authenticated requests
        
        **Token expires in 7 days**
        """,
        "externalDocs": {
            "description": "Authentication Guide",
            "url": "https://docs.aetheriumproxy.io/auth"
        }
    },
    {
        "name": "VPN",
        "description": """
        Decentralized VPN management.
        
        **Features:**
        - WireGuard protocol
        - Node selection algorithm
        - Kill switch
        - Split tunneling
        - Traffic monitoring
        
        **Burn rate:** 0.001 AETH per minute
        """,
        "externalDocs": {
            "description": "VPN Setup Guide",
            "url": "https://docs.aetheriumproxy.io/vpn"
        }
    },
    {
        "name": "Node Management",
        "description": """
        Miner node operations and monitoring.
        
        **Requirements:**
        - 1000 AETH stake
        - Minimum 100 Mbps bandwidth
        - Public IP address
        
        **Rewards:**
        - Base: 0.1 AETH per GB
        - Level multiplier: +10% per level
        - NFT multiplier: 1.1x - 3x
        - Reputation bonus: up to +100%
        """,
        "externalDocs": {
            "description": "Node Operator Guide",
            "url": "https://docs.aetheriumproxy.io/nodes"
        }
    },
    {
        "name": "Blockchain",
        "description": """
        Smart contract interactions.
        
        **Contracts:**
        - AETHTokenV2: Token & Staking
        - MinerNodeV2: Node management
        - NodeNFT: NFT marketplace
        - ReferralProgram: MLM system
        - VPNSession: Session tracking
        - Validator: Network validation
        - PremiumVPN: Premium subscriptions
        """,
        "externalDocs": {
            "description": "Smart Contracts Docs",
            "url": "https://docs.aetheriumproxy.io/contracts"
        }
    }
]
