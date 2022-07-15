import { DATA_OBJECT } from "../type";

export const ESSENTIAL_CONTRACTS: DATA_OBJECT = {
  REGISTRY: "contracts/protocol/earn-protocol-configuration/contracts/Registry.sol:Registry",
  REGISTRY_PROXY: "contracts/protocol/earn-protocol-configuration/contracts/RegistryProxy.sol:RegistryProxy",
  RISK_MANAGER: "contracts/protocol/earn-protocol-configuration/contracts/RiskManager.sol:RiskManager",
  STRATEGY_PROVIDER: "contracts/protocol/earn-protocol-configuration/contracts/StrategyProvider.sol:StrategyProvider",
  HARVEST_CODE_PROVIDER: "HarvestCodeProvider",
  VAULT_PROXY: "InitializableImmutableAdminUpgradeabilityProxy",
  VAULT: "Vault",
  TEST_VAULT: "TestVault",
  VAULT_PROXY_V2: "AdminUpgradeabilityProxy",
  RISK_MANAGER_PROXY: "contracts/protocol/earn-protocol-configuration/contracts/RiskManagerProxy.sol:RiskManagerProxy",
  ODEFI_VAULT_BOOSTER: "ODEFIVaultBooster",
  ERC20: "@openzeppelin/contracts-0.8.x/token/ERC20/ERC20.sol:ERC20",
  ADAPTER: "IAdapterFull",
  STRATEGY_MANAGER: "contracts/protocol/lib/StrategyManager.sol:StrategyManager",
  CLAIM_AND_HARVEST: "contracts/protocol/lib/ClaimAndHarvest.sol:ClaimAndHarvest",
};
