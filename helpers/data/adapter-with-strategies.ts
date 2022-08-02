// import { default as DaiStrategies } from "optyfi-sdk/ethereum/strategies/dai.json";
// import { default as SlpStrategies } from "optyfi-sdk/ethereum/strategies/slp.json";
// import { default as UsdcStrategies } from "optyfi-sdk/ethereum/strategies/usdc.json";
// import { default as WethStrategies } from "optyfi-sdk/ethereum/strategies/weth.json";
import { ethers, BigNumber } from "ethers";
import { ADAPTER_WITH_STRATEGIES_DATA, MultiChainVaultsType, StrategiesByTokenByChainType, VaultType } from "../type";
import {
  AAVE_V1_ADAPTER_NAME,
  AAVE_V2_ADAPTER_NAME,
  COMPOUND_ADAPTER_NAME,
  CURVE_DEPOSIT_POOL_ADAPTER_NAME,
  CURVE_SWAP_POOL_ADAPTER_NAME,
  DFORCE_ADAPTER_NAME,
  FULCRUM_ADAPTER_NAME,
  HARVEST_V1_ADAPTER_NAME,
  SUSHISWAP_ADAPTER_NAME,
  CONVEX_ADAPTER_NAME,
} from "../constants/adapters";
import { eEVMNetwork, NETWORKS_CHAIN_ID, NETWORKS_CHAIN_ID_HEX } from "../../helper-hardhat-config";

export const TypedAdapterStrategies: ADAPTER_WITH_STRATEGIES_DATA = {
  [CONVEX_ADAPTER_NAME]: [
    {
      strategyName:
        "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveSwapPool-MIM-3LP3CRV-f-DEPOSIT-Convex-cvxMIM-3LP3CRV-f",
      token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      strategy: [
        {
          contract: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
          outputToken: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
          isBorrow: false,
          outputTokenSymbol: "3Crv",
          adapterName: "CurveSwapPoolAdapter",
          protocol: "Curve",
        },
        {
          contract: "0x5a6A4D54456819380173272A5E8E9B9904BdF41B",
          outputToken: "0x5a6A4D54456819380173272A5E8E9B9904BdF41B",
          isBorrow: false,
          outputTokenSymbol: "MIM-3LP3CRV-f",
          adapterName: "CurveSwapPoolAdapter",
          protocol: "Curve",
        },
        {
          contract: "0xabB54222c2b77158CC975a2b715a3d703c256F05",
          outputToken: "0xabB54222c2b77158CC975a2b715a3d703c256F05",
          isBorrow: false,
          outputTokenSymbol: "cvxMIM-3LP3CRV-f",
          adapterName: "ConvexAdapter",
          protocol: "Convex",
        },
      ],
      riskProfileCode: 1,
    },
  ],
  [CURVE_SWAP_POOL_ADAPTER_NAME]: [
    {
      strategyName: "dai-DEPOSIT-CurveSwapPool-3Crv",
      token: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      strategy: [
        {
          contract: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
          outputToken: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
          isBorrow: false,
          outputTokenSymbol: "3Crv",
          adapterName: "CurveSwapPoolAdapter",
          protocol: "Curve",
        },
      ],
      riskProfileCode: 1,
    },
  ],
  [CURVE_DEPOSIT_POOL_ADAPTER_NAME]: [
    {
      strategyName: "dai-DEPOSIT-CurveDepositPool-cDAI+cUSDC",
      token: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      strategy: [
        {
          contract: "0xeB21209ae4C2c9FF2a86ACA31E123764A3B6Bc06",
          outputToken: "0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2",
          isBorrow: false,
          outputTokenSymbol: "cDAI+cUSDC",
          adapterName: "CurveDepositPoolAdapter",
          protocol: "Curve",
        },
      ],
      riskProfileCode: 1,
    },
  ],
  [COMPOUND_ADAPTER_NAME]: [
    {
      strategyName: "dai-DEPOSIT-Compound-cDAI",
      token: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      strategy: [
        {
          contract: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
          outputToken: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
          isBorrow: false,
          outputTokenSymbol: "cDAI",
          adapterName: "CompoundAdapter",
          protocol: "Compound",
        },
      ],
      riskProfileCode: 1,
    },
  ],
  [AAVE_V1_ADAPTER_NAME]: [
    {
      strategyName: "dai-DEPOSIT-AaveV1-aDAI",
      token: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      strategy: [
        {
          contract: "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8",
          outputToken: "0xfC1E690f61EFd961294b3e1Ce3313fBD8aa4f85d",
          isBorrow: false,
          outputTokenSymbol: "aDAI",
          adapterName: "AaveV1Adapter",
          protocol: "AaveV1",
        },
      ],
      riskProfileCode: 1,
    },
  ],
  [AAVE_V2_ADAPTER_NAME]: [
    {
      strategyName: "dai-DEPOSIT-AaveV2-aDAI",
      token: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      strategy: [
        {
          contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
          outputToken: "0x028171bCA77440897B824Ca71D1c56caC55b68A3",
          isBorrow: false,
          outputTokenSymbol: "aDAI",
          adapterName: "AaveV2Adapter",
          protocol: "AaveV2",
        },
      ],
      riskProfileCode: 1,
    },
  ],
  [DFORCE_ADAPTER_NAME]: [
    {
      strategyName: "dai-DEPOSIT-DForce-dDAI",
      token: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      strategy: [
        {
          contract: "0x02285AcaafEB533e03A7306C55EC031297df9224",
          outputToken: "0x02285AcaafEB533e03A7306C55EC031297df9224",
          isBorrow: false,
          outputTokenSymbol: "dDAI",
          adapterName: "DForceAdapter",
          protocol: "DForce",
        },
      ],
      riskProfileCode: 1,
    },
  ],
  [FULCRUM_ADAPTER_NAME]: [
    {
      strategyName: "dai-DEPOSIT-Fulcrum-iDAI",
      token: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      strategy: [
        {
          contract: "0x6b093998D36f2C7F0cc359441FBB24CC629D5FF0",
          outputToken: "0x6b093998D36f2C7F0cc359441FBB24CC629D5FF0",
          isBorrow: false,
          outputTokenSymbol: "iDAI",
          adapterName: "FulcrumAdapter",
          protocol: "Fulcrum",
        },
      ],
      riskProfileCode: 1,
    },
  ],
  [HARVEST_V1_ADAPTER_NAME]: [
    {
      strategyName: "dai-DEPOSIT-HarvestV1-fDAI",
      token: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      strategy: [
        {
          contract: "0xab7FA2B2985BCcfC13c6D86b1D5A17486ab1e04C",
          outputToken: "0xab7FA2B2985BCcfC13c6D86b1D5A17486ab1e04C",
          isBorrow: false,
          outputTokenSymbol: "fDAI",
          adapterName: "HarvestV1Adapter",
          protocol: "Harvest",
        },
      ],
      riskProfileCode: 1,
    },
  ],
  [SUSHISWAP_ADAPTER_NAME]: [
    {
      strategyName: "slp-DEPOSIT-Sushiswap",
      token: "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0",
      strategy: [
        {
          contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
          outputToken: "0x0000000000000000000000000000000000000000",
          isBorrow: false,
          outputTokenSymbol: "",
          adapterName: "SushiswapMasterChefV1Adapter",
          protocol: "Sushiswap",
        },
      ],
      riskProfileCode: 1,
    },
  ],
};

