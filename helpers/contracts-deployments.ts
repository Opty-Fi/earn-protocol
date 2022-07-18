import {
  ESSENTIAL_CONTRACTS,
  ESSENTIAL_CONTRACTS as ESSENTIAL_CONTRACTS_DATA,
} from "./constants/essential-contracts-name";
import { ADAPTERS } from "./constants/adapters";
import { Contract, Signer } from "ethers";
import { CONTRACTS } from "./type";
import { addRiskProfiles } from "./contracts-actions";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { deployContract, executeFunc, generateTokenHashV2 } from "./helpers";
import { NETWORKS_CHAIN_ID_TO_HEX } from "../helper-hardhat-config";

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
  console.log("\n Deploying Registry...");
  const registry = await deployRegistry(hre, owner, isDeployedOnce);
  console.log("\n Adding risk profiles...");
  await addRiskProfiles(owner, registry);
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
  await executeFunc(registry, owner, "setHarvestCodeProvider(address)", [harvestCodeProvider.address]);
  const riskManager = await deployRiskManager(hre, owner, isDeployedOnce, registry.address);
  await executeFunc(registry, owner, "setRiskManager(address)", [riskManager.address]);

  const essentialContracts: CONTRACTS = {
    registry,
    strategyProvider,
    riskManager,
    harvestCodeProvider,
  };

  return essentialContracts;
}

export async function deployAdapterPrerequisites(
  hre: HardhatRuntimeEnvironment,
  owner: Signer,
  isDeployedOnce: boolean,
): Promise<CONTRACTS> {
  const registry = await deployRegistry(hre, owner, isDeployedOnce);

  const harvestCodeProvider = await deployContract(
    hre,
    ESSENTIAL_CONTRACTS_DATA.HARVEST_CODE_PROVIDER,
    isDeployedOnce,
    owner,
    [registry.address],
  );

  await executeFunc(registry, owner, "setHarvestCodeProvider(address)", [harvestCodeProvider.address]);

  const adapterPrerequisites: CONTRACTS = {
    registry,
    harvestCodeProvider,
  };

  return adapterPrerequisites;
}

export async function deployAdapter(
  hre: HardhatRuntimeEnvironment,
  owner: Signer,
  adapterName: string,
  registryAddr: string,
  isDeployedOnce: boolean,
): Promise<Contract> {
  const contract: Contract = await deployContract(hre, adapterName, isDeployedOnce, owner, [registryAddr]);
  return contract;
}

export async function deployAdapters(
  hre: HardhatRuntimeEnvironment,
  owner: Signer,
  registryAddr: string,
  isDeployedOnce: boolean,
): Promise<CONTRACTS> {
  const data: CONTRACTS = {};
  for (const adapter of ADAPTERS) {
    try {
      data[adapter] = await deployAdapter(hre, owner, adapter, registryAddr, isDeployedOnce);
    } catch (error: any) {
      console.log(adapter, error);
    }
  }
  return data;
}

export async function deployVault(
  hre: HardhatRuntimeEnvironment,
  registry: string,
  underlyingToken: string,
  owner: Signer,
  admin: Signer,
  underlyingTokenName: string,
  underlyingTokenSymbol: string,
  riskProfileCode: number,
  isDeployedOnce: boolean,
): Promise<Contract> {
  const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS_DATA.REGISTRY, registry, owner);

  const riskProfile = await registryContract.getRiskProfile(riskProfileCode);

  let vault = await deployContract(hre, ESSENTIAL_CONTRACTS_DATA.VAULT, isDeployedOnce, owner, [
    registry,
    underlyingTokenName,
    underlyingTokenSymbol,
    riskProfile.name,
    riskProfile.symbol,
  ]);

  const adminAddress = await admin.getAddress();

  const vaultProxy = await deployContract(hre, ESSENTIAL_CONTRACTS_DATA.VAULT_PROXY, isDeployedOnce, owner, [
    adminAddress,
  ]);

  await executeFunc(vaultProxy, admin, "upgradeTo(address)", [vault.address]);

  vault = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS_DATA.VAULT, vaultProxy.address, owner);

  await executeFunc(vault, owner, "initialize(address,address,string,string,uint256)", [
    registry,
    underlyingToken,
    underlyingTokenName,
    underlyingTokenSymbol,
    riskProfileCode,
  ]);
  return vault;
}

export async function deployVaultWithHash(
  hre: HardhatRuntimeEnvironment,
  vaultName: string,
  registry: string,
  strategyManager: string,
  claimAndHarvest: string,
  underlyingToken: string,
  whitelistedCodesRoot: string,
  whitelistedAccountsRoot: string,
  vaultConfiguration: string,
  userDepositCapUT: number,
  minimumDepositValueUT: number,
  totalValueLockedLimitUT: number,
  owner: Signer,
  admin: Signer,
  underlyingTokenName: string,
  underlyingTokenSymbol: string,
  riskProfileCode: number,
): Promise<{ contract: Contract; hash: string | undefined }> {
  const { deploy } = hre.deployments;
  const ownerAddress = await owner.getAddress();
  const adminAddress = await admin.getAddress();
  const vaultArtifact = await hre.deployments.getArtifact(ESSENTIAL_CONTRACTS.VAULT);
  const proxyV2Artifact = await hre.deployments.getArtifact(ESSENTIAL_CONTRACTS.VAULT_PROXY_V2);

  const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS_DATA.REGISTRY, registry, owner);
  const riskProfile = await registryContract.getRiskProfile(riskProfileCode);
  const chainId = NETWORKS_CHAIN_ID_TO_HEX[await hre.getChainId()];
  const underlyingTokenHash = generateTokenHashV2([underlyingToken], chainId);

  const vaultDeployment = await deploy(vaultName, {
    from: ownerAddress,
    contract: {
      abi: vaultArtifact.abi,
      bytecode: vaultArtifact.bytecode,
      deployedBytecode: vaultArtifact.deployedBytecode,
    },
    args: [registry, underlyingTokenName, underlyingTokenSymbol, riskProfile.name, riskProfile.symbol],
    log: true,
    skipIfAlreadyDeployed: true,
    libraries: {
      "contracts/protocol/lib/StrategyManager.sol:StrategyManager": strategyManager,
      "contracts/protocol/lib/ClaimAndHarvest.sol:ClaimAndHarvest": claimAndHarvest,
    },
    proxy: {
      owner: adminAddress,
      upgradeIndex: 0,
      proxyContract: {
        abi: proxyV2Artifact.abi,
        bytecode: proxyV2Artifact.bytecode,
        deployedBytecode: proxyV2Artifact.deployedBytecode,
      },
      execute: {
        init: {
          methodName: "initialize",
          args: [
            registry,
            underlyingTokenHash,
            whitelistedCodesRoot,
            whitelistedAccountsRoot,
            underlyingTokenName,
            underlyingTokenSymbol,
            riskProfileCode,
            vaultConfiguration,
            userDepositCapUT,
            minimumDepositValueUT,
            totalValueLockedLimitUT,
          ],
        },
      },
    },
  });
  const contract = <Contract>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vaultDeployment.address);
  const hash = vaultDeployment.transactionHash;
  return { contract, hash };
}
