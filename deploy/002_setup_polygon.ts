import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ADAPTERS } from "../helpers/constants/adapters-polygon";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { addRiskProfiles } from "../helpers/contracts-actions";
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const [owner] = await hre.ethers.getSigners();
  const { deploy } = deployments;

  const registryAddress = (await deployments.get("RegistryProxy")).address;
  const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryAddress);

  await addRiskProfiles(owner, registryContract);

  for (let i = 0; i < ADAPTERS.length; i = +1) {
    const adapter = ADAPTERS[i];
    await deploy(adapter, {
      from: await owner.getAddress(),
      args: [],
      log: true,
      contract: adapter,
    });
  }
};

export default func;
func.tags = ["Polygon"];
