import { default as AaveDefiPools } from "optyfi-sdk/polygon/pools/Aave.json";
import { default as CurveGaugeDefiPools } from "optyfi-sdk/polygon/pools/CurveGauge.json";
import { default as CurveStableSwapDefiPools } from "optyfi-sdk/polygon/pools/CurveStableSwap.json";
import { default as CurveFactoryMetaPool } from "optyfi-sdk/polygon/pools/CurveFactoryMetaPool.json";
import {
  AAVE_ADAPTER_NAME,
  CURVE_GAUGE_ADAPTER,
  CURVE_STABLE_SWAP_ADAPTER,
  CURVE_METAPOOL_FACTORY_ADAPTER,
} from "../constants/adapters-polygon";

import { DEFI_POOLS_DATA } from "../type";

export const TypedDefiPools: DEFI_POOLS_DATA = {
  [AAVE_ADAPTER_NAME]: AaveDefiPools,
  [CURVE_GAUGE_ADAPTER]: CurveGaugeDefiPools,
  [CURVE_STABLE_SWAP_ADAPTER]: CurveStableSwapDefiPools,
  [CURVE_METAPOOL_FACTORY_ADAPTER]: CurveFactoryMetaPool,
};

export const TypedMumbaiDefiPools: DEFI_POOLS_DATA = {
  [AAVE_ADAPTER_NAME]: {
    usdc: {
      pool: "0xE6ef11C967898F9525D550014FDEdCFAB63536B5",
      lpToken: "0x2271e3Fef9e15046d09E1d78a8FF038c691E9Cf9",
      tokens: ["0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e"],
    },
    wmatic: {
      pool: "0xE6ef11C967898F9525D550014FDEdCFAB63536B5",
      lpToken: "0xF45444171435d0aCB08a8af493837eF18e86EE27",
      tokens: ["0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889"],
    },
  },
};
