export const AAVE_ADAPTER_NAME: string = "AaveAdapter";
export const CURVE_STABLE_SWAP_ADAPTER: string = "CurveStableSwapAdapter";
export const CURVE_GAUGE_ADAPTER: string = "CurveGaugeAdapter";
export const CURVE_METAPOOL_FACTORY_ADAPTER: string = "CurveMetapoolFactoryAdapter";

export const CURVE_ADAPTERS = [CURVE_STABLE_SWAP_ADAPTER, CURVE_GAUGE_ADAPTER, CURVE_METAPOOL_FACTORY_ADAPTER];

export const CURVE_PROTOCOLS = CURVE_ADAPTERS.map(item =>
  item === CURVE_METAPOOL_FACTORY_ADAPTER ? "CurveFactoryMetaPool" : item.split("Adapter")[0],
);

export const ADAPTERS = [AAVE_ADAPTER_NAME, ...CURVE_ADAPTERS];

export const PROTOCOLS = [AAVE_ADAPTER_NAME.split("Adapter")[0], ...CURVE_PROTOCOLS];
