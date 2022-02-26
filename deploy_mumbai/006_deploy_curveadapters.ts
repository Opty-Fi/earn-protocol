import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { CURVE_ADAPTERS, CURVE_PROTOCOLS } from "../helpers/constants/adapters-polygon";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { TypedMumbaiDefiPools } from "../helpers/data/polygon_defiPools";
import { TypedMumbaiTokens } from "../helpers/data";
import { approveLiquidityPoolAndMapAdaptersV2 } from "../helpers/contracts-actions";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const [owner] = await hre.ethers.getSigners();
  const { deploy } = deployments;
  const registryAddress = (await deployments.get("RegistryProxy")).address;
  const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryAddress);
  const curveAdapters: { [name: string]: string } = {};
  for (let i = 0; i < CURVE_ADAPTERS.length; i++) {
    curveAdapters[CURVE_ADAPTERS[i]] = (
      await deploy(CURVE_ADAPTERS[i], {
        from: await owner.getAddress(),
        args: [registryAddress],
        log: true,
        contract: CURVE_ADAPTERS[i],
      })
    ).address;
  }

  const tokenKeys = Object.keys(TypedMumbaiTokens);

  const liquidityPoolsAddressesMapAdapter: string[][] = [];

  for (let i = 0; i < CURVE_ADAPTERS.length; i += 1) {
    for (let j = 0; j < tokenKeys.length; j += 1) {
      if (TypedMumbaiDefiPools[CURVE_PROTOCOLS[i]] && TypedMumbaiDefiPools[CURVE_PROTOCOLS[i]][tokenKeys[j]]) {
        liquidityPoolsAddressesMapAdapter.push([
          TypedMumbaiDefiPools[CURVE_PROTOCOLS[i]][tokenKeys[j]].lpToken,
          curveAdapters[CURVE_ADAPTERS[i]],
        ]);
      }
    }
  }
  if (liquidityPoolsAddressesMapAdapter.length > 0) {
    await approveLiquidityPoolAndMapAdaptersV2(owner, registryContract, [], liquidityPoolsAddressesMapAdapter, false);
  }
};

export default func;
func.tags = ["Setup"];
