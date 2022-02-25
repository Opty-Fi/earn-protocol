import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { RegistryV2, RegistryProxy } from "../typechain";
import KOVAN from "../_deployments/kovan.json";
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

  const registryProxyContract: RegistryProxy = <RegistryProxy>(
    await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, KOVAN.RegistryProxy)
  );

  const registryContract: RegistryV2 = <RegistryV2>(
    await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryAddress)
  );

  await registryProxyContract.connect(owner).setPendingImplementation(registryAddress);
  await registryContract.connect(owner).become(KOVAN.RegistryProxy);
};

export default func;
func.tags = ["RegistryV2"];
