import { default as DefiPools } from "./defiPools.json";
import { default as AdapterStrategies } from "./adapter-with-strategies.json";
import { default as Strategies } from "./strategies.json";
import { default as CurveDepositPoolGauges } from "./curve-deposit-pool-gauges.json";
import { default as CurveDepositPools } from "./curve-deposit-pools.json";
import { default as CurveSwapPools } from "./curve-swap-pools.json";
import { default as Tokens } from "./tokens.json";
import { default as BtcTokens } from "./btc_tokens.json";
import { DEFI_POOLS_DATA, ADAPTER_WITH_STRATEGIES_DATA, STRATEGY, DATA_OBJECT } from "../type";

export const TypedDefiPools = DefiPools as DEFI_POOLS_DATA;
export const TypedAdapterStrategies = AdapterStrategies as ADAPTER_WITH_STRATEGIES_DATA;
export const TypedStrategies = Strategies as STRATEGY[];
export const TypedCurveDepositPoolGauges = CurveDepositPoolGauges as DATA_OBJECT;
export const TypedCurveDepositPools = CurveDepositPools as DATA_OBJECT;
export const TypedCurveSwapPools = CurveSwapPools as DATA_OBJECT;
export const TypedTokens = Tokens as DATA_OBJECT;

export const TypedBtcTokens = BtcTokens as DATA_OBJECT;
