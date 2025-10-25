// Contract addresses and ABIs - V2
// Auto-generated at: 2025-10-25T20:37:02.861Z

export const CONTRACTS = {
  AETHTokenV2: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  MinerNodeV2: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  NodeNFT: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  ReferralProgram: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  VPNSession: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  Validator: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  PremiumVPN: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
};

export const CHAIN_ID = 31337; // Hardhat localhost
export const RPC_URL = "http://127.0.0.1:8545";

// Import ABIs
import AETHTokenV2ABI from "./AETHTokenV2.json";
import MinerNodeV2ABI from "./MinerNodeV2.json";
import NodeNFTABI from "./NodeNFT.json";
import ReferralProgramABI from "./ReferralProgram.json";
import VPNSessionABI from "./VPNSession.json";
import ValidatorABI from "./Validator.json";
import PremiumVPNABI from "./PremiumVPN.json";

export const ABIS = {
  AETHTokenV2: AETHTokenV2ABI.abi,
  MinerNodeV2: MinerNodeV2ABI.abi,
  NodeNFT: NodeNFTABI.abi,
  ReferralProgram: ReferralProgramABI.abi,
  VPNSession: VPNSessionABI.abi,
  Validator: ValidatorABI.abi,
  PremiumVPN: PremiumVPNABI.abi,
};
