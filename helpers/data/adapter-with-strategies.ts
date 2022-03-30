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

const mainnetStrategiesByToken = {
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
    "USDC-DEPOSIT-Curve_3Crv-DEPOSIT-Curve_USDN-3Crv-DEPOSIT-Convex_CurveUsdn-3Crv": {
      strategyName: "USDC-DEPOSIT-Curve_3Crv-DEPOSIT-Curve_USDN-3Crv-DEPOSIT-Convex_CurveUsdn-3Crv",
      token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      strategy: [
        {
          contract: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
          outputToken: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
          isBorrow: false,
          adapterName: "CurveSwapPoolAdapter",
          protocol: "Curve",
          outputTokenSymbol: "3Crv",
        },
        {
          contract: "0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1",
          outputToken: "0x4f3E8F405CF5aFC05D68142F3783bDfE13811522",
          isBorrow: false,
          adapterName: "CurveSwapPoolAdapter",
          protocol: "Curve",
          outputTokenSymbol: "usdn3Crv",
        },
        {
          contract: "0x3689f325E88c2363274E5F3d44b6DaB8f9e1f524",
          outputToken: "0x3689f325E88c2363274E5F3d44b6DaB8f9e1f524",
          isBorrow: false,
          adapterName: "ConvexFinanceAdapter",
          protocol: "Convex",
          outputTokenSymbol: "cvxusdn3CRV",
        },
      ],
    },
    "USDC-DEPOSIT-Curve_3Crv-DEPOSIT-Curve_UST-3Crv-DEPOSIT-Convex_CurveUst-3Crv": {
      strategyName: "USDC-DEPOSIT-Curve_3Crv-DEPOSIT-Curve_UST-3Crv-DEPOSIT-Convex_CurveUst-3Crv",
      token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      strategy: [
        {
          contract: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
          outputToken: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
          isBorrow: false,
          adapterName: "CurveSwapPoolAdapter",
          protocol: "Curve",
          outputTokenSymbol: "3Crv",
        },
        {
          contract: "0x890f4e345B1dAED0367A877a1612f86A1f86985f",
          outputToken: "0x94e131324b6054c0D789b190b2dAC504e4361b53",
          isBorrow: false,
          adapterName: "CurveSwapPool",
          protocol: "Curve",
          outputTokenSymbol: "ust3Crv",
        },
        {
          contract: "0x67c4f788FEB82FAb27E3007daa3d7b90959D5b89",
          outputToken: "0x67c4f788FEB82FAb27E3007daa3d7b90959D5b89",
          isBorrow: false,
          adapterName: "ConvexFinanceAdapter",
          protocol: "Convex",
          outputTokenSymbol: "cvxust3CRV",
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
};

const polygonStrategiesbyToken = {
  USDC: {
    "usdc-DEPOSIT-CurveStableSwap-am3CRV": {
      strategyName: "usdc-DEPOSIT-CurveStableSwap-am3CRV",
      token: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
      strategy: [
        {
          contract: "0x445FE580eF8d70FF569aB36e80c647af338db351",
          outputToken: "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171",
          isBorrow: false,
          outputTokenSymbol: "am3CRV",
          adapterName: "CurveStableSwapAdapter",
          protocol: "Curve",
        },
      ],
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
    },
    "usdc-DEPOSIT-CurveStableSwap-am3CRV-DEPOSIT-Beefy-mooCurveAm3CRV": {
      strategyName: "usdc-DEPOSIT-CurveStableSwap-am3CRV-DEPOSIT-Beefy-mooCurveAm3CRV",
      token: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
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
    },
    "usdc-DEPOSIT-Sushiswap-USDC-USDT-SLP-DEPOSIT-Beefy-mooSushiUSDC-USDT": {
      strategyName: "usdc-DEPOSIT-USDCUSDTSLP-DEPOSIT-Beefy-mooSushiUSDC-USDT",
      token: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      strategy: [
        {
          contract: "0x4b1f1e2435a9c96f7330faea190ef6a7c8d70001",
          outputToken: "0x4b1f1e2435a9c96f7330faea190ef6a7c8d70001",
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
    },
    "usdc-DEPOSIT-Sushiswap-USDC-DAI-SLP-DEPOSIT-Beefy-mooSushiUSDC-DAI": {
      strategyName: "usdc-DEPOSIT-Sushiswap-USDC-DAI-SLP-DEPOSIT-Beefy-mooSushiUSDC-DAI",
      token: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      strategy: [
        {
          contract: "0xcd578f016888b57f1b1e3f887f392f0159e26747",
          outputToken: "0xcd578f016888b57f1b1e3f887f392f0159e26747",
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
    },
    "usdc-DEPOSIT-Quickswap-USDC-USDT-QLP-Beefy-mooQuickUSDC-USDT": {},
    "usdc-DEPOSIT-Quickswap-USDC-DAI-QLP-Beefy-mooQuickUSDC-DAI": {},
    "usdc-DEPOSIT-Quickswap-USDC-MAI-QLP-Beefy-mooQuickUSDC-MAI": {},
    "usdc-DEPOSIT-Apeswap-USDC-DAI-ALP-Beefy-mooApeUSDC-DAI": {},
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
};
