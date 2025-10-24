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
        Set up WireGuard server configuration
        
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
                
                # Save keys
                self.config_dir.mkdir(parents=True, exist_ok=True)
                self.server_private_key_path.write_text(private_key)
                self.server_private_key_path.chmod(0o600)
                self.server_public_key_path.write_text(public_key)
                
                logger.info(f"Server keys generated and saved to {self.config_dir}")
            else:
                private_key = self.server_private_key_path.read_text().strip()
                public_key = self.server_public_key_path.read_text().strip()
            
            # Create server configuration
            config_path = self.config_dir / f"{self.interface}.conf"
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
            
            # Enable IP forwarding
            try:
                subprocess.run(["sudo", "sysctl", "-w", "net.ipv4.ip_forward=1"], check=True)
            except subprocess.CalledProcessError:
                logger.warning("Failed to enable IP forwarding with sysctl, trying alternative method")
                # Alternative: write directly to proc
                try:
                    subprocess.run(["sudo", "sh", "-c", "echo 1 > /proc/sys/net/ipv4/ip_forward"], check=True)
                except Exception as e2:
                    logger.warning(f"Could not enable IP forwarding: {e2}")
            
            logger.info(f"WireGuard server configured at {config_path}")
            
            return {
                "interface": self.interface,
                "server_public_key": public_key,
                "server_address": self.server_address,
                "server_port": self.server_port,
                "public_endpoint": public_endpoint,
                "config_path": str(config_path)
            }
            
        except Exception as e:
            logger.error(f"Failed to setup WireGuard server: {e}")
            raise
    
    def start_server(self):
        """Start WireGuard server"""
        try:
            # Check if interface is already up
            result = subprocess.run(
                ["sudo", "wg", "show", self.interface],
                capture_output=True,
                text=True
            )
            
            if result.returncode == 0:
                logger.info(f"WireGuard interface {self.interface} is already running")
                return
            
            # Bring up the interface
            subprocess.run(["sudo", "wg-quick", "up", self.interface], check=True)
            logger.info(f"WireGuard server started on {self.interface}")
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to start WireGuard server: {e}")
            raise Exception("Failed to start WireGuard server")
    
    def stop_server(self):
        """Stop WireGuard server"""
        try:
            subprocess.run(["sudo", "wg-quick", "down", self.interface], check=True)
            logger.info(f"WireGuard server stopped on {self.interface}")
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to stop WireGuard server: {e}")
            raise Exception("Failed to stop WireGuard server")
    
    def add_peer(self, peer_id: str, allowed_ips: str = None) -> Dict[str, str]:
        """
        Add a new peer (client) to WireGuard server
        
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
            server_public_key = self.server_public_key_path.read_text().strip()
            
            # Add peer to server
            subprocess.run([
                "wg", "set", self.interface,
                "peer", public_key,
                "preshared-key", "/dev/stdin",
                "allowed-ips", allowed_ips
            ], input=psk, text=True, check=True)
            
            # Save configuration
            subprocess.run(["wg-quick", "save", self.interface], check=True)
            
            # Save peer info to file
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
            
            logger.info(f"Peer {peer_id} added with IP {allowed_ips}")
            
            return peer_info
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to add peer: {e}")
            raise Exception("Failed to add peer to WireGuard")
    
    def remove_peer(self, peer_id: str):
        """
        Remove a peer from WireGuard server
        
        Args:
            peer_id: Unique identifier for the peer
        """
        try:
            # Load peer info
            peer_info_path = self.peers_dir / f"{peer_id}.json"
            if not peer_info_path.exists():
                raise Exception(f"Peer {peer_id} not found")
            
            import json
            peer_info = json.loads(peer_info_path.read_text())
            public_key = peer_info['public_key']
            
            # Remove peer from server
            subprocess.run([
                "wg", "set", self.interface,
                "peer", public_key,
                "remove"
            ], check=True)
            
            # Save configuration
            subprocess.run(["wg-quick", "save", self.interface], check=True)
            
            # Delete peer info file
            peer_info_path.unlink()
            
            logger.info(f"Peer {peer_id} removed")
            
        except subprocess.CalledProcessError as e:
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
        List all connected peers
        
        Returns:
            List of peer information
        """
        try:
            # Get peer info from wg command
            result = subprocess.run(
                ["wg", "show", self.interface, "dump"],
                capture_output=True,
                text=True,
                check=True
            )
            
            peers = []
            lines = result.stdout.strip().split('\n')
            
            # Skip first line (server info)
            for line in lines[1:]:
                if line:
                    parts = line.split('\t')
                    if len(parts) >= 6:
                        peers.append({
                            "public_key": parts[0],
                            "preshared_key": parts[1] if parts[1] != "(none)" else None,
                            "endpoint": parts[2] if parts[2] != "(none)" else None,
                            "allowed_ips": parts[3],
                            "latest_handshake": int(parts[4]),
                            "transfer_rx": int(parts[5]),
                            "transfer_tx": int(parts[6]) if len(parts) > 6 else 0
                        })
            
            return peers
            
        except subprocess.CalledProcessError as e:
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
