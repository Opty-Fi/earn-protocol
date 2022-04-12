import { defineConfig } from "./src";
import { PROTOCOLS as ETH_PROTOCOLS } from "../helpers/constants/adapters";
import { PROTOCOLS as POLYGON_PROTOCOLS } from "../helpers/constants/adapters-polygon";
import { NETWORKS_ID } from "../helpers/constants/network";
import { legos as PolygonLegos } from "@optyfi/defi-legos/polygon";

export default defineConfig({
  // TODO: ONLY WORKS FOR ONE NETWORK
  // [NETWORKS_ID.MAINNET]: {
  //   strategies: {
  //     dai: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  //     usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  //     slp: "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0",
  //   },
  //   protocols: ETH_PROTOCOLS,
  // },
  [NETWORKS_ID.POLYGON]: {
    strategies: {
      usdc: PolygonLegos.tokens.USDC,
      wmatic: PolygonLegos.tokens.WMATIC,
      dai: PolygonLegos.tokens.DAI,
      slp: PolygonLegos.tokens.SLP,
      weth: PolygonLegos.tokens.WETH,
    },
    protocols: POLYGON_PROTOCOLS,
  },
});
