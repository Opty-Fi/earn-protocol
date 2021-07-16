import { ESSENTIAL_CONTRACTS as ESSENTIAL_CONTRACTS_DATA, RISK_PROFILES, ADAPTER, TOKENS } from "./constants";
import { Contract, Signer } from "ethers";
import { CONTRACTS, CONTRACTS_WITH_HASH } from "./type";
import { getTokenName, getTokenSymbol } from "./contracts-actions";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { deployContract, executeFunc, deployContractWithHash } from "./helpers";

export async function deployRegistry(
  hre: HardhatRuntimeEnvironment,
  owner: Signer,
  isDeployedOnce: boolean,
): Promise<Contract> {
  let registry = await deployContract(hre, ESSENTIAL_CONTRACTS_DATA.REGISTRY, isDeployedOnce, owner, []);

  const registryProxy = await deployContract(hre, ESSENTIAL_CONTRACTS_DATA.REGISTRY_PROXY, isDeployedOnce, owner, []);

  await executeFunc(registryProxy, owner, "setPendingImplementation(address)", [registry.address]);
  await executeFunc(registry, owner, "become(address)", [registryProxy.address]);

  registry = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS_DATA.REGISTRY, registryProxy.address, owner);

  return registry;
}

export async function deployRiskManager(
  hre: HardhatRuntimeEnvironment,
  owner: Signer,
  isDeployedOnce: boolean,
  registry: string,
): Promise<Contract> {
  let riskManager = await deployContract(hre, ESSENTIAL_CONTRACTS_DATA.RISK_MANAGER, isDeployedOnce, owner, [registry]);

  const riskManagerProxy = await deployContract(
    hre,
    ESSENTIAL_CONTRACTS_DATA.RISK_MANAGER_PROXY,
    isDeployedOnce,
    owner,
    [registry],
  );

  await executeFunc(riskManagerProxy, owner, "setPendingImplementation(address)", [riskManager.address]);
  await executeFunc(riskManager, owner, "become(address)", [riskManagerProxy.address]);

  riskManager = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS_DATA.RISK_MANAGER, riskManagerProxy.address, owner);

  return riskManager;
}

