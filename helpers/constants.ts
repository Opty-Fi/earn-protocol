import { DATA_OBJECT, RISK_PROFILE_DATA } from "./type";
export const ESSENTIAL_CONTRACTS: DATA_OBJECT = {
  REGISTRY: "Registry",
  REGISTRY_PROXY: "RegistryProxy",
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
