"""
IPFS Service using NFT.Storage API
Handles uploading NFT metadata and images to IPFS
"""
import os
import httpx
import json
from typing import Dict, Optional
from fastapi import HTTPException


class IPFSService:
    def __init__(self):
        self.api_key = os.getenv("NFT_STORAGE_API_KEY")
        if not self.api_key:
            raise ValueError("NFT_STORAGE_API_KEY not found in environment")
        
        self.base_url = "https://api.nft.storage"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
        }
    
    async def upload_json(self, metadata: Dict) -> str:
        """
        Upload JSON metadata to IPFS via NFT.Storage
        Returns: IPFS CID (Content Identifier)
        """
        try:
            async with httpx.AsyncClient() as client:
                # NFT.Storage expects multipart/form-data with a file
                json_str = json.dumps(metadata)
                files = {
                    'file': ('metadata.json', json_str, 'application/json')
                }
                
                response = await client.post(
                    f"{self.base_url}/upload",
                    headers=self.headers,
                    files=files,
                    timeout=30.0
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"IPFS upload failed: {response.text}"
                    )
                
                data = response.json()
                cid = data.get("value", {}).get("cid")
                
                if not cid:
                    raise HTTPException(
                        status_code=500,
                        detail="Failed to get CID from NFT.Storage"
                    )
                
                return cid
        
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=500,
                detail=f"IPFS service error: {str(e)}"
            )
    
    async def upload_file(self, file_content: bytes, filename: str, content_type: str) -> str:
        """
        Upload a file (image, etc.) to IPFS
        Returns: IPFS CID
        """
        try:
            async with httpx.AsyncClient() as client:
                files = {
                    'file': (filename, file_content, content_type)
                }
                
                response = await client.post(
                    f"{self.base_url}/upload",
                    headers=self.headers,
                    files=files,
                    timeout=60.0
                )
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"File upload failed: {response.text}"
                    )
                
                data = response.json()
                cid = data.get("value", {}).get("cid")
                
                if not cid:
                    raise HTTPException(
                        status_code=500,
                        detail="Failed to get CID from NFT.Storage"
                    )
                
                return cid
        
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=500,
                detail=f"File upload error: {str(e)}"
            )
    
    def get_ipfs_url(self, cid: str) -> str:
        """
        Get the public IPFS gateway URL for a CID
        """
        return f"https://ipfs.io/ipfs/{cid}"
    
    def get_nft_storage_url(self, cid: str) -> str:
        """
        Get the NFT.Storage gateway URL (faster)
        """
        return f"https://{cid}.ipfs.nftstorage.link"
    
    async def get_metadata(self, cid: str) -> Dict:
        """
        Retrieve metadata from IPFS by CID
        """
        try:
            url = self.get_ipfs_url(cid)
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=30.0)
                
                if response.status_code != 200:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=f"Failed to fetch metadata from IPFS"
                    )
                
                return response.json()
        
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=500,
                detail=f"IPFS fetch error: {str(e)}"
            )
    
    async def check_status(self, cid: str) -> Dict:
        """
        Check the status of an uploaded file
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/check/{cid}",
                    headers=self.headers,
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    return {"status": "not_found"}
                
                return response.json()
        
        except httpx.HTTPError:
            return {"status": "error"}


# Global instance
ipfs_service = IPFSService()
