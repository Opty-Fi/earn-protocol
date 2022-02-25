export const AAVE_ADAPTER_NAME: string = "AaveAdapter";
export const CURVE_STABLE_SWAP_ADAPTER: string = "CurveStableSwapAdapter";
export const CURVE_GAUGE_ADAPTER: string = "CurveGaugeAdapter";

export const ADAPTERS = [AAVE_ADAPTER_NAME, CURVE_STABLE_SWAP_ADAPTER, CURVE_GAUGE_ADAPTER];
export const PROTOCOLS = ADAPTERS.map(item => item.split("Adapter")[0]);
