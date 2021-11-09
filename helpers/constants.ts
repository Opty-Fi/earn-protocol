import {
  DATA_OBJECT,
  REWARD_TOKEN_DATA_OBJECT,
  RISK_PROFILE_DATA,
  OPTY_STAKING_VAULT,
  SUPPORTED_TOKENS_DATA,
} from "./type";
import { TypedTokens } from "./data";

export const ESSENTIAL_CONTRACTS: DATA_OBJECT = {
  REGISTRY: "Registry",
  REGISTRY_PROXY: "RegistryProxy",
  INVEST_STRATEGY_REGISTRY: "InvestStrategyRegistry",
  STRATEGY_MANAGER: "StrategyManager",
  OPTY: "OPTY",
  OPTY_DISTRIBUTOR: "OPTYDistributor",
  RISK_MANAGER: "RiskManager",
  STRATEGY_PROVIDER: "StrategyProvider",
  HARVEST_CODE_PROVIDER: "HarvestCodeProvider",
  VAULT_PROXY: "InitializableImmutableAdminUpgradeabilityProxy",
  VAULT: "Vault",
  RISK_MANAGER_PROXY: "RiskManagerProxy",
  PRICE_ORACLE: "PriceOracle",
  OPTY_STAKING_VAULT: "OPTYStakingVault",
  OPTY_STAKING_RATE_BALANCER: "OPTYStakingRateBalancer",
  OPTY_STAKING_RATE_BALANCER_PROXY: "OPTYStakingRateBalancerProxy",
  APR_ORACLE: "APROracle",
  ODEFI_VAULT_BOOSTER: "ODEFIVaultBooster",
  ERC20: "ERC20",
};

export const AAVE_V1_ADAPTER_NAME: string = "AaveV1Adapter";
export const AAVE_V2_ADAPTER_NAME: string = "AaveV2Adapter";
export const COMPOUND_ADAPTER_NAME: string = "CompoundAdapter";
export const CREAM_ADAPTER_NAME: string = "CreamAdapter";
export const CURVE_DEPOSIT_POOL_ADAPTER_NAME: string = "CurveDepositPoolAdapter";
export const CURVE_SWAP_POOL_ADAPTER_NAME: string = "CurveSwapPoolAdapter";
export const DYDX_ADAPTER_NAME = "DyDxAdapter";
export const DFORCE_ADAPTER_NAME = "DForceAdapter";
export const FULCRUM_ADAPTER_NAME = "FulcrumAdapter";
export const HARVEST_V1_ADAPTER_NAME = "HarvestV1Adapter";
export const YVAULT_ADAPTER_NAME = "YVaultAdapter";
export const SUSHISWAP_ADAPTER_NAME = "SushiswapAdapter";

export const ADAPTERS = [
  AAVE_V1_ADAPTER_NAME,
  AAVE_V2_ADAPTER_NAME,
  COMPOUND_ADAPTER_NAME,
  CREAM_ADAPTER_NAME,
  CURVE_DEPOSIT_POOL_ADAPTER_NAME,
  CURVE_SWAP_POOL_ADAPTER_NAME,
  DYDX_ADAPTER_NAME,
  DFORCE_ADAPTER_NAME,
  FULCRUM_ADAPTER_NAME,
  HARVEST_V1_ADAPTER_NAME,
  YVAULT_ADAPTER_NAME,
  SUSHISWAP_ADAPTER_NAME,
];

export const VAULT_TOKENS: DATA_OBJECT = {
  DAI: TypedTokens["DAI"],
  USDC: TypedTokens["USDC"],
  USDT: TypedTokens["USDT"],
  WBTC: TypedTokens["WBTC"],
  WETH: TypedTokens["WETH"],
  CHI: TypedTokens["CHI"],
  SLP_WETH_USDC: TypedTokens["SLP_WETH_USDC"],
};

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

export const TESTING_CONTRACTS: DATA_OBJECT = {
  TESTING_EMERGENCY_BRAKE: "TestEmergencyBrake",
  TEST_DUMMY_TOKEN: "TestDummyToken",
  TEST_DUMMY_TOKEN_TRANSFER_FEE: "TestDummyTokenTransferFee",
  TEST_DUMMY_EMPTY_CONTRACT: "TestDummyEmptyContract",
  TESTING_DEFI_ADAPTER: "TestDeFiAdapter",
  TESTING_HARVEST_CODE_PROVIDER: "TestHarvestCodeProvider",
  TEST_REGISTRY_NEW_IMPLEMENTATION: "TestRegistryNewImplementation",
  TEST_RISK_MANAGER_NEW_IMPLEMENTATION: "TestRiskManagerNewImplementation",
  TEST_OPTY_STAKING_RATE_BALANCER_NEW_IMPLEMENTATION: "TestOptyStakingRateBalancerNewImplementation",
  TEST_VAULT_NEW_IMPLEMENTATION: "TestVaultNewImplementation",
  TEST_STRATEGY_MANAGER: "TestStrategyManager",
  TEST_STAKING_RATE_BALANCER: "TestOPTYStakingRateBalancer",
};

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

export const ZERO_BYTES32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

export const RISK_PROFILES: RISK_PROFILE_DATA = [
  {
    code: 0,
    name: "RP0",
    symbol: "RP0",
    canBorrow: false,
    poolRating: [0, 5],
  },
  {
    code: 1,
    name: "Basic",
    symbol: "bas",
    canBorrow: false,
    poolRating: [0, 10],
  },
  {
    code: 2,
    name: "Intermediate",
    symbol: "int",
    canBorrow: true,
    poolRating: [0, 20],
  },
  {
    code: 3,
    name: "Advanced",
    symbol: "adv",
    canBorrow: true,
    poolRating: [0, 30],
  },
];

