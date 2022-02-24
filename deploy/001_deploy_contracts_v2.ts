import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { RegistryV2, RegistryProxy, RiskManagerV2, RiskManagerProxy } from "../typechain";
import { executeFunc } from "../helpers/helpers";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const [owner] = await hre.ethers.getSigners();
  const { deploy } = deployments;
  const registryAddress = (
    await deploy("RegistryV2", {
      from: await owner.getAddress(),
      args: [],
      log: true,
      contract: ESSENTIAL_CONTRACTS.REGISTRY_V2,
    })
  ).address;

  const registryProxyAddress = (
    await deploy("RegistryProxy", {
      from: await owner.getAddress(),
      args: [],
      log: true,
      contract: ESSENTIAL_CONTRACTS.REGISTRY_PROXY,
    })
  ).address;

  const registryProxyContract: RegistryProxy = <RegistryProxy>(
    await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, registryProxyAddress)
  );

  const registryContract: RegistryV2 = <RegistryV2>(
    await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryAddress)
  );

  await registryProxyContract.connect(owner).setPendingImplementation(registryAddress);
  await registryContract.connect(owner).become(registryProxyAddress);

  const riskManagerAddress = (
    await deploy("RiskManagerV2", {
      from: await owner.getAddress(),
      args: [registryProxyContract.address],
      log: true,
      contract: ESSENTIAL_CONTRACTS.RISK_MANAGER_V2,
    })
  ).address;

  const riskManagerProxyAddress = (
    await deploy("RiskManagerProxy", {
      from: await owner.getAddress(),
      args: [registryProxyContract.address],
      log: true,
      contract: ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY,
    })
  ).address;

  const riskManagerProxyContract: RiskManagerProxy = <RiskManagerProxy>(
    await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY, riskManagerProxyAddress)
  );

  let riskManagerContract: RiskManagerV2 = <RiskManagerV2>(
    await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER_V2, riskManagerAddress)
  );

  await riskManagerProxyContract.connect(owner).setPendingImplementation(riskManagerAddress);
  await riskManagerContract.connect(owner).become(riskManagerProxyAddress);
  riskManagerContract = <RiskManagerV2>(
    await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER_V2, riskManagerProxyAddress)
  );

  const strategyProviderAddress = (
    await deploy("StrategyProviderV2", {
      from: await owner.getAddress(),
      args: [registryProxyContract.address],
      log: true,
      contract: ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER_V2,
    })
  ).address;

  const strategyManagerAddress = (
    await deploy("StrategyManager", {
      from: await owner.getAddress(),
      args: [registryProxyContract.address],
      log: true,
      contract: ESSENTIAL_CONTRACTS.STRATEGY_MANAGER,
    })
  ).address;

  const harvestCodeProviderAddress = (
    await deploy("HarvestCodeProvider", {
      from: await owner.getAddress(),
      args: [registryProxyContract.address],
      log: true,
      contract: ESSENTIAL_CONTRACTS.HARVEST_CODE_PROVIDER,
    })
  ).address;
  console.log("----------------------------------------");
  console.log("Setting essential contracts in RegistryV2");
  await executeFunc(registryContract, owner, "setStrategyProvider(address)", [strategyProviderAddress]);
  await executeFunc(registryContract, owner, "setHarvestCodeProvider(address)", [harvestCodeProviderAddress]);
  await executeFunc(registryContract, owner, "setStrategyManager(address)", [strategyManagerAddress]);
  await executeFunc(registryContract, owner, "setRiskManager(address)", [riskManagerContract.address]);
  console.log("Finished deploying all essential contracts");
};

export default func;
func.tags = ["Contracts"];
