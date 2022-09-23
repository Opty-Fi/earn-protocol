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
  const curveSwapPoolAdapter = await deployments.get("CurveSwapPoolAdapter");
  const curveMetaPoolSwapAdapter = await deployments.get("CurveMetapoolSwapAdapter");
  const sushiswapPoolAdapterEthereum = await deployments.get("SushiswapPoolAdapterEthereum");
  const newoStakingAdapter = await deployments.get("NewoStakingAdapter");
  const aaveV1Adapter = await deployments.get("AaveV1Adapter");
  const aaveV2Adapter = await deployments.get("AaveV2Adapter");
  const compoundAdapter = await deployments.get("CompoundAdapter");
  const convexFinanceAdapter = await deployments.get("ConvexFinanceAdapter");
  const sushiswapMasterChefV1Adapter = await deployments.get("SushiswapMasterChefV1Adapter");
  const sushiBarAdapter = await deployments.get("SushiBarAdapter");
  const sushiswapMasterChefV2AdapterEthereum = await deployments.get("SushiswapMasterChefV2AdapterEthereum");
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
    "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8": { rate: 90, adapter: aaveV1Adapter.address }, // aave v1 lending pool address provider
    "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413": { rate: 90, adapter: aaveV2Adapter.address }, // aave v2 lending pool address provider
    "0x39AA39c021dfbaE8faC545936693aC917d5E7563": { rate: 90, adapter: compoundAdapter.address }, // compound usdc pool
    "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5": { rate: 90, adapter: compoundAdapter.address }, // compound eth pool
    "0xabB54222c2b77158CC975a2b715a3d703c256F05": { rate: 80, adapter: convexFinanceAdapter.address }, // convex pool cvxMIM-3LP3CRV-f
    "0xbE0F6478E0E4894CFb14f32855603A083A57c7dA": { rate: 80, adapter: convexFinanceAdapter.address }, // convex pool for cvxFRAX3CRV-f
    "0x9518c9063eB0262D791f38d8d6Eb0aca33c63ed0": { rate: 80, adapter: convexFinanceAdapter.address }, // convex pool for cvxsteCR:{rate:80, adapter:}
    "0x87650D7bbfC3A9F10587d7778206671719d9910D": { rate: 80, adapter: curveSwapPoolAdapter.address }, // ousd+3Crv curve pool
    "0x4f062658EaAF2C1ccf8C8e36D6824CDf41167956": { rate: 80, adapter: curveSwapPoolAdapter.address }, // gusd3CRV curve pool
    "0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604": { rate: 80, adapter: curveSwapPoolAdapter.address }, // husd3CRV curve pool
    "0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb": { rate: 80, adapter: curveSwapPoolAdapter.address }, // usdk3CRV curve pool
    "0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1": { rate: 80, adapter: curveSwapPoolAdapter.address }, // usdn3CRV curve pool
    "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171": { rate: 80, adapter: curveSwapPoolAdapter.address }, // LinkUSD3CRV curve pool
    "0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6": { rate: 80, adapter: curveSwapPoolAdapter.address }, // musd3CRV curve pool
    "0xC18cC39da8b11dA8c3541C598eE022258F9744da": { rate: 80, adapter: curveSwapPoolAdapter.address }, // rsv3CRV curve pool
    "0x8038C01A0390a8c547446a0b2c18fc9aEFEcc10c": { rate: 80, adapter: curveSwapPoolAdapter.address }, // dusd3CRV curve pool
    "0x890f4e345B1dAED0367A877a1612f86A1f86985f": { rate: 80, adapter: curveSwapPoolAdapter.address }, // ust+3CRV curve pool
    "0x42d7025938bEc20B69cBae5A77421082407f053A": { rate: 80, adapter: curveSwapPoolAdapter.address }, // usdp+3crv curve pool
    "0x3689f325E88c2363274E5F3d44b6DaB8f9e1f524": { rate: 80, adapter: convexFinanceAdapter.address }, // cvxusdc3CRV
    "0x67c4f788FEB82FAb27E3007daa3d7b90959D5b89": { rate: 80, adapter: convexFinanceAdapter.address }, // cvxust3CRV
    "0xBC9016C379fb218B95Fe3730D5F49F3149E86CAB": { rate: 50, adapter: newoStakingAdapter.address }, // stkNEWO
    "0xdb36b23964FAB32dCa717c99D6AEFC9FB5748f3a": { rate: 50, adapter: newoStakingAdapter.address }, // newoSushiNEWO-USDC
    "0xc08ED9a9ABEAbcC53875787573DC32Eee5E43513": { rate: 50, adapter: sushiswapPoolAdapterEthereum.address }, // SUSHI-NEWO-USDC
    "0xD75EA151a61d06868E31F8988D28DFE5E9df57B4": { rate: 50, adapter: sushiswapPoolAdapterEthereum.address }, // SUSHI-AAVE-WETH
    "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd": { rate: 90, adapter: sushiswapMasterChefV1Adapter.address }, // Sushiswap's MasterChef
    "0xe65cdB6479BaC1e22340E4E755fAE7E509EcD06c": { rate: 90, adapter: compoundAdapter.address }, // compound AAVE pool
    "0xB27C7b131Cf4915BeC6c4Bc1ce2F33f9EE434b9f": { rate: 50, adapter: sushiswapPoolAdapterEthereum.address }, // SUSHI-APE-USDT
    "0xEF0881eC094552b2e128Cf945EF17a6752B4Ec5d": { rate: 90, adapter: sushiswapMasterChefV2AdapterEthereum.address }, // Sushiswap's MasterChef V2
    "0x795065dCc9f64b5614C407a6EFDC400DA6221FB0": { rate: 50, adapter: sushiswapPoolAdapterEthereum.address }, // SUSHI-SUSHI-WETH
    "0x4B0181102A0112A2ef11AbEE5563bb4a3176c9d7": { rate: 90, adapter: compoundAdapter.address }, // compound SUSHI pool
    "0x1bEC4db6c3Bc499F3DbF289F5499C30d541FEc97": { rate: 50, adapter: sushiswapPoolAdapterEthereum.address }, // SUSHI-MANA-WETH
    "0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272": { rate: 90, adapter: sushiBarAdapter.address }, // xSUSHI
    "0x32512Bee3848bfcBb7bEAf647aa697a100f3b706": { rate: 80, adapter: convexFinanceAdapter.address }, //cvxcDAI+cUSDC
    "0xA1c3492b71938E144ad8bE4c2fB6810b01A43dD8": { rate: 80, adapter: convexFinanceAdapter.address }, //cvxcDAI+cUSDC+cUSDT
    "0xC40D16476380e4037e6b1A2594cAF6a6cc8Da967": { rate: 50, adapter: sushiswapPoolAdapterEthereum.address }, // LINK-WETH-SLP
    "0xFAce851a4921ce59e912d19329929CE6da6EB0c7": { rate: 90, adapter: compoundAdapter.address }, // compound LINK pool
    "0xF178C0b5Bb7e7aBF4e12A4838C7b7c5bA2C623c0": { rate: 80, adapter: curveSwapPoolAdapter.address }, // linkCRV pool
    "0xD37969740d78C94C648d74671B8BE31eF43c30aB": { rate: 80, adapter: convexFinanceAdapter.address }, // cvxusdc3CRV
    "0xa1181481bEb2dc5De0DaF2c85392d81C704BF75D": { rate: 50, adapter: sushiswapPoolAdapterEthereum.address }, // ENS-WETH-SLP
    "0x31503dcb60119A812feE820bb7042752019F2355": { rate: 50, adapter: sushiswapPoolAdapterEthereum.address }, // COMP-WETH-SLP
    "0x70e36f6BF80a52b3B46b3aF8e106CC0ed743E8e4": { rate: 90, adapter: compoundAdapter.address }, // compound COMP pool
    "0x18Cd890F4e23422DC4aa8C2D6E0Bd3F3bD8873d8": { rate: 50, adapter: sushiswapPoolAdapterEthereum.address }, // IMX-WETH-SLP
    "0xC558F600B34A5f69dD2f0D06Cb8A88d829B7420a": { rate: 50, adapter: sushiswapPoolAdapterEthereum.address }, // LDO-WETH-SLP
    "0x99B42F2B49C395D2a77D973f6009aBb5d67dA343": { rate: 50, adapter: sushiswapPoolAdapterEthereum.address }, // YGG-WETH-SLP
    "0xC3f279090a47e80990Fe3a9c30d24Cb117EF91a8": { rate: 50, adapter: sushiswapPoolAdapterEthereum.address }, // ALCX-WETH-SLP
    "0x58Dc5a51fE44589BEb22E8CE67720B5BC5378009": { rate: 50, adapter: sushiswapPoolAdapterEthereum.address }, // CRV-WETH-SLP
    "0x05767d9EF41dC40689678fFca0608878fb3dE906": { rate: 50, adapter: sushiswapPoolAdapterEthereum.address }, // CVX-WETH-SLP
    "0x088ee5007C98a9677165D78dD2109AE4a3D04d0C": { rate: 50, adapter: sushiswapPoolAdapterEthereum.address }, // YFI-WETH-SLP
    "0x80a2AE356fc9ef4305676f7a3E2Ed04e12C33946": { rate: 90, adapter: compoundAdapter.address }, // compound YFI pool
    "0x30D9410ED1D5DA1F6C8391af5338C93ab8d4035C": { rate: 80, adapter: convexFinanceAdapter.address }, // cvx3Crv
    "0xc5424B857f758E906013F3555Dad202e4bdB4567": { rate: 80, adapter: curveSwapPoolAdapter.address }, // eCRV
    "0xAF1d4C576bF55f6aE493AEebAcC3a227675e5B98": { rate: 80, adapter: convexFinanceAdapter.address }, // cvxeCRV
    "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643": { rate: 90, adapter: compoundAdapter.address }, // compound DAI pool
    "0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9": { rate: 90, adapter: compoundAdapter.address }, // compound USDT pool
    "0xC11b1268C1A384e55C48c2391d8d480264A3A7F4": { rate: 90, adapter: compoundAdapter.address }, // compound WBTC pool
    "0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714": { rate: 80, adapter: curveSwapPoolAdapter.address }, // crvRenWSBTC pool
    "0x93054188d876f558f4a66B2EF1d97d16eDf0895B": { rate: 80, adapter: curveSwapPoolAdapter.address }, // crvRenWSBTC pool
    "0xbA723E335eC2939D52a2efcA2a8199cb4CB93cC3": { rate: 80, adapter: convexFinanceAdapter.address }, // cvxcrvRenWSBTC
    "0x74b79021Ea6De3f0D1731fb8BdfF6eE7DF10b8Ae": { rate: 80, adapter: convexFinanceAdapter.address }, // cvxcrvRenWBTC
    "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0": { rate: 50, adapter: sushiswapPoolAdapterEthereum.address }, // SUSHI-USDC-WETH
    "0xCEfF51756c56CeFFCA006cD410B03FFC46dd3a58": { rate: 50, adapter: sushiswapPoolAdapterEthereum.address }, // SUSHI-WBTC-WETH
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
    console.log(`approve ${approveLiquidityPoolAndMap.length} pools And Map `, approveLiquidityPoolAndMap);
    if (getAddress(operatorSigner.address) === getAddress(deployer)) {
      // approve liquidity pool and map adapter
      console.log(`operator approving and mapping ${approveLiquidityPoolAndMap.length} pools ...`);
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
      console.log("cannot approve and map pools as signer is not the operator");
    }
  } else {
    console.log("Already approved liquidity pool and map to adapter");
  }

  console.log("==Only map liquidity pool to adapter==");
  if (onlyMapPoolsToAdapters.length > 0) {
    console.log(`map ${onlyMapPoolsToAdapters.length} pools `, onlyMapPoolsToAdapters);
    // only map pool to adapter
    if (getAddress(operatorSigner.address) === getAddress(deployer)) {
      console.log(`operator only mapping ${onlyMapPoolsToAdapters.length} pools ...`);
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
      console.log("cannot map pools as signer is not the operator");
    }
  } else {
    console.log("Already mapped to adapter");
  }

  console.log("==Only rate liquidity pool==");
  if (ratePools.length > 0) {
    console.log(`${ratePools.length} pools to rate ...`, ratePools);
    // rate pools
    if (getAddress(riskOperatorSigner.address) === getAddress(deployer)) {
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
      console.log("cannot rate pools as signer is not the risk operator");
    }
  } else {
    console.log("Already rate liquidity pool");
  }
};
export default func;
func.tags = ["ApproveAndMapLiquidityPoolToAdapter"];
func.dependencies = [
  "Registry",
  "CurveSwapPoolAdapter",
  "CurveMetapoolSwapAdapter",
  "SushiswapMasterChefV1Adapter",
  "SushiswapMasterChefV2AdapterEthereum",
  "SushiswapPoolAdapterEthereum",
  "NewoStakingAdapter",
  "AaveV1Adapter",
  "AaveV2Adapter",
  "CompoundAdapter",
  "ConvexFinanceAdapter",
];
