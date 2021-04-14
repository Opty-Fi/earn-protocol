import { default as DefiPools } from "./defiPools.json";
import { default as Strategies } from "./strategies.json";
import { DEFI_POOLS_DATA, STRATEGIES_DATA } from "../utils/type";

export const TypedDefiPools = DefiPools as DEFI_POOLS_DATA;
export const TypedStrategies = Strategies as STRATEGIES_DATA;
