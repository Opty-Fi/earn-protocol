import { TypedTokens } from "../data";
import { REWARD_TOKEN_DATA_OBJECT, TOKENS_DATA } from "../type";

export const REWARD_TOKENS: REWARD_TOKEN_DATA_OBJECT = {
  CompoundAdapter: {
    tokenName: "COMP",
    tokenAddress: TypedTokens["COMP"],
    distributionActive: true,
  },
  CurveAdapter: {
    tokenName: "CRV",
    tokenAddress: TypedTokens["CRV"],
    distributionActive: true,
  },
  DForceAdapter: {
    tokenName: "DF",
    tokenAddress: TypedTokens["DF"],
    distributionActive: false,
  },
  HarvestV1Adapter: {
    tokenName: "FARM",
    tokenAddress: TypedTokens["FARM"],
    distributionActive: true,
  },
  CreamAdapter: {
    tokenName: "CREAM",
    tokenAddress: TypedTokens["CREAM"],
    distributionActive: false,
  },
  SushiswapAdapter: {
    tokenName: "SUSHI",
    tokenAddress: TypedTokens["SUSHI"],
    distributionActive: true,
  },
};

export const VAULT_TOKENS: TOKENS_DATA = {
  DAI: {
    address: TypedTokens["DAI"],
    pair: false,
  },
  USDC: {
    address: TypedTokens["USDC"],
    pair: false,
  },
  USDT: {
    address: TypedTokens["USDT"],
    pair: false,
  },
  TUSD: {
    address: TypedTokens["TUSD"],
    pair: false,
  },
  WBTC: {
    address: TypedTokens["WBTC"],
    pair: false,
  },
  WETH: {
    address: TypedTokens["WETH"],
    pair: false,
  },
  SLP_WETH_USDC: {
    address: TypedTokens["SLP_WETH_USDC"],
    pair: true,
  },
  MKR: {
    address: TypedTokens["MKR"],
    pair: false,
  },
};
