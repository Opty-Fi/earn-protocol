import { default as AaveDefiPools } from "optyfi-sdk/polygon/pools/Aave.json";
import { default as CurveGaugeDefiPools } from "optyfi-sdk/polygon/pools/CurveGauge.json";
import { default as CurveStableSwapDefiPools } from "optyfi-sdk/polygon/pools/CurveStableSwap.json";
import { AAVE_ADAPTER_NAME, CURVE_GAUGE_ADAPTER, CURVE_STABLE_SWAP_ADAPTER } from "../constants/adapters-polygon";

import { DEFI_POOLS_DATA } from "../type";

export const TypedDefiPools: DEFI_POOLS_DATA = {
  [AAVE_ADAPTER_NAME]: AaveDefiPools,
  [CURVE_GAUGE_ADAPTER]: CurveGaugeDefiPools,
  [CURVE_STABLE_SWAP_ADAPTER]: CurveStableSwapDefiPools,
};
