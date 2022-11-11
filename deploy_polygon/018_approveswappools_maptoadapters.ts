import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";

const func: DeployFunction = async ({ deployments, ethers }: HardhatRuntimeEnvironment) => {
  const { getAddress } = ethers.utils;
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const sushiswapExchangeAdapterPolygon = await deployments.get("SushiswapExchangeAdapterPolygon");
  const quickSwapExchangeAdapterPolygon = await deployments.get("QuickswapExchangeAdapterPolygon");

  const operatorAddress = await registryV2Instance.getOperator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const riskOperatorAddress = await registryV2Instance.getRiskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperatorAddress);

  // approve swap pools and map to adapter
  const poolsWithRatings: { [key: string]: { rate: number; adapter: string } } = {
    "0x4b1f1e2435a9c96f7330faea190ef6a7c8d70001": { rate: 99, adapter: sushiswapExchangeAdapterPolygon.address }, // pool for USDC-USDT-SLP
    "0xcd578f016888b57f1b1e3f887f392f0159e26747": { rate: 99, adapter: sushiswapExchangeAdapterPolygon.address }, // pool for  USDC-DAI-SLP
    "0x2cF7252e74036d1Da831d11089D326296e64a728": { rate: 99, adapter: quickSwapExchangeAdapterPolygon.address }, // pool for USDC-USDT-QLP
    "0xf04adBF75cDFc5eD26eeA4bbbb991DB002036Bdd": { rate: 99, adapter: quickSwapExchangeAdapterPolygon.address }, // pool for USDC-DAI-QLP
    "0x160532D2536175d65C03B97b0630A9802c274daD": { rate: 99, adapter: quickSwapExchangeAdapterPolygon.address }, // pool for USDC-MAI-QLP
  };

  const onlyMapSwapPoolsToAdapters = [];
  const approveSwapPoolAndMap = [];
  const rateSwapPools: [string, number][] = [];

  for (const pool of Object.keys(poolsWithRatings)) {
    const { rating, isLiquidityPool } = await registryV2Instance.getSwapPool(pool);
    const adapter = await registryV2Instance.getSwapPoolToAdapter(pool);
    if (!isLiquidityPool && getAddress(adapter) != getAddress(poolsWithRatings[pool].adapter)) {
      approveSwapPoolAndMap.push([pool, poolsWithRatings[pool].adapter]);
    }
    if (isLiquidityPool && getAddress(adapter) != getAddress(poolsWithRatings[pool].adapter)) {
      onlyMapSwapPoolsToAdapters.push([pool, poolsWithRatings[pool].adapter]);
    }
    if (rating != poolsWithRatings[pool].rate) {
      rateSwapPools.push([pool, poolsWithRatings[pool].rate]);
    }
  }

  console.log("==Approve swap pool and map to adapter==");
  if (approveSwapPoolAndMap.length > 0) {
    // approve swap pool and map adapter
    console.log(`operator approving and mapping ${approveSwapPoolAndMap.length} pools ...`, approveSwapPoolAndMap);
    const feeData = await ethers.provider.getFeeData();
    const approveSwapPoolAndMapAdapterTx = await registryV2Instance
      .connect(operatorSigner)
      ["approveSwapPoolAndMapToAdapter((address,address)[])"](approveSwapPoolAndMap, {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await approveSwapPoolAndMapAdapterTx.wait();
  } else {
    console.log("Already approved swap pool and map to adapter");
  }

  console.log("==Only map swap pool to adapter==");
  if (onlyMapSwapPoolsToAdapters.length > 0) {
    // only map swappool to adapter
    console.log(`operator only mapping ${onlyMapSwapPoolsToAdapters.length} pools ...`, onlyMapSwapPoolsToAdapters);
    const feeData = await ethers.provider.getFeeData();
    const mapToAdapterTx = await registryV2Instance
      .connect(operatorSigner)
      ["setSwapPoolToAdapter((address,address)[])"](onlyMapSwapPoolsToAdapters, {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await mapToAdapterTx.wait();
  } else {
    console.log("Already mapped to adapter");
  }

  console.log("==Only rate swap pool==");
  if (rateSwapPools.length > 0) {
    // rate swappools
    console.log(`risk operator rating ${rateSwapPools.length} pools ...`, rateSwapPools);
    const feeData = await ethers.provider.getFeeData();
    const rateAdapterTx = await registryV2Instance
      .connect(riskOperatorSigner)
      ["rateSwapPool((address,uint8)[])"](rateSwapPools, {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await rateAdapterTx.wait();
  } else {
    console.log("Already rate swap pool");
  }
};
export default func;
func.tags = ["PolygonApproveAndMapSwapPoolToAdapter"];
func.dependencies = ["SushiswapExchangeAdapterPolygon", "QuickswapExchangeAdapterPolygon"];
