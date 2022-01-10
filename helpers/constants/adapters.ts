export const AAVE_V1_ADAPTER_NAME: string = "AaveV1Adapter";
export const AAVE_V2_ADAPTER_NAME: string = "AaveV2Adapter";
export const COMPOUND_ADAPTER_NAME: string = "CompoundAdapter";
export const CREAM_ADAPTER_NAME: string = "CreamAdapter";
export const CURVE_DEPOSIT_POOL_ADAPTER_NAME: string = "CurveDepositPoolAdapter";
export const CURVE_SWAP_POOL_ADAPTER_NAME: string = "CurveSwapPoolAdapter";
export const DYDX_ADAPTER_NAME: string = "DyDxAdapter";
export const DFORCE_ADAPTER_NAME: string = "DForceAdapter";
export const FULCRUM_ADAPTER_NAME: string = "FulcrumAdapter";
export const HARVEST_V1_ADAPTER_NAME: string = "HarvestV1Adapter";
export const YVAULT_ADAPTER_NAME: string = "YVaultAdapter";
export const SUSHISWAP_ADAPTER_NAME: string = "SushiswapAdapter";
export const CONVEX_ADAPTER_NAME: string = "ConvexFinanceAdapter";

export const ADAPTERS = [
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
];
export const PROTOCOLS = ADAPTERS.map(item => (item === "ConvexFinanceAdapter" ? "Convex" : item.split("Adapter")[0]));
