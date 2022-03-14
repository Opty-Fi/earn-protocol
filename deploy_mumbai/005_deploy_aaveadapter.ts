import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { AAVE_ADAPTER_NAME } from "../helpers/constants/adapters-polygon";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { TypedMumbaiDefiPools } from "../helpers/data/polygon_defiPools";
import { approveLiquidityPoolAndMapAdaptersV2 } from "../helpers/contracts-actions";
import { TypedMumbaiTokens } from "../helpers/data";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const [owner] = await hre.ethers.getSigners();
  const { deploy } = deployments;
  const registryAddress = (await deployments.get("RegistryProxy")).address;
  const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryAddress);
  const adapter = (
    await deploy(AAVE_ADAPTER_NAME, {
      from: await owner.getAddress(),
      args: [registryAddress],
      log: true,
      contract: AAVE_ADAPTER_NAME,
    })
  ).address;

  const tokenKeys = Object.keys(TypedMumbaiTokens);

  const liquidityPoolsAddressesMapAdapter: string[][] = [];

  if (liquidityPoolsAddressesMapAdapter.length > 0) {
    await approveLiquidityPoolAndMapAdaptersV2(
      owner,
      registryContract,
      [],
      tokenKeys.map(token => [adapter, TypedMumbaiDefiPools[AAVE_ADAPTER_NAME][token].lpToken]),
      false,
    );
  }
};

export default func;
func.tags = ["Setup"];