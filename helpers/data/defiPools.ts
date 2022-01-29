import { default as CompoundDefiPools } from "optyfi-sdk/ethereum/pools/Compound.json";
import { default as AaveV1DefiPools } from "optyfi-sdk/ethereum/pools/AaveV1.json";
import { default as AaveV2DefiPools } from "optyfi-sdk/ethereum/pools/AaveV2.json";
import { default as CurveDepositDefiPools } from "optyfi-sdk/ethereum/pools/CurveDepositPool.json";
import { default as CurveSwapDefiPools } from "optyfi-sdk/ethereum/pools/CurveSwapPool.json";
import { default as DForceDefiPools } from "optyfi-sdk/ethereum/pools/DForce.json";
import { default as FulcrumDefiPools } from "optyfi-sdk/ethereum/pools/Fulcrum.json";
import { default as HarvestDefiPools } from "optyfi-sdk/ethereum/pools/HarvestV1.json";
import { default as SushiSwapDefiPools } from "optyfi-sdk/ethereum/pools/Sushiswap.json";
import { default as ConvexDefiPools } from "optyfi-sdk/ethereum/pools/Convex.json";

import {
  AAVE_V1_ADAPTER_NAME,
  AAVE_V2_ADAPTER_NAME,
  COMPOUND_ADAPTER_NAME,
  CURVE_DEPOSIT_POOL_ADAPTER_NAME,
  CURVE_SWAP_POOL_ADAPTER_NAME,
  DFORCE_ADAPTER_NAME,
  FULCRUM_ADAPTER_NAME,
  HARVEST_V1_ADAPTER_NAME,
  SUSHISWAP_ADAPTER_NAME,
  CONVEX_ADAPTER_NAME,
} from "../constants/adapters";

import { DEFI_POOLS_DATA } from "../type";

export const TypedDefiPools: DEFI_POOLS_DATA = {
  [COMPOUND_ADAPTER_NAME]: CompoundDefiPools,
  [AAVE_V1_ADAPTER_NAME]: AaveV1DefiPools,
  [AAVE_V2_ADAPTER_NAME]: AaveV2DefiPools,
  [CURVE_DEPOSIT_POOL_ADAPTER_NAME]: CurveDepositDefiPools,
  [CURVE_SWAP_POOL_ADAPTER_NAME]: CurveSwapDefiPools,
  [DFORCE_ADAPTER_NAME]: DForceDefiPools,
  [FULCRUM_ADAPTER_NAME]: FulcrumDefiPools,
  [HARVEST_V1_ADAPTER_NAME]: HarvestDefiPools,
  [SUSHISWAP_ADAPTER_NAME]: SushiSwapDefiPools,
  [CONVEX_ADAPTER_NAME]: ConvexDefiPools,
};