export async function deployEssentialContracts(
  hre: HardhatRuntimeEnvironment,
  owner: Signer,
  isDeployedOnce: boolean,
): Promise<CONTRACTS> {
  const registry = await deployRegistry(hre, owner, isDeployedOnce);
  const profiles = Object.keys(RISK_PROFILES);
  for (let i = 0; i < profiles.length; i++) {
    try {
      const profile = await registry.riskProfiles(RISK_PROFILES[profiles[i]].name);
      if (!profile.exists) {
        await executeFunc(registry, owner, "addRiskProfile(string,uint8,(uint8,uint8))", [
          RISK_PROFILES[profiles[i]].name,
          RISK_PROFILES[profiles[i]].steps,
          RISK_PROFILES[profiles[i]].poolRating,
        ]);
      }
    } catch (error) {
      console.log(error);
    }
  }

  const vaultStepInvestStrategyDefinitionRegistry = await deployContract(
    hre,
    ESSENTIAL_CONTRACTS_DATA.VAULT_STEP_INVEST_STRATEGY_DEFINITION_REGISTRY,
    isDeployedOnce,
    owner,
    [registry.address],
  );

  await executeFunc(registry, owner, "setVaultStepInvestStrategyDefinitionRegistry(address)", [
    vaultStepInvestStrategyDefinitionRegistry.address,
  ]);

  const strategyProvider = await deployContract(
    hre,
    ESSENTIAL_CONTRACTS_DATA.STRATEGY_PROVIDER,
    isDeployedOnce,
    owner,
    [registry.address],
  );

  await executeFunc(registry, owner, "setStrategyProvider(address)", [strategyProvider.address]);

  const aprOracle = await deployContract(hre, ESSENTIAL_CONTRACTS_DATA.APR_ORACLE, isDeployedOnce, owner, [
    registry.address,
  ]);

  await executeFunc(registry, owner, "setAPROracle(address)", [aprOracle.address]);

  const harvestCodeProvider = await deployContract(
    hre,
    ESSENTIAL_CONTRACTS_DATA.HARVEST_CODE_PROVIDER,
    isDeployedOnce,
    owner,
    [registry.address],
  );

  await executeFunc(registry, owner, "setHarvestCodeProvider(address)", [harvestCodeProvider.address]);

  const riskManager = await deployRiskManager(hre, owner, isDeployedOnce, registry.address);

  await executeFunc(registry, owner, "setRiskManager(address)", [riskManager.address]);

  const strategyManager = await deployContract(hre, ESSENTIAL_CONTRACTS_DATA.STRATEGY_MANAGER, isDeployedOnce, owner, [
    registry.address,
  ]);

  await executeFunc(registry, owner, "setStrategyManager(address)", [strategyManager.address]);

  const opty = await deployContract(hre, ESSENTIAL_CONTRACTS_DATA.OPTY, isDeployedOnce, owner, [
    registry.address,
    100000000000000,
  ]);

  const optyDistributor = await deployContract(hre, ESSENTIAL_CONTRACTS_DATA.OPTY_DISTRIBUTOR, isDeployedOnce, owner, [
    registry.address,
    opty.address,
    1700000000,
  ]);

  let optyStakingRateBalancer = await deployContract(
    hre,
    ESSENTIAL_CONTRACTS_DATA.OPTY_STAKING_RATE_BALANCER,
    isDeployedOnce,
    owner,
    [registry.address],
  );

  const optyStakingRateBalancerProxy = await deployContract(
    hre,
    ESSENTIAL_CONTRACTS_DATA.OPTY_STAKING_RATE_BALANCER_PROXY,
    isDeployedOnce,
    owner,
    [registry.address],
  );

  await executeFunc(optyStakingRateBalancerProxy, owner, "setPendingImplementation(address)", [
    optyStakingRateBalancer.address,
  ]);
  await executeFunc(optyStakingRateBalancer, owner, "become(address)", [optyStakingRateBalancerProxy.address]);

  optyStakingRateBalancer = await hre.ethers.getContractAt(
    ESSENTIAL_CONTRACTS_DATA.OPTY_STAKING_RATE_BALANCER,
    optyStakingRateBalancerProxy.address,
    owner,
  );

  await executeFunc(registry, owner, "setOPTYStakingRateBalancer(address)", [optyStakingRateBalancer.address]);

  const optyStakingVault1D = await deployContract(
    hre,
    ESSENTIAL_CONTRACTS_DATA.OPTY_STAKING_VAULT,
    isDeployedOnce,
    owner,
    [registry.address, opty.address, 86400, "1D"],
  );

  const optyStakingVault30D = await deployContract(
    hre,
    ESSENTIAL_CONTRACTS_DATA.OPTY_STAKING_VAULT,
    isDeployedOnce,
    owner,
    [registry.address, opty.address, 2592000, "30D"],
  );

  const optyStakingVault60D = await deployContract(
    hre,
    ESSENTIAL_CONTRACTS_DATA.OPTY_STAKING_VAULT,
    isDeployedOnce,
    owner,
    [registry.address, opty.address, 5184000, "60D"],
  );

  const optyStakingVault180D = await deployContract(
    hre,
    ESSENTIAL_CONTRACTS_DATA.OPTY_STAKING_VAULT,
    isDeployedOnce,
    owner,
    [registry.address, opty.address, 15552000, "180D"],
  );

  await executeFunc(registry, owner, "setOPTYDistributor(address)", [optyDistributor.address]);
  await executeFunc(optyDistributor, owner, "setStakingVault(address,bool)", [optyStakingVault1D.address, true]);
  await executeFunc(optyDistributor, owner, "setStakingVault(address,bool)", [optyStakingVault30D.address, true]);
  await executeFunc(optyDistributor, owner, "setStakingVault(address,bool)", [optyStakingVault60D.address, true]);
  await executeFunc(optyDistributor, owner, "setStakingVault(address,bool)", [optyStakingVault180D.address, true]);
  await executeFunc(optyStakingRateBalancer, owner, "initialize(address,address,address,address)", [
    optyStakingVault1D.address,
    optyStakingVault30D.address,
    optyStakingVault60D.address,
    optyStakingVault180D.address,
  ]);
  await executeFunc(optyStakingRateBalancer, owner, "setStakingVaultMultipliers(address,uint256)", [
    optyStakingVault1D.address,
    10000,
  ]);
  await executeFunc(optyStakingRateBalancer, owner, "setStakingVaultMultipliers(address,uint256)", [
    optyStakingVault30D.address,
    12000,
  ]);
  await executeFunc(optyStakingRateBalancer, owner, "setStakingVaultMultipliers(address,uint256)", [
    optyStakingVault60D.address,
    15000,
  ]);
  await executeFunc(optyStakingRateBalancer, owner, "setStakingVaultMultipliers(address,uint256)", [
    optyStakingVault180D.address,
    20000,
  ]);
  await executeFunc(optyStakingRateBalancer, owner, "setStakingVaultOPTYAllocation(uint256)", [10000000000]);

  const priceOracle = await deployContract(hre, ESSENTIAL_CONTRACTS_DATA.PRICE_ORACLE, isDeployedOnce, owner, [
    registry.address,
  ]);

  await executeFunc(registry, owner, "setPriceOracle(address)", [priceOracle.address]);

  const essentialContracts: CONTRACTS = {
    registry,
    vaultStepInvestStrategyDefinitionRegistry,
    strategyProvider,
    strategyManager,
    optyDistributor,
    opty,
    riskManager,
    harvestCodeProvider,
    optyStakingRateBalancer,
    optyStakingVault1D,
    optyStakingVault30D,
    optyStakingVault60D,
    optyStakingVault180D,
    priceOracle,
  };

  return essentialContracts;
}

