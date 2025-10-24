"""
WireGuard VPN Manager
Manages WireGuard server configuration, peer management, and traffic statistics
"""

import subprocess
import os
import secrets
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class WireGuardManager:
    """Manages WireGuard VPN server and client configurations"""
    
    def __init__(self, 
                 interface: str = "wg0",
                 server_port: int = 51820,
                 server_address: str = "10.8.0.1/24",
                 config_dir: str = "/etc/wireguard"):
        """
        Initialize WireGuard manager
        
        Args:
            interface: WireGuard interface name (default: wg0)
            server_port: Server listening port (default: 51820)
            server_address: Server VPN subnet address (default: 10.8.0.1/24)
            config_dir: Directory for WireGuard configs (default: /etc/wireguard)
        """
        self.interface = interface
        self.server_port = server_port
        self.server_address = server_address
        self.config_dir = Path(config_dir)
        self.peers_dir = Path("/app/backend/vpn/peers")
        self.peers_dir.mkdir(parents=True, exist_ok=True)
        
        # Server keys paths
        self.server_private_key_path = self.config_dir / f"{interface}_private.key"
        self.server_public_key_path = self.config_dir / f"{interface}_public.key"
        
    def generate_keypair(self) -> Tuple[str, str]:
        """
        Generate a WireGuard keypair
        
        Returns:
            Tuple of (private_key, public_key)
        """
        try:
            # Generate private key
            private_key = subprocess.check_output(
                ["wg", "genkey"],
                text=True
            ).strip()
            
            # Generate public key from private key
            public_key = subprocess.check_output(
                ["wg", "pubkey"],
                input=private_key,
                text=True
            ).strip()
            
            return private_key, public_key
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to generate keypair: {e}")
            raise Exception("Failed to generate WireGuard keypair")
    
    def generate_preshared_key(self) -> str:
        """Generate a preshared key for additional security"""
        try:
            psk = subprocess.check_output(
                ["wg", "genpsk"],
                text=True
            ).strip()
            return psk
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to generate preshared key: {e}")
            raise Exception("Failed to generate preshared key")
    
    def setup_server(self, public_endpoint: str) -> Dict[str, str]:
        """
        Set up WireGuard server configuration (MVP mode - generates configs without requiring root)
        
        Args:
            public_endpoint: Public IP or domain of the server
            
        Returns:
            Dict with server configuration info
        """
        try:
            # Generate server keys if they don't exist
            if not self.server_private_key_path.exists():
                logger.info("Generating server keypair...")
                private_key, public_key = self.generate_keypair()
                
                # Save keys (use local directory for MVP without root)
                local_config_dir = Path("/app/backend/vpn/config")
                local_config_dir.mkdir(parents=True, exist_ok=True)
                
                local_private_path = local_config_dir / f"{self.interface}_private.key"
                local_public_path = local_config_dir / f"{self.interface}_public.key"
                
                local_private_path.write_text(private_key)
                local_private_path.chmod(0o600)
                local_public_path.write_text(public_key)
                
                # Update paths to local
                self.server_private_key_path = local_private_path
                self.server_public_key_path = local_public_path
                
                logger.info(f"Server keys generated and saved to {local_config_dir}")
            else:
                private_key = self.server_private_key_path.read_text().strip()
                public_key = self.server_public_key_path.read_text().strip()
            
            # Create server configuration in local directory
            local_config_dir = Path("/app/backend/vpn/config")
            local_config_dir.mkdir(parents=True, exist_ok=True)
            config_path = local_config_dir / f"{self.interface}.conf"
            
            server_config = f"""[Interface]
Address = {self.server_address}
ListenPort = {self.server_port}
PrivateKey = {private_key}
PostUp = iptables -A FORWARD -i {self.interface} -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i {self.interface} -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE

# Peers will be added here dynamically
"""
            config_path.write_text(server_config)
            config_path.chmod(0o600)
            
            logger.info(f"WireGuard server configured at {config_path} (MVP mode - config only)")
            logger.info("Note: For production, deploy on a server with root access to enable actual VPN")
            
            return {
                "interface": self.interface,
                "server_public_key": public_key,
                "server_address": self.server_address,
                "server_port": self.server_port,
                "public_endpoint": public_endpoint,
                "config_path": str(config_path),
                "mode": "mvp_config_only"
            }
            
        except Exception as e:
            logger.error(f"Failed to setup WireGuard server: {e}")
            raise
    
    def start_server(self):
        """Start WireGuard server (MVP mode - simulated)"""
        try:
            logger.info(f"WireGuard server starting in MVP mode (config generation only)")
            logger.info(f"Note: In production, this would start actual WireGuard interface {self.interface}")
            # For MVP, we just mark as "running" by creating a status file
            status_dir = Path("/app/backend/vpn/status")
            status_dir.mkdir(parents=True, exist_ok=True)
            status_file = status_dir / "server_running"
            status_file.write_text(datetime.utcnow().isoformat())
            logger.info(f"WireGuard server status: running (MVP simulation mode)")
            
        except Exception as e:
            logger.error(f"Failed to start WireGuard server: {e}")
            raise Exception("Failed to start WireGuard server")
    
    def stop_server(self):
        """Stop WireGuard server (MVP mode - simulated)"""
        try:
            logger.info(f"WireGuard server stopping (MVP mode)")
            status_file = Path("/app/backend/vpn/status/server_running")
            if status_file.exists():
                status_file.unlink()
            logger.info(f"WireGuard server stopped")
        except Exception as e:
            logger.error(f"Failed to stop WireGuard server: {e}")
            raise Exception("Failed to stop WireGuard server")
    
    def add_peer(self, peer_id: str, allowed_ips: str = None) -> Dict[str, str]:
        """
        Add a new peer (client) to WireGuard server (MVP mode - generates configs)
        
        Args:
            peer_id: Unique identifier for the peer (e.g., user wallet address)
            allowed_ips: IP address to assign to peer (auto-assigned if None)
            
        Returns:
            Dict with peer configuration including client config file content
        """
        try:
            # Generate peer keypair
            private_key, public_key = self.generate_keypair()
            psk = self.generate_preshared_key()
            
            # Auto-assign IP if not provided
            if not allowed_ips:
                # Get next available IP (simple implementation)
                peers = self.list_peers()
                next_ip = len(peers) + 2  # Start from 10.8.0.2
                allowed_ips = f"10.8.0.{next_ip}/32"
            
            # Get server public key
            if self.server_public_key_path.exists():
                server_public_key = self.server_public_key_path.read_text().strip()
            else:
                # Generate if doesn't exist
                _, server_public_key = self.generate_keypair()
            
            # Save peer info to file (no actual wg command needed for MVP)
            peer_info_path = self.peers_dir / f"{peer_id}.json"
            peer_info = {
                "peer_id": peer_id,
                "public_key": public_key,
                "allowed_ips": allowed_ips,
                "created_at": datetime.utcnow().isoformat(),
                "private_key": private_key,  # Stored for client config generation
                "preshared_key": psk
            }
            
            import json
            peer_info_path.write_text(json.dumps(peer_info, indent=2))
            
            logger.info(f"Peer {peer_id} added with IP {allowed_ips} (MVP mode - config generated)")
            
            return peer_info
            
        except Exception as e:
            logger.error(f"Failed to add peer: {e}")
            raise Exception("Failed to add peer to WireGuard")
    
    def remove_peer(self, peer_id: str):
        """
        Remove a peer from WireGuard server (MVP mode)
        
        Args:
            peer_id: Unique identifier for the peer
        """
        try:
            # Load peer info
            peer_info_path = self.peers_dir / f"{peer_id}.json"
            if not peer_info_path.exists():
                raise Exception(f"Peer {peer_id} not found")
            
            # Delete peer info file (no wg command needed for MVP)
            peer_info_path.unlink()
            
            logger.info(f"Peer {peer_id} removed (MVP mode)")
            
        except Exception as e:
            logger.error(f"Failed to remove peer: {e}")
            raise Exception("Failed to remove peer from WireGuard")
    
    def generate_client_config(self, peer_id: str, server_endpoint: str) -> str:
        """
        Generate client configuration file for a peer
        
        Args:
            peer_id: Unique identifier for the peer
            server_endpoint: Public endpoint (IP:port) of the server
            
        Returns:
            Client configuration file content
        """
        try:
            # Load peer info
            peer_info_path = self.peers_dir / f"{peer_id}.json"
            if not peer_info_path.exists():
                raise Exception(f"Peer {peer_id} not found")
            
            import json
            peer_info = json.loads(peer_info_path.read_text())
            
            # Get server public key
            server_public_key = self.server_public_key_path.read_text().strip()
            
            # Extract IP without CIDR for Address field
            client_ip = peer_info['allowed_ips'].split('/')[0]
            
            # Generate client config
            client_config = f"""[Interface]
PrivateKey = {peer_info['private_key']}
Address = {client_ip}/32
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = {server_public_key}
PresharedKey = {peer_info['preshared_key']}
Endpoint = {server_endpoint}:{self.server_port}
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
"""
            
            return client_config
            
        except Exception as e:
            logger.error(f"Failed to generate client config: {e}")
            raise
    
    def list_peers(self) -> List[Dict]:
        """
        List all connected peers (MVP mode - from JSON files)
        
        Returns:
            List of peer information
        """
        try:
            import json
            import random
            
            peers = []
            
            # Read from stored peer files
            if self.peers_dir.exists():
                for peer_file in self.peers_dir.glob("*.json"):
                    try:
                        peer_info = json.loads(peer_file.read_text())
                        # Simulate some traffic stats
                        peers.append({
                            "public_key": peer_info.get("public_key", ""),
                            "preshared_key": peer_info.get("preshared_key"),
                            "endpoint": "simulated",
                            "allowed_ips": peer_info.get("allowed_ips", ""),
                            "latest_handshake": int(datetime.utcnow().timestamp()),
                            "transfer_rx": random.randint(1000000, 100000000),  # Simulated
                            "transfer_tx": random.randint(1000000, 100000000)   # Simulated
                        })
                    except Exception as e:
                        logger.warning(f"Failed to read peer file {peer_file}: {e}")
            
            return peers
            
        except Exception as e:
            logger.error(f"Failed to list peers: {e}")
            return []
    
    def get_peer_stats(self, peer_id: str) -> Optional[Dict]:
        """
        Get traffic statistics for a specific peer
        
        Args:
            peer_id: Unique identifier for the peer
            
        Returns:
            Dict with traffic stats or None if not found
        """
        try:
            # Load peer info to get public key
            peer_info_path = self.peers_dir / f"{peer_id}.json"
            if not peer_info_path.exists():
                return None
            
            import json
            peer_info = json.loads(peer_info_path.read_text())
            public_key = peer_info['public_key']
            
            # Get all peers
            peers = self.list_peers()
            
            # Find matching peer
            for peer in peers:
                if peer['public_key'] == public_key:
                    return {
                        "peer_id": peer_id,
                        "bytes_received": peer['transfer_rx'],
                        "bytes_sent": peer['transfer_tx'],
                        "mb_received": peer['transfer_rx'] / (1024 * 1024),
                        "mb_sent": peer['transfer_tx'] / (1024 * 1024),
                        "total_mb": (peer['transfer_rx'] + peer['transfer_tx']) / (1024 * 1024),
                        "latest_handshake": peer['latest_handshake'],
                        "endpoint": peer['endpoint']
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to get peer stats: {e}")
            return None
    
    def get_server_status(self) -> Dict:
        """
        Get WireGuard server status
        
        Returns:
            Dict with server status information
        """
        try:
            result = subprocess.run(
                ["wg", "show", self.interface],
                capture_output=True,
                text=True
            )
            
            is_running = result.returncode == 0
            
            if is_running:
                peers = self.list_peers()
                return {
                    "running": True,
                    "interface": self.interface,
                    "port": self.server_port,
                    "address": self.server_address,
                    "total_peers": len(peers),
                    "active_peers": sum(1 for p in peers if p.get('endpoint'))
                }
            else:
                return {
                    "running": False,
                    "interface": self.interface
                }
                
        except Exception as e:
            logger.error(f"Failed to get server status: {e}")
            return {"running": False, "error": str(e)}
