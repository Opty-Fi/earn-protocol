import { default as DefiPools } from "./defiPools.json";
import { default as AdapterStrategies } from "./adapter-with-strategies.json";
import { default as Strategies } from "./strategies.json";
import { DEFI_POOLS_DATA, ADAPTER_WITH_STRATEGIES_DATA, STRATEGY } from "../type";

export const TypedDefiPools = DefiPools as DEFI_POOLS_DATA;
export const TypedAdapterStrategies = AdapterStrategies as ADAPTER_WITH_STRATEGIES_DATA;
export const TypedStrategies = Strategies as STRATEGY[];
