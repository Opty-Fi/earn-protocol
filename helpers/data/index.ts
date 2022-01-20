import { default as Strategies } from "./strategies.json";
import { default as Tokens } from "./plain_tokens.json";
import { default as BtcTokens } from "./btc_tokens.json";
import { default as PairTokens } from "./multi_asset_tokens.json";
import { default as CurveTokens } from "./curve_tokens.json";
import { default as TokenHolders } from "./token_holders.json";
import { default as Contracts } from "./contracts.json";
import { default as EOA } from "./eoa.json";
import { default as TokenStrategies } from "./tokenStrategies.json";

import { STRATEGY, DATA_OBJECT, MULTI_ASSET_TOKEN_DATA, CURVE_TOKEN_DATA, TOKEN_STRATEGIES } from "../type";

export const TypedStrategies = Strategies as STRATEGY[];
export const TypedTokens = Tokens as DATA_OBJECT;
export const TypedBtcTokens = BtcTokens as DATA_OBJECT;
export const TypedMultiAssetTokens = PairTokens as MULTI_ASSET_TOKEN_DATA;
export const TypedCurveTokens = CurveTokens as CURVE_TOKEN_DATA;
export const TypedTokenHolders = TokenHolders as DATA_OBJECT;
export const TypedContracts = Contracts as DATA_OBJECT;
export const TypedEOA = EOA as DATA_OBJECT;
export const TypedTokenStrategies = TokenStrategies as TOKEN_STRATEGIES;
