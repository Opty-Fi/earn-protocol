import { default as DaiStrategies } from "../../.opty-sdk/ethereum/DAI.json";
import { default as SlpStrategies } from "../../.opty-sdk/ethereum/SLP.json";
import { ADAPTER_WITH_STRATEGIES_DATA } from "../type";
import {
  AAVE_V1_ADAPTER_NAME,
  AAVE_V2_ADAPTER_NAME,
  COMPOUND_ADAPTER_NAME,
  CURVE_DEPOSIT_POOL_ADAPTER_NAME,
  CURVE_SWAP_POOL_ADAPTER_NAME,
  DYDX_ADAPTER_NAME,
  DFORCE_ADAPTER_NAME,
  FULCRUM_ADAPTER_NAME,
  HARVEST_V1_ADAPTER_NAME,
  YVAULT_ADAPTER_NAME,
  SUSHISWAP_ADAPTER_NAME,
} from "../constants/adapters";

export const TypedAdapterStrategies: ADAPTER_WITH_STRATEGIES_DATA = {
  [CURVE_SWAP_POOL_ADAPTER_NAME]: [DaiStrategies["DAI-DEPOSIT-CurveSwapPool-3Crv"]],
  [CURVE_DEPOSIT_POOL_ADAPTER_NAME]: [DaiStrategies["DAI-DEPOSIT-CurveDepositPool-cDAI+cUSDC"]],
  [COMPOUND_ADAPTER_NAME]: [DaiStrategies["DAI-DEPOSIT-Compound-cDAI"]],
  [AAVE_V1_ADAPTER_NAME]: [DaiStrategies["DAI-DEPOSIT-AaveV1-aDAI"]],
  [AAVE_V2_ADAPTER_NAME]: [DaiStrategies["DAI-DEPOSIT-AaveV2-aDAI"]],
  [DFORCE_ADAPTER_NAME]: [DaiStrategies["DAI-DEPOSIT-DForce-dDAI"]],
  [DYDX_ADAPTER_NAME]: [DaiStrategies["DAI-DEPOSIT-DyDx"]],
  [YVAULT_ADAPTER_NAME]: [DaiStrategies["DAI-DEPOSIT-YVault-yDAI"]],
  [FULCRUM_ADAPTER_NAME]: [DaiStrategies["DAI-DEPOSIT-Fulcrum-iDAI"]],
  [HARVEST_V1_ADAPTER_NAME]: [DaiStrategies["DAI-DEPOSIT-HarvestV1-fDAI"]],
  [SUSHISWAP_ADAPTER_NAME]: [SlpStrategies["SLP-DEPOSIT-Sushiswap"]],
};
