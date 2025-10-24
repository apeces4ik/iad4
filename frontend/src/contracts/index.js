// Contract addresses and ABIs
export const CONTRACTS = {
  AETHToken: "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707",
  MinerNode: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
  VPNSession: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  Validator: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
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