const mainnetStrategiesByToken = {
  // USDC: {
  //   "usdc-DEPOSIT-AaveV2-aUSDC": {
  //     strategyName: "usdc-DEPOSIT-AaveV2-aUSDC",
  //     token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  //     strategy: [
  //       {
  //         contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
  //         outputToken: "0xBcca60bB61934080951369a648Fb03DF4F96263C",
  //         isBorrow: false,
  //         outputTokenSymbol: "aUSDC",
  //         adapterName: "AaveV2Adapter",
  //         protocol: "AaveV2",
  //       },
  //     ],
  //     riskProfileCode: 1,
  //   },
  //   "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveMetapoolSwapPool-FRAX3CRV-f-DEPOSIT-Convex-cvxFRAX3CRV-f": {
  //     strategyName:
  //       "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveMetapoolSwapPool-FRAX3CRV-f-DEPOSIT-Convex-cvxFRAX3CRV-f",
  //     token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  //     strategy: [
  //       {
  //         contract: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
  //         outputToken: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
  //         isBorrow: false,
  //         outputTokenSymbol: "3Crv",
  //         adapterName: "CurveSwapPoolAdapter",
  //         protocol: "Curve",
  //       },
  //       {
  //         contract: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
  //         outputToken: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
  //         isBorrow: false,
  //         outputTokenSymbol: "FRAX3CRV-f",
  //         adapterName: "CurveMetapoolSwapAdapter",
  //         protocol: "Curve",
  //       },
  //       {
  //         contract: "0xbE0F6478E0E4894CFb14f32855603A083A57c7dA",
  //         outputToken: "0xbE0F6478E0E4894CFb14f32855603A083A57c7dA",
  //         isBorrow: false,
  //         outputTokenSymbol: "cvxFRAX3CRV-f",
  //         adapterName: "ConvexFinanceAdapter",
  //         protocol: "Convex",
  //       },
  //     ],
  //     riskProfileCode: 1,
  //   },
  //   "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveSwapPool-MIM-3LP3CRV-f-DEPOSIT-Convex-cvxMIM-3LP3CRV-f": {
  //     strategyName:
  //       "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveSwapPool-MIM-3LP3CRV-f-DEPOSIT-Convex-cvxMIM-3LP3CRV-f",
  //     token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  //     strategy: [
  //       {
  //         contract: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
  //         outputToken: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
  //         isBorrow: false,
  //         outputTokenSymbol: "3Crv",
  //         adapterName: "CurveSwapPoolAdapter",
  //         protocol: "Curve",
  //       },
  //       {
  //         contract: "0x5a6A4D54456819380173272A5E8E9B9904BdF41B",
  //         outputToken: "0x5a6A4D54456819380173272A5E8E9B9904BdF41B",
  //         isBorrow: false,
  //         outputTokenSymbol: "MIM-3LP3CRV-f",
  //         adapterName: "CurveMetapoolSwapAdapter",
  //         protocol: "Curve",
  //       },
  //       {
  //         contract: "0xabB54222c2b77158CC975a2b715a3d703c256F05",
  //         outputToken: "0xabB54222c2b77158CC975a2b715a3d703c256F05",
  //         isBorrow: false,
  //         outputTokenSymbol: "cvxMIM-3LP3CRV-f",
  //         adapterName: "ConvexFinanceAdapter",
  //         protocol: "Convex",
  //       },
  //     ],
  //     riskProfileCode: 1,
  //   },
  //   "usdc-DEPOSIT-Curve_3Crv-DEPOSIT-Curve_USDN-3Crv-DEPOSIT-Convex_CurveUsdn-3Crv": {
  //     strategyName: "usdc-DEPOSIT-Curve_3Crv-DEPOSIT-Curve_USDN-3Crv-DEPOSIT-Convex_CurveUsdn-3Crv",
  //     token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  //     strategy: [
  //       {
  //         contract: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
  //         outputToken: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
  //         isBorrow: false,
  //         adapterName: "CurveSwapPoolAdapter",
  //         protocol: "Curve",
  //         outputTokenSymbol: "3Crv",
  //       },
  //       {
  //         contract: "0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1",
  //         outputToken: "0x4f3E8F405CF5aFC05D68142F3783bDfE13811522",
  //         isBorrow: false,
  //         adapterName: "CurveSwapPoolAdapter",
  //         protocol: "Curve",
  //         outputTokenSymbol: "usdn3Crv",
  //       },
  //       {
  //         contract: "0x3689f325E88c2363274E5F3d44b6DaB8f9e1f524",
  //         outputToken: "0x3689f325E88c2363274E5F3d44b6DaB8f9e1f524",
  //         isBorrow: false,
  //         adapterName: "ConvexFinanceAdapter",
  //         protocol: "Convex",
  //         outputTokenSymbol: "cvxusdn3CRV",
  //       },
  //     ],
  //     riskProfileCode: 1,
  //   },
  // },
  // WETH: {
  //   "weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV": {
  //     strategyName: "weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV",
  //     token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  //     strategy: [
  //       {
  //         contract: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
  //         outputToken: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
  //         isBorrow: false,
  //         outputTokenSymbol: "stETH",
  //         adapterName: "LidoAdapter",
  //         protocol: "Lido",
  //       },
  //       {
  //         contract: "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022",
  //         outputToken: "0x06325440D014e39736583c165C2963BA99fAf14E",
  //         isBorrow: false,
  //         outputTokenSymbol: "steCRV",
  //         adapterName: "CurveSwapPoolAdapter",
  //         protocol: "Curve",
  //       },
  //       {
  //         contract: "0x9518c9063eB0262D791f38d8d6Eb0aca33c63ed0",
  //         outputToken: "0x9518c9063eB0262D791f38d8d6Eb0aca33c63ed0",
  //         isBorrow: false,
  //         outputTokenSymbol: "cvxsteCRV",
  //         adapterName: "ConvexFinanceAdapter",
  //         protocol: "Convex",
  //       },
  //     ],
  //     riskProfileCode: 1,
  //   },
  //   "weth-DEPOSIT-AaveV2-aWETH": {
  //     strategyName: "weth-DEPOSIT-AaveV2-aWETH",
  //     token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  //     strategy: [
  //       {
  //         contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
  //         outputToken: "0x030bA81f1c18d280636F32af80b9AAd02Cf0854e",
  //         isBorrow: false,
  //         outputTokenSymbol: "aWETH",
  //         adapterName: "AaveV2Adapter",
  //         protocol: "AaveV2",
  //       },
  //     ],
  //     riskProfileCode: 1,
  //   },
  // },
  // NEWO: {
  //   "newo-DEPOSIT-NewOrder-stkNEWO": {
  //     strategyName: "newo-DEPOSIT-NewOrder-stkNEWO",
  //     token: "0x98585dFc8d9e7D48F0b1aE47ce33332CF4237D96",
  //     strategy: [
  //       {
  //         contract: "0xBC9016C379fb218B95Fe3730D5F49F3149E86CAB",
  //         outputToken: "0xBC9016C379fb218B95Fe3730D5F49F3149E86CAB",
  //         isBorrow: false,
  //         outputTokenSymbol: "stkNEWO",
  //         adapterName: "NewoStakingAdapter",
  //         protocol: "NewOrder",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  // },
  // AAVE: {
  //   "aave-DEPOSIT-SushiswapPool-AAVE-WETH-SLP": {
  //     strategyName: "aave-DEPOSIT-SushiswapPool-AAVE-WETH-SLP",
  //     token: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
  //     strategy: [
  //       {
  //         contract: "0xD75EA151a61d06868E31F8988D28DFE5E9df57B4",
  //         outputToken: "0xD75EA151a61d06868E31F8988D28DFE5E9df57B4",
  //         isBorrow: false,
  //         outputTokenSymbol: "AAVE-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapter",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "aave-DEPOSIT-SushiswapPool-AAVE-WETH-SLP-DEPOSIT-SushiswapMasterChef": {
  //     strategyName: "aave-DEPOSIT-SushiswapPool-AAVE-WETH-SLP-DEPOSIT-SushiswapMasterChef",
  //     token: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
  //     strategy: [
  //       {
  //         contract: "0xD75EA151a61d06868E31F8988D28DFE5E9df57B4",
  //         outputToken: "0xD75EA151a61d06868E31F8988D28DFE5E9df57B4",
  //         isBorrow: false,
  //         outputTokenSymbol: "AAVE-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //       {
  //         contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
  //         outputToken: "0x0000000000000000000000000000000000000000",
  //         isBorrow: false,
  //         outputTokenSymbol: "",
  //         adapterName: "SushiswapMasterChefV1Adapter",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "aave-DEPOSIT-Compound-cAAVE": {
  //     strategyName: "aave-DEPOSIT-Compound-cAAVE",
  //     token: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
  //     strategy: [
  //       {
  //         contract: "0xe65cdB6479BaC1e22340E4E755fAE7E509EcD06c",
  //         outputToken: "0xe65cdB6479BaC1e22340E4E755fAE7E509EcD06c",
  //         isBorrow: false,
  //         outputTokenSymbol: "cAAVE",
  //         adapterName: "CompoundAdapter",
  //         protocol: "Compound",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  // },
  // APE: {
  //   "ape-DEPOSIT-SushiswapPool-APE-USDT-SLP": {
  //     strategyName: "ape-DEPOSIT-SushiswapPool-APE-USDT-SLP",
  //     token: "0x4d224452801ACEd8B2F0aebE155379bb5D594381",
  //     strategy: [
  //       {
  //         contract: "0xB27C7b131Cf4915BeC6c4Bc1ce2F33f9EE434b9f",
  //         outputToken: "0xB27C7b131Cf4915BeC6c4Bc1ce2F33f9EE434b9f",
  //         isBorrow: false,
  //         outputTokenSymbol: "APE-USDT-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "ape-DEPOSIT-SushiswapPool-APE-USDT-SLP-DEPOSIT-SushiswapMasterChefV2": {
  //     strategyName: "ape-DEPOSIT-SushiswapPool-APE-USDT-SLP-DEPOSIT-SushiswapMasterChefV2",
  //     token: "0x4d224452801ACEd8B2F0aebE155379bb5D594381",
  //     strategy: [
  //       {
  //         contract: "0xB27C7b131Cf4915BeC6c4Bc1ce2F33f9EE434b9f",
  //         outputToken: "0xB27C7b131Cf4915BeC6c4Bc1ce2F33f9EE434b9f",
  //         isBorrow: false,
  //         outputTokenSymbol: "APE-USDT-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //       {
  //         contract: "0xEF0881eC094552b2e128Cf945EF17a6752B4Ec5d",
  //         outputToken: "0x0000000000000000000000000000000000000000",
  //         isBorrow: false,
  //         outputTokenSymbol: "",
  //         adapterName: "SushiswapMasterChefV2AdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  // },
  // SUSHI: {
  //   "sushi-DEPOSIT-SushiswapPool-SUSHI-WETH-SLP": {
  //     strategyName: "sushi-DEPOSIT-SushiswapPool-SUSHI-WETH-SLP",
  //     token: "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
  //     strategy: [
  //       {
  //         contract: "0x795065dCc9f64b5614C407a6EFDC400DA6221FB0",
  //         outputToken: "0x795065dCc9f64b5614C407a6EFDC400DA6221FB0",
  //         isBorrow: false,
  //         outputTokenSymbol: "SUSHI-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "sushi-DEPOSIT-SushiswapPool-SUSHI-WETH-SLP-DEPOSIT-SushiswapMasterChef": {
  //     strategyName: "sushi-DEPOSIT-SushiswapPool-SUSHI-WETH-SLP-DEPOSIT-SushiswapMasterChef",
  //     token: "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
  //     strategy: [
  //       {
  //         contract: "0x795065dCc9f64b5614C407a6EFDC400DA6221FB0",
  //         outputToken: "0x795065dCc9f64b5614C407a6EFDC400DA6221FB0",
  //         isBorrow: false,
  //         outputTokenSymbol: "SUSHI-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //       {
  //         contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
  //         outputToken: "0x0000000000000000000000000000000000000000",
  //         isBorrow: false,
  //         outputTokenSymbol: "",
  //         adapterName: "SushiswapMasterChefV1Adapter",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "sushi-DEPOSIT-Compound-cSUSHI": {
  //     strategyName: "sushi-DEPOSIT-Compound-cSUSHI",
  //     token: "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
  //     strategy: [
  //       {
  //         contract: "0x4B0181102A0112A2ef11AbEE5563bb4a3176c9d7",
  //         outputToken: "0x4B0181102A0112A2ef11AbEE5563bb4a3176c9d7",
  //         isBorrow: false,
  //         outputTokenSymbol: "cSUSHI",
  //         adapterName: "CompoundAdapter",
  //         protocol: "Compound",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "sushi-DEPOSIT-SushiBar-xSUSHI": {
  //     strategyName: "sushi-DEPOSIT-SushiBar-xSUSHI",
  //     token: "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
  //     strategy: [
  //       {
  //         contract: "0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272",
  //         outputToken: "0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272",
  //         isBorrow: false,
  //         outputTokenSymbol: "xSushi",
  //         adapterName: "SushiBarAdapter",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "sushi-DEPOSIT-SushiBar-xSUSHI-DEPOSIT-AaveV2-aXSUSHI": {
  //     strategyName: "sushi-DEPOSIT-SushiBar-xSUSHI-DEPOSIT-AaveV2-aXSUSHI",
  //     token: "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
  //     strategy: [
  //       {
  //         contract: "0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272",
  //         outputToken: "0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272",
  //         isBorrow: false,
  //         outputTokenSymbol: "xSushi",
  //         adapterName: "SushiBarAdapter",
  //         protocol: "Sushiswap",
  //       },
  //       {
  //         contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
  //         outputToken: "0xF256CC7847E919FAc9B808cC216cAc87CCF2f47a",
  //         isBorrow: false,
  //         outputTokenSymbol: "aXSUSHI",
  //         adapterName: "AaveV2Adapter",
  //         protocol: "Aave",
  //       }
  //     ],
  //     riskProfileCode: 2,
  //   }
  // },
  // MANA: {
  //   "mana-DEPOSIT-SushiswapPool-MANA-WETH-SLP": {
  //     strategyName: "mana-DEPOSIT-SushiswapPool-MANA-WETH-SLP",
  //     token: "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942",
  //     strategy: [
  //       {
  //         contract: "0x1bEC4db6c3Bc499F3DbF289F5499C30d541FEc97",
  //         outputToken: "0x1bEC4db6c3Bc499F3DbF289F5499C30d541FEc97",
  //         isBorrow: false,
  //         outputTokenSymbol: "MANA-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapter",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "mana-DEPOSIT-SushiswapPool-MANA-WETH-SLP-DEPOSIT-SushiswapMasterChef": {
  //     strategyName: "mana-DEPOSIT-SushiswapPool-MANA-WETH-SLP-DEPOSIT-SushiswapMasterChef",
  //     token: "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942",
  //     strategy: [
  //       {
  //         contract: "0x1bEC4db6c3Bc499F3DbF289F5499C30d541FEc97",
  //         outputToken: "0x1bEC4db6c3Bc499F3DbF289F5499C30d541FEc97",
  //         isBorrow: false,
  //         outputTokenSymbol: "MANA-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //       {
  //         contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
  //         outputToken: "0x0000000000000000000000000000000000000000",
  //         isBorrow: false,
  //         outputTokenSymbol: "",
  //         adapterName: "SushiswapMasterChefV1Adapter",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "mana-DEPOSIT-AaveV1-aMANA": {
  //     strategyName: "mana-DEPOSIT-AaveV1-aMANA",
  //     token: "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942",
  //     strategy: [
  //       {
  //         contract: "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8",
  //         outputToken: "0x6FCE4A401B6B80ACe52baAefE4421Bd188e76F6f",
  //         isBorrow: false,
  //         outputTokenSymbol: "aMANA",
  //         adapterName: "AaveV1Adapter",
  //         protocol: "Aave",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "mana-DEPOSIT-AaveV2-aMANA": {
  //     strategyName: "mana-DEPOSIT-AaveV2-aMANA",
  //     token: "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942",
  //     strategy: [
  //       {
  //         contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
  //         outputToken: "0xa685a61171bb30d4072B338c80Cb7b2c865c873E",
  //         isBorrow: false,
  //         outputTokenSymbol: "aMANA",
  //         adapterName: "AaveV2Adapter",
  //         protocol: "Aave",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  // },
  // LINK: {
  //   "link-DEPOSIT-Sushiswap-LINK-WETH": {
  //     strategyName: "link-DEPOSIT-Sushiswap-LINK-WETH",
  //     token: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
  //     strategy: [
  //       {
  //         contract: "0xC40D16476380e4037e6b1A2594cAF6a6cc8Da967",
  //         outputToken: "0xC40D16476380e4037e6b1A2594cAF6a6cc8Da967",
  //         isBorrow: false,
  //         outputTokenSymbol: "LINK-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "link-DEPOSIT-Sushiswap-LINK-WETH-DEPOSIT-SushiswapMasterChef": {
  //     strategyName: "link-DEPOSIT-Sushiswap-LINK-WETH-DEPOSIT-SushiswapMasterChef",
  //     token: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
  //     strategy: [
  //       {
  //         contract: "0xC40D16476380e4037e6b1A2594cAF6a6cc8Da967",
  //         outputToken: "0xC40D16476380e4037e6b1A2594cAF6a6cc8Da967",
  //         isBorrow: false,
  //         outputTokenSymbol: "LINK-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //       {
  //         contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
  //         outputToken: "0x0000000000000000000000000000000000000000",
  //         isBorrow: false,
  //         outputTokenSymbol: "",
  //         adapterName: "SushiswapMasterChefV1Adapter",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "link-DEPOSIT-AaveV1-aLINK": {
  //     strategyName: "link-DEPOSIT-AaveV1-aLINK",
  //     token: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
  //     strategy: [
  //       {
  //         contract: "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8",
  //         outputToken: "0xA64BD6C70Cb9051F6A9ba1F163Fdc07E0DfB5F84",
  //         isBorrow: false,
  //         outputTokenSymbol: "aLINK",
  //         adapterName: "AaveV1Adapter",
  //         protocol: "Aave",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "link-DEPOSIT-AaveV2-aLINK": {
  //     strategyName: "link-DEPOSIT-AaveV2-aLINK",
  //     token: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
  //     strategy: [
  //       {
  //         contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
  //         outputToken: "0xa06bC25B5805d5F8d82847D191Cb4Af5A3e873E0",
  //         isBorrow: false,
  //         outputTokenSymbol: "aLINK",
  //         adapterName: "AaveV2Adapter",
  //         protocol: "Aave",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "link-DEPOSIT-Compound-cLINK": {
  //     strategyName: "link-DEPOSIT-Compound-cLINK",
  //     token: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
  //     strategy: [
  //       {
  //         contract: "0xFAce851a4921ce59e912d19329929CE6da6EB0c7",
  //         outputToken: "0xFAce851a4921ce59e912d19329929CE6da6EB0c7",
  //         isBorrow: false,
  //         outputTokenSymbol: "cLINK",
  //         adapterName: "CompoundAdapter",
  //         protocol: "Compound",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "link-DEPOSIT-Curve-linkCRV": {
  //     strategyName: "link-DEPOSIT-Curve-linkCRV",
  //     token: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
  //     strategy: [
  //       {
  //         contract: "0xF178C0b5Bb7e7aBF4e12A4838C7b7c5bA2C623c0",
  //         outputToken: "0xcee60cFa923170e4f8204AE08B4fA6A3F5656F3a",
  //         isBorrow: false,
  //         outputTokenSymbol: "linkCRV",
  //         adapterName: "CurveSwapPoolAdapter",
  //         protocol: "Curve",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "link-DEPOSIT-Curve-linkCRV-DEPOSIT-Convex-cvxlinkCRV": {
  //     strategyName: "link-DEPOSIT-Curve-linkCRV-DEPOSIT-Convex-cvxlinkCRV",
  //     token: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
  //     strategy: [
  //       {
  //         contract: "0xF178C0b5Bb7e7aBF4e12A4838C7b7c5bA2C623c0",
  //         outputToken: "0xcee60cFa923170e4f8204AE08B4fA6A3F5656F3a",
  //         isBorrow: false,
  //         outputTokenSymbol: "linkCRV",
  //         adapterName: "CurveSwapPoolAdapter",
  //         protocol: "Curve",
  //       },
  //       {
  //         contract: "0xD37969740d78C94C648d74671B8BE31eF43c30aB",
  //         outputToken: "0xD37969740d78C94C648d74671B8BE31eF43c30aB",
  //         isBorrow: false,
  //         outputTokenSymbol: "cvxlinkCRV",
  //         adapterName: "ConvexFinanceAdapter",
  //         protocol: "Convex",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  // },
  // ENS:{
  //   "ens-DEPOSIT-Sushiswap-ENS-WETH": {
  //     strategyName: "ens-DEPOSIT-Sushiswap-ENS-WETH",
  //     token: "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72",
  //     strategy: [
  //       {
  //         contract: "0xa1181481bEb2dc5De0DaF2c85392d81C704BF75D",
  //         outputToken: "0xa1181481bEb2dc5De0DaF2c85392d81C704BF75D",
  //         isBorrow: false,
  //         outputTokenSymbol: "ENS-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "ens-DEPOSIT-Sushiswap-ENS-WETH-DEPOSIT-SushiswapMasterChefV2": {
  //     strategyName: "ens-DEPOSIT-Sushiswap-ENS-WETH-DEPOSIT-SushiswapMasterChefV2",
  //     token: "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72",
  //     strategy: [
  //       {
  //         contract: "0xa1181481bEb2dc5De0DaF2c85392d81C704BF75D",
  //         outputToken: "0xa1181481bEb2dc5De0DaF2c85392d81C704BF75D",
  //         isBorrow: false,
  //         outputTokenSymbol: "ENS-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //       {
  //         contract: "0xEF0881eC094552b2e128Cf945EF17a6752B4Ec5d",
  //         outputToken: "0x0000000000000000000000000000000000000000",
  //         isBorrow: false,
  //         outputTokenSymbol: "",
  //         adapterName: "SushiswapMasterChefV2AdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "ens-DEPOSIT-AaveV2-aENS": {
  //     strategyName: "ens-DEPOSIT-AaveV2-aENS",
  //     token: "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72",
  //     strategy: [
  //       {
  //         contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
  //         outputToken: "0x9a14e23A58edf4EFDcB360f68cd1b95ce2081a2F",
  //         isBorrow: false,
  //         outputTokenSymbol: "aENS",
  //         adapterName: "AaveV1Adapter",
  //         protocol: "Aave",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   }
  // },
  // COMP:{
  //   "comp-DEPOSIT-Sushiswap-COMP-WETH": {
  //     strategyName: "ens-DEPOSIT-Sushiswap-COMP-WETH",
  //     token: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
  //     strategy: [
  //       {
  //         contract: "0x31503dcb60119A812feE820bb7042752019F2355",
  //         outputToken: "0x31503dcb60119A812feE820bb7042752019F2355",
  //         isBorrow: false,
  //         outputTokenSymbol: "COMP-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "comp-DEPOSIT-Sushiswap-COMP-WETH-DEPOSIT-SushiswapMasterChef": {
  //     strategyName: "comp-DEPOSIT-Sushiswap-COMP-WETH-DEPOSIT-SushiswapMasterChef",
  //     token: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
  //     strategy: [
  //       {
  //         contract: "0x31503dcb60119A812feE820bb7042752019F2355",
  //         outputToken: "0x31503dcb60119A812feE820bb7042752019F2355",
  //         isBorrow: false,
  //         outputTokenSymbol: "COMP-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //       {
  //         contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
  //         outputToken: "0x0000000000000000000000000000000000000000",
  //         isBorrow: false,
  //         outputTokenSymbol: "",
  //         adapterName: "SushiswapMasterChefV1Adapter",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "comp-DEPOSIT-Compound-cCOMP": {
  //     strategyName: "comp-DEPOSIT-Compound-cCOMP",
  //     token: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
  //     strategy: [
  //       {
  //         contract: "0x70e36f6BF80a52b3B46b3aF8e106CC0ed743E8e4",
  //         outputToken: "0x70e36f6BF80a52b3B46b3aF8e106CC0ed743E8e4",
  //         isBorrow: false,
  //         outputTokenSymbol: "cCOMP",
  //         adapterName: "CompoundAdapter",
  //         protocol: "Compound",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   }
  // },
  // IMX: {
  //   "imx-DEPOSIT-Sushiswap-IMX-WETH": {
  //     strategyName: "imx-DEPOSIT-Sushiswap-IMX-WETH",
  //     token: "0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF",
  //     strategy: [
  //       {
  //         contract: "0x18Cd890F4e23422DC4aa8C2D6E0Bd3F3bD8873d8",
  //         outputToken: "0x18Cd890F4e23422DC4aa8C2D6E0Bd3F3bD8873d8",
  //         isBorrow: false,
  //         outputTokenSymbol: "IMX-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "imx-DEPOSIT-SushiswapPool-IMX-WETH-SLP-DEPOSIT-SushiswapMasterChefV2": {
  //     strategyName: "imx-DEPOSIT-SushiswapPool-IMX-WETH-SLP-DEPOSIT-SushiswapMasterChefV2",
  //     token: "0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF",
  //     strategy: [
  //       {
  //         contract: "0x18Cd890F4e23422DC4aa8C2D6E0Bd3F3bD8873d8",
  //         outputToken: "0x18Cd890F4e23422DC4aa8C2D6E0Bd3F3bD8873d8",
  //         isBorrow: false,
  //         outputTokenSymbol: "IMX-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //       {
  //         contract: "0xEF0881eC094552b2e128Cf945EF17a6752B4Ec5d",
  //         outputToken: "0x0000000000000000000000000000000000000000",
  //         isBorrow: false,
  //         outputTokenSymbol: "",
  //         adapterName: "SushiswapMasterChefV2AdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  // },
  // ALCX: {
  //   "alcx-DEPOSIT-Sushiswap-ALCX-WETH": {
  //     strategyName: "alcx-DEPOSIT-Sushiswap-ALCX-WETH",
  //     token: "0xdBdb4d16EdA451D0503b854CF79D55697F90c8DF",
  //     strategy: [
  //       {
  //         contract: "0xC3f279090a47e80990Fe3a9c30d24Cb117EF91a8",
  //         outputToken: "0xC3f279090a47e80990Fe3a9c30d24Cb117EF91a8",
  //         isBorrow: false,
  //         outputTokenSymbol: "ALCX-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "alcx-DEPOSIT-SushiswapPool-ALCX-WETH-SLP-DEPOSIT-SushiswapMasterChefV2": {
  //     strategyName: "alcx-DEPOSIT-SushiswapPool-ALCX-WETH-SLP-DEPOSIT-SushiswapMasterChefV2",
  //     token: "0xdBdb4d16EdA451D0503b854CF79D55697F90c8DF",
  //     strategy: [
  //       {
  //         contract: "0xC3f279090a47e80990Fe3a9c30d24Cb117EF91a8",
  //         outputToken: "0xC3f279090a47e80990Fe3a9c30d24Cb117EF91a8",
  //         isBorrow: false,
  //         outputTokenSymbol: "ALCX-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //       {
  //         contract: "0xEF0881eC094552b2e128Cf945EF17a6752B4Ec5d",
  //         outputToken: "0x0000000000000000000000000000000000000000",
  //         isBorrow: false,
  //         outputTokenSymbol: "",
  //         adapterName: "SushiswapMasterChefV2AdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  // },
  // CRV: {
  //   "crv-DEPOSIT-Sushiswap-CRV-WETH": {
  //     strategyName: "crv-DEPOSIT-Sushiswap-CRV-WETH",
  //     token: "0xD533a949740bb3306d119CC777fa900bA034cd52",
  //     strategy: [
  //       {
  //         contract: "0x58Dc5a51fE44589BEb22E8CE67720B5BC5378009",
  //         outputToken: "0x58Dc5a51fE44589BEb22E8CE67720B5BC5378009",
  //         isBorrow: false,
  //         outputTokenSymbol: "CRV-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "crv-DEPOSIT-SushiswapPool-CRV-WETH-SLP-DEPOSIT-SushiswapMasterChef": {
  //     strategyName: "crv-DEPOSIT-SushiswapPool-CRV-WETH-SLP-DEPOSIT-SushiswapMasterChef",
  //     token: "0xD533a949740bb3306d119CC777fa900bA034cd52",
  //     strategy: [
  //       {
  //         contract: "0x58Dc5a51fE44589BEb22E8CE67720B5BC5378009",
  //         outputToken: "0x58Dc5a51fE44589BEb22E8CE67720B5BC5378009",
  //         isBorrow: false,
  //         outputTokenSymbol: "CRV-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //       {
  //         contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
  //         outputToken: "0x0000000000000000000000000000000000000000",
  //         isBorrow: false,
  //         outputTokenSymbol: "",
  //         adapterName: "SushiswapMasterChefV1Adapter",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "crv-DEPOSIT-AaveV2-aCRV": {
  //     strategyName: "crv-DEPOSIT-AaveV2-aCRV",
  //     token: "0xD533a949740bb3306d119CC777fa900bA034cd52",
  //     strategy: [
  //       {
  //         contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
  //         outputToken: "0x8dAE6Cb04688C62d939ed9B68d32Bc62e49970b1",
  //         isBorrow: false,
  //         outputTokenSymbol: "aCRV",
  //         adapterName: "AaveV2Adapter",
  //         protocol: "Aave",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  // },
  CVX: {
    "cvx-DEPOSIT-Sushiswap-CVX-WETH": {
      strategyName: "cvx-DEPOSIT-Sushiswap-CVX-WETH",
      token: "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B",
      strategy: [
        {
          contract: "0x05767d9EF41dC40689678fFca0608878fb3dE906",
          outputToken: "0x05767d9EF41dC40689678fFca0608878fb3dE906",
          isBorrow: false,
          outputTokenSymbol: "CVX-WETH-SLP",
          adapterName: "SushiswapPoolAdapterEthereum",
          protocol: "Sushiswap",
        },
      ],
      riskProfileCode: 2,
    },
    "cvx-DEPOSIT-SushiswapPool-CVX-WETH-SLP-DEPOSIT-SushiswapMasterChefV2": {
      strategyName: "cvx-DEPOSIT-SushiswapPool-CVX-WETH-SLP-DEPOSIT-SushiswapMasterChefV2",
      token: "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B",
      strategy: [
        {
          contract: "0x05767d9EF41dC40689678fFca0608878fb3dE906",
          outputToken: "0x05767d9EF41dC40689678fFca0608878fb3dE906",
          isBorrow: false,
          outputTokenSymbol: "CVX-WETH-SLP",
          adapterName: "SushiswapPoolAdapterEthereum",
          protocol: "Sushiswap",
        },
        {
          contract: "0xEF0881eC094552b2e128Cf945EF17a6752B4Ec5d",
          outputToken: "0x0000000000000000000000000000000000000000",
          isBorrow: false,
          outputTokenSymbol: "",
          adapterName: "SushiswapMasterChefV2AdapterEthereum",
          protocol: "Sushiswap",
        },
      ],
      riskProfileCode: 2,
    },
  },
  // YFI: {
  //   "yfi-DEPOSIT-Sushiswap-YFI-WETH": {
  //     strategyName: "yfi-DEPOSIT-Sushiswap-YFI-WETH",
  //     token: "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e",
  //     strategy: [
  //       {
  //         contract: "0x088ee5007C98a9677165D78dD2109AE4a3D04d0C",
  //         outputToken: "0x088ee5007C98a9677165D78dD2109AE4a3D04d0C",
  //         isBorrow: false,
  //         outputTokenSymbol: "YFI-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "yfi-DEPOSIT-SushiswapPool-YFI-WETH-SLP-DEPOSIT-SushiswapMasterChefV1": {
  //     strategyName: "yfi-DEPOSIT-SushiswapPool-YFI-WETH-SLP-DEPOSIT-SushiswapMasterChefV1",
  //     token: "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e",
  //     strategy: [
  //       {
  //         contract: "0x088ee5007C98a9677165D78dD2109AE4a3D04d0C",
  //         outputToken: "0x088ee5007C98a9677165D78dD2109AE4a3D04d0C",
  //         isBorrow: false,
  //         outputTokenSymbol: "YFI-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //       {
  //         contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
  //         outputToken: "0x0000000000000000000000000000000000000000",
  //         isBorrow: false,
  //         outputTokenSymbol: "",
  //         adapterName: "SushiswapMasterChefV1Adapter",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "yfi-DEPOSIT-AaveV2-aYFI": {
  //     strategyName: "yfi-DEPOSIT-AaveV2-aYFI",
  //     token: "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e",
  //     strategy: [
  //       {
  //         contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
  //         outputToken: "0x5165d24277cD063F5ac44Efd447B27025e888f37",
  //         isBorrow: false,
  //         outputTokenSymbol: "aYFI",
  //         adapterName: "AaveV2Adapter",
  //         protocol: "Aave",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "yfi-DEPOSIT-AaveV1-aYFI": {
  //     strategyName: "yfi-DEPOSIT-AaveV1-aYFI",
  //     token: "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e",
  //     strategy: [
  //       {
  //         contract: "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8",
  //         outputToken: "0x12e51E77DAAA58aA0E9247db7510Ea4B46F9bEAd",
  //         isBorrow: false,
  //         outputTokenSymbol: "aYFI",
  //         adapterName: "AaveV1Adapter",
  //         protocol: "Aave",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "yfi-DEPOSIT-Compound-cYFI": {
  //     strategyName: "yfi-DEPOSIT-Compound-cYFI",
  //     token: "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e",
  //     strategy: [
  //       {
  //         contract: "0x80a2AE356fc9ef4305676f7a3E2Ed04e12C33946",
  //         outputToken: "0x80a2AE356fc9ef4305676f7a3E2Ed04e12C33946",
  //         isBorrow: false,
  //         outputTokenSymbol: "cYFI",
  //         adapterName: "CompoundAdapter",
  //         protocol: "Compound",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  // },
  // SNX: {
  //   "snx-DEPOSIT-Sushiswap-SNX-WETH": {
  //     strategyName: "snx-DEPOSIT-Sushiswap-SNX-WETH",
  //     token: "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F",
  //     strategy: [
  //       {
  //         contract: "0xA1d7b2d891e3A1f9ef4bBC5be20630C2FEB1c470",
  //         outputToken: "0xA1d7b2d891e3A1f9ef4bBC5be20630C2FEB1c470",
  //         isBorrow: false,
  //         outputTokenSymbol: "SNX-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "snx-DEPOSIT-SushiswapPool-SNX-WETH-SLP-DEPOSIT-SushiswapMasterChefV1": {
  //     strategyName: "snx-DEPOSIT-SushiswapPool-SNX-WETH-SLP-DEPOSIT-SushiswapMasterChefV1",
  //     token: "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F",
  //     strategy: [
  //       {
  //         contract: "0xA1d7b2d891e3A1f9ef4bBC5be20630C2FEB1c470",
  //         outputToken: "0xA1d7b2d891e3A1f9ef4bBC5be20630C2FEB1c470",
  //         isBorrow: false,
  //         outputTokenSymbol: "SNX-WETH-SLP",
  //         adapterName: "SushiswapPoolAdapterEthereum",
  //         protocol: "Sushiswap",
  //       },
  //       {
  //         contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
  //         outputToken: "0x0000000000000000000000000000000000000000",
  //         isBorrow: false,
  //         outputTokenSymbol: "",
  //         adapterName: "SushiswapMasterChefV1Adapter",
  //         protocol: "Sushiswap",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "snx-DEPOSIT-AaveV2-aSNX": {
  //     strategyName: "snx-DEPOSIT-AaveV2-aSNX",
  //     token: "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F",
  //     strategy: [
  //       {
  //         contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
  //         outputToken: "0x35f6B052C598d933D69A4EEC4D04c73A191fE6c2",
  //         isBorrow: false,
  //         outputTokenSymbol: "aSNX",
  //         adapterName: "AaveV2Adapter",
  //         protocol: "Aave",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  //   "snx-DEPOSIT-AaveV1-aSNX": {
  //     strategyName: "snx-DEPOSIT-AaveV1-aSNX",
  //     token: "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F",
  //     strategy: [
  //       {
  //         contract: "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8",
  //         outputToken: "0x328C4c80BC7aCa0834Db37e6600A6c49E12Da4DE",
  //         isBorrow: false,
  //         outputTokenSymbol: "aSNX",
  //         adapterName: "AaveV1Adapter",
  //         protocol: "Aave",
  //       },
  //     ],
  //     riskProfileCode: 2,
  //   },
  // },
};

