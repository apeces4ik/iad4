import { createConfig, http } from "wagmi";
import { mainnet, polygon, polygonMumbai } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

export const config = createConfig({
  chains: [mainnet, polygon, polygonMumbai],
  connectors: [
    injected(),
    walletConnect({
      projectId: "demo-project-id",
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [polygonMumbai.id]: http(),
  },
});