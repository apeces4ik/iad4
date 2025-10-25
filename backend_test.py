#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Aetherium VPN - Blockchain Integration
Tests all blockchain endpoints and existing API routes
"""

import requests
import json
import os
from datetime import datetime
import time

# Configuration
BACKEND_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://node-network-1.preview.emergentagent.com')
API_BASE = f"{BACKEND_URL}/api"

# Test addresses from Hardhat (first few accounts)
TEST_ADDRESSES = [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",  # Account 0
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",  # Account 1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",  # Account 2
]

# Expected contract addresses (V2)
EXPECTED_CONTRACTS_V2 = {
    "aethTokenV2": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "minerNodeV2": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "nodeNFT": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    "referralProgram": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
    "vpnSession": "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
    "validator": "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
    "premiumVPN": "0x0165878A594ca255338adfa4d48449f69242Eb8F"
}

# Legacy contract addresses (for backward compatibility)
EXPECTED_CONTRACTS = {
    "aethToken": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "minerNode": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "vpnSession": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    "validator": "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
}

class TestResults:
    def __init__(self):
        self.passed = []
        self.failed = []
        self.warnings = []
    
    def add_pass(self, test_name, details=""):
        self.passed.append(f"✅ {test_name}" + (f" - {details}" if details else ""))
    
    def add_fail(self, test_name, error):
        self.failed.append(f"❌ {test_name} - ERROR: {error}")
    
    def add_warning(self, test_name, warning):
        self.warnings.append(f"⚠️  {test_name} - WARNING: {warning}")
    
    def print_summary(self):
        print("\n" + "="*80)
        print("BACKEND TEST RESULTS SUMMARY")
        print("="*80)
        
        if self.failed:
            print(f"\n🔴 FAILED TESTS ({len(self.failed)}):")
            for fail in self.failed:
                print(f"  {fail}")
        
        if self.warnings:
            print(f"\n🟡 WARNINGS ({len(self.warnings)}):")
            for warning in self.warnings:
                print(f"  {warning}")
        
        if self.passed:
            print(f"\n🟢 PASSED TESTS ({len(self.passed)}):")
            for pass_test in self.passed:
                print(f"  {pass_test}")
        
        print(f"\nOVERALL: {len(self.passed)} passed, {len(self.failed)} failed, {len(self.warnings)} warnings")
        print("="*80)

def test_health_check(results):
    """Test basic API health check"""
    print("\n🔍 Testing Health Check...")
    try:
        response = requests.get(f"{API_BASE}/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "operational":
                results.add_pass("Health Check", f"API operational - {data.get('message')}")
            else:
                results.add_warning("Health Check", f"Unexpected status: {data}")
        else:
            results.add_fail("Health Check", f"HTTP {response.status_code}")
    except Exception as e:
        results.add_fail("Health Check", str(e))

def test_blockchain_status(results):
    """Test blockchain connection status"""
    print("\n🔍 Testing Blockchain Status...")
    try:
        response = requests.get(f"{API_BASE}/blockchain/status", timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            # Check connection
            if data.get("connected"):
                results.add_pass("Blockchain Connection", "Connected to Hardhat node")
            else:
                results.add_fail("Blockchain Connection", "Not connected to blockchain")
                return
            
            # Check contracts (V2 format)
            contracts = data.get("contracts", {})
            for contract_name, expected_addr in EXPECTED_CONTRACTS_V2.items():
                actual_addr = contracts.get(contract_name)
                if actual_addr == expected_addr:
                    results.add_pass(f"Contract Address - {contract_name}", f"Correct: {actual_addr}")
                else:
                    results.add_fail(f"Contract Address - {contract_name}", 
                                   f"Expected {expected_addr}, got {actual_addr}")
        else:
            results.add_fail("Blockchain Status", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Blockchain Status", str(e))

def test_blockchain_contracts(results):
    """Test contracts endpoint"""
    print("\n🔍 Testing Blockchain Contracts Endpoint...")
    try:
        response = requests.get(f"{API_BASE}/blockchain/contracts", timeout=10)
        if response.status_code == 200:
            data = response.json()
            
            # Verify all expected contracts are present
            for contract_name, expected_addr in EXPECTED_CONTRACTS.items():
                if contract_name in data and data[contract_name] == expected_addr:
                    results.add_pass(f"Contracts Endpoint - {contract_name}", "Address correct")
                else:
                    results.add_fail(f"Contracts Endpoint - {contract_name}", 
                                   f"Missing or incorrect address")
            
            # Check RPC URL
            if "rpcUrl" in data:
                results.add_pass("Contracts Endpoint - RPC URL", f"Present: {data['rpcUrl']}")
            else:
                results.add_warning("Contracts Endpoint - RPC URL", "RPC URL not returned")
        else:
            results.add_fail("Contracts Endpoint", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Contracts Endpoint", str(e))

def test_balance_endpoints(results):
    """Test balance endpoints with valid and invalid addresses"""
    print("\n🔍 Testing Balance Endpoints...")
    
    # Test with valid address
    test_address = TEST_ADDRESSES[0]
    try:
        response = requests.get(f"{API_BASE}/blockchain/balance/{test_address}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            required_fields = ["address", "balance", "staked", "pendingRewards"]
            
            for field in required_fields:
                if field in data:
                    results.add_pass(f"Balance Endpoint - {field}", f"Present: {data[field]}")
                else:
                    results.add_fail(f"Balance Endpoint - {field}", "Missing field")
            
            # Verify address matches
            if data.get("address") == test_address:
                results.add_pass("Balance Endpoint - Address Match", "Correct address returned")
            else:
                results.add_fail("Balance Endpoint - Address Match", 
                               f"Expected {test_address}, got {data.get('address')}")
        else:
            results.add_fail("Balance Endpoint - Valid Address", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Balance Endpoint - Valid Address", str(e))
    
    # Test with invalid address format
    try:
        invalid_address = "invalid_address"
        response = requests.get(f"{API_BASE}/blockchain/balance/{invalid_address}", timeout=10)
        if response.status_code == 500:
            results.add_pass("Balance Endpoint - Invalid Address", "Properly handles invalid address")
        else:
            results.add_warning("Balance Endpoint - Invalid Address", 
                              f"Expected 500, got {response.status_code}")
    except Exception as e:
        results.add_warning("Balance Endpoint - Invalid Address", f"Error testing invalid address: {e}")

def test_node_endpoints(results):
    """Test node-related endpoints"""
    print("\n🔍 Testing Node Endpoints...")
    
    # Test getting nodes for an address (should return empty array for new address)
    test_address = TEST_ADDRESSES[0]
    try:
        response = requests.get(f"{API_BASE}/blockchain/nodes/owner/{test_address}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "nodes" in data and isinstance(data["nodes"], list):
                results.add_pass("Node Owner Endpoint", f"Returns nodes array: {len(data['nodes'])} nodes")
            else:
                results.add_fail("Node Owner Endpoint", "Invalid response format")
        else:
            results.add_fail("Node Owner Endpoint", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Node Owner Endpoint", str(e))

def test_session_endpoints(results):
    """Test session-related endpoints"""
    print("\n🔍 Testing Session Endpoints...")
    
    # Test getting sessions for a user (should return empty array for new address)
    test_address = TEST_ADDRESSES[0]
    try:
        response = requests.get(f"{API_BASE}/blockchain/sessions/user/{test_address}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "sessions" in data and isinstance(data["sessions"], list):
                results.add_pass("User Sessions Endpoint", f"Returns sessions array: {len(data['sessions'])} sessions")
            else:
                results.add_fail("User Sessions Endpoint", "Invalid response format")
        else:
            results.add_fail("User Sessions Endpoint", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("User Sessions Endpoint", str(e))

def test_validator_endpoints(results):
    """Test validator-related endpoints"""
    print("\n🔍 Testing Validator Endpoints...")
    
    # Test getting validator info for non-validator address
    test_address = TEST_ADDRESSES[0]
    try:
        response = requests.get(f"{API_BASE}/blockchain/validator/{test_address}", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if "isValidator" in data:
                if data["isValidator"] == False:
                    results.add_pass("Validator Endpoint - Non-Validator", "Correctly returns isValidator: false")
                else:
                    results.add_warning("Validator Endpoint - Non-Validator", 
                                      f"Unexpected validator status: {data}")
            else:
                results.add_fail("Validator Endpoint - Non-Validator", "Missing isValidator field")
        else:
            results.add_fail("Validator Endpoint", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Validator Endpoint", str(e))

def test_wallet_connection(results):
    """Test wallet connection endpoint (no auth required)"""
    print("\n🔍 Testing Wallet Connection...")
    
    try:
        payload = {
            "wallet_address": TEST_ADDRESSES[0],
            "signature": "mock_signature_for_testing",
            "message": "Connect to Aetherium VPN"
        }
        
        response = requests.post(f"{API_BASE}/auth/connect-wallet", 
                               json=payload, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            if "token" in data and "user" in data:
                results.add_pass("Wallet Connection", "Successfully connected wallet and received token")
                return data["token"]  # Return token for authenticated tests
            else:
                results.add_fail("Wallet Connection", "Missing token or user in response")
        else:
            results.add_fail("Wallet Connection", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Wallet Connection", str(e))
    
    return None

def test_dashboard_stats(results, token):
    """Test dashboard stats endpoint (requires authentication)"""
    print("\n🔍 Testing Dashboard Stats...")
    
    if not token:
        results.add_warning("Dashboard Stats", "Skipped - no auth token available")
        return
    
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}/dashboard/stats", 
                              headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            required_fields = ["aeth_balance", "staked_aeth", "total_earnings", 
                             "active_nodes", "total_data_shared"]
            
            for field in required_fields:
                if field in data:
                    results.add_pass(f"Dashboard Stats - {field}", f"Present: {data[field]}")
                else:
                    results.add_fail(f"Dashboard Stats - {field}", "Missing field")
        else:
            results.add_fail("Dashboard Stats", f"HTTP {response.status_code}: {response.text}")
    except Exception as e:
        results.add_fail("Dashboard Stats", str(e))

def main():
    """Run all backend tests"""
    print("🚀 Starting Aetherium VPN Backend Testing")
    print(f"📡 Backend URL: {BACKEND_URL}")
    print(f"🔗 API Base: {API_BASE}")
    
    results = TestResults()
    
    # Test basic functionality
    test_health_check(results)
    
    # Test blockchain integration
    test_blockchain_status(results)
    test_blockchain_contracts(results)
    test_balance_endpoints(results)
    test_node_endpoints(results)
    test_session_endpoints(results)
    test_validator_endpoints(results)
    
    # Test existing API functionality
    token = test_wallet_connection(results)
    test_dashboard_stats(results, token)
    
    # Print comprehensive results
    results.print_summary()
    
    # Return exit code based on results
    if results.failed:
        print(f"\n❌ Testing completed with {len(results.failed)} failures")
        return 1
    else:
        print(f"\n✅ All tests passed successfully!")
        return 0

if __name__ == "__main__":
    exit(main())