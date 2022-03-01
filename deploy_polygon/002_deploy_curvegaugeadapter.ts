import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { CURVE_GAUGE_ADAPTER } from "../helpers/constants/adapters-polygon";
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
  const curveAdapter = (
    await deploy(CURVE_GAUGE_ADAPTER, {
      from: await owner.getAddress(),
      args: [registryAddress],
      log: true,
      contract: CURVE_GAUGE_ADAPTER,
    })
  ).address;

  const tokenKeys = MULTI_CHAIN_VAULT_TOKENS[hre.network.name]
    ? Object.keys(MULTI_CHAIN_VAULT_TOKENS[hre.network.name])
    : [];

  const liquidityPoolsAddressesMapAdapter: string[][] = [];

  for (let j = 0; j < tokenKeys.length; j += 1) {
    if (PolygonDefiPools[CURVE_GAUGE_ADAPTER] && PolygonDefiPools[CURVE_GAUGE_ADAPTER][tokenKeys[j]]) {
      liquidityPoolsAddressesMapAdapter.push([
        PolygonDefiPools[CURVE_GAUGE_ADAPTER][tokenKeys[j]].lpToken,
        curveAdapter,
      ]);
    }
  }

  if (liquidityPoolsAddressesMapAdapter.length > 0) {
    await approveLiquidityPoolAndMapAdaptersV2(owner, registryContract, [], liquidityPoolsAddressesMapAdapter, false);
  }
};

export default func;
func.tags = ["CurveGaugeAdapter"];
