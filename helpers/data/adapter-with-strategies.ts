import { default as DaiStrategies } from "optyfi-sdk/ethereum/strategies/dai.json";
import { default as SlpStrategies } from "optyfi-sdk/ethereum/strategies/slp.json";
import { default as UsdcStrategies } from "optyfi-sdk/ethereum/strategies/usdc.json";

import { ADAPTER_WITH_STRATEGIES_DATA, StrategiesByTokenByChainType } from "../type";
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
import { eEVMNetwork, NETWORKS_CHAIN_ID } from "../../helper-hardhat-config";

export const TypedAdapterStrategies: ADAPTER_WITH_STRATEGIES_DATA = {
  [CONVEX_ADAPTER_NAME]: [
    UsdcStrategies[
      "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveSwapPool-MIM-3LP3CRV-f-DEPOSIT-Convex-cvxMIM-3LP3CRV-f"
    ],
  ],
  [CURVE_SWAP_POOL_ADAPTER_NAME]: [DaiStrategies["dai-DEPOSIT-CurveSwapPool-3Crv"]],
  [CURVE_DEPOSIT_POOL_ADAPTER_NAME]: [DaiStrategies["dai-DEPOSIT-CurveDepositPool-cDAI+cUSDC"]],
  [COMPOUND_ADAPTER_NAME]: [DaiStrategies["dai-DEPOSIT-Compound-cDAI"]],
  [AAVE_V1_ADAPTER_NAME]: [DaiStrategies["dai-DEPOSIT-AaveV1-aDAI"]],
  [AAVE_V2_ADAPTER_NAME]: [DaiStrategies["dai-DEPOSIT-AaveV2-aDAI"]],
  [DFORCE_ADAPTER_NAME]: [DaiStrategies["dai-DEPOSIT-DForce-dDAI"]],
  [FULCRUM_ADAPTER_NAME]: [DaiStrategies["dai-DEPOSIT-Fulcrum-iDAI"]],
  [HARVEST_V1_ADAPTER_NAME]: [DaiStrategies["dai-DEPOSIT-HarvestV1-fDAI"]],
  [SUSHISWAP_ADAPTER_NAME]: [SlpStrategies["slp-DEPOSIT-Sushiswap"]],
};

export const StrategiesByTokenByChain: StrategiesByTokenByChainType = {
  [eEVMNetwork.ethereum || NETWORKS_CHAIN_ID[eEVMNetwork.ethereum]]: {
    USDC: UsdcStrategies,
    DAI: DaiStrategies,
    USDC_ETH_SLP: SlpStrategies,
  },
  [eEVMNetwork.matic || eEVMNetwork.polygon || NETWORKS_CHAIN_ID[eEVMNetwork.matic]]: {},
  [eEVMNetwork.avalanche || NETWORKS_CHAIN_ID[eEVMNetwork.avalanche]]: {},
};
