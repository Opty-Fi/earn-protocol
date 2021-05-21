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

  const harvestCodeProvider = await deployContract(
    hre,
    ESSENTIAL_CONTRACTS_DATA.HARVEST_CODE_PROVIDER,
    isDeployedOnce,
    owner,
    [registry.address],
  );

  const riskManager = await deployRiskManager(hre, owner, isDeployedOnce, registry.address);

  const strategyManager = await deployContract(hre, ESSENTIAL_CONTRACTS_DATA.STRATEGY_MANAGER, isDeployedOnce, owner, [
    registry.address,
    harvestCodeProvider.address,
  ]);

  const opty = await deployContract(hre, ESSENTIAL_CONTRACTS_DATA.OPTY, isDeployedOnce, owner, [
    registry.address,
    100000000000000,
  ]);

  const optyMinter = await deployContract(hre, ESSENTIAL_CONTRACTS_DATA.OPTY_MINTER, isDeployedOnce, owner, [
    registry.address,
    opty.address,
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

  const optyStakingPool1D = await deployContract(
    hre,
    ESSENTIAL_CONTRACTS_DATA.OPTY_STAKING_POOL,
    isDeployedOnce,
    owner,
    [registry.address, opty.address, optyMinter.address, 86400, optyStakingRateBalancer.address, "1D"],
  );

  const optyStakingPool30D = await deployContract(
    hre,
    ESSENTIAL_CONTRACTS_DATA.OPTY_STAKING_POOL,
    isDeployedOnce,
    owner,
    [registry.address, opty.address, optyMinter.address, 2592000, optyStakingRateBalancer.address, "30D"],
  );

  const optyStakingPool60D = await deployContract(
    hre,
    ESSENTIAL_CONTRACTS_DATA.OPTY_STAKING_POOL,
    isDeployedOnce,
    owner,
    [registry.address, opty.address, optyMinter.address, 5184000, optyStakingRateBalancer.address, "60D"],
  );

  const optyStakingPool180D = await deployContract(
    hre,
    ESSENTIAL_CONTRACTS_DATA.OPTY_STAKING_POOL,
    isDeployedOnce,
    owner,
    [registry.address, opty.address, optyMinter.address, 15552000, optyStakingRateBalancer.address, "180D"],
  );

  await executeFunc(registry, owner, "setMinter(address)", [optyMinter.address]);
  await executeFunc(optyMinter, owner, "setStakingPool(address,bool)", [optyStakingPool1D.address, true]);
  await executeFunc(optyMinter, owner, "setStakingPool(address,bool)", [optyStakingPool30D.address, true]);
  await executeFunc(optyMinter, owner, "setStakingPool(address,bool)", [optyStakingPool60D.address, true]);
  await executeFunc(optyMinter, owner, "setStakingPool(address,bool)", [optyStakingPool180D.address, true]);
  await executeFunc(optyStakingRateBalancer, owner, "initialize(address,address,address,address)", [
    optyStakingPool1D.address,
    optyStakingPool30D.address,
    optyStakingPool60D.address,
    optyStakingPool180D.address,
  ]);
  await executeFunc(optyStakingRateBalancer, owner, "setStakingPoolMultipliers(address,uint256)", [
    optyStakingPool1D.address,
    10000,
  ]);
  await executeFunc(optyStakingRateBalancer, owner, "setStakingPoolMultipliers(address,uint256)", [
    optyStakingPool30D.address,
    12000,
  ]);
  await executeFunc(optyStakingRateBalancer, owner, "setStakingPoolMultipliers(address,uint256)", [
    optyStakingPool60D.address,
    15000,
  ]);
  await executeFunc(optyStakingRateBalancer, owner, "setStakingPoolMultipliers(address,uint256)", [
    optyStakingPool180D.address,
    20000,
  ]);
  await executeFunc(optyStakingRateBalancer, owner, "setStakingPoolOPTYAllocation(uint256)", [10000000000]);

  const priceOracle = await deployContract(hre, ESSENTIAL_CONTRACTS_DATA.PRICE_ORACLE, isDeployedOnce, owner, [
    registry.address,
  ]);

  const essentialContracts: CONTRACTS = {
    registry,
    vaultStepInvestStrategyDefinitionRegistry,
    strategyProvider,
    strategyManager,
    optyMinter,
    opty,
    riskManager,
    harvestCodeProvider,
    optyStakingRateBalancer,
    optyStakingPool1D,
    optyStakingPool30D,
    optyStakingPool60D,
    optyStakingPool180D,
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
  riskManager: string,
  strategyManager: string,
  optyMinter: string,
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
        riskManager,
        strategyManager,
        optyMinter,
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
  riskManager: string,
  strategyManager: string,
  optyMinter: string,
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

  await executeFunc(vault, owner, "initialize(address,address,address,address,address,string,string,string)", [
    registry,
    riskManager,
    underlyingToken,
    strategyManager,
    optyMinter,
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
  riskManager: string,
  strategyManager: string,
  optyMinter: string,
  owner: Signer,
  admin: Signer,
): Promise<CONTRACTS_WITH_HASH> {
  const vaults: CONTRACTS_WITH_HASH = {};
  for (const token in TOKENS) {
    const name = await getTokenName(hre, token);
    const symbol = await getTokenSymbol(hre, token);
    for (const riskProfile of Object.keys(RISK_PROFILES)) {
      const vault = await deployVaultWithHash(
        hre,
        registry,
        riskManager,
        strategyManager,
        optyMinter,
        TOKENS[token],
        owner,
        admin,
        name,
        symbol,
        riskProfile,
      );
      vaults[`${symbol}-${riskProfile}`] = vault;
    }
  }
  return vaults;
}

export async function deployVaultWithHash(
  hre: HardhatRuntimeEnvironment,
  registry: string,
  riskManager: string,
  strategyManager: string,
  optyMinter: string,
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
    [
      registry,
      riskManager,
      underlyingToken,
      strategyManager,
      optyMinter,
      underlyingTokenName,
      underlyingTokenSymbol,
      riskProfile,
    ],
  );
  return vaultProxy;
}
