// import { default as DaiStrategies } from "optyfi-sdk/ethereum/strategies/dai.json";
// import { default as SlpStrategies } from "optyfi-sdk/ethereum/strategies/slp.json";
// import { default as UsdcStrategies } from "optyfi-sdk/ethereum/strategies/usdc.json";
// import { default as WethStrategies } from "optyfi-sdk/ethereum/strategies/weth.json";

import { ADAPTER_WITH_STRATEGIES_DATA, StrategiesByTokenByChainType } from "../type";
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
import { eEVMNetwork, NETWORKS_CHAIN_ID } from "../../helper-hardhat-config";

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
          adapterName: "SushiswapAdapter",
          protocol: "Sushiswap",
        },
      ],
    },
  ],
};

export const StrategiesByTokenByChain: StrategiesByTokenByChainType = {
  [eEVMNetwork.mainnet || NETWORKS_CHAIN_ID[eEVMNetwork.mainnet]]: {
    USDC: {
      "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveMetapoolSwapPool-FRAX3CRV-f-DEPOSIT-Convex-cvxFRAX3CRV-f": {
        strategyName:
          "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveMetapoolSwapPool-FRAX3CRV-f-DEPOSIT-Convex-cvxFRAX3CRV-f",
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
            contract: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
            outputToken: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
            isBorrow: false,
            outputTokenSymbol: "FRAX3CRV-f",
            adapterName: "CurveMetapoolSwapAdapter",
            protocol: "Curve",
          },
          {
            contract: "0xbE0F6478E0E4894CFb14f32855603A083A57c7dA",
            outputToken: "0xbE0F6478E0E4894CFb14f32855603A083A57c7dA",
            isBorrow: false,
            outputTokenSymbol: "cvxFRAX3CRV-f",
            adapterName: "ConvexFinanceAdapter",
            protocol: "Convex",
          },
        ],
      },
      "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-CurveSwapPool-MIM-3LP3CRV-f-DEPOSIT-Convex-cvxMIM-3LP3CRV-f": {
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
            adapterName: "CurveMetapoolSwapAdapter",
            protocol: "Curve",
          },
          {
            contract: "0xabB54222c2b77158CC975a2b715a3d703c256F05",
            outputToken: "0xabB54222c2b77158CC975a2b715a3d703c256F05",
            isBorrow: false,
            outputTokenSymbol: "cvxMIM-3LP3CRV-f",
            adapterName: "ConvexFinanceAdapter",
            protocol: "Convex",
          },
        ],
      },
    },
    WETH: {
      "weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV": {
        strategyName: "weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV",
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        strategy: [
          {
            contract: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
            outputToken: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
            isBorrow: false,
            outputTokenSymbol: "stETH",
            adapterName: "LidoAdapter",
            protocol: "Lido",
          },
          {
            contract: "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022",
            outputToken: "0x06325440D014e39736583c165C2963BA99fAf14E",
            isBorrow: false,
            outputTokenSymbol: "steCRV",
            adapterName: "CurveSwapPoolAdapter",
            protocol: "Curve",
          },
          {
            contract: "0x9518c9063eB0262D791f38d8d6Eb0aca33c63ed0",
            outputToken: "0x9518c9063eB0262D791f38d8d6Eb0aca33c63ed0",
            isBorrow: false,
            outputTokenSymbol: "cvxsteCRV",
            adapterName: "ConvexFinanceAdapter",
            protocol: "Convex",
          },
        ],
      },
    },
  },
  [eEVMNetwork.polygon || NETWORKS_CHAIN_ID[eEVMNetwork.polygon]]: {},
  [eEVMNetwork.avalanche || NETWORKS_CHAIN_ID[eEVMNetwork.avalanche]]: {},
  [eEVMNetwork.kovan || NETWORKS_CHAIN_ID[eEVMNetwork.kovan]]: {
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
      },
    },
  },
};
