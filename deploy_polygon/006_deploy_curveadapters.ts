import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { CURVE_ADAPTERS, CURVE_PROTOCOLS } from "../helpers/constants/adapters-polygon";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { TypedDefiPools as PolygonDefiPools } from "../helpers/data/polygon_defiPools";
import { approveLiquidityPoolAndMapAdaptersV2 } from "../helpers/contracts-actions";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const [owner] = await hre.ethers.getSigners();
  const { deploy } = deployments;
  const registryAddress = (await deployments.get("RegistryProxy")).address;
  const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryAddress);
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

  const tokenKeys = MULTI_CHAIN_VAULT_TOKENS[hre.network.name]
    ? Object.keys(MULTI_CHAIN_VAULT_TOKENS[hre.network.name])
    : [];

  const liquidityPoolsAddressesMapAdapter: string[][] = [];

  for (let i = 0; i < CURVE_ADAPTERS.length; i += 1) {
    for (let j = 0; j < tokenKeys.length; j += 1) {
      if (PolygonDefiPools[CURVE_ADAPTERS[i]] && PolygonDefiPools[CURVE_ADAPTERS[i]][tokenKeys[j]]) {
        liquidityPoolsAddressesMapAdapter.push([
          PolygonDefiPools[CURVE_ADAPTERS[i]][tokenKeys[j]].lpToken,
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