const kovanStrategiesByToken = {
  USDC: {
    "usdc-DEPOSIT-AaveV1-aUSDC": {
      strategyName: "usdc-DEPOSIT-AaveV1-aUSDC",
      token: "0xe22da380ee6b445bb8273c81944adeb6e8450422",
      strategy: [
        {
          contract: "0x506B0B2CF20FAA8f38a4E2B524EE43e1f4458Cc5",
          outputToken: "0x02F626c6ccb6D2ebC071c068DC1f02Bf5693416a",
          isBorrow: false,
          outputTokenSymbol: "aUSDC",
          adapterName: "AaveV1Adapter",
          protocol: "Aave",
        },
      ],
      riskProfileCode: 1,
    },
    "usdc-DEPOSIT-AaveV2-aUSDC": {
      strategyName: "usdc-DEPOSIT-AaveV2-aUSDC",
      token: "0xe22da380ee6b445bb8273c81944adeb6e8450422",
      strategy: [
        {
          contract: "0x1E40B561EC587036f9789aF83236f057D1ed2A90",
          outputToken: "0xe12AFeC5aa12Cf614678f9bFeeB98cA9Bb95b5B0",
          isBorrow: false,
          outputTokenSymbol: "aUSDC",
          adapterName: "AaveV2Adapter",
          protocol: "Aave",
        },
      ],
      riskProfileCode: 1,
    },
  },
};

