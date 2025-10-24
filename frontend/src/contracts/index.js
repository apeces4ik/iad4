// Contract addresses and ABIs
export const CONTRACTS = {
  AETHToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  MinerNode: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  VPNSession: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  Validator: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
};

export const CHAIN_ID = 1337;
export const RPC_URL = "http://127.0.0.1:8545";

// Import ABIs
import AETHTokenABI from "./AETHToken.json";
import MinerNodeABI from "./MinerNode.json";
import VPNSessionABI from "./VPNSession.json";
import ValidatorABI from "./Validator.json";

export const ABIS = {
  AETHToken: AETHTokenABI.abi,
  MinerNode: MinerNodeABI.abi,
  VPNSession: VPNSessionABI.abi,
  Validator: ValidatorABI.abi,
};
