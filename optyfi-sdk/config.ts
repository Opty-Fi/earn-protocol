import { defineConfig } from "./src";
import { PROTOCOLS as ETH_PROTOCOLS } from "../helpers/constants/adapters";
import { PROTOCOLS as POLYGON_PROTOCOLS } from "../helpers/constants/adapters-polygon";
import { NETWORKS_ID } from "../helpers/constants/network";
// import { legos as EthereumLegos } from "@optyfi/defi-legos/ethereum";
import tokens from "../helpers/data/plain_tokens.json";

export default defineConfig({
  // TODO: ONLY WORKS FOR ONE NETWORK
  [NETWORKS_ID.MAINNET]: {
    strategies: {
      usdc: tokens.USDC,
      dai: tokens.DAI,
      slp: tokens.SLP_WETH_USDC,
      weth: tokens.WETH,
    },
    protocols: ETH_PROTOCOLS,
  },
  // [NETWORKS_ID.POLYGON]: {
  //   strategies: {
  //     usdc: PolygonLegos.tokens.USDC,
  //     wmatic: PolygonLegos.tokens.WMATIC,
  //     dai: PolygonLegos.tokens.DAI,
  //     slp: PolygonLegos.tokens.SLP,
  //     weth: PolygonLegos.tokens.WETH,
  //   },
  //   protocols: POLYGON_PROTOCOLS,
  // },
});