const polygonStrategiesbyToken = {
  USDC: {
    "usdc-DEPOSIT-CurveStableSwap-am3CRV-DEPOSIT-CurveGauge-am3CRV-gauge": {
      strategyName: "usdc-DEPOSIT-CurveStableSwap-am3CRV",
      token: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      strategy: [
        {
          contract: "0x445FE580eF8d70FF569aB36e80c647af338db351",
          outputToken: "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171",
          isBorrow: false,
          outputTokenSymbol: "am3CRV",
          adapterName: "CurveStableSwapAdapter",
          protocol: "Curve",
        },
        {
          contract: "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c",
          outputToken: "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c",
          isBorrow: false,
          outputTokenSymbol: "am3CRV-gauge",
          adapterName: "CurveGaugeAdapter",
          protocol: "Curve",
        },
      ],
      riskProfileCode: 1,
    },
    "usdc-DEPOSIT-Aave-amUSDC": {
      strategyName: "usdc-DEPOSIT-Aave-amUSDC",
      token: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      strategy: [
        {
          contract: "0x3ac4e9aa29940770aeC38fe853a4bbabb2dA9C19",
          outputToken: "0x1a13F4Ca1d028320A707D99520AbFefca3998b7F",
          isBorrow: false,
          outputTokenSymbol: "amUSDC",
          adapterName: "AaveAdapter",
          protocol: "Aave",
        },
      ],
      riskProfileCode: 1,
    },
    "usdc-DEPOSIT-CurveStableSwap-am3CRV-DEPOSIT-Beefy-mooCurveAm3CRV": {
      strategyName: "usdc-DEPOSIT-CurveStableSwap-am3CRV-DEPOSIT-Beefy-mooCurveAm3CRV",
      token: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      strategy: [
        {
          contract: "0x445FE580eF8d70FF569aB36e80c647af338db351",
          outputToken: "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171",
          isBorrow: false,
          outputTokenSymbol: "am3CRV",
          adapterName: "CurveStableSwapAdapter",
          protocol: "Curve",
        },
        {
          contract: "0xAA7C2879DaF8034722A0977f13c343aF0883E92e",
          outputToken: "0xAA7C2879DaF8034722A0977f13c343aF0883E92e",
          isBorrow: false,
          outputTokenSymbol: "mooCurveAm3CRV",
          adapterName: "BeefyFinanceAdapter",
          protocol: "Beefy",
        },
      ],
      riskProfileCode: 1,
    },
    "usdc-DEPOSIT-Sushiswap-USDC-USDT-SLP-DEPOSIT-Beefy-mooSushiUSDC-USDT": {
      strategyName: "usdc-DEPOSIT-USDCUSDTSLP-DEPOSIT-Beefy-mooSushiUSDC-USDT",
      token: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      strategy: [
        {
          contract: "0x4B1F1e2435A9C96f7330FAea190Ef6A7C8D70001",
          outputToken: "0x4B1F1e2435A9C96f7330FAea190Ef6A7C8D70001",
          isBorrow: false,
          outputTokenSymbol: "USDC-USDT-SLP",
          adapterName: "SushiswapPoolAdapter",
          protocol: "Sushiswap",
        },
        {
          contract: "0xB6B89a05ad8228b98d0D8a77e1a695c54500db3b",
          outputToken: "0xB6B89a05ad8228b98d0D8a77e1a695c54500db3b",
          isBorrow: false,
          outputTokenSymbol: "mooSushiUSDC-USDT",
          adapterName: "BeefyFinanceAdapter",
          protocol: "Beefy",
        },
      ],
      riskProfileCode: 1,
    },
    "usdc-DEPOSIT-Sushiswap-USDC-DAI-SLP-DEPOSIT-Beefy-mooSushiUSDC-DAI": {
      strategyName: "usdc-DEPOSIT-Sushiswap-USDC-DAI-SLP-DEPOSIT-Beefy-mooSushiUSDC-DAI",
      token: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      strategy: [
        {
          contract: "0xCD578F016888B57F1b1e3f887f392F0159E26747",
          outputToken: "0xCD578F016888B57F1b1e3f887f392F0159E26747",
          isBorrow: false,
          outputTokenSymbol: "USDC-DAI-SLP",
          adapterName: "SushiswapPoolAdapter",
          protocol: "Sushiswap",
        },
        {
          contract: "0x75424BE5378621AeC2eEF25965f40FeB59039B52",
          outputToken: "0x75424BE5378621AeC2eEF25965f40FeB59039B52",
          isBorrow: false,
          outputTokenSymbol: "mooSushiUSDC-DAI",
          adapterName: "BeefyFinanceAdapter",
          protocol: "Beefy",
        },
      ],
      riskProfileCode: 1,
    },
    "usdc-DEPOSIT-Quickswap-USDC-USDT-QLP-Beefy-mooQuickUSDC-USDT": {
      strategyName: "usdc-DEPOSIT-Quickswap-USDC-USDT-QLP-Beefy-mooQuickUSDC-USDT",
      token: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      strategy: [
        {
          contract: "0x2cF7252e74036d1Da831d11089D326296e64a728",
          outputToken: "0x2cF7252e74036d1Da831d11089D326296e64a728",
          isBorrow: false,
          outputTokenSymbol: "USDC-USDT-QLP",
          adapterName: "QuickSwapPoolAdapter",
          protocol: "Quickswap",
        },
        {
          contract: "0x4462817b53E76b722c2D174D0148ddb81452f1dE",
          outputToken: "0x4462817b53E76b722c2D174D0148ddb81452f1dE",
          isBorrow: false,
          outputTokenSymbol: "mooQuickUSDC-USDT",
          adapterName: "BeefyFinanceAdapter",
          protocol: "Beefy",
        },
      ],
      riskProfileCode: 1,
    },
    "usdc-DEPOSIT-Quickswap-USDC-DAI-QLP-Beefy-mooQuickUSDC-DAI": {
      strategyName: "usdc-DEPOSIT-Quickswap-USDC-DAI-QLP-Beefy-mooQuickUSDC-DAI",
      token: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      strategy: [
        {
          contract: "0xf04adBF75cDFc5eD26eeA4bbbb991DB002036Bdd",
          outputToken: "0xf04adBF75cDFc5eD26eeA4bbbb991DB002036Bdd",
          isBorrow: false,
          outputTokenSymbol: "USDC-DAI-QLP",
          adapterName: "QuickSwapPoolAdapter",
          protocol: "Quickswap",
        },
        {
          contract: "0x0dFd8c4dd493d8f87Be362878E41537Ca7Ee4d9e",
          outputToken: "0x0dFd8c4dd493d8f87Be362878E41537Ca7Ee4d9e",
          isBorrow: false,
          outputTokenSymbol: "mooquickUSDC-DAI",
          adapterName: "BeefyFinanceAdapter",
          protocol: "Beefy",
        },
      ],
      riskProfileCode: 1,
    },
    "usdc-DEPOSIT-Quickswap-USDC-MAI-QLP-Beefy-mooMaiUSDC-miMATIC": {
      strategyName: "usdc-DEPOSIT-Quickswap-USDC-MAI-QLP-Beefy-mooQuickUSDC-MAI",
      token: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      strategy: [
        {
          contract: "0x160532D2536175d65C03B97b0630A9802c274daD",
          outputToken: "0x160532D2536175d65C03B97b0630A9802c274daD",
          isBorrow: false,
          outputTokenSymbol: "USDC-MAI-QLP",
          adapterName: "QuickSwapPoolAdapter",
          protocol: "Quickswap",
        },
        {
          contract: "0xebe0c8d842AA5A57D7BEf8e524dEabA676F91cD1",
          outputToken: "0xebe0c8d842AA5A57D7BEf8e524dEabA676F91cD1",
          isBorrow: false,
          outputTokenSymbol: "mooMaiUSDC-miMATIC",
          adapterName: "BeefyFinanceAdapter",
          protocol: "Beefy",
        },
      ],
      riskProfileCode: 1,
    },
    "usdc-DEPOSIT-Apeswap-USDC-DAI-ALP-Beefy-mooApeUSDC-DAI": {
      strategyName: "usdc-DEPOSIT-Apeswap-USDC-MAI-QLP-Beefy-mooApeUSDC-MAI",
      token: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      strategy: [
        {
          contract: "0x5b13B583D4317aB15186Ed660A1E4C65C10da659",
          outputToken: "0x5b13B583D4317aB15186Ed660A1E4C65C10da659",
          isBorrow: false,
          outputTokenSymbol: "USDC-DAI-ALP",
          adapterName: "ApeSwapPoolAdapter",
          protocol: "Apeswap",
        },
        {
          contract: "0x8440DAe4E1002e83D57fbFD6d33E6F3684a35036",
          outputToken: "0x8440DAe4E1002e83D57fbFD6d33E6F3684a35036",
          isBorrow: false,
          outputTokenSymbol: "mooApeSwapUSDC-DAI",
          adapterName: "BeefyFinanceAdapter",
          protocol: "Beefy",
        },
      ],
      riskProfileCode: 1,
    },
  },
  WMATIC: {
    "wmatic-DEPOSIT-Aave-amWMATIC": {
      strategyName: "wmatic-DEPOSIT-Aave-amWMATIC",
      token: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      strategy: [
        {
          contract: "0x3ac4e9aa29940770aeC38fe853a4bbabb2dA9C19",
          outputToken: "0x8dF3aad3a84da6b69A4DA8aeC3eA40d9091B2Ac4",
          isBorrow: false,
          outputTokenSymbol: "amWMATIC",
          adapterName: "AaveAdapter",
          protocol: "Aave",
        },
      ],
      riskProfileCode: 1,
    },
  },
};

