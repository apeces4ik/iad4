"""
Rate Limiting Middleware для FastAPI
Согласно строкам 292-295 файла "цель"
"""

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from typing import Callable
import time

from redis_client import get_redis_client


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware using Redis
    
    Rate limits по endpoint:
    - /api/auth/*: 10 requests/minute
    - /api/blockchain/*: 30 requests/minute
    - /api/vpn/*: 20 requests/minute
    - /api/nodes/*: 50 requests/minute
    - Default: 100 requests/minute
    """
    
    def __init__(self, app):
        super().__init__(app)
        self.redis = get_redis_client()
        
        # Rate limits по endpoint pattern
        self.rate_limits = {
            "/api/auth/": (10, 60),           # 10 req/min
            "/api/blockchain/": (30, 60),     # 30 req/min  
            "/api/vpn/": (20, 60),            # 20 req/min
            "/api/nodes/": (50, 60),          # 50 req/min
            "/api/dashboard/": (100, 60),     # 100 req/min
            "default": (100, 60)              # 100 req/min
        }
    
    def get_rate_limit_for_path(self, path: str) -> tuple[int, int]:
        """Get rate limit for specific path"""
        for pattern, (limit, window) in self.rate_limits.items():
            if pattern in path:
                return limit, window
        return self.rate_limits["default"]
    
    def get_client_identifier(self, request: Request) -> str:
        """Get unique client identifier (IP + User Agent)"""
        # Try to get real IP (considering proxies)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"
        
        # Add user agent for more uniqueness
        user_agent = request.headers.get("User-Agent", "unknown")[:50]
        
        return f"{client_ip}:{user_agent}"
    
    async def dispatch(self, request: Request, call_next: Callable):
        """Process request with rate limiting"""
        
        # Skip rate limiting for health check and docs
        if request.url.path in ["/health", "/docs", "/redoc", "/openapi.json"]:
            return await call_next(request)
        
        # Get client identifier
        client_id = self.get_client_identifier(request)
        path = request.url.path
        
        # Get rate limit for this endpoint
        limit, window = self.get_rate_limit_for_path(path)
        
        # Create rate limit key
        rate_key = f"ratelimit:{path}:{client_id}"
        
        # Check rate limit
        is_allowed, remaining = self.redis.check_rate_limit(rate_key, limit, window)
        
        if not is_allowed:
            # Rate limit exceeded
            ttl = self.redis.get_rate_limit_ttl(rate_key)
            
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Please try again in {ttl} seconds.",
                    "retry_after": ttl,
                    "limit": limit,
                    "window": window
                },
                headers={
                    "X-RateLimit-Limit": str(limit),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(time.time()) + ttl),
                    "Retry-After": str(ttl)
                }
            )
        
        # Add rate limit headers to response
        response = await call_next(request)
        
        # Add rate limit info to response headers
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Window"] = str(window)
        
        return response


class IPWhitelistMiddleware(BaseHTTPMiddleware):
    """Middleware для whitelist определенных IP адресов"""
    
    def __init__(self, app, whitelist: list = None):
        super().__init__(app)
        self.whitelist = whitelist or []
        
        # Add local IPs by default
        self.whitelist.extend(["127.0.0.1", "localhost", "::1"])
    
    async def dispatch(self, request: Request, call_next: Callable):
        """Check if IP is whitelisted for admin endpoints"""
        
        # Only check for admin endpoints
        if not request.url.path.startswith("/api/admin/"):
            return await call_next(request)
        
        # Get client IP
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            client_ip = forwarded.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"
        
        # Check whitelist
        if client_ip not in self.whitelist:
            return JSONResponse(
                status_code=403,
                content={
                    "error": "Forbidden",
                    "message": "Access denied. IP not whitelisted."
                }
            )
        
        return await call_next(request)


# Rate limiter decorator для specific endpoints
def rate_limit(requests: int, window: int):
    """
    Decorator для rate limiting specific functions
    
    Args:
        requests: Maximum requests allowed
        window: Time window in seconds
    
    Example:
        @rate_limit(requests=5, window=60)
        async def expensive_endpoint():
            ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Get request from kwargs
            request = kwargs.get('request') or (args[0] if args else None)
            
            if not request or not isinstance(request, Request):
                # Cannot apply rate limit without request object
                return await func(*args, **kwargs)
            
            redis = get_redis_client()
            
            # Get client identifier
            forwarded = request.headers.get("X-Forwarded-For")
            if forwarded:
                client_ip = forwarded.split(",")[0].strip()
            else:
                client_ip = request.client.host if request.client else "unknown"
            
            # Create rate limit key
            rate_key = f"ratelimit:{func.__name__}:{client_ip}"
            
            # Check rate limit
            is_allowed, remaining = redis.check_rate_limit(rate_key, requests, window)
            
            if not is_allowed:
                ttl = redis.get_rate_limit_ttl(rate_key)
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "Rate limit exceeded",
                        "retry_after": ttl,
                        "limit": requests
                    }
                )
            
            # Execute function
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


# Cache decorator для caching responses
def cache_response(expire: int = 300, key_prefix: str = ""):
    """
    Decorator для caching function responses
    
    Args:
        expire: Cache TTL in seconds
        key_prefix: Prefix for cache key
    
    Example:
        @cache_response(expire=60, key_prefix="user")
        async def get_user(user_id: str):
            ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            redis = get_redis_client()
            
            # Generate cache key from function name and arguments
            key_parts = [key_prefix or func.__name__]
            key_parts.extend([str(arg) for arg in args])
            key_parts.extend([f"{k}={v}" for k, v in sorted(kwargs.items())])
            cache_key = ":".join(key_parts)
            
            # Try to get from cache
            cached = redis.get(cache_key)
            if cached is not None:
                return cached
            
            # Execute function
            result = await func(*args, **kwargs)
            
            # Cache result
            redis.set(cache_key, result, expire)
            
            return result
        
        return wrapper
    return decorator
