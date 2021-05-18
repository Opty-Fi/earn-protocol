import { DATA_OBJECT, REWARD_TOKEN_DATA_OBJECT, RISK_PROFILE_DATA } from "./type";
export const ESSENTIAL_CONTRACTS: DATA_OBJECT = {
  REGISTRY: "Registry",
  REGISTRY_PROXY: "RegistryProxy",
  VAULT_STEP_INVEST_STRATEGY_DEFINITION_REGISTRY: "VaultStepInvestStrategyDefinitionRegistry",
  STRATEGY_MANAGER: "StrategyManager",
  OPTY: "OPTY",
  OPTY_MINTER: "OPTYMinter",
  RISK_MANAGER: "RiskManager",
  STRATEGY_PROVIDER: "StrategyProvider",
  HARVEST_CODE_PROVIDER: "HarvestCodeProvider",
  VAULT_PROXY: "InitializableImmutableAdminUpgradeabilityProxy",
  VAULT: "Vault",
  RISK_MANAGER_PROXY: "RiskManagerProxy",
  PRICE_ORACLE: "PriceOracle",
  OPTY_STAKING_POOL: "OPTYStakingPool",
  OPTY_STAKING_RATE_BALANCER: "OPTYStakingRateBalancer",
  OPTY_STAKING_RATE_BALANCER_PROXY: "OPTYStakingRateBalancerProxy",
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
  TESTING_EMERGENCY_BRAKE: "EmergencyBrake",
};

export const ADDRESS_ZERO = "0x0000000000000000000000000000000000000000";

export const RISK_PROFILES: RISK_PROFILE_DATA = {
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
