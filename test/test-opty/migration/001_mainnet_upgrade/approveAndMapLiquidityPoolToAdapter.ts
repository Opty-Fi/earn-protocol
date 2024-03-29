import { getAddress } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { RegistryV1__factory } from "../../../../helpers/types/registryV1";
import { RegistryProxy as registryProxyAddress } from "../../_deployments/mainnet.json";

export async function approveAndMapLiquidityPoolToAdapter(): Promise<void> {
  const registryV2Instance = await ethers.getContractAt(RegistryV1__factory.abi, registryProxyAddress);
  const curveSwapPoolAdapterFactory = await ethers.getContractFactory("CurveSwapPoolAdapter");
  const curveSwapPoolAdapter = await curveSwapPoolAdapterFactory.deploy(registryProxyAddress);
  const curveMetapoolSwapAdapterFactory = await ethers.getContractFactory("CurveMetapoolSwapAdapter");
  const curveMetaPoolSwapAdapter = await curveMetapoolSwapAdapterFactory.deploy(registryProxyAddress);
  const lidoAdapterFactory = await ethers.getContractFactory("LidoAdapter");
  const lidoAdapter = await lidoAdapterFactory.deploy(registryProxyAddress);
  const aaveV1AdapterAddress = "0x80647B9A016E197dC7adBf14cC2b21B58B830Bcc";
  const aaveV2AdapterAddress = "0x962F0877C2706c513CDc82eC8eE7e1c29FbeF5D0";
  const compoundAdapterAddress = "0x9680624aD6BF5a34cE496A483400585136c575A4";
  const convexFinanceAdapterAddress = "0xCb612ccE8F0ccddFadE6CE28774534292da2C970";
  const operatorAddress = await registryV2Instance.getOperator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const riskOperatorAddress = await registryV2Instance.getRiskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperatorAddress);

  // approve liquidity pools and map to adapter
  const poolsWithRatings: { [key: string]: { rate: number; adapter: string } } = {
    "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7": { rate: 80, adapter: curveSwapPoolAdapter.address }, // curve Pool for DAI/USDC/USDT
    "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022": { rate: 80, adapter: curveSwapPoolAdapter.address }, // curve ETH/stETH StableSwap
    "0x5a6A4D54456819380173272A5E8E9B9904BdF41B": { rate: 80, adapter: curveMetaPoolSwapAdapter.address }, // curve MIM Metapool
    "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B": { rate: 80, adapter: curveMetaPoolSwapAdapter.address }, // curve swap pool for FRAX3CRV
    "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84": { rate: 80, adapter: lidoAdapter.address }, // lido deposit Pool for stETH
    "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8": { rate: 90, adapter: aaveV1AdapterAddress }, // aave v1 lending pool address provider
    "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413": { rate: 90, adapter: aaveV2AdapterAddress }, // aave v2 lending pool address provider
    "0x39AA39c021dfbaE8faC545936693aC917d5E7563": { rate: 90, adapter: compoundAdapterAddress }, // compound usdc pool
    "0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5": { rate: 90, adapter: compoundAdapterAddress }, // compound eth pool
    "0xabB54222c2b77158CC975a2b715a3d703c256F05": { rate: 80, adapter: convexFinanceAdapterAddress }, // convex pool cvxMIM-3LP3CRV-f
    "0xbE0F6478E0E4894CFb14f32855603A083A57c7dA": { rate: 80, adapter: convexFinanceAdapterAddress }, // convex pool for cvxFRAX3CRV-f
    "0x9518c9063eB0262D791f38d8d6Eb0aca33c63ed0": { rate: 80, adapter: convexFinanceAdapterAddress }, // convex pool for cvxsteCR:{rate:80, adapter:}
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
    "0x3689f325E88c2363274E5F3d44b6DaB8f9e1f524": { rate: 80, adapter: convexFinanceAdapterAddress }, // cvxusdc3CRV
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

  if (approveLiquidityPoolAndMap.length > 0) {
    // approve liquidity pool and map adapter
    const approveLiquidityPoolAndMapAdapterTx = await registryV2Instance
      .connect(operatorSigner)
      ["approveLiquidityPoolAndMapToAdapter((address,address)[])"](approveLiquidityPoolAndMap);
    await approveLiquidityPoolAndMapAdapterTx.wait();
  }

  if (onlyMapPoolsToAdapters.length > 0) {
    // only map pool to adapter
    const mapToAdapterTx = await registryV2Instance
      .connect(operatorSigner)
      ["setLiquidityPoolToAdapter((address,address)[])"](onlyMapPoolsToAdapters);
    await mapToAdapterTx.wait();
  }

  if (ratePools.length > 0) {
    // rate pools
    const rateAdapterTx = await registryV2Instance
      .connect(riskOperatorSigner)
      ["rateLiquidityPool((address,uint8)[])"](ratePools);
    await rateAdapterTx.wait();
  }
}
