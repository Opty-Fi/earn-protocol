import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { RegistryV2 } from "../typechain";
import { executeFunc } from "../helpers/helpers";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const [owner] = await hre.ethers.getSigners();
  const { deploy } = deployments;
  const registryAddress = (await deployments.get("RegistryProxy")).address;

  const registryContract: RegistryV2 = <RegistryV2>(
    await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryAddress)
  );

  const strategyProviderAddress = (
    await deploy("StrategyProviderV2", {
      from: await owner.getAddress(),
      args: [registryAddress],
      log: true,
      contract: ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER_V2,
    })
  ).address;

  await executeFunc(registryContract, owner, "setStrategyProvider(address)", [strategyProviderAddress]);
};

export default func;
func.tags = ["StrategyProviderV2", "Polygon"];
