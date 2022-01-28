import { DATA_OBJECT } from "../type";

export const ESSENTIAL_CONTRACTS: DATA_OBJECT = {
  REGISTRY: "contracts/protocol/earn-protocol-configuration/contracts/Registry.sol:Registry",
  REGISTRY_PROXY: "contracts/protocol/earn-protocol-configuration/contracts/RegistryProxy.sol:RegistryProxy",
  INVEST_STRATEGY_REGISTRY:
    "contracts/protocol/earn-protocol-configuration/contracts/InvestStrategyRegistry.sol:InvestStrategyRegistry",
  STRATEGY_MANAGER: "StrategyManager",
  OPTY: "OPTY",
  OPTY_DISTRIBUTOR: "OPTYDistributor",
  RISK_MANAGER: "contracts/protocol/earn-protocol-configuration/contracts/RiskManager.sol:RiskManager",
  STRATEGY_PROVIDER: "contracts/protocol/earn-protocol-configuration/contracts/StrategyProvider.sol:StrategyProvider",
  HARVEST_CODE_PROVIDER: "HarvestCodeProvider",
  VAULT_PROXY: "InitializableImmutableAdminUpgradeabilityProxy",
  VAULT: "Vault",
  RISK_MANAGER_PROXY: "contracts/protocol/earn-protocol-configuration/contracts/RiskManagerProxy.sol:RiskManagerProxy",
  OPTY_STAKING_VAULT: "OPTYStakingVault",
  OPTY_STAKING_RATE_BALANCER: "OPTYStakingRateBalancer",
  OPTY_STAKING_RATE_BALANCER_PROXY: "OPTYStakingRateBalancerProxy",
  APR_ORACLE: "contracts/protocol/earn-protocol-configuration/contracts/APROracle.sol:APROracle",
  ODEFI_VAULT_BOOSTER: "ODEFIVaultBooster",
  ERC20: "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
};
