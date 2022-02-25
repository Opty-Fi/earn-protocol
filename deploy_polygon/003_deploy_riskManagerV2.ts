import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { RegistryV2, RiskManagerV2, RiskManagerProxy } from "../typechain";
import { executeFunc } from "../helpers/helpers";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const [owner] = await hre.ethers.getSigners();
  const { deploy } = deployments;
  const registryAddress = (await deployments.get("RegistryProxy")).address;

  const registryContract: RegistryV2 = <RegistryV2>(
    await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryAddress)
  );

  const riskManagerAddress = (
    await deploy("RiskManagerV2", {
      from: await owner.getAddress(),
      args: [registryAddress],
      log: true,
      contract: ESSENTIAL_CONTRACTS.RISK_MANAGER_V2,
    })
  ).address;

  const riskManagerProxyAddress = (
    await deploy("RiskManagerProxy", {
      from: await owner.getAddress(),
      args: [registryAddress],
      log: true,
      contract: ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY,
    })
  ).address;

  const riskManagerProxyContract: RiskManagerProxy = <RiskManagerProxy>(
    await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY, riskManagerProxyAddress)
  );

  const riskManagerContract: RiskManagerV2 = <RiskManagerV2>(
    await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER_V2, riskManagerAddress)
  );

  await riskManagerProxyContract.connect(owner).setPendingImplementation(riskManagerAddress);
  await riskManagerContract.connect(owner).become(riskManagerProxyAddress);

  await executeFunc(registryContract, owner, "setRiskManager(address)", [riskManagerContract.address]);
};

export default func;
func.tags = ["RegistryV2"];
