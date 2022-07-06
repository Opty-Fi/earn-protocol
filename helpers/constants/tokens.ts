import { legos as PolygonLegos } from "@optyfi/defi-legos/polygon";
import { eEVMNetwork, NETWORKS_CHAIN_ID, NETWORKS_CHAIN_ID_HEX } from "../../helper-hardhat-config";
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
  SushiswapMasterChefV1Adapter: {
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

const ethereumTokens = {
  DAI: {
    address: TypedTokens["DAI"],
    pair: false,
    hash: generateTokenHashV2([TypedTokens["DAI"]], NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mainnet]),
  },
  USDC: {
    address: TypedTokens["USDC"],
    pair: false,
    hash: generateTokenHashV2([TypedTokens["USDC"]], NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mainnet]),
  },
  USDT: {
    address: TypedTokens["USDT"],
    pair: false,
    hash: generateTokenHashV2([TypedTokens["USDT"]], NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mainnet]),
  },
  TUSD: {
    address: TypedTokens["TUSD"],
    pair: false,
    hash: generateTokenHashV2([TypedTokens["TUSD"]], NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mainnet]),
  },
  WBTC: {
    address: TypedTokens["WBTC"],
    pair: false,
    hash: generateTokenHashV2([TypedTokens["WBTC"]], NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mainnet]),
  },
  WETH: {
    address: TypedTokens["WETH"],
    pair: false,
    hash: generateTokenHashV2([TypedTokens["WETH"]], NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mainnet]),
  },
  SLP_WETH_USDC: {
    address: TypedTokens["SLP_WETH_USDC"],
    pair: true,
    hash: generateTokenHashV2([TypedTokens["SLP_WETH_USDC"]], NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mainnet]),
  },
  MKR: {
    address: TypedTokens["MKR"],
    pair: false,
    hash: generateTokenHashV2([TypedTokens["MKR"]], NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mainnet]),
  },
  NEWO: {
    address: TypedTokens["NEWO"],
    pair: false,
    hash: generateTokenHashV2([TypedTokens["NEWO"]], NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mainnet]),
  },
  AAVE: {
    address: TypedTokens["AAVE"],
    pair: false,
    hash: generateTokenHashV2([TypedTokens["AAVE"]], NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mainnet]),
  },
  ILV: {
    address: TypedTokens["ILV"],
    pair: false,
    hash: generateTokenHashV2([TypedTokens["ILV"]], NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mainnet]),
  },
  APE: {
    address: TypedTokens["APE"],
    pair: false,
    hash: generateTokenHashV2([TypedTokens["APE"]], NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mainnet]),
  },
  SUSHI: {
    address: TypedTokens["SUSHI"],
    pair: false,
    hash: generateTokenHashV2([TypedTokens["SUSHI"]], NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mainnet]),
  },
};

const polygonTokens = {
  USDC: {
    address: PolygonLegos.tokens.USDC,
    pair: false,
    hash: generateTokenHashV2([PolygonLegos.tokens.USDC], NETWORKS_CHAIN_ID_HEX[eEVMNetwork.polygon]),
  },
  DAI: {
    address: PolygonLegos.tokens.DAI,
    pair: false,
    hash: generateTokenHashV2([PolygonLegos.tokens.DAI], NETWORKS_CHAIN_ID_HEX[eEVMNetwork.polygon]),
  },
  WMATIC: {
    address: PolygonLegos.tokens.WMATIC,
    pair: false,
    hash: generateTokenHashV2([PolygonLegos.tokens.WMATIC], NETWORKS_CHAIN_ID_HEX[eEVMNetwork.polygon]),
  },
  WETH: {
    address: PolygonLegos.tokens.WETH,
    pair: false,
    hash: generateTokenHashV2([PolygonLegos.tokens.WETH], NETWORKS_CHAIN_ID_HEX[eEVMNetwork.polygon]),
  },
};

const kovanTokens = {
  USDC: {
    address: "0xe22da380ee6b445bb8273c81944adeb6e8450422",
    pair: false,
    hash: generateTokenHashV2(["0xe22da380ee6b445bb8273c81944adeb6e8450422"], NETWORKS_CHAIN_ID_HEX[eEVMNetwork.kovan]),
  },
};

const mumbaiTokens = {
  USDC: {
    address: "0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e",
    pair: false,
    hash: generateTokenHashV2(
      ["0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e"],
      NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mumbai],
    ),
  },
};

const avalancheTokens = {
  USDC: {
    address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    pair: false,
    hash: generateTokenHashV2(
      ["0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E"],
      NETWORKS_CHAIN_ID_HEX[eEVMNetwork.avalanche],
    ),
  },
  USDCe: {
    address: "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
    pair: false,
    hash: generateTokenHashV2(
      ["0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664"],
      NETWORKS_CHAIN_ID_HEX[eEVMNetwork.avalanche],
    ),
  },
  WAVAX: {
    address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    pair: false,
    hash: generateTokenHashV2(
      ["0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7"],
      NETWORKS_CHAIN_ID_HEX[eEVMNetwork.avalanche],
    ),
  },
};

export const MULTI_CHAIN_VAULT_TOKENS: MULTI_CHAIN_TOKENS_DATA = {
  [eEVMNetwork.mainnet]: ethereumTokens,
  [NETWORKS_CHAIN_ID[eEVMNetwork.mainnet]]: ethereumTokens,
  [NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mainnet]]: ethereumTokens,
  [eEVMNetwork.polygon]: polygonTokens,
  [NETWORKS_CHAIN_ID[eEVMNetwork.polygon]]: polygonTokens,
  [NETWORKS_CHAIN_ID_HEX[eEVMNetwork.polygon]]: polygonTokens,
  [eEVMNetwork.mumbai]: mumbaiTokens,
  [NETWORKS_CHAIN_ID[eEVMNetwork.mumbai]]: mumbaiTokens,
  [NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mumbai]]: mumbaiTokens,
  [eEVMNetwork.kovan]: kovanTokens,
  [NETWORKS_CHAIN_ID[eEVMNetwork.kovan]]: kovanTokens,
  [NETWORKS_CHAIN_ID_HEX[eEVMNetwork.kovan]]: kovanTokens,
  [eEVMNetwork.avalanche]: avalancheTokens,
  [NETWORKS_CHAIN_ID[eEVMNetwork.avalanche]]: avalancheTokens,
  [NETWORKS_CHAIN_ID_HEX[eEVMNetwork.avalanche]]: avalancheTokens,
};
