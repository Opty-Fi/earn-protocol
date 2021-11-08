import { DATA_OBJECT } from "../type";

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
