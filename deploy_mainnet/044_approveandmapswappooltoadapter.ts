import { BigNumber } from "ethers";
import { getNamedAccounts } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";

const func: DeployFunction = async ({ deployments, ethers }: HardhatRuntimeEnvironment) => {
  const { deployer } = await getNamedAccounts();
  const { getAddress } = ethers.utils;
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const curveExchangeAdapterEthereum = await deployments.get("CurveExchangeAdapterEthereum");
  const uniswapV2ExchangeAdapterEthereum = await deployments.get("UniswapV2ExchangeAdapterEthereum");
  const sushiswapExchangeAdapterEthereum = await deployments.get("SushiswapExchangeAdapterEthereum");
  const operatorAddress = await registryV2Instance.getOperator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const riskOperatorAddress = await registryV2Instance.getRiskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperatorAddress);

  // approve swap pools and map to adapter
  const poolsWithRatings: { [key: string]: { rate: number; adapter: string } } = {
    "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7": { rate: 99, adapter: curveExchangeAdapterEthereum.address }, // curve Pool for DAI/USDC/USDT
    "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022": { rate: 99, adapter: curveExchangeAdapterEthereum.address }, // curve ETH/stETH StableSwap
    "0xdcef968d416a41cdac0ed8702fac8128a64241a2": { rate: 99, adapter: curveExchangeAdapterEthereum.address }, // curve FRAX/USDC StableSwap
    "0x795065dCc9f64b5614C407a6EFDC400DA6221FB0": { rate: 99, adapter: sushiswapExchangeAdapterEthereum.address }, // SUSHI-SUSHI-WETH
    "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0": { rate: 99, adapter: sushiswapExchangeAdapterEthereum.address }, // SUSHI-USDC-WETH
    "0xCEfF51756c56CeFFCA006cD410B03FFC46dd3a58": { rate: 99, adapter: sushiswapExchangeAdapterEthereum.address }, // SUSHI-WBTC-WETH
    "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc": { rate: 99, adapter: uniswapV2ExchangeAdapterEthereum.address }, // UNI-USDC-WETH
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
    console.log(`approve ${approveSwapPoolAndMap.length} pools And Map `, approveSwapPoolAndMap);
    if (getAddress(operatorSigner.address) === getAddress(deployer)) {
      // approve swap pool and map adapter
      console.log(`operator approving and mapping ${approveSwapPoolAndMap.length} pools ...`);
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
      console.log("cannot approve and map swap pools as signer is not the operator");
    }
  } else {
    console.log("Already approved swap pool and map to adapter");
  }

  console.log("==Only map swap pool to adapter==");
  if (onlyMapSwapPoolsToAdapters.length > 0) {
    console.log(`map ${onlyMapSwapPoolsToAdapters.length} pools `, onlyMapSwapPoolsToAdapters);
    // only map swap pool to adapter
    if (getAddress(operatorSigner.address) === getAddress(deployer)) {
      console.log(`operator only mapping ${onlyMapSwapPoolsToAdapters.length} pools ...`);
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
      console.log("cannot map swap pools as signer is not the operator");
    }
  } else {
    console.log("Already mapped to adapter");
  }

  console.log("==Only rate swap pool==");
  if (rateSwapPools.length > 0) {
    console.log(`${rateSwapPools.length} pools to rate ...`, rateSwapPools);
    // rate pools
    if (getAddress(riskOperatorSigner.address) === getAddress(deployer)) {
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
      console.log("cannot rate swap pools as signer is not the risk operator");
    }
  } else {
    console.log("Already rate swap pool");
  }
};
export default func;
func.tags = ["ApproveAndMapSwapPoolToAdapter"];
func.dependencies = [
  "Registry",
  "CurveExchangeAdapterEthereum",
  "UniswapV2ExchangeAdapterEthereum",
  "SushiswapExchangeAdapterEthereum",
];
