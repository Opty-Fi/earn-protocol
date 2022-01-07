import { defineConfig } from "./src";
import { PROTOCOLS } from "../helpers/constants/adapters";
import { NETWORKS_ID } from "../helpers/constants/network";
export default defineConfig({
  [NETWORKS_ID.MAINNET]: {
    strategies: {
      dai: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      slp: "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0",
    },
    protocols: PROTOCOLS,
  },
});
