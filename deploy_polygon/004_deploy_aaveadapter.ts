import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ADAPTERS as POLYGON_ADAPTERS } from "../helpers/constants/adapters-polygon";
import { ADAPTERS as ETHEREUM_ADAPTERS } from "../helpers/constants/adapters";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { NETWORKS_CHAIN_ID_HASH, eEVMNetwork } from "../helper-hardhat-config";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { TypedDefiPools as PolygonDefiPools } from "../helpers/data/polygon_defiPools";
import { DEFI_POOLS_DATA } from "../helpers/type";
import {
  addRiskProfiles,
  approveAndMapTokenHashToTokensV2,
  approveLiquidityPoolAndMapAdaptersV2,
} from "../helpers/contracts-actions";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const [owner] = await hre.ethers.getSigners();
  const { deploy } = deployments;
  const adapters = ["polygon", "mumbai"].includes(hre.network.name) ? POLYGON_ADAPTERS : ETHEREUM_ADAPTERS;
  const deployedAdapters: { [adapterName: string]: string } = {};
  for (let i = 0; i < adapters.length; i = +1) {
    const adapter = adapters[i];
    deployedAdapters[adapter] = (
      await deploy(adapter, {
        from: await owner.getAddress(),
        args: [registryAddress],
        log: true,
        contract: adapter,
      })
    ).address;
  }
  console.log("Deployed Adapters.");
  console.log("----------------------");

  const tokenKeys = MULTI_CHAIN_VAULT_TOKENS[hre.network.name]
    ? Object.keys(MULTI_CHAIN_VAULT_TOKENS[hre.network.name])
    : [];
  const tokens =
    tokenKeys.length > 0 ? tokenKeys.map(token => MULTI_CHAIN_VAULT_TOKENS[hre.network.name][token].address) : [];

  if (tokens.length > 0) {
    console.log("Approving Tokens...");

    await approveAndMapTokenHashToTokensV2(
      owner,
      registryContract,
      tokens,
      true,
      NETWORKS_CHAIN_ID_HASH[hre.network.name as eEVMNetwork],
      false,
    );
  }

  let adapterMapliquidityPools: DEFI_POOLS_DATA = {};
  switch (hre.network.name) {
    case eEVMNetwork.polygon: {
      adapterMapliquidityPools = PolygonDefiPools;
      break;
    }
    default:
      break;
  }
  let liquidityPoolsAddressesMapAdapter: string[][] = [];
  const protocolNames = Object.keys(adapterMapliquidityPools);
  for (let i = 0; i < protocolNames.length; i++) {
    const adapterName = `${protocolNames[i]}Adapter`;
    const liquidityPools = adapterMapliquidityPools[protocolNames[i]];
    const poolAddressesWithAdapter = tokenKeys.map(token => [
      deployedAdapters[adapterName],
      liquidityPools[token].lpToken,
    ]);
    liquidityPoolsAddressesMapAdapter = poolAddressesWithAdapter;
  }
  if (liquidityPoolsAddressesMapAdapter.length > 0) {
    await approveLiquidityPoolAndMapAdaptersV2(owner, registryContract, [], liquidityPoolsAddressesMapAdapter, false);
  }
};

export default func;
func.tags = ["Setup"];
