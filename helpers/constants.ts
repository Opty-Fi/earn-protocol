import { DATA_OBJECT, REWARD_TOKEN_DATA_OBJECT, RISK_PROFILE_DATA } from "./type";
import { TypedTokens } from "./data";
export const ESSENTIAL_CONTRACTS: DATA_OBJECT = {
  REGISTRY: "Registry",
  REGISTRY_PROXY: "RegistryProxy",
  VAULT_STEP_INVEST_STRATEGY_DEFINITION_REGISTRY: "VaultStepInvestStrategyDefinitionRegistry",
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
export const HARVEST_ADAPTER_NAME = "HarvestAdapter";
export const YVAULT_ADAPTER_NAME = "YVaultAdapter";
export const SUSHISWAP_ADAPTER_NAME = "SushiswapAdapter";

export const ADAPTER = [
  AAVE_V1_ADAPTER_NAME,
  AAVE_V2_ADAPTER_NAME,
  COMPOUND_ADAPTER_NAME,
  CREAM_ADAPTER_NAME,
  CURVE_DEPOSIT_POOL_ADAPTER_NAME,
  CURVE_SWAP_POOL_ADAPTER_NAME,
  DYDX_ADAPTER_NAME,
  DFORCE_ADAPTER_NAME,
  FULCRUM_ADAPTER_NAME,
  HARVEST_ADAPTER_NAME,
  YVAULT_ADAPTER_NAME,
  SUSHISWAP_ADAPTER_NAME,
];

export const TOKENS: DATA_OBJECT = {
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
  HarvestAdapter: {
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
};

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

export const RISK_PROFILES: RISK_PROFILE_DATA = {
  RP0: {
    name: "RP0",
    canBorrow: false,
    poolRating: [0, 0],
  },
  RP1: {
    name: "RP1",
    canBorrow: false,
    poolRating: [0, 10],
  },
  RP2: {
    name: "RP2",
    canBorrow: true,
    poolRating: [0, 20],
  },
  RP3: {
    name: "RP3",
    canBorrow: true,
    poolRating: [0, 30],
  },
};

export const TESTING_DEPLOYMENT_ONCE = false; // accept deploy contracts once for testing

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const MAPPING_CURVE_SWAP_DATA = [
  {
    swap: "COMPOUND_SWAP_POOL",
    lpToken: "CDAI_CUSDC",
    tokens: ["CDAI", "CUSDC"],
    gauges: "COMPOUND_GAUGE",
  },
  {
    swap: "USDT_SWAP_POOL",
    lpToken: "CDAI_CUSDC_CUSDT",
    tokens: ["CDAI", "CUSDC", "USDT"],
    gauges: "USDT_GAUGE",
  },
  {
    swap: "PAX_SWAP_POOL",
    lpToken: "Y_PAX_CRV",
    tokens: ["YCDAI", "YCUSDC", "YCUSDT", "PAX"],
    gauges: "PAX_GAUGE",
  },
  {
    swap: "Y_SWAP_POOL",
    lpToken: "YDAI_YUSDC_YUSDT_YTUSD",
    tokens: ["YDAI", "YUSDC", "YUSDT", "YTUSD"],
    gauges: "Y_GAUGE",
  },
  {
    swap: "BUSD_SWAP_POOL",
    lpToken: "YDAI_YUSDC_YUSDT_YBUSD",
    tokens: ["YDAI", "YUSDC", "YUSDT", "YBUSD"],
    gauges: "BUSD_GAUGE",
  },
  {
    swap: "SUSD_SWAP_POOL",
    lpToken: "CRV_PLAIN_3_AND_SUSD",
    tokens: ["DAI", "USDC", "USDT", "SUSD"],
    gauges: "SUSD_GAUGE",
  },
  {
    swap: "REN_SWAP_POOL",
    lpToken: "CRV_REN_WBTC",
    tokens: ["REN_BTC", "WBTC"],
    gauges: "REN_GAUGE",
  },
  {
    swap: "SBTC_SWAP_POOL",
    lpToken: "CRV_REN_BTC_WBTC_SBTC",
    tokens: ["REN_BTC", "WBTC", "SBTC"],
    gauges: "SBTC_GAUGE",
  },
  {
    swap: "HBTC_SWAP_POOL",
    lpToken: "HCRV",
    tokens: ["HBTC", "WBTC"],
    gauges: "HBTC_GAUGE",
  },
  {
    swap: "THREE_SWAP_POOL",
    lpToken: "THREE_CRV",
    tokens: ["DAI", "USDC", "USDT"],
    gauges: "THREE_GAUGE",
  },
  {
    swap: "GUSD_SWAP_POOL",
    lpToken: "GUSD_THREE_CRV",
    tokens: ["GUSD", "THREE_CRV"],
    gauges: "GUSD_GAUGE",
  },
  {
    swap: "HUSD_SWAP_POOL",
    lpToken: "HUSD_THREE_CRV",
    tokens: ["HUSD", "THREE_CRV"],
    gauges: "HUSD_GAUGE",
  },
  {
    swap: "USDK_SWAP_POOL",
    lpToken: "USDK_THREE_CRV",
    tokens: ["USDK", "THREE_CRV"],
    gauges: "USDK_GAUGE",
  },
  {
    swap: "USDN_SWAP_POOL",
    lpToken: "USDN_THREE_CRV",
    tokens: ["USDN", "THREE_CRV"],
    gauges: "USDN_GAUGE",
  },
  {
    swap: "LINKUSD_SWAP_POOL",
    lpToken: "LINKUSD_THREE_CRV",
    tokens: ["LINKUSD", "THREE_CRV"],
    gauges: "",
  },
  {
    swap: "MUSD_SWAP_POOL",
    lpToken: "MUSD_THREE_CRV",
    tokens: ["MUSD", "THREE_CRV"],
    gauges: "MUSD_GAUGE",
  },
  {
    swap: "RSV_SWAP_POOL",
    lpToken: "RSV_THREE_CRV",
    tokens: ["RSV", "THREE_CRV"],
    gauges: "RSV_GAUGE",
  },
  {
    swap: "TBTC_SWAP_POOL",
    lpToken: "TBTC_SBTC_CRV",
    tokens: ["TBTC", "CRV_REN_BTC_WBTC_SBTC"],
    gauges: "TBTC_GAUGE",
  },
  {
    swap: "DUSD_SWAP_POOL",
    lpToken: "RSV_THREE_CRV",
    tokens: ["DUSD", "THREE_CRV"],
    gauges: "DUSD_GAUGE",
  },
];
export const MAPPING_CURVE_DEPOSIT_DATA = [
  {
    lp: "COMPOUND_DEPOSIT_POOL",
    tokens: ["DAI", "USDC"],
    swap: "COMPOUND_SWAP_POOL",
    gauges: "COMPOUND_GAUGE",
  },
  {
    lp: "USDT_DEPOSIT_POOL",
    tokens: ["DAI", "USDC", "USDT"],
    swap: "USDT_SWAP_POOL",
    gauges: "USDT_GAUGE",
  },
  {
    lp: "PAX_DEPOSIT_POOL",
    tokens: ["DAI", "USDC", "USDT", "PAX"],
    swap: "PAX_SWAP_POOL",
    gauges: "PAX_GAUGE",
  },
  {
    lp: "Y_DEPOSIT_POOL",
    tokens: ["DAI", "USDC", "USDT", "TUSD"],
    swap: "Y_SWAP_POOL",
    gauges: "Y_GAUGE",
  },
  {
    lp: "BUSD_DEPOSIT_POOL",
    tokens: ["DAI", "USDC", "USDT", "BUSD"],
    swap: "BUSD_SWAP_POOL",
    gauges: "BUSD_GAUGE",
  },
  {
    lp: "SUSD_DEPOSIT_POOL",
    tokens: ["DAI", "USDC", "USDT", "SUSD"],
    swap: "SUSD_SWAP_POOL",
    gauges: "SUSD_GAUGE",
  },
  {
    lp: "GUSD_DEPOSIT_POOL",
    tokens: ["GUSD", "DAI", "USDC", "USDT"],
    swap: "GUSD_SWAP_POOL",
    gauges: "GUSD_GAUGE",
  },
  {
    lp: "HUSD_DEPOSIT_POOL",
    tokens: ["HUSD", "DAI", "USDC", "USDT"],
    swap: "HUSD_SWAP_POOL",
    gauges: "HUSD_GAUGE",
  },
  {
    lp: "USDK_DEPOSIT_POOL",
    tokens: ["USDK", "DAI", "USDC", "USDT"],
    swap: "USDK_SWAP_POOL",
    gauges: "USDK_GAUGE",
  },
  {
    lp: "USDN_DEPOSIT_POOL",
    tokens: ["USDN", "DAI", "USDC", "USDT"],
    swap: "USDN_SWAP_POOL",
    gauges: "USDN_GAUGE",
  },
  {
    lp: "LINKUSD_DEPOSIT_POOL",
    tokens: ["LINKUSD", "DAI", "USDC", "USDT"],
    swap: "LINKUSD_SWAP_POOL",
    gauges: "LINKUSD_GAUGE",
  },
  {
    lp: "MUSD_DEPOSIT_POOL",
    tokens: ["MUSD", "DAI", "USDC", "USDT"],
    swap: "MUSD_SWAP_POOL",
    gauges: "MUSD_GAUGE",
  },
  {
    lp: "RSV_DEPOSIT_POOL",
    tokens: ["RSV", "DAI", "USDC", "USDT"],
    swap: "RSV_SWAP_POOL",
    gauges: "RSV_GAUGE",
  },
  {
    lp: "TBTC_DEPOSIT_POOL",
    tokens: ["TBTC", "DAI", "USDC", "USDT"],
    swap: "TBTC_SWAP_POOL",
    gauges: "TBTC_GAUGE",
  },
  {
    lp: "DUSD_DEPOSIT_POOL",
    tokens: ["DUSD", "DAI", "USDC", "USDT"],
    swap: "DUSD_SWAP_POOL",
    gauges: "DUSD_GAUGE",
  },
];