const mumbaiStrategiesbyToken = {
  USDC: {
    "usdc-DEPOSIT-Aave-amUSDC": {
      strategyName: "",
      token: "0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e",
      strategy: [
        {
          contract: "0xE6ef11C967898F9525D550014FDEdCFAB63536B5",
          outputToken: "0x2271e3Fef9e15046d09E1d78a8FF038c691E9Cf9",
          isBorrow: false,
          outputTokenSymbol: "amUSDC",
          adapterName: "AaveAdapter",
          protocol: "Aave",
        },
      ],
      riskProfileCode: 1,
    },
  },
};

const avalancheStrategiesbyToken = {
  USDC: {
    "usdc-DEPOSIT-AaveV3-aAvaUSDC": {
      strategyName: "",
      token: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      strategy: [
        {
          contract: "0x770ef9f4fe897e59daCc474EF11238303F9552b6",
          outputToken: "0x625E7708f30cA75bfd92586e17077590C60eb4cD",
          isBorrow: false,
          outputTokenSymbol: "aAvaUSDC",
          adapterName: "AaveV3AvalancheAdapter",
          protocol: "AaveV3",
        },
      ],
      riskProfileCode: 1,
    },
  },
  WAVAX: {
    "wavax-DEPOSIT-AaveV2-avWAVAX": {
      strategyName: "",
      token: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      strategy: [
        {
          contract: "0x4235E22d9C3f28DCDA82b58276cb6370B01265C2",
          outputToken: "0xDFE521292EcE2A4f44242efBcD66Bc594CA9714B",
          isBorrow: false,
          outputTokenSymbol: "avWAVAX",
          adapterName: "AaveV2AvalancheAdapter",
          protocol: "AaveV2",
        },
      ],
      riskProfileCode: 1,
    },
    "wavax-DEPOSIT-AaveV3-aAvaWAVAX": {
      strategyName: "",
      token: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
      strategy: [
        {
          contract: "0x770ef9f4fe897e59daCc474EF11238303F9552b6",
          outputToken: "0x6d80113e533a2C0fe82EaBD35f1875DcEA89Ea97",
          isBorrow: false,
          outputTokenSymbol: "aAvaWAVAX",
          adapterName: "AaveV3AvalancheAdapter",
          protocol: "AaveV3",
        },
      ],
      riskProfileCode: 1,
    },
  },
  USDCe: {
    "usdce-DEPOSIT-AaveV2-avUSDC": {
      strategyName: "",
      token: "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
      strategy: [
        {
          contract: "0x4235E22d9C3f28DCDA82b58276cb6370B01265C2",
          outputToken: "0x46A51127C3ce23fb7AB1DE06226147F446e4a857",
          isBorrow: false,
          outputTokenSymbol: "avUSDC",
          adapterName: "AaveV2AvalancheAdapter",
          protocol: "AaveV2",
        },
      ],
      riskProfileCode: 1,
    },
  },
};