export const TESTING_DEPLOYMENT_ONCE = false; // accept deploy contracts once for testing

export const OPTY_STAKING_VAULTS: OPTY_STAKING_VAULT[] = [
  {
    name: "optyStakingVault1D",
    numberOfDays: "1D",
    lockTime: 86400,
    multiplier: 10000,
  },
  {
    name: "optyStakingVault30D",
    numberOfDays: "30D",
    lockTime: 2592000,
    multiplier: 12000,
  },
  {
    name: "optyStakingVault60D",
    numberOfDays: "60D",
    lockTime: 5184000,
    multiplier: 15000,
  },
  {
    name: "optyStakingVault180D",
    numberOfDays: "180D",
    lockTime: 15552000,
    multiplier: 20000,
  },
];
export const TOKEN_HOLDERS: DATA_OBJECT = {
  CRETH2: "0x66692b8e2a9543e1f83d681f6ef535ca60a0a655",
  UNI_V2_ETH_USDT: "0x888e1b67bfb11d6a68c43a6af939b89d8defb2bb",
  UNI_V2_USDC_ETH: "0xece09032ef138573714beec20aacdd10f76b2b8a",
  UNI_V2_WBTC_ETH: "0x92c96306289a7322174d6e091b9e36b14210e4f5",
  UNI_V2_DAI_ETH: "0x79317fc0fb17bc0ce213a2b50f343e4d4c277704",
  XSUSHI: "0xf977814e90da44bfa03b6295a0616a897441acec",
  BBADGER: "0x108a8b7200d044bbbe95bef6f671baec5473e05f",
  YVCURVE_IB: "0xd6d16b110ea9173d7ceb6cfe8ca4060749a75f5c",
  YVCURVE_SETH: "0x69ad95b08f3bdb60de1cf3f08d76c9a2819a76d3",
  YVCURVE_STETH: "0x7ccc9481fbca38091044194982575f305d3e9e22",
  VVSP: "0xdbc13e67f678cc00591920cece4dca6322a79ac7",
  YVWETH: "0x28b8ea972a2eeb21c7b6cbf7182f7849ffab31b8",
  YUSD: "0x7a15866affd2149189aa52eb8b40a8f9166441d9",
  IBBTC: "0x1d5e65a087ebc3d03a294412e46ce5d6882969f4",
  USDK: "0xd30b438df65f4f788563b2b3611bd6059bff4ad9",
  LINKUSD: "0x8375a41c445df074709eefa1f4aefee5b8b15c59",
  SBTC: "0x7e935fac4448102c16fa83abc01ac57d38123dca",
  CRV_REN_BTC_WBTC_SBTC: "0x545946fcae98afb4333b788b8f530046eb8ed997",
  SEUR: "0x16b8cc5b1558b365d9844385425b13bde0ceaa49",
  CRV_REN_WBTC: "0x1ddDf789Ca75AC8BB4C146FbcF60041d2af3327E",
  STE_CRV: "0x56c915758ad3f76fd287fff7563ee313142fb663",
  ADAI: "0xdb7030beb1c07668aa49ea32fbe0282fe8e9d12f",
  AUSDC: "0x602d9abd5671d24026e2ca473903ff2a9a957407",
  AUSDT: "0x49069b69af418de925e07ffa16092ca9d5623ad6",
  SLINK: "0x45899a8104cda54deabadda505f0bba68223f631",
  RETH: "0xf8a8199c832256d0ea397cb96e8a766ff97d7985",
  CYDAI: "0x431e81e5dfb5a24541b5ff8762bdef3f32f96354",
  CYUSDC: "0x431e81e5dfb5a24541b5ff8762bdef3f32f96354",
  CYUSDT: "0x431e81e5dfb5a24541b5ff8762bdef3f32f96354",
  ASUSD: "0x9ff797e6076b27d9218327ebcdb5e4faf41ce800",
};

export enum MAX_DEPOSIT_MODE {
  number,
  pct,
}

export const UPGRADABLE_CONTRACTS = [ESSENTIAL_CONTRACTS.REGISTRY, ESSENTIAL_CONTRACTS.RISK_MANAGER];

export const CONTRACT_ADDRESSES: DATA_OBJECT = {
  COMPOUND_COMPTROLLER: "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B",
  UNISWAPV2_ROUTER: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
  SUSHISWAP_ROUTER: "0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F",
  AAVE_V1_LENDING_POOL: "0x398eC7346DcD622eDc5ae82352F02bE94C62d119",
  AAVE_V1_LENDING_POOL_CORE: "0x3dfd23A6c5E8BbcFc9581d2E864a68feb6a076d3",
  AAVE_V1_PRICE_ORACLE: "0x76B47460d7F7c5222cFb6b6A75615ab10895DDe4",
  CURVE_REGISTRY_ADDRESS: "0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5",
  AAVE_V2_PRICE_ORACLE: "0xA50ba011c48153De246E5192C8f9258A2ba79Ca9",
  AAVE_V2_LENDING_POOL: "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9",
  AAVE_V2_PROTOCOL_DATA_PROVIDER: "0x057835Ad21a177dbdd3090bB1CAE03EaCF78Fc6d",
  CURVE_REGISTRY: "0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5",
  HARVEST_CONTROLLER: "0x3cC47874dC50D98425ec79e647d83495637C55e3",
  SUSHI_MASTER_CHEF: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
};

export const HARVEST_GOVERNANCE = "0xf00dD244228F51547f0563e60bCa65a30FBF5f7f";

export const SUPPORTED_TOKENS: SUPPORTED_TOKENS_DATA = {
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
};
