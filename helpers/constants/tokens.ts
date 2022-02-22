import { legos as PolygonLegos } from "@optyfi/defi-legos/polygon";
import { eEVMNetwork, NETWORKS_CHAIN_ID } from "../../helper-hardhat-config";
import { TypedTokens } from "../data";
import { MULTI_CHAIN_TOKENS_DATA, REWARD_TOKEN_DATA_OBJECT, TOKENS_DATA } from "../type";
import { generateTokenHashV2 } from "../helpers";

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

export const MULTI_CHAIN_VAULT_TOKENS: MULTI_CHAIN_TOKENS_DATA = {
  [eEVMNetwork.ethereum || NETWORKS_CHAIN_ID[eEVMNetwork.ethereum]]: {
    DAI: {
      address: TypedTokens["DAI"],
      pair: false,
      hash: generateTokenHashV2([TypedTokens["DAI"]], NETWORKS_CHAIN_ID[eEVMNetwork.ethereum].toString()),
    },
    USDC: {
      address: TypedTokens["USDC"],
      pair: false,
      hash: generateTokenHashV2([TypedTokens["USDC"]], NETWORKS_CHAIN_ID[eEVMNetwork.ethereum].toString()),
    },
    USDT: {
      address: TypedTokens["USDT"],
      pair: false,
      hash: generateTokenHashV2([TypedTokens["USDT"]], NETWORKS_CHAIN_ID[eEVMNetwork.ethereum].toString()),
    },
    TUSD: {
      address: TypedTokens["TUSD"],
      pair: false,
      hash: generateTokenHashV2([TypedTokens["TUSD"]], NETWORKS_CHAIN_ID[eEVMNetwork.ethereum].toString()),
    },
    WBTC: {
      address: TypedTokens["WBTC"],
      pair: false,
      hash: generateTokenHashV2([TypedTokens["WBTC"]], NETWORKS_CHAIN_ID[eEVMNetwork.ethereum].toString()),
    },
    WETH: {
      address: TypedTokens["WETH"],
      pair: false,
      hash: generateTokenHashV2([TypedTokens["WETH"]], NETWORKS_CHAIN_ID[eEVMNetwork.ethereum].toString()),
    },
    SLP_WETH_USDC: {
      address: TypedTokens["SLP_WETH_USDC"],
      pair: true,
      hash: generateTokenHashV2([TypedTokens["SLP_WETH_USDC"]], NETWORKS_CHAIN_ID[eEVMNetwork.ethereum].toString()),
    },
    MKR: {
      address: TypedTokens["MKR"],
      pair: false,
      hash: generateTokenHashV2([TypedTokens["MKR"]], NETWORKS_CHAIN_ID[eEVMNetwork.ethereum].toString()),
    },
  },
  [eEVMNetwork.matic ||
  NETWORKS_CHAIN_ID[eEVMNetwork.matic] ||
  eEVMNetwork.polygon ||
  NETWORKS_CHAIN_ID[eEVMNetwork.polygon]]: {
    USDC: {
      address: PolygonLegos.tokens.USDC,
      pair: false,
      hash: generateTokenHashV2([PolygonLegos.tokens.USDC], NETWORKS_CHAIN_ID[eEVMNetwork.matic].toString()),
    },
    DAI: {
      address: PolygonLegos.tokens.DAI,
      pair: false,
      hash: generateTokenHashV2([PolygonLegos.tokens.DAI], NETWORKS_CHAIN_ID[eEVMNetwork.matic].toString()),
    },
    ["WMATIC" || "WETH"]: {
      address: PolygonLegos.tokens.WMATIC,
      pair: false,
      hash: generateTokenHashV2([PolygonLegos.tokens.WMATIC], NETWORKS_CHAIN_ID[eEVMNetwork.matic].toString()),
    },
  },
};