export const StrategiesByTokenByChain: StrategiesByTokenByChainType = {
  [eEVMNetwork.mainnet]: mainnetStrategiesByToken,
  [NETWORKS_CHAIN_ID[eEVMNetwork.mainnet]]: mainnetStrategiesByToken,
  [NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mainnet]]: mainnetStrategiesByToken,
  [eEVMNetwork.kovan]: kovanStrategiesByToken,
  [NETWORKS_CHAIN_ID[eEVMNetwork.kovan]]: kovanStrategiesByToken,
  [NETWORKS_CHAIN_ID_HEX[eEVMNetwork.kovan]]: kovanStrategiesByToken,
  [eEVMNetwork.polygon]: polygonStrategiesbyToken,
  [NETWORKS_CHAIN_ID[eEVMNetwork.polygon]]: polygonStrategiesbyToken,
  [NETWORKS_CHAIN_ID_HEX[eEVMNetwork.polygon]]: polygonStrategiesbyToken,
  [eEVMNetwork.mumbai]: mumbaiStrategiesbyToken,
  [NETWORKS_CHAIN_ID[eEVMNetwork.mumbai]]: mumbaiStrategiesbyToken,
  [NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mumbai]]: mumbaiStrategiesbyToken,
  [eEVMNetwork.avalanche]: avalancheStrategiesbyToken,
  [NETWORKS_CHAIN_ID[eEVMNetwork.avalanche]]: avalancheStrategiesbyToken,
  [NETWORKS_CHAIN_ID_HEX[eEVMNetwork.avalanche]]: avalancheStrategiesbyToken,
};

