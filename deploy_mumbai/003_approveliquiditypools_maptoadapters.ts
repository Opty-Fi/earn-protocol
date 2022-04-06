import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";

const func: DeployFunction = async ({ deployments, ethers }: HardhatRuntimeEnvironment) => {
  const { getAddress } = ethers.utils;
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const aaveAdapter = await deployments.get("AaveAdapter");

  const operatorAddress = await registryV2Instance.getOperator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const riskOperatorAddress = await registryV2Instance.getRiskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperatorAddress);

  // approve liquidity pools and map to adapter
  const poolsWithRatings: { [key: string]: { rate: number; adapter: string } } = {
    "0xE6ef11C967898F9525D550014FDEdCFAB63536B5": { rate: 90, adapter: aaveAdapter.address }, // aave lendingpoolregistryprovider
  };

  const onlyMapPoolsToAdapters = [];
  const approveLiquidityPoolAndMap = [];
  const ratePools: [string, number][] = [];

  for (const pool of Object.keys(poolsWithRatings)) {
    const { rating, isLiquidityPool } = await registryV2Instance.getLiquidityPool(pool);
    const adapter = await registryV2Instance.liquidityPoolToAdapter(pool);
    if (!isLiquidityPool && getAddress(adapter) != getAddress(poolsWithRatings[pool].adapter)) {
      approveLiquidityPoolAndMap.push([pool, poolsWithRatings[pool].adapter]);
    }
    if (isLiquidityPool && getAddress(adapter) != getAddress(poolsWithRatings[pool].adapter)) {
      onlyMapPoolsToAdapters.push([pool, poolsWithRatings[pool].adapter]);
    }
    if (rating != poolsWithRatings[pool].rate) {
      ratePools.push([pool, poolsWithRatings[pool].rate]);
    }
  }

  console.log("==Approve liquidity pool and map to adapter==");
  if (approveLiquidityPoolAndMap.length > 0) {
    // approve liquidity pool and map adapter
    console.log(
      `operator approving and mapping ${approveLiquidityPoolAndMap.length} pools ...`,
      approveLiquidityPoolAndMap,
    );
    const approveLiquidityPoolAndMapAdapterTx = await registryV2Instance
      .connect(operatorSigner)
      ["approveLiquidityPoolAndMapToAdapter((address,address)[])"](approveLiquidityPoolAndMap);
    await approveLiquidityPoolAndMapAdapterTx.wait();
  } else {
    console.log("Already approved liquidity pool and map to adapter");
  }

  console.log("==Only map liquidity pool to adapter==");
  if (onlyMapPoolsToAdapters.length > 0) {
    // only map pool to adapter
    console.log(`operator only mapping ${onlyMapPoolsToAdapters.length} pools ...`, onlyMapPoolsToAdapters);
    const mapToAdapterTx = await registryV2Instance
      .connect(operatorSigner)
      ["setLiquidityPoolToAdapter((address,address)[])"](onlyMapPoolsToAdapters);
    await mapToAdapterTx.wait();
  } else {
    console.log("Already mapped to adapter");
  }

  console.log("==Only rate liquidity pool==");
  if (ratePools.length > 0) {
    // rate pools
    console.log(`risk operator rating ${ratePools.length} pools ...`, ratePools);
    const rateAdapterTx = await registryV2Instance
      .connect(riskOperatorSigner)
      ["rateLiquidityPool((address,uint8)[])"](ratePools);
    await rateAdapterTx.wait();
  } else {
    console.log("Already rate liquidity pool");
  }
};
export default func;
func.tags = ["MumbaiApproveAndMapLiquidityPoolToAdapter"];
func.dependencies = ["MumbaiAaveAdapter"];
