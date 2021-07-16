import { DATA_OBJECT, REWARD_TOKEN_DATA_OBJECT, RISK_PROFILE_DATA } from "./type";
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
};

export const ADAPTER = [
  "AaveV1Adapter",
  "AaveV2Adapter",
  "CompoundAdapter",
  "CreamAdapter",
  "CurvePoolAdapter",
  "CurveSwapAdapter",
  "DyDxAdapter",
  "DForceAdapter",
  "FulcrumAdapter",
  "HarvestAdapter",
  "YVaultAdapter",
];

export const TOKENS: DATA_OBJECT = {
  DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
  USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
  WBTC: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
  WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  CHI: "0x0000000000004946c0e9F43F4Dee607b0eF1fA1c",
};

export const REWARD_TOKENS: REWARD_TOKEN_DATA_OBJECT = {
  CompoundAdapter: {
    tokenName: "COMP",
    tokenAddress: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
    distributionActive: true,
  },
  CurveAdapter: {
    tokenName: "CRV",
    tokenAddress: "0xD533a949740bb3306d119CC777fa900bA034cd52",
    distributionActive: true,
  },
  DForceAdapter: {
    tokenName: "DF",
    tokenAddress: "0x431ad2ff6a9C365805eBaD47Ee021148d6f7DBe0",
    distributionActive: true,
  },
  HarvestAdapter: {
    tokenName: "FARM",
    tokenAddress: "0xa0246c9032bC3A600820415aE600c6388619A14D",
    distributionActive: true,
  },
  CreamAdapter: {
    tokenName: "CREAM",
    tokenAddress: "0x2ba592F78dB6436527729929AAf6c908497cB200",
    distributionActive: false,
  },
};

export const TESTING_CONTRACTS: DATA_OBJECT = {
  TESTING_EMERGENCY_BRAKE: "TestEmergencyBrake",
  TEST_DUMMY_TOKEN: "TestDummyToken",
  TEST_DUMMY_TOKEN_TRANSFER_FEE: "TestDummyTokenTransferFee",
};

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

export const RISK_PROFILES: RISK_PROFILE_DATA = {
  RP0: {
    name: "RP0",
    steps: 0,
    poolRating: [0, 0],
  },
  RP1: {
    name: "RP1",
    steps: 1,
    poolRating: [0, 10],
  },
  RP2: {
    name: "RP2",
    steps: 2,
    poolRating: [0, 20],
  },
  RP3: {
    name: "RP3",
    steps: 3,
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
