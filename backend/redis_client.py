"""
Redis Client для кэширования и rate limiting
Согласно строкам 304-335 файла "цель"
"""

import redis
from typing import Optional, Any
import json
import os
from datetime import timedelta

class RedisClient:
    """Redis client wrapper для кэширования и rate limiting"""
    
    def __init__(self):
        self.redis_host = os.getenv('REDIS_HOST', 'localhost')
        self.redis_port = int(os.getenv('REDIS_PORT', 6379))
        self.redis_db = int(os.getenv('REDIS_DB', 0))
        self.redis_password = os.getenv('REDIS_PASSWORD', None)
        
        try:
            self.client = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                db=self.redis_db,
                password=self.redis_password,
                decode_responses=True,
                socket_connect_timeout=5
            )
            # Test connection
            self.client.ping()
            print(f"✅ Redis connected: {self.redis_host}:{self.redis_port}")
        except redis.ConnectionError:
            print(f"⚠️  Redis connection failed, using in-memory fallback")
            self.client = None
    
    def is_connected(self) -> bool:
        """Check if Redis is connected"""
        if not self.client:
            return False
        try:
            self.client.ping()
            return True
        except:
            return False
    
    # ============= CACHING =============
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.is_connected():
            return None
        
        try:
            value = self.client.get(key)
            if value:
                return json.loads(value)
            return None
        except Exception as e:
            print(f"Redis get error: {e}")
            return None
    
    def set(self, key: str, value: Any, expire: int = 300):
        """
        Set value in cache with expiration
        
        Args:
            key: Cache key
            value: Value to cache (will be JSON serialized)
            expire: TTL in seconds (default 5 minutes)
        """
        if not self.is_connected():
            return False
        
        try:
            serialized = json.dumps(value)
            self.client.setex(key, expire, serialized)
            return True
        except Exception as e:
            print(f"Redis set error: {e}")
            return False
    
    def delete(self, key: str):
        """Delete key from cache"""
        if not self.is_connected():
            return False
        
        try:
            self.client.delete(key)
            return True
        except Exception as e:
            print(f"Redis delete error: {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """Check if key exists"""
        if not self.is_connected():
            return False
        
        try:
            return self.client.exists(key) > 0
        except:
            return False
    
    def clear_pattern(self, pattern: str):
        """Delete all keys matching pattern"""
        if not self.is_connected():
            return False
        
        try:
            keys = self.client.keys(pattern)
            if keys:
                self.client.delete(*keys)
            return True
        except Exception as e:
            print(f"Redis clear_pattern error: {e}")
            return False
    
    # ============= RATE LIMITING =============
    
    def check_rate_limit(self, key: str, limit: int, window: int) -> tuple[bool, int]:
        """
        Check if rate limit is exceeded
        
        Args:
            key: Unique identifier (e.g., IP address, user ID)
            limit: Maximum requests allowed
            window: Time window in seconds
            
        Returns:
            (is_allowed, remaining_requests)
        """
        if not self.is_connected():
            return True, limit  # Allow if Redis unavailable
        
        try:
            current = self.client.get(key)
            
            if current is None:
                # First request
                self.client.setex(key, window, 1)
                return True, limit - 1
            
            current = int(current)
            
            if current >= limit:
                # Rate limit exceeded
                ttl = self.client.ttl(key)
                return False, 0
            
            # Increment counter
            self.client.incr(key)
            return True, limit - current - 1
            
        except Exception as e:
            print(f"Redis rate limit error: {e}")
            return True, limit  # Allow on error
    
    def get_rate_limit_ttl(self, key: str) -> int:
        """Get remaining TTL for rate limit key"""
        if not self.is_connected():
            return 0
        
        try:
            return self.client.ttl(key)
        except:
            return 0
    
    # ============= BLOCKCHAIN CACHING =============
    
    def cache_blockchain_data(self, contract: str, method: str, params: str, data: Any, expire: int = 60):
        """Cache blockchain read operations"""
        cache_key = f"blockchain:{contract}:{method}:{params}"
        self.set(cache_key, data, expire)
    
    def get_cached_blockchain_data(self, contract: str, method: str, params: str) -> Optional[Any]:
        """Get cached blockchain data"""
        cache_key = f"blockchain:{contract}:{method}:{params}"
        return self.get(cache_key)
    
    def clear_blockchain_cache(self, contract: Optional[str] = None):
        """Clear blockchain cache"""
        if contract:
            self.clear_pattern(f"blockchain:{contract}:*")
        else:
            self.clear_pattern("blockchain:*")
    
    # ============= SESSION CACHING =============
    
    def cache_user_session(self, wallet_address: str, data: dict, expire: int = 3600):
        """Cache user session data"""
        cache_key = f"session:{wallet_address}"
        self.set(cache_key, data, expire)
    
    def get_user_session(self, wallet_address: str) -> Optional[dict]:
        """Get cached user session"""
        cache_key = f"session:{wallet_address}"
        return self.get(cache_key)
    
    def clear_user_session(self, wallet_address: str):
        """Clear user session"""
        cache_key = f"session:{wallet_address}"
        self.delete(cache_key)
    
    # ============= VPN NODE CACHING =============
    
    def cache_available_nodes(self, location: str, nodes: list, expire: int = 30):
        """Cache available VPN nodes for location"""
        cache_key = f"vpn:nodes:{location}"
        self.set(cache_key, nodes, expire)
    
    def get_available_nodes(self, location: str) -> Optional[list]:
        """Get cached available nodes"""
        cache_key = f"vpn:nodes:{location}"
        return self.get(cache_key)
    
    # ============= STATISTICS CACHING =============
    
    def cache_stats(self, stat_type: str, data: Any, expire: int = 300):
        """Cache statistics data"""
        cache_key = f"stats:{stat_type}"
        self.set(cache_key, data, expire)
    
    def get_stats(self, stat_type: str) -> Optional[Any]:
        """Get cached statistics"""
        cache_key = f"stats:{stat_type}"
        return self.get(cache_key)
    
    # ============= PUBSUB (Event Listeners) =============
    
    def publish(self, channel: str, message: dict):
        """Publish message to channel"""
        if not self.is_connected():
            return False
        
        try:
            serialized = json.dumps(message)
            self.client.publish(channel, serialized)
            return True
        except Exception as e:
            print(f"Redis publish error: {e}")
            return False
    
    def subscribe(self, channels: list):
        """Subscribe to channels"""
        if not self.is_connected():
            return None
        
        try:
            pubsub = self.client.pubsub()
            pubsub.subscribe(channels)
            return pubsub
        except Exception as e:
            print(f"Redis subscribe error: {e}")
            return None


# Global Redis instance
redis_client = RedisClient()


def get_redis_client() -> RedisClient:
    """Get Redis client instance"""
    return redis_client
