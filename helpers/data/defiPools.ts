import { default as CompoundDefiPools } from "../../.optyfi-sdk/ethereum/Compound.json";
import { default as AaveV1DefiPools } from "../../.optyfi-sdk/ethereum/AaveV1.json";
import { default as AaveV2DefiPools } from "../../.optyfi-sdk/ethereum/AaveV2.json";
import { default as CreamDefiPools } from "../../.optyfi-sdk/ethereum/Cream.json";
import { default as CurveDepositDefiPools } from "../../.optyfi-sdk/ethereum/CurveDepositPool.json";
import { default as CurveSwapDefiPools } from "../../.optyfi-sdk/ethereum/CurveSwapPool.json";
import { default as DForceDefiPools } from "../../.optyfi-sdk/ethereum/DForce.json";
import { default as DyDxDefiPools } from "../../.optyfi-sdk/ethereum/DyDx.json";
import { default as FulcrumDefiPools } from "../../.optyfi-sdk/ethereum/Fulcrum.json";
import { default as HarvestDefiPools } from "../../.optyfi-sdk/ethereum/HarvestV1.json";
import { default as SushiSwapDefiPools } from "../../.optyfi-sdk/ethereum/Sushiswap.json";
import { default as YVaultDefiPools } from "../../.optyfi-sdk/ethereum/YVault.json";

import {
  AAVE_V1_ADAPTER_NAME,
  AAVE_V2_ADAPTER_NAME,
  COMPOUND_ADAPTER_NAME,
  CREAM_ADAPTER_NAME,
  CURVE_DEPOSIT_POOL_ADAPTER_NAME,
  CURVE_SWAP_POOL_ADAPTER_NAME,
  DYDX_ADAPTER_NAME,
  DFORCE_ADAPTER_NAME,
  FULCRUM_ADAPTER_NAME,
  HARVEST_V1_ADAPTER_NAME,
  YVAULT_ADAPTER_NAME,
  SUSHISWAP_ADAPTER_NAME,
  CONVEX_ADAPTER_NAME,
} from "../constants/adapters";

import { DEFI_POOLS_DATA } from "../type";

export const TypedDefiPools: DEFI_POOLS_DATA = {
  [COMPOUND_ADAPTER_NAME]: CompoundDefiPools,
  [AAVE_V1_ADAPTER_NAME]: AaveV1DefiPools,
  [AAVE_V2_ADAPTER_NAME]: AaveV2DefiPools,
  [CREAM_ADAPTER_NAME]: CreamDefiPools,
  [CURVE_DEPOSIT_POOL_ADAPTER_NAME]: CurveDepositDefiPools,
  [CURVE_SWAP_POOL_ADAPTER_NAME]: CurveSwapDefiPools,
  [DYDX_ADAPTER_NAME]: DyDxDefiPools,
  [DFORCE_ADAPTER_NAME]: DForceDefiPools,
  [FULCRUM_ADAPTER_NAME]: FulcrumDefiPools,
  [HARVEST_V1_ADAPTER_NAME]: HarvestDefiPools,
  [YVAULT_ADAPTER_NAME]: YVaultDefiPools,
  [SUSHISWAP_ADAPTER_NAME]: SushiSwapDefiPools,
};