// (0-15) Deposit fee UT = 0 UT = 0000
// (16-31) Deposit fee % = 0% = 0000
// (32-47) Withdrawal fee UT = 0 UT = 0000
// (48-63) Withdrawal fee % = 0% = 0000
// (64-79) Max vault value jump % = 1% = 0064
// (80-239) vault fee address = 0000000000000000000000000000000000000000
// (240-247) risk profile code = 1 = 01
// (248) emergency shutdown = false = 0
// (249) unpause = true = 1
// (250) allow whitelisted state = false = 0
// (251) - 0
// (252) - 0
// (253) - 0
// (254) - 0
// (255) - 0
// 0x0201000000000000000000000000000000000000000000640000000000000000
// 906392544231311161076231617881117198619499239097192527361058388634069106688
const vaultConfigRP1 = ethers.BigNumber.from(
  "906392544231311161076231617881117198619499239097192527361058388634069106688",
);

// (0-15) Deposit fee UT = 0 UT = 0000
// (16-31) Deposit fee % = 0% = 0000
// (32-47) Withdrawal fee UT = 0 UT = 0000
// (48-63) Withdrawal fee % = 0% = 0000
// (64-79) Max vault value jump % = 1% = 0064
// (80-239) vault fee address = 0000000000000000000000000000000000000000
// (240-247) risk profile code = 2 = 02
// (248) emergency shutdown = false = 0
// (249) unpause = true = 1
// (250) allow whitelisted state = false = 0
// (251) - 0
// (252) - 0
// (253) - 0
// (254) - 0
// (255) - 0
// 0x0202000000000000000000000000000000000000000000640000000000000000
// 908159391296089545405814915381860117135326722994068146319179994835361726464
const vaultConfigRP2 = ethers.BigNumber.from(
  "908159391296089545405814915381860117135326722994068146319179994835361726464",
);

