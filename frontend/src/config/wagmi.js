import { createConfig, http } from "wagmi";
import { mainnet, polygon, polygonMumbai } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

// Hardhat local network
const hardhat = {
  id: 1337,
  name: "Hardhat",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
    public: { http: ["http://127.0.0.1:8545"] },
  },
  testnet: true,
};

export const config = createConfig({
  chains: [hardhat, mainnet, polygon, polygonMumbai],
  connectors: [
    injected(),
    walletConnect({
      projectId: "demo-project-id",
    }),
  ],
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [polygonMumbai.id]: http(),
  },
});