export async function deployAdapter(
  hre: HardhatRuntimeEnvironment,
  owner: Signer,
  adapterName: string,
  registryAddr: string,
  harvestAddr: string,
  priceOracleAddr: string,
  isDeployedOnce: boolean,
): Promise<Contract> {
  let contract: Contract;
  if (["DyDxAdapter", "FulcrumAdapter", "YVaultAdapter"].includes(adapterName)) {
    contract = await deployContract(hre, adapterName, isDeployedOnce, owner, [registryAddr]);
  } else if (adapterName === "CurvePoolAdapter") {
    contract = await deployContract(hre, adapterName, isDeployedOnce, owner, [
      registryAddr,
      harvestAddr,
      priceOracleAddr,
    ]);
  } else {
    contract = await deployContract(hre, adapterName, isDeployedOnce, owner, [registryAddr, harvestAddr]);
  }
  return contract;
}

export async function deployAdapters(
  hre: HardhatRuntimeEnvironment,
  owner: Signer,
  registryAddr: string,
  harvestAddr: string,
  priceOracleAddr: string,
  isDeployedOnce: boolean,
): Promise<CONTRACTS> {
  const data: CONTRACTS = {};
  for (const adapter of ADAPTER) {
    try {
      data[adapter] = await deployAdapter(
        hre,
        owner,
        adapter,
        registryAddr,
        harvestAddr,
        priceOracleAddr,
        isDeployedOnce,
      );
    } catch (error) {
      console.log(adapter, error);
    }
  }
  return data;
}

