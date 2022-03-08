import { getAddress } from "ethers/lib/utils";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";

const func: DeployFunction = async ({ deployments, ethers }: HardhatRuntimeEnvironment) => {
  const registryProxy = await deployments.get("RegistryProxy");
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryProxy.address);
  const curveDepositPoolAdapter = await deployments.get("CurveDepositPoolAdapter");
  const curveSwapPoolAdapter = await deployments.get("CurveSwapPoolAdapter");
  const curveMetaPoolSwapAdapter = await deployments.get("CurveMetapoolSwapAdapter");
  const curveMetaPoolDepositAdapter = await deployments.get("CurveMetapoolDepositAdapter");
  const lidoAdapter = await deployments.get("LidoAdapter");
  const aaveV1Adapter = await deployments.get("AaveV1Adapter");
  const aaveV2Adapter = await deployments.get("AaveV2Adapter");
  const compoundAdapter = await deployments.get("CompoundAdapter");
  const convexFinanceAdapter = await deployments.get("ConvexFinanceAdapter");
  const operatorAddress = await registryV2Instance.getOperator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const riskOperatorAddress = await registryV2Instance.getRiskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperatorAddress);

  // approve liquidity pools and map to adapter
  const poolsWithRatings: { [key: string]: { rate: number; adapter: string } } = {
    "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7": { rate: 80, adapter: curveSwapPoolAdapter.address }, // curve Pool for DAI/USDC/USDT
    "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022": { rate: 80, adapter: curveSwapPoolAdapter.address }, // curve ETH/stETH StableSwap
    "0x5a6A4D54456819380173272A5E8E9B9904BdF41B": { rate: 80, adapter: curveSwapPoolAdapter.address }, // curve MIM Metapool
    "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B": { rate: 80, adapter: curveMetaPoolSwapAdapter.address }, // curve swap pool for FRAX3CRV
    "0xA79828DF1850E8a3A3064576f380D90aECDD3359": { rate: 80, adapter: curveMetaPoolDepositAdapter.address }, // curve deposit Pool for FRAX3CRV-f
    "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84": { rate: 80, adapter: lidoAdapter.address }, // lido deposit Pool for stETH
    "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8": { rate: 90, adapter: aaveV1Adapter.address }, // aave v1 lending pool address provider
    "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413": { rate: 90, adapter: aaveV2Adapter.address }, // aave v2 lending pool address provider
    "0x39AA39c021dfbaE8faC545936693aC917d5E7563": { rate: 90, adapter: compoundAdapter.address }, // compound usdc pool
    "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5": { rate: 90, adapter: compoundAdapter.address }, // compound eth pool
    "0xabB54222c2b77158CC975a2b715a3d703c256F05": { rate: 80, adapter: convexFinanceAdapter.address }, // convex pool cvxMIM-3LP3CRV-f
    "0xbE0F6478E0E4894CFb14f32855603A083A57c7dA": { rate: 80, adapter: convexFinanceAdapter.address }, // convex pool for cvxFRAX3CRV-f
    "0x9518c9063eB0262D791f38d8d6Eb0aca33c63ed0": { rate: 80, adapter: convexFinanceAdapter.address }, // convex pool for cvxsteCR:{rate:80, adapter:}
    "0x0aE274c98c0415C0651AF8cF52b010136E4a0082": { rate: 80, adapter: curveDepositPoolAdapter.address },
    "0x0a53FaDa2d943057C47A301D25a4D9b3B8e01e8E": { rate: 80, adapter: curveDepositPoolAdapter.address },
    "0x6600e98b71dabfD4A8Cac03b302B0189Adb86Afb": { rate: 80, adapter: curveDepositPoolAdapter.address },
    "0x35796DAc54f144DFBAD1441Ec7C32313A7c29F39": { rate: 80, adapter: curveDepositPoolAdapter.address },
    "0xF6bDc2619FFDA72c537Cd9605e0A274Dc48cB1C9": { rate: 80, adapter: curveDepositPoolAdapter.address },
    "0x78CF256256C8089d68Cde634Cf7cDEFb39286470": { rate: 80, adapter: curveDepositPoolAdapter.address },
    "0x459eAA680b47D27c8561708C96c949e0018dF5d9": { rate: 80, adapter: curveDepositPoolAdapter.address },
    "0x61E10659fe3aa93d036d099405224E4Ac24996d0": { rate: 80, adapter: curveDepositPoolAdapter.address },
    "0x3c8cAee4E09296800f8D29A68Fa3837e2dae4940": { rate: 80, adapter: curveDepositPoolAdapter.address },
    "0xDeBF20617708857ebe4F679508E7b7863a8A8EeE": { rate: 80, adapter: curveDepositPoolAdapter.address },
    "0x2dded6Da1BF5DBdF597C45fcFaa3194e53EcfeAF": { rate: 80, adapter: curveDepositPoolAdapter.address },
    "0x87650D7bbfC3A9F10587d7778206671719d9910D": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0x4f062658EaAF2C1ccf8C8e36D6824CDf41167956": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0xC18cC39da8b11dA8c3541C598eE022258F9744da": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0x8038C01A0390a8c547446a0b2c18fc9aEFEcc10c": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0x890f4e345B1dAED0367A877a1612f86A1f86985f": { rate: 80, adapter: curveSwapPoolAdapter.address },
    "0x42d7025938bEc20B69cBae5A77421082407f053A": { rate: 80, adapter: curveSwapPoolAdapter.address },
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
    console.log(`approving and mapping ${approveLiquidityPoolAndMap.length} pools ...`, approveLiquidityPoolAndMap);
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
    console.log(`only mapping ${onlyMapPoolsToAdapters.length} pools ...`, onlyMapPoolsToAdapters);
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
    console.log(`rating ${ratePools.length} pools ...`, ratePools);
    const rateAdapterTx = await registryV2Instance
      .connect(riskOperatorSigner)
      ["rateLiquidityPool((address,uint8)[])"](ratePools);
    await rateAdapterTx.wait();
  } else {
    console.log("Already rate liquidity pool");
  }
};
export default func;
func.tags = ["ApproveAndMapLiquidityPoolToAdapter"];