const mainnetVaults: VaultType = {
  // USDC: [
  //   {
  //     name: "opUSDCgrow",
  //     vaultConfig: vaultConfigRP1,
  //     userDepositCapUT: BigNumber.from("100000000000"), // 100,000 USDC user deposit cap
  //     minimumDepositValueUT: BigNumber.from("1000000000"), // 1000 USDC minimum deposit
  //     totalValueLockedLimitUT: BigNumber.from("10000000000000"), // 10,000,000 USDC TVL limit
  //   },
  // ],
  // WETH: [
  //   {
  //     name: "opWETHgrow",
  //     vaultConfig: vaultConfigRP1,
  //     userDepositCapUT: BigNumber.from("5000000000000000000"), // 5 WETH user deposit cap
  //     minimumDepositValueUT: BigNumber.from("250000000000000000"), // 0.25 WETH minimum deposit
  //     totalValueLockedLimitUT: BigNumber.from("5000000000000000000000"), // 5000 WETH TVL limit
  //   },
  // ],
  // NEWO: [
  //   {
  //     name: "opNEWOaggr",
  //     vaultConfig: vaultConfigRP2,
  //     userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 NEWO wei user deposit cap
  //     minimumDepositValueUT: BigNumber.from("10000000000000000000000"), // 10,000 NEWO minimum deposit
  //     totalValueLockedLimitUT: BigNumber.from("3000000000000000000000000"), // 3,000,000 NEWO TVL limit
  //   },
  // ],
  // AAVE: [
  //   {
  //     name: "opAAVEaggr",
  //     vaultConfig: vaultConfigRP2,
  //     userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 AAVE wei user deposit cap
  //     minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 AAVE minimum deposit
  //     totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 AAVE TVL limit
  //   },
  // ],
  // APE: [
  //   {
  //     name: "opAPEaggr",
  //     vaultConfig: vaultConfigRP2,
  //     userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 APE wei user deposit cap
  //     minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 APE minimum deposit
  //     totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 APE TVL limit
  //   },
  // ],
  // SUSHI: [
  //   {
  //     name: "opSUSHIaggr",
  //     vaultConfig: vaultConfigRP2,
  //     userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 SUSHI wei user deposit cap
  //     minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 SUSHI minimum deposit
  //     totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 SUSHI TVL limit
  //   },
  // ],
  // MANA: [
  //   {
  //     name: "opMANAaggr",
  //     vaultConfig: vaultConfigRP2,
  //     userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 MANA wei user deposit cap
  //     minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 MANA minimum deposit
  //     totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 MANA TVL limit
  //   },
  // ],
  // LINK: [
  //   {
  //     name: "opLINKaggr",
  //     vaultConfig: vaultConfigRP2,
  //     userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 LINK wei user deposit cap
  //     minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 LINK minimum deposit
  //     totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 LINK TVL limit
  //   },
  // ],
  // ENS: [
  //   {
  //     name: "opENSaggr",
  //     vaultConfig: vaultConfigRP2,
  //     userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 ENS wei user deposit cap
  //     minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 ENS minimum deposit
  //     totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 ENS TVL limit
  //   }
  // ],
  // COMP: [
  //   {
  //     name: "opCOMPaggr",
  //     vaultConfig: vaultConfigRP2,
  //     userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 COMP wei user deposit cap
  //     minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 COMP minimum deposit
  //     totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 COMP TVL limit
  //   },
  // ],
  // IMX: [
  //   {
  //     name: "opIMXaggr",
  //     vaultConfig: vaultConfigRP2,
  //     userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 IMX wei user deposit cap
  //     minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 IMX minimum deposit
  //     totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 IMX TVL limit
  //   },
  // ],
  // ALCX: [
  //   {
  //     name: "opALCXaggr",
  //     vaultConfig: vaultConfigRP2,
  //     userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 ALCX wei user deposit cap
  //     minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 ALCX minimum deposit
  //     totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 ALCX TVL limit
  //   },
  // ],
  // CRV: [
  //   {
  //     name: "opCRVaggr",
  //     vaultConfig: vaultConfigRP2,
  //     userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 CRV wei user deposit cap
  //     minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 CRV minimum deposit
  //     totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 CRV TVL limit
  //   },
  // ],
  CVX: [
    {
      name: "opCVXaggr",
      vaultConfig: vaultConfigRP2,
      userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 CVX wei user deposit cap
      minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 CVX minimum deposit
      totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 CVX TVL limit
    },
  ],
  // YFI: [
  //   {
  //     name: "opYFIaggr",
  //     vaultConfig: vaultConfigRP2,
  //     userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 LINK wei user deposit cap
  //     minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 LINK minimum deposit
  //     totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 LINK TVL limit
  //   },
  // ],
  // SNX: [
  //   {
  //     name: "opSNXaggr",
  //     vaultConfig: vaultConfigRP2,
  //     userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 LINK wei user deposit cap
  //     minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 LINK minimum deposit
  //     totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 LINK TVL limit
  //   },
  // ]
};

const kovanVaults: VaultType = {
  USDC: [
    {
      name: "opAVUSDCint",
      vaultConfig: vaultConfigRP1,
      userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256),
      minimumDepositValueUT: BigNumber.from("0"),
      totalValueLockedLimitUT: BigNumber.from(ethers.constants.MaxUint256),
    },
  ],
};

const polygonVaults: VaultType = {
  USDC: [
    {
      name: "opUSDCgrow",
      vaultConfig: vaultConfigRP1,
      userDepositCapUT: BigNumber.from("100000000000"), // 100,000 USDC user deposit cap
      minimumDepositValueUT: BigNumber.from("1000000000"), // 1000 USDC minimum deposit
      totalValueLockedLimitUT: BigNumber.from("10000000000000"), // 10,000,000 USDC TVL limit
    },
  ],
  WMATIC: [
    {
      name: "opWMATICgrow",
      vaultConfig: vaultConfigRP1,
      userDepositCapUT: BigNumber.from("5000000000000000000"), // 5 WMATIC user deposit cap
      minimumDepositValueUT: BigNumber.from("250000000000000000"), // 0.25 WMATIC minimum deposit
      totalValueLockedLimitUT: BigNumber.from("5000000000000000000000"), // 5000 WMATIC TVL limit
    },
  ],
};

const mumbaiVaults: VaultType = {
  USDC: [
    {
      name: "opUSDCgrow",
      vaultConfig: vaultConfigRP1,
      userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256),
      minimumDepositValueUT: BigNumber.from("0"),
      totalValueLockedLimitUT: BigNumber.from(ethers.constants.MaxUint256),
    },
  ],
};

const avalancheVaults: VaultType = {
  USDC: [
    {
      name: "opUSDCgrow",
      vaultConfig: vaultConfigRP1,
      userDepositCapUT: BigNumber.from("100000000000"), // 100,000 USDC user deposit cap
      minimumDepositValueUT: BigNumber.from("1000000000"), // 1000 USDC minimum deposit
      totalValueLockedLimitUT: BigNumber.from("10000000000000"), // 10,000,000 USDC TVL limit
    },
  ],
  USDCe: [
    {
      name: "opUSDCegrow",
      vaultConfig: vaultConfigRP1,
      userDepositCapUT: BigNumber.from("100000000000"), // 100,000 USDCe user deposit cap
      minimumDepositValueUT: BigNumber.from("1000000000"), // 1000 USDCe minimum deposit
      totalValueLockedLimitUT: BigNumber.from("10000000000000"), // 10,000,000 USDCe TVL limit
    },
  ],
  WAVAX: [
    {
      name: "opWAVAXgrow",
      vaultConfig: vaultConfigRP1,
      userDepositCapUT: BigNumber.from("5000000000000000000"), // 5 WAVAX user deposit cap
      minimumDepositValueUT: BigNumber.from("250000000000000000"), // 0.25 WAVAX minimum deposit
      totalValueLockedLimitUT: BigNumber.from("5000000000000000000000"), // 5000 WAVAX TVL limit
    },
  ],
};

export const MultiChainVaults: MultiChainVaultsType = {
  [eEVMNetwork.mainnet]: mainnetVaults,
  [NETWORKS_CHAIN_ID[eEVMNetwork.mainnet]]: mainnetVaults,
  [NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mainnet]]: mainnetVaults,
  [eEVMNetwork.kovan]: kovanVaults,
  [NETWORKS_CHAIN_ID[eEVMNetwork.kovan]]: kovanVaults,
  [NETWORKS_CHAIN_ID_HEX[eEVMNetwork.kovan]]: kovanVaults,
  [eEVMNetwork.polygon]: polygonVaults,
  [NETWORKS_CHAIN_ID[eEVMNetwork.polygon]]: polygonVaults,
  [NETWORKS_CHAIN_ID_HEX[eEVMNetwork.polygon]]: polygonVaults,
  [eEVMNetwork.mumbai]: mumbaiVaults,
  [NETWORKS_CHAIN_ID[eEVMNetwork.mumbai]]: mumbaiVaults,
  [NETWORKS_CHAIN_ID_HEX[eEVMNetwork.mumbai]]: mumbaiVaults,
  [eEVMNetwork.avalanche]: avalancheVaults,
  [NETWORKS_CHAIN_ID[eEVMNetwork.avalanche]]: avalancheVaults,
  [NETWORKS_CHAIN_ID_HEX[eEVMNetwork.avalanche]]: avalancheVaults,
};