export async function deployVaults(
  hre: HardhatRuntimeEnvironment,
  registry: string,
  owner: Signer,
  admin: Signer,
  isDeployedOnce: boolean,
): Promise<CONTRACTS> {
  const vaults: CONTRACTS = {};
  for (const token in TOKENS) {
    if (token === "CHI") {
      continue;
    }
    const name = await getTokenName(hre, token);
    const symbol = await getTokenSymbol(hre, token);
    for (const riskProfile of Object.keys(RISK_PROFILES)) {
      const vault = await deployVault(
        hre,
        registry,
        TOKENS[token],
        owner,
        admin,
        name,
        symbol,
        riskProfile,
        isDeployedOnce,
      );
      vaults[`${symbol}-${riskProfile}`] = vault;
    }
  }
  return vaults;
}
export async function deployVault(
  hre: HardhatRuntimeEnvironment,
  registry: string,
  underlyingToken: string,
  owner: Signer,
  admin: Signer,
  underlyingTokenName: string,
  underlyingTokenSymbol: string,
  riskProfile: string,
  isDeployedOnce: boolean,
): Promise<Contract> {
  let vault = await deployContract(hre, ESSENTIAL_CONTRACTS_DATA.VAULT, isDeployedOnce, owner, [
    registry,
    underlyingTokenName,
    underlyingTokenSymbol,
    riskProfile,
  ]);

  const adminAddress = await admin.getAddress();

  const vaultProxy = await deployContract(hre, ESSENTIAL_CONTRACTS_DATA.VAULT_PROXY, isDeployedOnce, owner, [
    adminAddress,
  ]);

  await executeFunc(vaultProxy, admin, "upgradeTo(address)", [vault.address]);

  vault = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS_DATA.VAULT, vaultProxy.address, owner);

  await executeFunc(vault, owner, "initialize(address,address,string,string,string)", [
    registry,
    underlyingToken,
    underlyingTokenName,
    underlyingTokenSymbol,
    riskProfile,
  ]);

  const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS_DATA.REGISTRY, registry, owner);

  await executeFunc(registryContract, owner, "setUnderlyingAssetHashToRPToVaults(address[],string,address)", [
    [underlyingToken],
    riskProfile,
    vault.address,
  ]);

  return vault;
}

export async function deployVaultsWithHash(
  hre: HardhatRuntimeEnvironment,
  registry: string,
  owner: Signer,
  admin: Signer,
): Promise<CONTRACTS_WITH_HASH> {
  const vaults: CONTRACTS_WITH_HASH = {};
  for (const token in TOKENS) {
    const name = await getTokenName(hre, token);
    const symbol = await getTokenSymbol(hre, token);
    for (const riskProfile of Object.keys(RISK_PROFILES)) {
      const vault = await deployVaultWithHash(hre, registry, TOKENS[token], owner, admin, name, symbol, riskProfile);
      vaults[`${symbol}-${riskProfile}`] = vault;
    }
  }
  return vaults;
}

export async function deployVaultWithHash(
  hre: HardhatRuntimeEnvironment,
  registry: string,
  underlyingToken: string,
  owner: Signer,
  admin: Signer,
  underlyingTokenName: string,
  underlyingTokenSymbol: string,
  riskProfile: string,
): Promise<{ contract: Contract; hash: string }> {
  const VAULT_FACTORY = await hre.ethers.getContractFactory(ESSENTIAL_CONTRACTS_DATA.VAULT);
  const vault = await deployContractWithHash(
    VAULT_FACTORY,
    [registry, underlyingTokenName, underlyingTokenSymbol, riskProfile],
    owner,
  );
  const adminAddress = await admin.getAddress();

  const VAULT_PROXY_FACTORY = await hre.ethers.getContractFactory(ESSENTIAL_CONTRACTS_DATA.VAULT_PROXY);
  const vaultProxy = await deployContractWithHash(VAULT_PROXY_FACTORY, [adminAddress], owner);

  await executeFunc(vaultProxy.contract, admin, "upgradeTo(address)", [vault.contract.address]);

  vaultProxy.contract = await hre.ethers.getContractAt(
    ESSENTIAL_CONTRACTS_DATA.VAULT,
    vaultProxy.contract.address,
    owner,
  );

  await executeFunc(
    vaultProxy.contract,
    owner,
    "initialize(address,address,address,address,address,string,string,string)",
    [registry, underlyingToken, underlyingTokenName, underlyingTokenSymbol, riskProfile],
  );
  return vaultProxy;
}
