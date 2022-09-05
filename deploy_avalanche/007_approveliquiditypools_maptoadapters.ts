import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";

const func: DeployFunction = async ({ deployments, ethers }: HardhatRuntimeEnvironment) => {
  const { getAddress } = ethers.utils;
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const aaveV2Adapter = await deployments.get("AaveV2AvalancheAdapter");
  const aaveV3Adapter = await deployments.get("AaveV3AvalancheAdapter");
  const benqiAdapter = await deployments.get("BenqiAdapter");
  const traderJoeLendAdapter = await deployments.get("TraderJoeLendAdapter");
  const traderJoeStakeAdapter = await deployments.get("TraderJoeStakeAdapter");

  const operatorAddress = await registryV2Instance.getOperator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const riskOperatorAddress = await registryV2Instance.getRiskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperatorAddress);

  // approve liquidity pools and map to adapter
  const poolsWithRatings: { [key: string]: { rate: number; adapter: string } } = {
    "0x4235E22d9C3f28DCDA82b58276cb6370B01265C2": { rate: 90, adapter: aaveV2Adapter.address }, // aave lendingpoolregistryprovider
    "0x770ef9f4fe897e59daCc474EF11238303F9552b6": { rate: 90, adapter: aaveV3Adapter.address }, // aave lendingpoolregistryprovider
    "0x5C0401e81Bc07Ca70fAD469b451682c0d747Ef1c": { rate: 90, adapter: benqiAdapter.address }, // benqi adapter
    "0xBEb5d47A3f720Ec0a390d04b4d41ED7d9688bC7F": { rate: 90, adapter: benqiAdapter.address }, // benqi adapter
    "0x4e9f683A27a6BdAD3FC2764003759277e93696e6": { rate: 90, adapter: benqiAdapter.address }, // benqi adapter
    "0x835866d37AFB8CB8F8334dCCdaf66cf01832Ff5D": { rate: 90, adapter: benqiAdapter.address }, // benqi adapter
    "0xe194c4c5aC32a3C9ffDb358d9Bfd523a0B6d1568": { rate: 90, adapter: benqiAdapter.address }, // benqi adapter
    "0x334AD834Cd4481BB02d09615E7c11a00579A7909": { rate: 90, adapter: benqiAdapter.address }, // benqi adapter
    "0xc9e5999b8e75C3fEB117F6f73E664b9f3C8ca65C": { rate: 90, adapter: benqiAdapter.address }, // benqi adapter
    "0x29472D511808Ce925F501D25F9Ee9efFd2328db2": { rate: 90, adapter: traderJoeLendAdapter.address }, // traderJoeLend adapter
    "0xC22F01ddc8010Ee05574028528614634684EC29e": { rate: 90, adapter: traderJoeLendAdapter.address }, // traderJoeLend adapter
    "0xEd6AaF91a2B084bd594DBd1245be3691F9f637aC": { rate: 90, adapter: traderJoeLendAdapter.address }, // traderJoeLend adapter
    "0x585E7bC75089eD111b656faA7aeb1104F5b96c15": { rate: 90, adapter: traderJoeLendAdapter.address }, // traderJoeLend adapter
    "0xc988c170d0E38197DC634A45bF00169C7Aa7CA19": { rate: 90, adapter: traderJoeLendAdapter.address }, // traderJoeLend adapter
    "0x3fE38b7b610C0ACD10296fEf69d9b18eB7a9eB1F": { rate: 90, adapter: traderJoeLendAdapter.address }, // traderJoeLend adapter
    "0x929f5caB61DFEc79a5431a7734a68D714C4633fa": { rate: 90, adapter: traderJoeLendAdapter.address }, // traderJoeLend adapter
    "0x8b650e26404AC6837539ca96812f0123601E4448": { rate: 90, adapter: traderJoeLendAdapter.address }, // traderJoeLend adapter
    "0xcE095A9657A02025081E0607c8D8b081c76A75ea": { rate: 90, adapter: traderJoeLendAdapter.address }, // traderJoeLend adapter
    "0xC146783a59807154F92084f9243eb139D58Da696": { rate: 90, adapter: traderJoeLendAdapter.address }, // traderJoeLend adapter
    "0x57319d41F71E81F3c65F2a47CA4e001EbAFd4F33": { rate: 90, adapter: traderJoeStakeAdapter.address }, // traderJoeStake adapter
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
    const feeData = await ethers.provider.getFeeData();
    const approveLiquidityPoolAndMapAdapterTx = await registryV2Instance
      .connect(operatorSigner)
      ["approveLiquidityPoolAndMapToAdapter((address,address)[])"](approveLiquidityPoolAndMap, {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await approveLiquidityPoolAndMapAdapterTx.wait();
  } else {
    console.log("Already approved liquidity pool and map to adapter");
  }

  console.log("==Only map liquidity pool to adapter==");
  if (onlyMapPoolsToAdapters.length > 0) {
    // only map pool to adapter
    console.log(`operator only mapping ${onlyMapPoolsToAdapters.length} pools ...`, onlyMapPoolsToAdapters);
    const feeData = await ethers.provider.getFeeData();
    const mapToAdapterTx = await registryV2Instance
      .connect(operatorSigner)
      ["setLiquidityPoolToAdapter((address,address)[])"](onlyMapPoolsToAdapters, {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await mapToAdapterTx.wait();
  } else {
    console.log("Already mapped to adapter");
  }

  console.log("==Only rate liquidity pool==");
  if (ratePools.length > 0) {
    // rate pools
    console.log(`risk operator rating ${ratePools.length} pools ...`, ratePools);
    const feeData = await ethers.provider.getFeeData();
    const rateAdapterTx = await registryV2Instance
      .connect(riskOperatorSigner)
      ["rateLiquidityPool((address,uint8)[])"](ratePools, {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await rateAdapterTx.wait();
  } else {
    console.log("Already rate liquidity pool");
  }
};
export default func;
func.tags = ["AvalancheApproveAndMapLiquidityPoolToAdapter"];
func.dependencies = ["AvalancheAaveV2Adapter", "AvalancheAaveV3Adapter", "AvalancheBenqiAdapter"];
