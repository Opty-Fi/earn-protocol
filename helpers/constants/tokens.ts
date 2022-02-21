import { TypedTokens } from "../data";
import { REWARD_TOKEN_DATA_OBJECT, TOKENS_DATA } from "../type";
import { getSoliditySHA3Hash } from "../utils";

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
    hash: {
      "1": getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["DAI"], "1"]),
      ethereum: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["DAI"], "1"]),
      "137": getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["DAI"], "137"]),
      matic: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["DAI"], "137"]),
      polygon: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["DAI"], "137"]),
    },
  },
  USDC: {
    address: TypedTokens["USDC"],
    pair: false,
    hash: {
      "1": getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["USDC"], "1"]),
      ethereum: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["USDC"], "1"]),
      "137": getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["USDC"], "137"]),
      matic: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["USDC"], "137"]),
      polygon: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["USDC"], "137"]),
    },
  },
  USDT: {
    address: TypedTokens["USDT"],
    pair: false,
    hash: {
      "1": getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["USDT"], "1"]),
      ethereum: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["USDT"], "1"]),
      "137": getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["USDT"], "137"]),
      matic: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["USDT"], "137"]),
      polygon: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["USDT"], "137"]),
    },
  },
  TUSD: {
    address: TypedTokens["TUSD"],
    pair: false,
    hash: {
      "1": getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["TUSD"], "1"]),
      ethereum: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["TUSD"], "1"]),
      "137": getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["TUSD"], "137"]),
      matic: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["TUSD"], "137"]),
      polygon: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["TUSD"], "137"]),
    },
  },
  WBTC: {
    address: TypedTokens["WBTC"],
    pair: false,
    hash: {
      "1": getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["WBTC"], "1"]),
      ethereum: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["WBTC"], "1"]),
      "137": getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["WBTC"], "137"]),
      matic: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["WBTC"], "137"]),
      polygon: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["WBTC"], "137"]),
    },
  },
  WETH: {
    address: TypedTokens["WETH"],
    pair: false,
    hash: {
      "1": getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["WETH"], "1"]),
      ethereum: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["WETH"], "1"]),
      "137": getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["WETH"], "137"]),
      matic: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["WETH"], "137"]),
      polygon: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["WETH"], "137"]),
    },
  },
  SLP_WETH_USDC: {
    address: TypedTokens["SLP_WETH_USDC"],
    pair: true,
    hash: {
      "1": getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["SLP_WETH_USDC"], "1"]),
      ethereum: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["SLP_WETH_USDC"], "1"]),
      "137": getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["SLP_WETH_USDC"], "137"]),
      matic: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["SLP_WETH_USDC"], "137"]),
      polygon: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["SLP_WETH_USDC"], "137"]),
    },
  },
  MKR: {
    address: TypedTokens["MKR"],
    pair: false,
    hash: {
      "1": getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["MKR"], "1"]),
      ethereum: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["MKR"], "1"]),
      "137": getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["MKR"], "137"]),
      matic: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["MKR"], "137"]),
      polygon: getSoliditySHA3Hash(["address", "uint256"], [TypedTokens["MKR"], "137"]),
    },
  },
};
