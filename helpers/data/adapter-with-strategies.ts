// import { default as DaiStrategies } from "optyfi-sdk/ethereum/strategies/dai.json";
// import { default as SlpStrategies } from "optyfi-sdk/ethereum/strategies/slp.json";
// import { default as UsdcStrategies } from "optyfi-sdk/ethereum/strategies/usdc.json";
// import { default as WethStrategies } from "optyfi-sdk/ethereum/strategies/weth.json";
import { ethers, BigNumber } from "ethers";
import {
  ADAPTER_WITH_STRATEGIES_DATA,
  MultiChainVaultsType,
  StrategiesByRiskProfileByTokenByChainType,
  StrategiesByTokenByChainType,
  VaultType,
} from "../type";
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
import { MULTI_CHAIN_VAULT_TOKENS } from "../constants/tokens";

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

const mainnetStrategiesByToken: StrategiesByTokenByChainType = {
  Save: {
    DAI: {
      "dai-DEPOSIT-AaveV2-aDAI": {
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
        riskProfileCode: 0,
        name: "DAI Lending on AAVE",
        description:
          "The OptyFi vault supplies DAI to the lending pool on Aave Protocol to earn interest in DAI. The earned DAI tokens are reinvested into the vault",
      },
      "dai-DEPOSIT-Compound-cDAI": {
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
        riskProfileCode: 0,
        name: "DAI Lending on Compound",
        description:
          "The OptyFi vault supplies DAI to the lending pool on Compound Protocol to earn interest in DAI and, potentially, additional rewards in COMP tokens. The earned DAI tokens and any harvested COMP rewards are reinvested into the vault.",
      },
    },
    USDT: {
      "usdt-DEPOSIT-AaveV2-aUSDT": {
        strategyName: "usdt-DEPOSIT-AaveV2-aUSDT",
        token: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        strategy: [
          {
            contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
            outputToken: "0x3Ed3B47Dd13EC9a98b44e6204A523E766B225811",
            isBorrow: false,
            outputTokenSymbol: "aUSDT",
            adapterName: "AaveV2Adapter",
            protocol: "AaveV2",
          },
        ],
        riskProfileCode: 0,
        name: "USDT Lending on AAVE",
        description:
          "The OptyFi vault supplies USDT to the lending pool on Aave Protocol to earn interest in USDT. The earned USDT tokens are reinvested into the vault",
      },
      "usdt-DEPOSIT-Compound-cUSDT": {
        strategyName: "usdt-DEPOSIT-Compound-cUSDT",
        token: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        strategy: [
          {
            contract: "0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9",
            outputToken: "0xf650C3d88D12dB855b8bf7D11Be6C55A4e07dCC9",
            isBorrow: false,
            outputTokenSymbol: "cUSDT",
            adapterName: "CompoundAdapter",
            protocol: "Compound",
          },
        ],
        riskProfileCode: 0,
        name: "USDT Lending on Compound",
        description:
          "The OptyFi vault supplies USDT to the lending pool on Compound Protocol to earn interest in USDT and, potentially, additional rewards in COMP tokens. The earned USDT tokens and any harvested COMP rewards are reinvested into the vault.",
      },
    },
    WBTC: {
      "wbtc-DEPOSIT-AaveV2-aWBTC": {
        strategyName: "wbtc-DEPOSIT-AaveV2-aWBTC",
        token: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        strategy: [
          {
            contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
            outputToken: "0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656",
            isBorrow: false,
            outputTokenSymbol: "aWBTC",
            adapterName: "AaveV2Adapter",
            protocol: "AaveV2",
          },
        ],
        riskProfileCode: 0,
        name: "WBTC Lending on AAVE",
        description:
          "The OptyFi vault supplies WBTC to the lending pool on Aave Protocol to earn interest in WBTC. The earned WBTC tokens are reinvested into the vault",
      },
      "wbtc-DEPOSIT-Compound-cWBTC": {
        strategyName: "wbtc-DEPOSIT-Compound-cWBTC",
        token: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        strategy: [
          {
            contract: "0xC11b1268C1A384e55C48c2391d8d480264A3A7F4",
            outputToken: "0xC11b1268C1A384e55C48c2391d8d480264A3A7F4",
            isBorrow: false,
            outputTokenSymbol: "cWBTC",
            adapterName: "CompoundAdapter",
            protocol: "Compound",
          },
        ],
        riskProfileCode: 0,
        name: "WBTC Lending on Compound",
        description:
          "The OptyFi vault supplies WBTC to the lending pool on Compound Protocol to earn interest in WBTC and, potentially, additional rewards in COMP tokens. The earned WBTC tokens and any harvested COMP rewards are reinvested into the vault.",
      },
    },
    USDC: {
      "usdc-DEPOSIT-AaveV2-aUSDC": {
        strategyName: "usdc-DEPOSIT-AaveV2-aUSDC",
        token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        strategy: [
          {
            contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
            outputToken: "0xBcca60bB61934080951369a648Fb03DF4F96263C",
            isBorrow: false,
            outputTokenSymbol: "aUSDC",
            adapterName: "AaveV2Adapter",
            protocol: "AaveV2",
          },
        ],
        riskProfileCode: 0,
        name: "USDC Lending on AAVE",
        description:
          "The OptyFi vault supplies USDC to the lending pool on Aave Protocol to earn interest in USDC. The earned USDC tokens are reinvested into the vault",
      },
      "usdc-DEPOSIT-Compound-cUSDC": {
        strategyName: "usdc-DEPOSIT-Compound-cUSDC",
        token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        strategy: [
          {
            contract: "0x39AA39c021dfbaE8faC545936693aC917d5E7563",
            outputToken: "0x39AA39c021dfbaE8faC545936693aC917d5E7563",
            isBorrow: false,
            outputTokenSymbol: "cUSDC",
            adapterName: "CompoundAdapter",
            protocol: "Compound",
          },
        ],
        riskProfileCode: 0,
        name: "USDC Lending on Compound",
        description:
          "The OptyFi vault supplies USDC to the lending pool on Compound Protocol to earn interest in USDC and, potentially, additional rewards in COMP tokens. The earned USDC tokens and any harvested COMP rewards are reinvested into the vault.",
      },
    },
    WETH: {
      "weth-DEPOSIT-AaveV2-aWETH": {
        strategyName: "weth-DEPOSIT-AaveV2-aWETH",
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        strategy: [
          {
            contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
            outputToken: "0x030bA81f1c18d280636F32af80b9AAd02Cf0854e",
            isBorrow: false,
            outputTokenSymbol: "aWETH",
            adapterName: "AaveV2Adapter",
            protocol: "AaveV2",
          },
        ],
        riskProfileCode: 0,
        name: "WETH Lending on Aave",
        description:
          "The OptyFi vault supplies WETH to the lending pool on Aave Protocol to earn interest in WETH. The earned WETH tokens are reinvested into the vault.",
      },
      "weth-DEPOSIT-Compound-cETH": {
        strategyName: "weth-DEPOSIT-Compound-cETH",
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        strategy: [
          {
            contract: "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5",
            outputToken: "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5",
            isBorrow: false,
            outputTokenSymbol: "cETH",
            adapterName: "CompoundAdapter",
            protocol: "Compound",
          },
        ],
        riskProfileCode: 0,
        name: "ETH Lending on Compound",
        description:
          "The OptyFi vault converts WETH to ETH and supplies ETH to the lending pool on Compound Protocol to earn interest in ETH and, potentially, additional rewards in COMP tokens. The earned COMP tokens are harvested to ETH and reinvested into the vault.",
      },
    },
  },
  Earn: {
    USDC: {
      "usdc-DEPOSIT-AaveV2-aUSDC": {
        strategyName: "usdc-DEPOSIT-AaveV2-aUSDC",
        token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        strategy: [
          {
            contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
            outputToken: "0xBcca60bB61934080951369a648Fb03DF4F96263C",
            isBorrow: false,
            outputTokenSymbol: "aUSDC",
            adapterName: "AaveV2Adapter",
            protocol: "AaveV2",
          },
        ],
        riskProfileCode: 1,
        name: "USDC Lending on AAVE",
        description:
          "The OptyFi vault supplies USDC to the lending pool on Aave Protocol to earn interest in USDC. The earned USDC tokens are reinvested into the vault",
      },
      "usdc-DEPOSIT-AaveV1-aUSDC": {
        strategyName: "usdc-DEPOSIT-AaveV1-aUSDC",
        token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        strategy: [
          {
            contract: "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8",
            outputToken: "0x9bA00D6856a4eDF4665BcA2C2309936572473B7E",
            isBorrow: false,
            outputTokenSymbol: "aUSDC",
            adapterName: "AaveV1Adapter",
            protocol: "AaveV1",
          },
        ],
        riskProfileCode: 1,
        name: "USDC Lending on AAVE",
        description:
          "The OptyFi vault supplies USDC to the lending pool on Aave Protocol to earn interest in USDC. The earned USDC tokens are reinvested into the vault",
      },
      "usdc-DEPOSIT-Compound-cUSDC": {
        strategyName: "usdc-DEPOSIT-Compound-cUSDC",
        token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        strategy: [
          {
            contract: "0x39AA39c021dfbaE8faC545936693aC917d5E7563",
            outputToken: "0x39AA39c021dfbaE8faC545936693aC917d5E7563",
            isBorrow: false,
            outputTokenSymbol: "cUSDC",
            adapterName: "CompoundAdapter",
            protocol: "Compound",
          },
        ],
        riskProfileCode: 1,
        name: "USDC Lending on Compound",
        description:
          "The OptyFi vault supplies USDC to the lending pool on Compound Protocol to earn interest in USDC and, potentially, additional rewards in COMP tokens. The earned USDC tokens and any harvested COMP rewards are reinvested into the vault.",
      },
      "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-Convex-cvx3Crv": {
        strategyName: "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-Convex-cvx3Crv",
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
            contract: "0x30D9410ED1D5DA1F6C8391af5338C93ab8d4035C",
            outputToken: "0x30D9410ED1D5DA1F6C8391af5338C93ab8d4035C",
            isBorrow: false,
            outputTokenSymbol: "cvx3Crv",
            adapterName: "ConvexFinanceAdapter",
            protocol: "Convex",
          },
        ],
        riskProfileCode: 1,
        name: "3CRV LP Staking on Convex",
        description:
          "The OptyFi vault supplies USDC to the 3CRV liquidity pool on Curve Finance and obtains the 3CRV LP token which accrues yield from the pool’s trading fees and rewards. The vault then stakes the 3CRV LP token on Convex Finance to earn additional rewards which are harvested to USDC and reinvested into the vault.",
      },
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
        riskProfileCode: 1,
        name: "FRAX3CRV LP Staking on Convex",
        description:
          "The OptyFi vault supplies USDC to the FRAX3CRV liquidity pool on Curve Finance and obtains the FRAX3CRV LP token which accrues yield from the pool’s trading fees and rewards. The vault then stakes the FRAX3CRV LP token on Convex Finance to earn additional rewards which are harvested to USDC and reinvested into the vault.",
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
        riskProfileCode: 1,
        name: "MIM3CRV LP Staking on Convex",
        description:
          "The OptyFi vault supplies USDC to the MIM3CRV liquidity pool on Curve Finance and obtains the MIM3CRV LP token which accrues yield from the pool’s trading fees and rewards. The vault then stakes the MIM3CRV LP token on Convex Finance to earn additional rewards which are harvested to USDC and reinvested into the vault.",
      },
      "usdc-DEPOSIT-Curve_3Crv-DEPOSIT-Curve_USDN-3Crv-DEPOSIT-Convex_CurveUsdn-3Crv": {
        strategyName: "usdc-DEPOSIT-Curve_3Crv-DEPOSIT-Curve_USDN-3Crv-DEPOSIT-Convex_CurveUsdn-3Crv",
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
        riskProfileCode: 1,
        name: null,
        description: null,
      },
      "usdc-DEPOSIT-Compound-cUSDC-dAMM-dCUSDC": {
        strategyName: "usdc-DEPOSIT-Compound-cUSDC-dAMM-dcUSDC",
        token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        strategy: [
          {
            contract: "0x39AA39c021dfbaE8faC545936693aC917d5E7563",
            outputToken: "0x39AA39c021dfbaE8faC545936693aC917d5E7563",
            isBorrow: false,
            outputTokenSymbol: "cUSDC",
            adapterName: "CompoundAdapter",
            protocol: "Compound",
          },
          {
            contract: "0x5714EB15A226059202CdfA1bF304167e36752862",
            outputToken: "0x5714EB15A226059202CdfA1bF304167e36752862",
            isBorrow: false,
            outputTokenSymbol: "dCUSDC",
            adapterName: "CompoundAdapter",
            protocol: "dAMM",
          },
        ],
        riskProfileCode: 1,
        name: "cUSDC Lending on dAMM",
        description:
          "The OptyFi vault supplies USDC to the lending pool on Compound finance. Then it lends cUSDC to cUSDC pool on dAMM finance. The earned USDC tokens and any harvested BDAMM rewards are reinvested into the vault.",
      },
      "usdc-DEPOSIT-dAMM-dUSDC": {
        strategyName: "usdc-DEPOSIT-dAMM-cUSDC",
        token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        strategy: [
          {
            contract: "0xa3006250a22E1Ca3C3f19fd1FB080C5dc65992c5",
            outputToken: "0xa3006250a22E1Ca3C3f19fd1FB080C5dc65992c5",
            isBorrow: false,
            outputTokenSymbol: "dUSDC",
            adapterName: "CompoundAdapter",
            protocol: "dAMM",
          },
        ],
        riskProfileCode: 1,
        name: "USDC Lending on dAMM",
        description:
          "The OptyFi vault supplies USDC to the lending pool on dAMM finance Protocol to earn interest in USDC and, potentially, additional rewards in BDAMM tokens. The earned USDC tokens and any harvested BDAMM rewards are reinvested into the vault.",
      },
    },
    WETH: {
      "weth-DEPOSIT-AaveV2-aWETH": {
        strategyName: "weth-DEPOSIT-AaveV2-aWETH",
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        strategy: [
          {
            contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
            outputToken: "0x030bA81f1c18d280636F32af80b9AAd02Cf0854e",
            isBorrow: false,
            outputTokenSymbol: "aWETH",
            adapterName: "AaveV2Adapter",
            protocol: "AaveV2",
          },
        ],
        riskProfileCode: 1,
        name: "WETH Lending on Aave",
        description:
          "The OptyFi vault supplies WETH to the lending pool on Aave Protocol to earn interest in WETH. The earned WETH tokens are reinvested into the vault.",
      },
      "weth-DEPOSIT-Compound-cETH": {
        strategyName: "weth-DEPOSIT-Compound-cETH",
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        strategy: [
          {
            contract: "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5",
            outputToken: "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5",
            isBorrow: false,
            outputTokenSymbol: "cETH",
            adapterName: "CompoundAdapter",
            protocol: "Compound",
          },
        ],
        riskProfileCode: 1,
        name: "ETH Lending on Compound",
        description:
          "The OptyFi vault converts WETH to ETH and supplies ETH to the lending pool on Compound Protocol to earn interest in ETH and, potentially, additional rewards in COMP tokens. The earned COMP tokens are harvested to ETH and reinvested into the vault.",
      },
      "weth-DEPOSIT-CurveSwapPool-eCRV-DEPOSIT-Convex-cvxeCRV": {
        strategyName: "weth-DEPOSIT-CurveSwapPool-eCRV-DEPOSIT-Convex-cvxeCRV",
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        strategy: [
          {
            contract: "0xc5424B857f758E906013F3555Dad202e4bdB4567",
            outputToken: "0xA3D87FffcE63B53E0d54fAa1cc983B7eB0b74A9c",
            isBorrow: false,
            outputTokenSymbol: "eCRV",
            adapterName: "CurveSwapPoolAdapter",
            protocol: "Curve",
          },
          {
            contract: "0xAF1d4C576bF55f6aE493AEebAcC3a227675e5B98",
            outputToken: "0xAF1d4C576bF55f6aE493AEebAcC3a227675e5B98",
            isBorrow: false,
            outputTokenSymbol: "cvxeCRV",
            adapterName: "ConvexFinanceAdapter",
            protocol: "Convex",
          },
        ],
        riskProfileCode: 1,
        name: "sETH LP Staking on Convex",
        description:
          "The OptyFi vault supplies WETH to the sETH-ETH liquidity pool on Curve Finance and obtains the sETH LP token which accrues yield from the pool’s trading fees and rewards. The vault then stakes the sETH LP token on Convex Finance to earn additional rewards which are harvested to WETH and reinvested into the vault.",
      },
      "weth-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV": {
        strategyName: "weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV",
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        strategy: [
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
        riskProfileCode: 1,
        name: "stETH LP Staking on Convex",
        description:
          "The OptyFi vault supplies WETH to the stETH-ETH liquidity pool on Curve Finance and obtains the stETH LP token which accrues yield from the pool’s trading fees and rewards. The vault then stakes the stETH LP token on Convex Finance to earn additional rewards which are harvested to WETH and reinvested into the vault.",
      },
      "weth-DEPOSIT-CurveSwapPool-eCRV": {
        strategyName: "weth-DEPOSIT-CurveSwapPool-eCRV-DEPOSIT-Convex-cvxeCRV",
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        strategy: [
          {
            contract: "0xc5424B857f758E906013F3555Dad202e4bdB4567",
            outputToken: "0xA3D87FffcE63B53E0d54fAa1cc983B7eB0b74A9c",
            isBorrow: false,
            outputTokenSymbol: "eCRV",
            adapterName: "CurveSwapPoolAdapter",
            protocol: "Curve",
          },
        ],
        riskProfileCode: 1,
        name: "sETH LP Staking on Convex",
        description:
          "The OptyFi vault supplies WETH to the sETH-ETH liquidity pool on Curve Finance and obtains the sETH LP token which accrues yield from the pool’s trading fees and rewards. The vault then stakes the sETH LP token on Convex Finance to earn additional rewards which are harvested to WETH and reinvested into the vault.",
      },
      "weth-DEPOSIT-CurveSwapPool-steCRV": {
        strategyName: "weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV",
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        strategy: [
          {
            contract: "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022",
            outputToken: "0x06325440D014e39736583c165C2963BA99fAf14E",
            isBorrow: false,
            outputTokenSymbol: "steCRV",
            adapterName: "CurveSwapPoolAdapter",
            protocol: "Curve",
          },
        ],
        riskProfileCode: 1,
        name: "stETH LP Staking on Curve",
        description:
          "The OptyFi vault supplies WETH to the stETH-ETH liquidity pool on Curve Finance and obtains the stETH LP token which accrues yield from the pool’s trading fees and rewards. The vault then stakes the stETH LP token on Curve Gauge to earn additional rewards which are harvested to WETH and reinvested into the vault.",
      },
      "weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV": {
        strategyName: "weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV",
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        strategy: [
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
        riskProfileCode: 1,
        name: "stETH LP Staking on Convex",
        description:
          "The OptyFi vault supplies WETH to the stETH-ETH liquidity pool on Curve Finance and obtains the stETH LP token which accrues yield from the pool’s trading fees and rewards. The vault then stakes the stETH LP token on Convex Finance to earn additional rewards which are harvested to WETH and reinvested into the vault.",
      },
      "weth-DEPOSIT-Compound-cETH-DEPOSIT-dAMM-dCWETH": {
        strategyName: "weth-DEPOSIT-Compound-cETH-DEPOSIT-dAMM-dCWETH",
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        strategy: [
          {
            contract: "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5",
            outputToken: "0x4Ddc2D193948926D02f9B1fE9e1daa0718270ED5",
            isBorrow: false,
            outputTokenSymbol: "cETH",
            adapterName: "CompoundAdapter",
            protocol: "Compound",
          },
          {
            contract: "0x3Be69a1D7B8821cDcCE90509aBB62D250A5AeFcc",
            outputToken: "0x3Be69a1D7B8821cDcCE90509aBB62D250A5AeFcc",
            isBorrow: false,
            outputTokenSymbol: "dCWETH",
            adapterName: "CompoundAdapter",
            protocol: "dAMM",
          },
        ],
        riskProfileCode: 1,
        name: "cETH Lending on dAMM",
        description:
          "The OptyFi vault supplies WETH to the lending pool on Compound finance the lends cETH to cETH lending pool on dAMM finance to earn interest in WETH and, potentially, additional rewards in BDAMM tokens. The earned BDAMM tokens are harvested to WETH and reinvested into the vault.",
      },
      "weth-DEPOSIT-dAMM-cWETH": {
        strategyName: "weth-DEPOSIT-dAMM-cWETH",
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        strategy: [
          {
            contract: "0x118823514681353634FF95837939E783D85B18AF",
            outputToken: "0x118823514681353634FF95837939E783D85B18AF",
            isBorrow: false,
            outputTokenSymbol: "cWETH",
            adapterName: "CompoundAdapter",
            protocol: "dAMM",
          },
        ],
        riskProfileCode: 1,
        name: "WETH Lending on dAMM",
        description:
          "The OptyFi vault WETH to the lending pool on dAMM finance Protocol to earn interest in WETH and, potentially, additional rewards in BDAMM tokens. The earned BDAMM tokens are harvested to WETH and reinvested into the vault.",
      },
    },
    USD3: {
      "3Crv-DEPOSIT-Convex-cvx3Crv": {
        strategyName: "3Crv-DEPOSIT-Convex-cvx3Crv",
        token: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
        strategy: [
          {
            contract: "0x30D9410ED1D5DA1F6C8391af5338C93ab8d4035C",
            outputToken: "0x30D9410ED1D5DA1F6C8391af5338C93ab8d4035C",
            isBorrow: false,
            outputTokenSymbol: "cvx3Crv",
            adapterName: "ConvexFinanceAdapter",
            protocol: "Convex",
          },
        ],
        riskProfileCode: 1,
        name: "3CRV LP Staking on Convex",
        description:
          "The OptyFi vault stakes the 3CRV LP token on Convex Finance to earn additional rewards which are harvested to 3CRV and reinvested into the vault.",
      },
      "3Crv-DEPOSIT-CurveMetapoolSwapPool-FRAX3CRV-f-DEPOSIT-Convex-cvxFRAX3CRV-f": {
        strategyName: "3Crv-DEPOSIT-CurveMetapoolSwapPool-FRAX3CRV-f-DEPOSIT-Convex-cvxFRAX3CRV-f",
        token: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
        strategy: [
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
        riskProfileCode: 1,
        name: "FRAX3CRV LP Staking on Convex",
        description:
          "The OptyFi vault supplies 3CRV to the FRAX3CRV liquidity pool on Curve Finance and obtains the FRAX3CRV LP token which accrues yield from the pool’s trading fees and rewards. The vault then stakes the FRAX3CRV LP token on Convex Finance to earn additional rewards which are harvested to 3CRV and reinvested into the vault.",
      },
      "3Crv-DEPOSIT-CurveSwapPool-MIM-3LP3CRV-f-DEPOSIT-Convex-cvxMIM-3LP3CRV-f": {
        strategyName: "3Crv-DEPOSIT-CurveMetapoolSwapPool-MIM-3LP3CRV-f-DEPOSIT-Convex-cvxMIM-3LP3CRV-f",
        token: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
        strategy: [
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
        riskProfileCode: 1,
        name: "MIM3CRV LP Staking on Convex",
        description:
          "The OptyFi vault supplies 3CRV to the MIM3CRV liquidity pool on Curve Finance and obtains the MIM3CRV LP token which accrues yield from the pool’s trading fees and rewards. The vault then stakes the MIM3CRV LP token on Convex Finance to earn additional rewards which are harvested to 3CRV and reinvested into the vault.",
      },
      "3Crv-DEPOSIT-CurveMetapoolSwapPool-LUSD3CRV-f-CurveCryptoPool-bLUSDLUSD3-f-CurveCryptoGauge-bLUSDLUSD3-f-gauge":
        {
          strategyName:
            "3Crv-DEPOSIT-CurveMetapoolSwapPool-LUSD3CRV-f-CurveCryptoPool-bLUSDLUSD3-f-CurveCryptoGauge-bLUSDLUSD3-f-gauge",
          token: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
          strategy: [
            {
              contract: "0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA",
              outputToken: "0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA",
              isBorrow: false,
              outputTokenSymbol: "LUSD3CRV-f",
              protocol: "Curve",
              adapterName: "CurveMetapoolSwapAdapter",
            },
            {
              contract: "0x74ED5d42203806c8CDCf2F04Ca5F60DC777b901c",
              outputToken: "0x5ca0313D44551e32e0d7a298EC024321c4BC59B4",
              isBorrow: false,
              outputTokenSymbol: "bLUSDLUSD3-f",
              protocol: "Curve",
              adapterName: "CurveCryptoPoolAdapter",
            },
            {
              contract: "0xdA0DD1798BE66E17d5aB1Dc476302b56689C2DB4",
              outputToken: "0xdA0DD1798BE66E17d5aB1Dc476302b56689C2DB4",
              isBorrow: false,
              outputTokenSymbol: "bLUSDLUSD3-f-gauge",
              protocol: "Curve",
              adapterName: "CurveMetapoolGaugeAdapter",
            },
          ],
          riskProfileCode: 1,
          name: "LUSD3CRV staking on Curve",
          description:
            "OptyFi vault supplies 3CRV to LUSD3CRV-f factory pool on Curve finance and obtains LUSD3CRV-f lp token which further deposited into bLUSDLUSD3-f and the lp token obtained is staked to bLUSDLUSD3 gauge. The vault earns interest from trading fees and rewards which are harvested to 3CRV are re-invested to the vault",
        },
      "3Crv-DEPOSIT-CurveMetapoolSwapPool-FRAX3CRV": {
        strategyName: "3Crv-DEPOSIT-CurveMetapoolSwapPool-FRAX3CRV",
        token: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
        strategy: [
          {
            contract: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
            outputToken: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
            isBorrow: false,
            outputTokenSymbol: "FRAX3CRV-f",
            adapterName: "CurveMetapoolSwapAdapter",
            protocol: "Curve",
          },
        ],
        riskProfileCode: 1,
        name: "FRAX3CRV LP on Curve",
        description:
          "The OptyFi vault supplies 3CRV to the FRAX3CRV liquidity pool on Curve Finance and obtains the FRAX3CRV LP token which accrues yield from the pool’s trading fees and rewards which are harvested to 3CRV and reinvested into the vault.",
      },
      "3Crv-DEPOSIT-CurveMetapoolSwapPool-MIM-3LP3CRV": {
        strategyName: "3Crv-DEPOSIT-CurveSwapPool-MIM-3LP3CRV-f-DEPOSIT-Convex-cvxMIM-3LP3CRV-f",
        token: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
        strategy: [
          {
            contract: "0x5a6A4D54456819380173272A5E8E9B9904BdF41B",
            outputToken: "0x5a6A4D54456819380173272A5E8E9B9904BdF41B",
            isBorrow: false,
            outputTokenSymbol: "MIM-3LP3CRV-f",
            adapterName: "CurveMetapoolSwapAdapter",
            protocol: "Curve",
          },
        ],
        riskProfileCode: 1,
        name: "MIM3CRV LP on Curve",
        description:
          "The OptyFi vault supplies 3CRV to the MIM3CRV liquidity pool on Curve Finance and obtains the MIM3CRV LP token which accrues yield from the pool’s trading fees and rewards which are harvested to 3CRV and reinvested into the vault.",
      },
    },
    WBTC: {
      "wbtc-DEPOSIT-Compound-cWBTC": {
        strategyName: "wbtc-DEPOSIT-Compound-cWBTC",
        token: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        strategy: [
          {
            contract: "0xC11b1268C1A384e55C48c2391d8d480264A3A7F4",
            outputToken: "0xC11b1268C1A384e55C48c2391d8d480264A3A7F4",
            isBorrow: false,
            outputTokenSymbol: "cWBTC",
            adapterName: "CompoundAdapter",
            protocol: "Compound",
          },
        ],
        riskProfileCode: 1,
        name: "WBTC Lending on Compound",
        description:
          "The OptyFi vault supplies WBTC to the lending pool on Compound Protocol to earn interest in WBTC and, potentially, additional rewards in COMP tokens. The earned WBTC tokens and any harvested COMP rewards are reinvested into the vault.",
      },
      "wbtc-DEPOSIT-Curve-crvRenWSBTC-DEPOSIT-Convex-cvxcrvRenWSBTC": {
        strategyName: "wbtc-DEPOSIT-Curve-crvRenWSBTC-DEPOSIT-Convex-cvxcrvRenWSBTC ",
        token: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        strategy: [
          {
            contract: "0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714",
            outputToken: "0x075b1bb99792c9E1041bA13afEf80C91a1e70fB3",
            isBorrow: false,
            outputTokenSymbol: "crvRenWSBTC",
            adapterName: "CurveSwapPoolAdapter",
            protocol: "Curve",
          },
          {
            contract: "0xbA723E335eC2939D52a2efcA2a8199cb4CB93cC3",
            outputToken: "0xbA723E335eC2939D52a2efcA2a8199cb4CB93cC3",
            isBorrow: false,
            outputTokenSymbol: "cvxcrvRenWSBTC",
            adapterName: "ConvexFinanceAdapter",
            protocol: "Convex",
          },
        ],
        riskProfileCode: 1,
        name: "crvRenWSBTC LP Staking on Convex",
        description:
          "The OptyFi vault supplies WBTC to the crvRenWSBTC liquidity pool on Curve Finance and obtains the crvRenWSBTC LP token which accrues yield from the pool’s trading fees and rewards. The vault then stakes the crvRenWSBTC LP token on Convex Finance to earn additional rewards which are harvested to WBTC and reinvested into the vault.",
      },
      "wbtc-DEPOSIT-Curve-crvRenWBTC-DEPOSIT-Convex-cvxcrvRenWBTC": {
        strategyName: "wbtc-DEPOSIT-Curve-crvRenWBTC-DEPOSIT-Convex-cvxcrvRenWBTC",
        token: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        strategy: [
          {
            contract: "0x93054188d876f558f4a66B2EF1d97d16eDf0895B",
            outputToken: "0x49849C98ae39Fff122806C06791Fa73784FB3675",
            isBorrow: false,
            outputTokenSymbol: "crvRenWBTC",
            adapterName: "CurveSwapPoolAdapter",
            protocol: "Curve",
          },
          {
            contract: "0x74b79021Ea6De3f0D1731fb8BdfF6eE7DF10b8Ae",
            outputToken: "0x74b79021Ea6De3f0D1731fb8BdfF6eE7DF10b8Ae",
            isBorrow: false,
            outputTokenSymbol: "cvxcrvRenWBTC",
            adapterName: "ConvexFinanceAdapter",
            protocol: "Convex",
          },
        ],
        riskProfileCode: 1,
        name: "crvRenWBTC LP Staking on Convex",
        description:
          "The OptyFi vault supplies WBTC to the crvRenWBTC liquidity pool on Curve Finance and obtains the crvRenWBTC LP token which accrues yield from the pool’s trading fees and rewards. The vault then stakes the crvRenWBTC LP token on Convex Finance to earn additional rewards which are harvested to WBTC and reinvested into the vault.",
      },
      "wbtc-DEPOSIT-Curve-crvRenWSBTC": {
        strategyName: "wbtc-DEPOSIT-Curve-crvRenWSBTC-DEPOSIT-Convex-cvxcrvRenWSBTC ",
        token: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        strategy: [
          {
            contract: "0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714",
            outputToken: "0x075b1bb99792c9E1041bA13afEf80C91a1e70fB3",
            isBorrow: false,
            outputTokenSymbol: "crvRenWSBTC",
            adapterName: "CurveSwapPoolAdapter",
            protocol: "Curve",
          },
        ],
        riskProfileCode: 1,
        name: "crvRenWSBTC LP on Curve",
        description:
          "The OptyFi vault supplies WBTC to the crvRenWSBTC liquidity pool on Curve Finance and obtains the crvRenWSBTC LP token which accrues yield from the pool’s trading fees and rewards.",
      },
      "wbtc-DEPOSIT-Curve-crvRenWBTC": {
        strategyName: "wbtc-DEPOSIT-Curve-crvRenWBTC",
        token: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        strategy: [
          {
            contract: "0x93054188d876f558f4a66B2EF1d97d16eDf0895B",
            outputToken: "0x49849C98ae39Fff122806C06791Fa73784FB3675",
            isBorrow: false,
            outputTokenSymbol: "crvRenWBTC",
            adapterName: "CurveSwapPoolAdapter",
            protocol: "Curve",
          },
        ],
        riskProfileCode: 1,
        name: "crvRenWBTC LP on Curve",
        description:
          "The OptyFi vault supplies WBTC to the crvRenWBTC liquidity pool on Curve Finance and obtains the crvRenWBTC LP token which accrues yield from the pool’s trading fees and rewards.",
      },
      "wbtc-DEPOSIT-dAMM-dWBTC": {
        strategyName: "wbtc-DEPOSIT-dAMM-dWBTC",
        token: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        strategy: [
          {
            contract: "0x63D6b99659f7b05b054DEEF582F5DaAa51780E80",
            outputToken: "0x63D6b99659f7b05b054DEEF582F5DaAa51780E80",
            isBorrow: false,
            outputTokenSymbol: "dWBTC",
            adapterName: "CompoundAdapter",
            protocol: "dAMM",
          },
        ],
        riskProfileCode: 1,
        name: "WBTC Lending on dAMM",
        description:
          "The OptyFi vault supplies WBTC to the lending pool on dAMM finance Protocol to earn interest in WBTC and, potentially, additional rewards in BDAMM tokens. The earned WBTC tokens and any harvested BDAMM rewards are reinvested into the vault.",
      },
      "wbtc-DEPOSIT-AaveV2-aWBTC-DEPOSIT-dAMM-dAWBTC": {
        strategyName: "wbtc-DEPOSIT-AaveV2-aWBTC-DEPOSIT-dAMM-dAWBTC",
        token: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
        strategy: [
          {
            contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
            outputToken: "0x9ff58f4fFB29fA2266Ab25e75e2A8b3503311656",
            isBorrow: false,
            outputTokenSymbol: "aWBTC",
            adapterName: "AaveV2Adapter",
            protocol: "AaveV2",
          },
          {
            contract: "0x9Dd451aB7bB62DA57b638070760A747bB6b1c5b1",
            outputToken: "0x9Dd451aB7bB62DA57b638070760A747bB6b1c5b1",
            isBorrow: false,
            outputTokenSymbol: "dAWBTC",
            adapterName: "CompoundAdapter",
            protocol: "dAMM",
          },
        ],
        riskProfileCode: 1,
        name: "dAWBTC Lending on Damm",
        description:
          "The OptyFi vault supplies WBTC to the lending pool on Aave Protocol then lends aWBTC to dAWBTC pool on Damm. The interest is earned on WBTC and BDAMM rewards are harvested and re-invested to the vault.",
      },
    },
  },
  Invest: {
    USDC: {
      "usdc-DEPOSIT-SushiswapPool-USDC-WETH-SLP": {
        strategyName: "usdc-DEPOSIT-SushiswapPool-USDC-WETH-SLP",
        token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        strategy: [
          {
            contract: "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0",
            outputToken: "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0",
            isBorrow: false,
            outputTokenSymbol: "USDC-WETH-SLP",
            adapterName: "SushiswapPoolAdapter",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "USDC-WETH LP Farming on Sushi",
        description:
          "The OptyFi vault supplies USDC to the USDC-WETH liquidity pool on Sushi and obtains the Sushi USDC-WETH LP token.",
      },
      "usdc-DEPOSIT-SushiswapPool-USDC-WETH-SLP-DEPOSIT-SushiswapMasterChef": {
        strategyName: "usdc-DEPOSIT-SushiswapPool-USDC-WETH-SLP-DEPOSIT-SushiswapMasterChef",
        token: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        strategy: [
          {
            contract: "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0",
            outputToken: "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0",
            isBorrow: false,
            outputTokenSymbol: "USDC-WETH-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
          {
            contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
            outputToken: "0x0000000000000000000000000000000000000000",
            isBorrow: false,
            outputTokenSymbol: "",
            adapterName: "SushiswapMasterChefV1Adapter",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "USDC-WETH LP Farming and staking on Sushi",
        description:
          "The OptyFi vault supplies USDC to the USDC-WETH liquidity pool on Sushi and obtains the Sushi USDC-WETH LP token. The vault then stake USDC-WETH LP token on sushiswap master chef to claim and harvest $SUSHI",
      },
      "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-Convex-cvx3Crv": {
        strategyName: "usdc-DEPOSIT-CurveSwapPool-3Crv-DEPOSIT-Convex-cvx3Crv",
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
            contract: "0x30D9410ED1D5DA1F6C8391af5338C93ab8d4035C",
            outputToken: "0x30D9410ED1D5DA1F6C8391af5338C93ab8d4035C",
            isBorrow: false,
            outputTokenSymbol: "cvx3Crv",
            adapterName: "ConvexFinanceAdapter",
            protocol: "Convex",
          },
        ],
        riskProfileCode: 2,
        name: "3CRV LP Staking on Convex",
        description:
          "The OptyFi vault supplies USDC to the 3CRV liquidity pool on Curve Finance and obtains the 3CRV LP token which accrues yield from the pool’s trading fees and rewards. The vault then stakes the 3CRV LP token on Convex Finance to earn additional rewards which are harvested to USDC and reinvested into the vault.",
      },
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
        riskProfileCode: 2,
        name: "FRAX3CRV LP Staking on Convex",
        description:
          "The OptyFi vault supplies USDC to the FRAX3CRV liquidity pool on Curve Finance and obtains the FRAX3CRV LP token which accrues yield from the pool’s trading fees and rewards. The vault then stakes the FRAX3CRV LP token on Convex Finance to earn additional rewards which are harvested to USDC and reinvested into the vault.",
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
        riskProfileCode: 2,
        name: "MIM3CRV LP Staking on Convex",
        description:
          "The OptyFi vault supplies USDC to the MIM3CRV liquidity pool on Curve Finance and obtains the MIM3CRV LP token which accrues yield from the pool’s trading fees and rewards. The vault then stakes the MIM3CRV LP token on Convex Finance to earn additional rewards which are harvested to USDC and reinvested into the vault.",
      },
      "usdc-DEPOSIT-Curve_3Crv-DEPOSIT-Curve_USDN-3Crv-DEPOSIT-Convex_CurveUsdn-3Crv": {
        strategyName: "usdc-DEPOSIT-Curve_3Crv-DEPOSIT-Curve_USDN-3Crv-DEPOSIT-Convex_CurveUsdn-3Crv",
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
        riskProfileCode: 2,
        name: null,
        description: null,
      },
    },
    WETH: {
      "weth-DEPOSIT-SushiswapPool-USDC-WETH-SLP": {
        strategyName: "weth-DEPOSIT-SushiswapPool-USDC-WETH-SLP",
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        strategy: [
          {
            contract: "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0",
            outputToken: "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0",
            isBorrow: false,
            outputTokenSymbol: "USDC-WETH-SLP",
            adapterName: "SushiswapPoolAdapter",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "USDC-WETH LP Farming on Sushi",
        description:
          "The OptyFi vault supplies WETH to the USDC-WETH liquidity pool on Sushi and obtains the Sushi USDC-WETH LP token.",
      },
      "weth-DEPOSIT-SushiswapPool-USDC-WETH-SLP-DEPOSIT-SushiswapMasterChef": {
        strategyName: "weth-DEPOSIT-SushiswapPool-USDC-WETH-SLP-DEPOSIT-SushiswapMasterChef",
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        strategy: [
          {
            contract: "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0",
            outputToken: "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0",
            isBorrow: false,
            outputTokenSymbol: "USDC-WETH-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
          {
            contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
            outputToken: "0x0000000000000000000000000000000000000000",
            isBorrow: false,
            outputTokenSymbol: "",
            adapterName: "SushiswapMasterChefV1Adapter",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "USDC-WETH LP Farming and staking on Sushi",
        description:
          "The OptyFi vault supplies WETH to the USDC-WETH liquidity pool on Sushi and obtains the Sushi USDC-WETH LP token. The vault then stake USDC-WETH LP token on sushiswap master chef to claim and harvest $SUSHI",
      },
      "weth-DEPOSIT-SushiswapPool-WBTC-WETH-SLP": {
        strategyName: "weth-DEPOSIT-SushiswapPool-WBTC-WETH-SLP",
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        strategy: [
          {
            contract: "0xCEfF51756c56CeFFCA006cD410B03FFC46dd3a58",
            outputToken: "0xCEfF51756c56CeFFCA006cD410B03FFC46dd3a58",
            isBorrow: false,
            outputTokenSymbol: "WBTC-WETH-SLP",
            adapterName: "SushiswapPoolAdapter",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "WBTC-WETH LP Farming on Sushi",
        description:
          "The OptyFi vault supplies WETH to the WBTC-WETH liquidity pool on Sushi and obtains the Sushi WBTC-WETH LP token.",
      },
      "weth-DEPOSIT-SushiswapPool-WBTC-WETH-SLP-DEPOSIT-SushiswapMasterChef": {
        strategyName: "weth-DEPOSIT-SushiswapPool-USDC-WETH-SLP-DEPOSIT-SushiswapMasterChef",
        token: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
        strategy: [
          {
            contract: "0xCEfF51756c56CeFFCA006cD410B03FFC46dd3a58",
            outputToken: "0xCEfF51756c56CeFFCA006cD410B03FFC46dd3a58",
            isBorrow: false,
            outputTokenSymbol: "WBTC-WETH-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
          {
            contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
            outputToken: "0x0000000000000000000000000000000000000000",
            isBorrow: false,
            outputTokenSymbol: "",
            adapterName: "SushiswapMasterChefV1Adapter",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "WBTC-WETH LP Farming and staking on Sushi",
        description:
          "The OptyFi vault supplies WBTC to the WBTC-WETH liquidity pool on Sushi and obtains the Sushi WBTC-WETH LP token. The vault then stake WBTC-WETH LP token on sushiswap master chef to claim and harvest $SUSHI",
      },
    },
    NEWO: {
      "newo-DEPOSIT-NewOrder-stkNEWO": {
        strategyName: "newo-DEPOSIT-NewOrder-stkNEWO",
        token: "0x98585dFc8d9e7D48F0b1aE47ce33332CF4237D96",
        strategy: [
          {
            contract: "0xBC9016C379fb218B95Fe3730D5F49F3149E86CAB",
            outputToken: "0xBC9016C379fb218B95Fe3730D5F49F3149E86CAB",
            isBorrow: false,
            outputTokenSymbol: "stkNEWO",
            adapterName: "NewoStakingAdapter",
            protocol: "NewOrder",
          },
        ],
        riskProfileCode: 2,
        name: "NEWO Staking on NEWO V2",
        description: "The OptyFi vault supplies NEWO to the NEWO V2 staking pool to earn NEWO rewards.",
      },
    },
    AAVE: {
      "aave-DEPOSIT-SushiswapPool-AAVE-WETH-SLP": {
        strategyName: "aave-DEPOSIT-SushiswapPool-AAVE-WETH-SLP",
        token: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
        strategy: [
          {
            contract: "0xD75EA151a61d06868E31F8988D28DFE5E9df57B4",
            outputToken: "0xD75EA151a61d06868E31F8988D28DFE5E9df57B4",
            isBorrow: false,
            outputTokenSymbol: "AAVE-WETH-SLP",
            adapterName: "SushiswapPoolAdapter",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "AAVE-WETH LP Farming on Sushi",
        description:
          "The OptyFi vault supplies AAVE to the AAVE-WETH liquidity pool on Sushi and obtains the Sushi AAVE-WETH LP token.",
      },
      "aave-DEPOSIT-SushiswapPool-AAVE-WETH-SLP-DEPOSIT-SushiswapMasterChef": {
        strategyName: "aave-DEPOSIT-SushiswapPool-AAVE-WETH-SLP-DEPOSIT-SushiswapMasterChef",
        token: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
        strategy: [
          {
            contract: "0xD75EA151a61d06868E31F8988D28DFE5E9df57B4",
            outputToken: "0xD75EA151a61d06868E31F8988D28DFE5E9df57B4",
            isBorrow: false,
            outputTokenSymbol: "AAVE-WETH-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
          {
            contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
            outputToken: "0x0000000000000000000000000000000000000000",
            isBorrow: false,
            outputTokenSymbol: "",
            adapterName: "SushiswapMasterChefV1Adapter",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "AAVE-WETH LP Farming and staking on Sushi",
        description:
          "The OptyFi vault supplies AAVE to the AAVE-WETH liquidity pool on Sushi and obtains the Sushi AAVE-WETH LP token. The vault then stake AAVE-WETH LP token on sushiswap master chef to claim and harvest $SUSHI",
      },
      "aave-DEPOSIT-Compound-cAAVE": {
        strategyName: "aave-DEPOSIT-Compound-cAAVE",
        token: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
        strategy: [
          {
            contract: "0xe65cdB6479BaC1e22340E4E755fAE7E509EcD06c",
            outputToken: "0xe65cdB6479BaC1e22340E4E755fAE7E509EcD06c",
            isBorrow: false,
            outputTokenSymbol: "cAAVE",
            adapterName: "CompoundAdapter",
            protocol: "Compound",
          },
        ],
        riskProfileCode: 2,
        name: "AAVE Lending on Compound",
        description:
          "The OptyFi vault supplies AAVE to the lending pool on Compound Protocol to earn interest in AAVE and, potentially, additional rewards in COMP tokens. The earned COMP token are harvested to AAVE and are reinvested into the vault.",
      },
    },
    APE: {
      "ape-DEPOSIT-SushiswapPool-APE-USDT-SLP": {
        strategyName: "ape-DEPOSIT-SushiswapPool-APE-USDT-SLP",
        token: "0x4d224452801ACEd8B2F0aebE155379bb5D594381",
        strategy: [
          {
            contract: "0xB27C7b131Cf4915BeC6c4Bc1ce2F33f9EE434b9f",
            outputToken: "0xB27C7b131Cf4915BeC6c4Bc1ce2F33f9EE434b9f",
            isBorrow: false,
            outputTokenSymbol: "APE-USDT-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "APE-USDT LP on Sushi",
        description:
          "The OptyFi vault supplies APE to the APE-USDT liquidity pool on Sushi and obtains the Sushi APE-USDT LP token which accrues yield from the pool’s trading fees.",
      },
      "ape-DEPOSIT-SushiswapPool-APE-USDT-SLP-DEPOSIT-SushiswapMasterChefV2": {
        strategyName: "ape-DEPOSIT-SushiswapPool-APE-USDT-SLP-DEPOSIT-SushiswapMasterChefV2",
        token: "0x4d224452801ACEd8B2F0aebE155379bb5D594381",
        strategy: [
          {
            contract: "0xB27C7b131Cf4915BeC6c4Bc1ce2F33f9EE434b9f",
            outputToken: "0xB27C7b131Cf4915BeC6c4Bc1ce2F33f9EE434b9f",
            isBorrow: false,
            outputTokenSymbol: "APE-USDT-SLP",
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
        name: "APE-USDT LP Farming on Sushi",
        description:
          "The OptyFi vault supplies APE to the APE-USDT liquidity pool on Sushi and obtains the Sushi APE-USDT LP token which accrues yield from the pool’s trading fees. The vault then stakes the APE-USDT LP token on Sushi MasterChef to earn additional SUSHI rewards which are harvested to APE and reinvested into the vault.",
      },
    },
    SUSHI: {
      "sushi-DEPOSIT-SushiswapPool-SUSHI-WETH-SLP": {
        strategyName: "sushi-DEPOSIT-SushiswapPool-SUSHI-WETH-SLP",
        token: "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
        strategy: [
          {
            contract: "0x795065dCc9f64b5614C407a6EFDC400DA6221FB0",
            outputToken: "0x795065dCc9f64b5614C407a6EFDC400DA6221FB0",
            isBorrow: false,
            outputTokenSymbol: "SUSHI-WETH-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "SUSHI-WETH LP on Sushi",
        description:
          "The OptyFi vault supplies SUSHI to the SUSHI-WETH liquidity pool on SushiSwap and obtains the SushiSwap SUSHI-WETH LP token which accrues yield from the pool’s trading fees.",
      },
      "sushi-DEPOSIT-SushiswapPool-SUSHI-WETH-SLP-DEPOSIT-SushiswapMasterChef": {
        strategyName: "sushi-DEPOSIT-SushiswapPool-SUSHI-WETH-SLP-DEPOSIT-SushiswapMasterChef",
        token: "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
        strategy: [
          {
            contract: "0x795065dCc9f64b5614C407a6EFDC400DA6221FB0",
            outputToken: "0x795065dCc9f64b5614C407a6EFDC400DA6221FB0",
            isBorrow: false,
            outputTokenSymbol: "SUSHI-WETH-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
          {
            contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
            outputToken: "0x0000000000000000000000000000000000000000",
            isBorrow: false,
            outputTokenSymbol: "",
            adapterName: "SushiswapMasterChefV1Adapter",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "SUSHI-WETH LP Farming on Sushi",
        description:
          "The OptyFi vault supplies SUSHI to the SUSHI-WETH liquidity pool on SushiSwap and obtains the SushiSwap SUSHI-WETH LP token which accrues yield from the pool’s trading fees. The vault then stakes the SUSHI-WETH LP token on SushiSwap MasterChef to earn additional SUSHI rewards which are reinvested into the vault.",
      },
      "sushi-DEPOSIT-Compound-cSUSHI": {
        strategyName: "sushi-DEPOSIT-Compound-cSUSHI",
        token: "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
        strategy: [
          {
            contract: "0x4B0181102A0112A2ef11AbEE5563bb4a3176c9d7",
            outputToken: "0x4B0181102A0112A2ef11AbEE5563bb4a3176c9d7",
            isBorrow: false,
            outputTokenSymbol: "cSUSHI",
            adapterName: "CompoundAdapter",
            protocol: "Compound",
          },
        ],
        riskProfileCode: 2,
        name: "SUSHI Lending on Compound",
        description:
          "The OptyFi vault supplies SUSHI to the lending pool on Compound Protocol to earn interest in SUSHI and, potentially, additional rewards in COMP tokens. The earned SUSHI tokens and any harvested COMP rewards are reinvested into the vault.",
      },
      "sushi-DEPOSIT-SushiBar-xSUSHI": {
        strategyName: "sushi-DEPOSIT-SushiBar-xSUSHI",
        token: "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
        strategy: [
          {
            contract: "0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272",
            outputToken: "0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272",
            isBorrow: false,
            outputTokenSymbol: "xSushi",
            adapterName: "SushiBarAdapter",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "Native SUSHI Staking on Sushi Bar",
        description: "The OptyFi vault supplies SUSHI to the Sushi Bar to earn SUSHI staking rewards.",
      },
      "sushi-DEPOSIT-SushiBar-xSUSHI-DEPOSIT-AaveV2-aXSUSHI": {
        strategyName: "sushi-DEPOSIT-SushiBar-xSUSHI-DEPOSIT-AaveV2-aXSUSHI",
        token: "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
        strategy: [
          {
            contract: "0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272",
            outputToken: "0x8798249c2E607446EfB7Ad49eC89dD1865Ff4272",
            isBorrow: false,
            outputTokenSymbol: "xSushi",
            adapterName: "SushiBarAdapter",
            protocol: "Sushiswap",
          },
          {
            contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
            outputToken: "0xF256CC7847E919FAc9B808cC216cAc87CCF2f47a",
            isBorrow: false,
            outputTokenSymbol: "aXSUSHI",
            adapterName: "AaveV2Adapter",
            protocol: "Aave",
          },
        ],
        riskProfileCode: 2,
        name: "Lending xSUSHI to Aave",
        description:
          "The OptyFi vault supplies SUSHI to the Sushi Bar and lends xSUSHI to Aave to earn xSUSHI and SUSHI staking rewards.",
      },
    },
    MANA: {
      "mana-DEPOSIT-SushiswapPool-MANA-WETH-SLP": {
        strategyName: "mana-DEPOSIT-SushiswapPool-MANA-WETH-SLP",
        token: "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942",
        strategy: [
          {
            contract: "0x1bEC4db6c3Bc499F3DbF289F5499C30d541FEc97",
            outputToken: "0x1bEC4db6c3Bc499F3DbF289F5499C30d541FEc97",
            isBorrow: false,
            outputTokenSymbol: "MANA-WETH-SLP",
            adapterName: "SushiswapPoolAdapter",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "MANA-WETH LP on Sushi",
        description:
          "The OptyFi vault supplies MANA to the MANA-WETH liquidity pool on Sushi and obtains the Sushi MANA-WETH LP token which accrues yield from the pool’s trading fees.",
      },
      "mana-DEPOSIT-SushiswapPool-MANA-WETH-SLP-DEPOSIT-SushiswapMasterChef": {
        strategyName: "mana-DEPOSIT-SushiswapPool-MANA-WETH-SLP-DEPOSIT-SushiswapMasterChef",
        token: "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942",
        strategy: [
          {
            contract: "0x1bEC4db6c3Bc499F3DbF289F5499C30d541FEc97",
            outputToken: "0x1bEC4db6c3Bc499F3DbF289F5499C30d541FEc97",
            isBorrow: false,
            outputTokenSymbol: "MANA-WETH-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
          {
            contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
            outputToken: "0x0000000000000000000000000000000000000000",
            isBorrow: false,
            outputTokenSymbol: "",
            adapterName: "SushiswapMasterChefV1Adapter",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "MANA-WETH LP Farming on Sushi",
        description:
          "The OptyFi vault supplies MANA to the MANA-WETH liquidity pool on Sushi and obtains the Sushi MANA-WETH LP token which accrues yield from the pool’s trading fees. The vault then stakes the MANA-WETH LP token on Sushi MasterChef to earn additional SUSHI rewards which are harvested to MANA and reinvested into the vault.",
      },
      "mana-DEPOSIT-AaveV1-aMANA": {
        strategyName: "mana-DEPOSIT-AaveV1-aMANA",
        token: "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942",
        strategy: [
          {
            contract: "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8",
            outputToken: "0x6FCE4A401B6B80ACe52baAefE4421Bd188e76F6f",
            isBorrow: false,
            outputTokenSymbol: "aMANA",
            adapterName: "AaveV1Adapter",
            protocol: "Aave",
          },
        ],
        riskProfileCode: 2,
        name: "MANA Lending on Aave",
        description:
          "The OptyFi vault supplies MANA to the lending pool on Aave Protocol to earn interest in MANA. The earned MANA tokens are reinvested into the vault.",
      },
      "mana-DEPOSIT-AaveV2-aMANA": {
        strategyName: "mana-DEPOSIT-AaveV2-aMANA",
        token: "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942",
        strategy: [
          {
            contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
            outputToken: "0xa685a61171bb30d4072B338c80Cb7b2c865c873E",
            isBorrow: false,
            outputTokenSymbol: "aMANA",
            adapterName: "AaveV2Adapter",
            protocol: "Aave",
          },
        ],
        riskProfileCode: 2,
        name: "MANA Lending on Aave",
        description:
          "The OptyFi vault supplies MANA to the lending pool on Aave Protocol to earn interest in MANA. The earned MANA tokens are reinvested into the vault.",
      },
    },
    LINK: {
      "link-DEPOSIT-Sushiswap-LINK-WETH": {
        strategyName: "link-DEPOSIT-Sushiswap-LINK-WETH",
        token: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
        strategy: [
          {
            contract: "0xC40D16476380e4037e6b1A2594cAF6a6cc8Da967",
            outputToken: "0xC40D16476380e4037e6b1A2594cAF6a6cc8Da967",
            isBorrow: false,
            outputTokenSymbol: "LINK-WETH-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "LINK-WETH LP on Sushi",
        description:
          "The OptyFi vault supplies LINK to the LINK-WETH liquidity pool on Sushi and obtains the Sushi LINK-WETH LP token which accrues yield from the pool’s trading fees.",
      },
      "link-DEPOSIT-Sushiswap-LINK-WETH-DEPOSIT-SushiswapMasterChef": {
        strategyName: "link-DEPOSIT-Sushiswap-LINK-WETH-DEPOSIT-SushiswapMasterChef",
        token: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
        strategy: [
          {
            contract: "0xC40D16476380e4037e6b1A2594cAF6a6cc8Da967",
            outputToken: "0xC40D16476380e4037e6b1A2594cAF6a6cc8Da967",
            isBorrow: false,
            outputTokenSymbol: "LINK-WETH-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
          {
            contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
            outputToken: "0x0000000000000000000000000000000000000000",
            isBorrow: false,
            outputTokenSymbol: "",
            adapterName: "SushiswapMasterChefV1Adapter",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "LINK-WETH LP Farming on Sushi",
        description:
          "The OptyFi vault supplies LINK to the LINK-WETH liquidity pool on Sushi and obtains the Sushi LINK-WETH LP token which accrues yield from the pool’s trading fees. The vault then stakes the LINK-WETH LP token on Sushi MasterChef to earn additional SUSHI rewards which are harvested to LINK and reinvested into the vault.",
      },
      "link-DEPOSIT-AaveV1-aLINK": {
        strategyName: "link-DEPOSIT-AaveV1-aLINK",
        token: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
        strategy: [
          {
            contract: "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8",
            outputToken: "0xA64BD6C70Cb9051F6A9ba1F163Fdc07E0DfB5F84",
            isBorrow: false,
            outputTokenSymbol: "aLINK",
            adapterName: "AaveV1Adapter",
            protocol: "Aave",
          },
        ],
        riskProfileCode: 2,
        name: "LINK Lending on Aave",
        description:
          "The OptyFi vault supplies LINK to the lending pool on Aave Protocol to earn interest in LINK. The earned LINK tokens are reinvested into the vault.",
      },
      "link-DEPOSIT-AaveV2-aLINK": {
        strategyName: "link-DEPOSIT-AaveV2-aLINK",
        token: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
        strategy: [
          {
            contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
            outputToken: "0xa06bC25B5805d5F8d82847D191Cb4Af5A3e873E0",
            isBorrow: false,
            outputTokenSymbol: "aLINK",
            adapterName: "AaveV2Adapter",
            protocol: "Aave",
          },
        ],
        riskProfileCode: 2,
        name: "LINK Lending on Aave",
        description:
          "The OptyFi vault supplies LINK to the lending pool on Aave Protocol to earn interest in LINK. The earned LINK tokens are reinvested into the vault.",
      },
      "link-DEPOSIT-Compound-cLINK": {
        strategyName: "link-DEPOSIT-Compound-cLINK",
        token: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
        strategy: [
          {
            contract: "0xFAce851a4921ce59e912d19329929CE6da6EB0c7",
            outputToken: "0xFAce851a4921ce59e912d19329929CE6da6EB0c7",
            isBorrow: false,
            outputTokenSymbol: "cLINK",
            adapterName: "CompoundAdapter",
            protocol: "Compound",
          },
        ],
        riskProfileCode: 2,
        name: "LINK Lending on Compound",
        description:
          "The OptyFi vault supplies LINK to the lending pool on Compound Protocol to earn interest in LINK and, potentially, additional rewards in COMP tokens. The earned LINK tokens and any harvested COMP rewards are reinvested into the vault.",
      },
      "link-DEPOSIT-Curve-linkCRV": {
        strategyName: "link-DEPOSIT-Curve-linkCRV",
        token: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
        strategy: [
          {
            contract: "0xF178C0b5Bb7e7aBF4e12A4838C7b7c5bA2C623c0",
            outputToken: "0xcee60cFa923170e4f8204AE08B4fA6A3F5656F3a",
            isBorrow: false,
            outputTokenSymbol: "linkCRV",
            adapterName: "CurveSwapPoolAdapter",
            protocol: "Curve",
          },
        ],
        riskProfileCode: 2,
        name: null,
        description: null,
      },
      "link-DEPOSIT-Curve-linkCRV-DEPOSIT-Convex-cvxlinkCRV": {
        strategyName: "link-DEPOSIT-Curve-linkCRV-DEPOSIT-Convex-cvxlinkCRV",
        token: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
        strategy: [
          {
            contract: "0xF178C0b5Bb7e7aBF4e12A4838C7b7c5bA2C623c0",
            outputToken: "0xcee60cFa923170e4f8204AE08B4fA6A3F5656F3a",
            isBorrow: false,
            outputTokenSymbol: "linkCRV",
            adapterName: "CurveSwapPoolAdapter",
            protocol: "Curve",
          },
          {
            contract: "0xD37969740d78C94C648d74671B8BE31eF43c30aB",
            outputToken: "0xD37969740d78C94C648d74671B8BE31eF43c30aB",
            isBorrow: false,
            outputTokenSymbol: "cvxlinkCRV",
            adapterName: "ConvexFinanceAdapter",
            protocol: "Convex",
          },
        ],
        riskProfileCode: 2,
        name: null,
        description: null,
      },
    },
    ENS: {
      "ens-DEPOSIT-Sushiswap-ENS-WETH": {
        strategyName: "ens-DEPOSIT-Sushiswap-ENS-WETH",
        token: "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72",
        strategy: [
          {
            contract: "0xa1181481bEb2dc5De0DaF2c85392d81C704BF75D",
            outputToken: "0xa1181481bEb2dc5De0DaF2c85392d81C704BF75D",
            isBorrow: false,
            outputTokenSymbol: "ENS-WETH-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "ENS-WETH LP on Sushi",
        description:
          "The OptyFi vault supplies ENS to the ENS-WETH liquidity pool on Sushi and obtains the Sushi ENS-WETH LP token which accrues yield from the pool’s trading fees.",
      },
      "ens-DEPOSIT-Sushiswap-ENS-WETH-DEPOSIT-SushiswapMasterChefV2": {
        strategyName: "ens-DEPOSIT-Sushiswap-ENS-WETH-DEPOSIT-SushiswapMasterChefV2",
        token: "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72",
        strategy: [
          {
            contract: "0xa1181481bEb2dc5De0DaF2c85392d81C704BF75D",
            outputToken: "0xa1181481bEb2dc5De0DaF2c85392d81C704BF75D",
            isBorrow: false,
            outputTokenSymbol: "ENS-WETH-SLP",
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
        name: "ENS-WETH LP Farming on Sushi",
        description:
          "The OptyFi vault supplies ENS to the ENS-WETH liquidity pool on Sushi and obtains the Sushi ENS-WETH LP token which accrues yield from the pool’s trading fees. The vault then stakes the ENS-WETH LP token on Sushi MasterChef to earn additional SUSHI rewards which are harvested to ENS and reinvested into the vault.",
      },
      "ens-DEPOSIT-AaveV2-aENS": {
        strategyName: "ens-DEPOSIT-AaveV2-aENS",
        token: "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72",
        strategy: [
          {
            contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
            outputToken: "0x9a14e23A58edf4EFDcB360f68cd1b95ce2081a2F",
            isBorrow: false,
            outputTokenSymbol: "aENS",
            adapterName: "AaveV1Adapter",
            protocol: "Aave",
          },
        ],
        riskProfileCode: 2,
        name: "ENS Lending on Aave",
        description:
          "The OptyFi vault supplies ENS to the lending pool on Aave Protocol to earn interest in ENS. The earned ENS tokens are reinvested into the vault.",
      },
    },
    COMP: {
      "comp-DEPOSIT-Sushiswap-COMP-WETH": {
        strategyName: "comp-DEPOSIT-Sushiswap-COMP-WETH",
        token: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
        strategy: [
          {
            contract: "0x31503dcb60119A812feE820bb7042752019F2355",
            outputToken: "0x31503dcb60119A812feE820bb7042752019F2355",
            isBorrow: false,
            outputTokenSymbol: "COMP-WETH-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "COMP-WETH LP on Sushi",
        description:
          "The OptyFi vault supplies COMP to the COMP-WETH liquidity pool on Sushi and obtains the Sushi COMP-WETH LP token which accrues yield from the pool’s trading fees.",
      },
      "comp-DEPOSIT-Sushiswap-COMP-WETH-DEPOSIT-SushiswapMasterChef": {
        strategyName: "comp-DEPOSIT-Sushiswap-COMP-WETH-DEPOSIT-SushiswapMasterChef",
        token: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
        strategy: [
          {
            contract: "0x31503dcb60119A812feE820bb7042752019F2355",
            outputToken: "0x31503dcb60119A812feE820bb7042752019F2355",
            isBorrow: false,
            outputTokenSymbol: "COMP-WETH-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
          {
            contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
            outputToken: "0x0000000000000000000000000000000000000000",
            isBorrow: false,
            outputTokenSymbol: "",
            adapterName: "SushiswapMasterChefV1Adapter",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "COMP-WETH LP Farming on Sushi",
        description:
          "The OptyFi vault supplies COMP to the COMP-WETH liquidity pool on Sushi and obtains the Sushi COMP-WETH LP token which accrues yield from the pool’s trading fees. The vault then stakes the COMP-WETH LP token on Sushi MasterChef to earn additional SUSHI rewards which are harvested to COMP and reinvested into the vault.",
      },
      "comp-DEPOSIT-Compound-cCOMP": {
        strategyName: "comp-DEPOSIT-Compound-cCOMP",
        token: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
        strategy: [
          {
            contract: "0x70e36f6BF80a52b3B46b3aF8e106CC0ed743E8e4",
            outputToken: "0x70e36f6BF80a52b3B46b3aF8e106CC0ed743E8e4",
            isBorrow: false,
            outputTokenSymbol: "cCOMP",
            adapterName: "CompoundAdapter",
            protocol: "Compound",
          },
        ],
        riskProfileCode: 2,
        name: "COMP Lending on Compound",
        description:
          "The OptyFi vault supplies COMP to the lending pool on Compound Protocol to earn interest in COMP and, potentially, additional rewards also in COMP tokens. The earned COMP tokens and any additional rewards are reinvested into the vault.",
      },
    },
    IMX: {
      "imx-DEPOSIT-Sushiswap-IMX-WETH": {
        strategyName: "imx-DEPOSIT-Sushiswap-IMX-WETH",
        token: "0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF",
        strategy: [
          {
            contract: "0x18Cd890F4e23422DC4aa8C2D6E0Bd3F3bD8873d8",
            outputToken: "0x18Cd890F4e23422DC4aa8C2D6E0Bd3F3bD8873d8",
            isBorrow: false,
            outputTokenSymbol: "IMX-WETH-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "IMX-WETH LP on Sushi",
        description:
          "The OptyFi vault supplies IMX to the IMX-WETH liquidity pool on Sushi and obtains the Sushi IMX-WETH LP token which accrues yield from the pool’s trading fees.",
      },
      "imx-DEPOSIT-SushiswapPool-IMX-WETH-SLP-DEPOSIT-SushiswapMasterChefV2": {
        strategyName: "imx-DEPOSIT-SushiswapPool-IMX-WETH-SLP-DEPOSIT-SushiswapMasterChefV2",
        token: "0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF",
        strategy: [
          {
            contract: "0x18Cd890F4e23422DC4aa8C2D6E0Bd3F3bD8873d8",
            outputToken: "0x18Cd890F4e23422DC4aa8C2D6E0Bd3F3bD8873d8",
            isBorrow: false,
            outputTokenSymbol: "IMX-WETH-SLP",
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
        name: "IMX-WETH LP Farming on Sushi",
        description:
          "The OptyFi vault supplies IMX to the IMX-WETH liquidity pool on Sushi and obtains the Sushi IMX-WETH LP token which accrues yield from the pool’s trading fees. The vault then stakes the IMX-WETH LP token on Sushi MasterChef to earn additional SUSHI rewards which are harvested to IMX and reinvested into the vault.",
      },
    },
    ALCX: {
      "alcx-DEPOSIT-Sushiswap-ALCX-WETH": {
        strategyName: "alcx-DEPOSIT-Sushiswap-ALCX-WETH",
        token: "0xdBdb4d16EdA451D0503b854CF79D55697F90c8DF",
        strategy: [
          {
            contract: "0xC3f279090a47e80990Fe3a9c30d24Cb117EF91a8",
            outputToken: "0xC3f279090a47e80990Fe3a9c30d24Cb117EF91a8",
            isBorrow: false,
            outputTokenSymbol: "ALCX-WETH-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "ALCX-WETH LP on Sushi",
        description:
          "The OptyFi vault supplies ALCX to the ALCX-WETH liquidity pool on Sushi and obtains the Sushi ALCX-WETH LP token which accrues yield from the pool’s trading fees.",
      },
      "alcx-DEPOSIT-SushiswapPool-ALCX-WETH-SLP-DEPOSIT-SushiswapMasterChefV2": {
        strategyName: "alcx-DEPOSIT-SushiswapPool-ALCX-WETH-SLP-DEPOSIT-SushiswapMasterChefV2",
        token: "0xdBdb4d16EdA451D0503b854CF79D55697F90c8DF",
        strategy: [
          {
            contract: "0xC3f279090a47e80990Fe3a9c30d24Cb117EF91a8",
            outputToken: "0xC3f279090a47e80990Fe3a9c30d24Cb117EF91a8",
            isBorrow: false,
            outputTokenSymbol: "ALCX-WETH-SLP",
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
        name: "ALCX-WETH LP Farming on Sushi",
        description:
          "The OptyFi vault supplies ALCX to the ALCX-WETH liquidity pool on Sushi and obtains the Sushi ALCX-WETH LP token which accrues yield from the pool’s trading fees. The vault then stakes the ALCX-WETH LP token on Sushi MasterChef to earn additional SUSHI rewards which are harvested to ALCX and reinvested into the vault.",
      },
    },
    CRV: {
      "crv-DEPOSIT-Sushiswap-CRV-WETH": {
        strategyName: "crv-DEPOSIT-Sushiswap-CRV-WETH",
        token: "0xD533a949740bb3306d119CC777fa900bA034cd52",
        strategy: [
          {
            contract: "0x58Dc5a51fE44589BEb22E8CE67720B5BC5378009",
            outputToken: "0x58Dc5a51fE44589BEb22E8CE67720B5BC5378009",
            isBorrow: false,
            outputTokenSymbol: "CRV-WETH-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "CRV-WETH LP on Sushi",
        description:
          "The OptyFi vault supplies CRV to the CRV-WETH liquidity pool on Sushi and obtains the Sushi CRV-WETH LP token which accrues yield from the pool’s trading fees.",
      },
      "crv-DEPOSIT-SushiswapPool-CRV-WETH-SLP-DEPOSIT-SushiswapMasterChef": {
        strategyName: "crv-DEPOSIT-SushiswapPool-CRV-WETH-SLP-DEPOSIT-SushiswapMasterChef",
        token: "0xD533a949740bb3306d119CC777fa900bA034cd52",
        strategy: [
          {
            contract: "0x58Dc5a51fE44589BEb22E8CE67720B5BC5378009",
            outputToken: "0x58Dc5a51fE44589BEb22E8CE67720B5BC5378009",
            isBorrow: false,
            outputTokenSymbol: "CRV-WETH-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
          {
            contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
            outputToken: "0x0000000000000000000000000000000000000000",
            isBorrow: false,
            outputTokenSymbol: "",
            adapterName: "SushiswapMasterChefV1Adapter",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "CRV-WETH LP Farming on Sushi",
        description:
          "The OptyFi vault supplies CRV to the CRV-WETH liquidity pool on Sushi and obtains the Sushi CRV-WETH LP token which accrues yield from the pool’s trading fees. The vault then stakes the CRV-WETH LP token on Sushi MasterChef to earn additional SUSHI rewards which are harvested to CRV and reinvested into the vault.",
      },
      "crv-DEPOSIT-AaveV2-aCRV": {
        strategyName: "crv-DEPOSIT-AaveV2-aCRV",
        token: "0xD533a949740bb3306d119CC777fa900bA034cd52",
        strategy: [
          {
            contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
            outputToken: "0x8dAE6Cb04688C62d939ed9B68d32Bc62e49970b1",
            isBorrow: false,
            outputTokenSymbol: "aCRV",
            adapterName: "AaveV2Adapter",
            protocol: "Aave",
          },
        ],
        riskProfileCode: 2,
        name: "CRV Lending on Aave",
        description:
          "The OptyFi vault supplies CRV to the lending pool on Aave Protocol to earn interest in CRV. The earned CRV tokens are reinvested into the vault.",
      },
    },
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
        name: "CVX-WETH LP on Sushi",
        description:
          "The OptyFi vault supplies CVX to the CVX-WETH liquidity pool on Sushi and obtains the Sushi CVX-WETH LP token which accrues yield from the pool’s trading fees.",
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
        name: "CVX-WETH LP Farming on Sushi",
        description:
          "The OptyFi vault supplies CVX to the CVX-WETH liquidity pool on Sushi and obtains the Sushi CVX-WETH LP token which accrues yield from the pool’s trading fees. The vault then stakes the CVX-WETH LP token on Sushi MasterChef to earn additional SUSHI rewards which are harvested to CVX and reinvested into the vault.",
      },
    },
    YFI: {
      "yfi-DEPOSIT-Sushiswap-YFI-WETH": {
        strategyName: "yfi-DEPOSIT-Sushiswap-YFI-WETH",
        token: "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e",
        strategy: [
          {
            contract: "0x088ee5007C98a9677165D78dD2109AE4a3D04d0C",
            outputToken: "0x088ee5007C98a9677165D78dD2109AE4a3D04d0C",
            isBorrow: false,
            outputTokenSymbol: "YFI-WETH-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "YFI-WETH LP on Sushi",
        description:
          "The OptyFi vault supplies YFI to the YFI-WETH liquidity pool on Sushi and obtains the Sushi YFI-WETH LP token which accrues yield from the pool’s trading fees.",
      },
      "yfi-DEPOSIT-SushiswapPool-YFI-WETH-SLP-DEPOSIT-SushiswapMasterChefV1": {
        strategyName: "yfi-DEPOSIT-SushiswapPool-YFI-WETH-SLP-DEPOSIT-SushiswapMasterChefV1",
        token: "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e",
        strategy: [
          {
            contract: "0x088ee5007C98a9677165D78dD2109AE4a3D04d0C",
            outputToken: "0x088ee5007C98a9677165D78dD2109AE4a3D04d0C",
            isBorrow: false,
            outputTokenSymbol: "YFI-WETH-SLP",
            adapterName: "SushiswapPoolAdapterEthereum",
            protocol: "Sushiswap",
          },
          {
            contract: "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
            outputToken: "0x0000000000000000000000000000000000000000",
            isBorrow: false,
            outputTokenSymbol: "",
            adapterName: "SushiswapMasterChefV1Adapter",
            protocol: "Sushiswap",
          },
        ],
        riskProfileCode: 2,
        name: "YFI-WETH LP Farming on Sushi",
        description:
          "The OptyFi vault supplies YFI to the YFI-WETH liquidity pool on Sushi and obtains the Sushi YFI-WETH LP token which accrues yield from the pool’s trading fees. The vault then stakes the YFI-WETH LP token on Sushi MasterChef to earn additional SUSHI rewards which are harvested to YFI and reinvested into the vault.",
      },
      "yfi-DEPOSIT-AaveV2-aYFI": {
        strategyName: "yfi-DEPOSIT-AaveV2-aYFI",
        token: "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e",
        strategy: [
          {
            contract: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
            outputToken: "0x5165d24277cD063F5ac44Efd447B27025e888f37",
            isBorrow: false,
            outputTokenSymbol: "aYFI",
            adapterName: "AaveV2Adapter",
            protocol: "Aave",
          },
        ],
        riskProfileCode: 2,
        name: "YFI Lending on Aave",
        description:
          "The OptyFi vault supplies YFI to the lending pool on Aave Protocol to earn interest in YFI. The earned YFI tokens are reinvested into the vault.",
      },
      "yfi-DEPOSIT-AaveV1-aYFI": {
        strategyName: "yfi-DEPOSIT-AaveV1-aYFI",
        token: "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e",
        strategy: [
          {
            contract: "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8",
            outputToken: "0x12e51E77DAAA58aA0E9247db7510Ea4B46F9bEAd",
            isBorrow: false,
            outputTokenSymbol: "aYFI",
            adapterName: "AaveV1Adapter",
            protocol: "Aave",
          },
        ],
        riskProfileCode: 2,
        name: "YFI Lending on Aave",
        description:
          "The OptyFi vault supplies YFI to the lending pool on Aave Protocol to earn interest in YFI. The earned YFI tokens are reinvested into the vault.",
      },
      "yfi-DEPOSIT-Compound-cYFI": {
        strategyName: "yfi-DEPOSIT-Compound-cYFI",
        token: "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e",
        strategy: [
          {
            contract: "0x80a2AE356fc9ef4305676f7a3E2Ed04e12C33946",
            outputToken: "0x80a2AE356fc9ef4305676f7a3E2Ed04e12C33946",
            isBorrow: false,
            outputTokenSymbol: "cYFI",
            adapterName: "CompoundAdapter",
            protocol: "Compound",
          },
        ],
        riskProfileCode: 2,
        name: "YFI Lending on Compound",
        description:
          "The OptyFi vault supplies YFI to the lending pool on Compound Protocol to earn interest in YFI and, potentially, additional rewards in COMP tokens. The earned YFI tokens and any harvested COMP rewards are reinvested into the vault.",
      },
    },
  },
};

const kovanStrategiesByToken = {
  Earn: {
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
  },
};

const polygonStrategiesbyToken = {
  Earn: {
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
        name: null,
        description: null,
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
        name: "USDC Lending on Aave",
        description:
          "The OptyFi vault supplies USDC to the lending pool on Aave Protocol to earn interest in USDC. The earned USDC tokens are reinvested into the vault.",
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
        name: null,
        description: null,
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
        name: null,
        description: null,
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
        name: null,
        description: null,
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
        name: null,
        description: null,
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
        name: null,
        description: null,
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
        name: null,
        description: null,
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
        name: null,
        description: null,
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
        name: null,
        description: null,
      },
    },
  },
};

const mumbaiStrategiesbyToken = {
  Earn: {
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
  },
};

const avalancheStrategiesbyToken = {
  Earn: {
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
    "USDC.e": {
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
  },
};

export const StrategiesByTokenByChain: StrategiesByRiskProfileByTokenByChainType = {
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
// (64-79) Max vault value jump % = 0.05% = 0005
// (80-239) vault fee address = 0x6bd60f089B6E8BA75c409a54CDea34AA511277f6
// (240-247) risk profile code = 0 = 00
// (248) emergency shutdown = false = 0
// (249) unpause = true = 1
// (250) allow whitelisted state = false = 0
// (251) - 0
// (252) - 0
// (253) - 0
// (254) - 0
// (255) - 0
// 0x02006bd60f089B6E8BA75c409a54CDea34AA511277f600050000000000000000
// 905369955037451290754171167376807445279006054759646226264060540481286701056
const vaultConfigRP0 = ethers.BigNumber.from(
  "905369955037451290754171167376807445279006054759646226264060540481286701056",
);

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
  Save: {
    USDC: {
      symbol: "opUSDC-Save",
      name: "OptyFi USDC Save Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.USDC.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.USDC.hash,
      vaultConfig: vaultConfigRP0,
      userDepositCapUT: BigNumber.from("100000000000"), // 100,000 USDC user deposit cap
      minimumDepositValueUT: BigNumber.from("1000000000"), // 1000 USDC minimum deposit
      totalValueLockedLimitUT: BigNumber.from("10000000000000"), // 10,000,000 USDC TVL limit
    },
    WETH: {
      symbol: "opWETH-Save",
      name: "OptyFi WETH Save Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.WETH.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.WETH.hash,
      vaultConfig: vaultConfigRP0,
      userDepositCapUT: BigNumber.from("500000000000000000000"), // 500 WETH user deposit cap
      minimumDepositValueUT: BigNumber.from("0"), // 0 WETH minimum deposit
      totalValueLockedLimitUT: BigNumber.from("5000000000000000000000"), // 5000 WETH TVL limit
    },
    DAI: {
      symbol: "opDAI-Save",
      name: "OptyFi DAI Save Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.DAI.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.DAI.hash,
      vaultConfig: vaultConfigRP0,
      userDepositCapUT: BigNumber.from("1000000000000000000000000000000000000"), // 1000000000000000000 DAI user deposit cap
      minimumDepositValueUT: BigNumber.from("0"), // 0 DAI minimum deposit
      totalValueLockedLimitUT: BigNumber.from("1000000000000000000000000000000000000"), // 1000000000000000000 DAI TVL limit
    },

    USDT: {
      symbol: "opUSDT-Save",
      name: "OptyFi USDT Save Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.USDT.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.USDT.hash,
      vaultConfig: vaultConfigRP0,
      userDepositCapUT: BigNumber.from("1000000000000000000000000"), // 1000000000000000000 USDT user deposit cap
      minimumDepositValueUT: BigNumber.from("0"), // 0 USDT minimum deposit
      totalValueLockedLimitUT: BigNumber.from("1000000000000000000000000"), // 1000000000000000000 USDT TVL limit
    },

    WBTC: {
      symbol: "opWBTC-Save",
      name: "OptyFi WBTC Save Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.WBTC.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.WBTC.hash,
      vaultConfig: vaultConfigRP0,
      userDepositCapUT: BigNumber.from("100000000000000000000000000"), // 100000000000000000000000000 WBTC user deposit cap
      minimumDepositValueUT: BigNumber.from("0"), // 0 WBTC minimum deposit
      totalValueLockedLimitUT: BigNumber.from("100000000000000000000000000"), // 100000000000000000000000000 WBTC TVL limit
    },
  },
  Earn: {
    USDC: {
      symbol: "opUSDC-Earn",
      name: "OptyFi USDC Earn Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.USDC.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.USDC.hash,
      vaultConfig: vaultConfigRP1,
      userDepositCapUT: BigNumber.from("100000000000"), // 100,000 USDC user deposit cap
      minimumDepositValueUT: BigNumber.from("1000000000"), // 1000 USDC minimum deposit
      totalValueLockedLimitUT: BigNumber.from("10000000000000"), // 10,000,000 USDC TVL limit
    },

    WETH: {
      symbol: "opWETH-Earn",
      name: "OptyFi WETH Earn Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.WETH.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.WETH.hash,
      vaultConfig: vaultConfigRP1,
      userDepositCapUT: BigNumber.from("500000000000000000000"), // 500 WETH user deposit cap
      minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 WETH minimum deposit
      totalValueLockedLimitUT: BigNumber.from("5000000000000000000000"), // 5000 WETH TVL limit
    },

    USD3: {
      symbol: "opUSD3-Earn",
      name: "OptyFi USD3 Earn Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.USD3.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.USD3.hash,
      vaultConfig: vaultConfigRP1,
      userDepositCapUT: BigNumber.from("100000000000000000000000000"), // 100000000000000000000000000 3CRV user deposit cap
      minimumDepositValueUT: BigNumber.from("0"), // 0 3CRV minimum deposit
      totalValueLockedLimitUT: BigNumber.from("100000000000000000000000000"), // 100000000000000000000000000 3CRV TVL limit
    },

    WBTC: {
      symbol: "opWBTC-Earn",
      name: "OptyFi WBTC Earn Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.WBTC.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.WBTC.hash,
      vaultConfig: vaultConfigRP1,
      userDepositCapUT: BigNumber.from("100000000000000000000000000"), // 100000000000000000000000000 WBTC user deposit cap
      minimumDepositValueUT: BigNumber.from("0"), // 0 WBTC minimum deposit
      totalValueLockedLimitUT: BigNumber.from("100000000000000000000000000"), // 100000000000000000000000000 WBTC TVL limit
    },
  },
  Invest: {
    USDC: {
      symbol: "opUSDC-Invst",
      name: "OptyFi USDC Invest Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.USDC.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.USDC.hash,
      vaultConfig: vaultConfigRP2,
      userDepositCapUT: BigNumber.from("100000000000"), // 100,000 USDC user deposit cap
      minimumDepositValueUT: BigNumber.from("1000000000"), // 1000 USDC minimum deposit
      totalValueLockedLimitUT: BigNumber.from("10000000000000"), // 10,000,000 USDC TVL limit
    },
    WETH: {
      symbol: "opWETH-Invst",
      name: "OptyFi WETH Invest Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.WETH.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.WETH.hash,
      vaultConfig: vaultConfigRP2,
      userDepositCapUT: BigNumber.from("500000000000000000000"), // 500 WETH user deposit cap
      minimumDepositValueUT: BigNumber.from("0"), // 0 WETH minimum deposit
      totalValueLockedLimitUT: BigNumber.from("5000000000000000000000"), // 5000 WETH TVL limit
    },
    NEWO: {
      symbol: "opNEWO-Invst",
      name: "OptyFi NEWO Invest Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.NEWO.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.NEWO.hash,
      vaultConfig: vaultConfigRP2,
      userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 NEWO wei user deposit cap
      minimumDepositValueUT: BigNumber.from("100000000000000000000000"), // 100,000 NEWO minimum deposit
      totalValueLockedLimitUT: BigNumber.from("3000000000000000000000000"), // 3,000,000 NEWO TVL limit
    },

    AAVE: {
      symbol: "opAAVE-Invst",
      name: "OptyFi AAVE Invest Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.AAVE.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.AAVE.hash,
      vaultConfig: vaultConfigRP2,
      userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 AAVE wei user deposit cap
      minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 AAVE minimum deposit
      totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 AAVE TVL limit
    },

    APE: {
      symbol: "opAPE-Invst",
      name: "OptyFi APE Invest Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.APE.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.APE.hash,
      vaultConfig: vaultConfigRP2,
      userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 APE wei user deposit cap
      minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 APE minimum deposit
      totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 APE TVL limit
    },

    SUSHI: {
      symbol: "opSUSHI-Invst",
      name: "OptyFi SUSHI Invest Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.SUSHI.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.SUSHI.hash,
      vaultConfig: vaultConfigRP2,
      userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 SUSHI wei user deposit cap
      minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 SUSHI minimum deposit
      totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 SUSHI TVL limit
    },

    MANA: {
      symbol: "opMANA-Invst",
      name: "OptyFi MANA Invest Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.MANA.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.MANA.hash,
      vaultConfig: vaultConfigRP2,
      userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 MANA wei user deposit cap
      minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 MANA minimum deposit
      totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 MANA TVL limit
    },

    LINK: {
      symbol: "opLINK-Invst",
      name: "OptyFi LINK Invest Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.LINK.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.LINK.hash,
      vaultConfig: vaultConfigRP2,
      userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 LINK wei user deposit cap
      minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 LINK minimum deposit
      totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 LINK TVL limit
    },

    ENS: {
      symbol: "opENS-Invst",
      name: "OptyFi ENS Invest Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.ENS.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.ENS.hash,
      vaultConfig: vaultConfigRP2,
      userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 ENS wei user deposit cap
      minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 ENS minimum deposit
      totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 ENS TVL limit
    },

    COMP: {
      symbol: "opCOMP-Invst",
      name: "OptyFi COMP Invest Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.COMP.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.COMP.hash,
      vaultConfig: vaultConfigRP2,
      userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 COMP wei user deposit cap
      minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 COMP minimum deposit
      totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 COMP TVL limit
    },

    IMX: {
      symbol: "opIMX-Invst",
      name: "OptyFi IMX Invest Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.IMX.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.IMX.hash,
      vaultConfig: vaultConfigRP2,
      userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 IMX wei user deposit cap
      minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 IMX minimum deposit
      totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 IMX TVL limit
    },

    ALCX: {
      symbol: "opALCX-Invst",
      name: "OptyFi ALCX Invest Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.ALCX.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.ALCX.hash,
      vaultConfig: vaultConfigRP2,
      userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 ALCX wei user deposit cap
      minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 ALCX minimum deposit
      totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 ALCX TVL limit
    },

    CRV: {
      symbol: "opCRV-Invst",
      name: "OptyFi CRV Invest Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.CRV.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.CRV.hash,
      vaultConfig: vaultConfigRP2,
      userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 CRV wei user deposit cap
      minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 CRV minimum deposit
      totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 CRV TVL limit
    },

    CVX: {
      symbol: "opCVX-Invst",
      name: "OptyFi CVX Invest Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.CVX.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.CVX.hash,
      vaultConfig: vaultConfigRP2,
      userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 CVX wei user deposit cap
      minimumDepositValueUT: BigNumber.from("10000000000000000000"), // 10 CVX minimum deposit
      totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 CVX TVL limit
    },

    YFI: {
      symbol: "opYFI-Invst",
      name: "OptyFi YFI Invest Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mainnet.YFI.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mainnet.YFI.hash,
      vaultConfig: vaultConfigRP2,
      userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256), // 2^256 YFI wei user deposit cap
      minimumDepositValueUT: BigNumber.from("1000000000000000000"), // 1 YFI minimum deposit
      totalValueLockedLimitUT: BigNumber.from("30000000000000000000000"), // 30,000 YFI TVL limit
    },
  },
};

const kovanVaults: VaultType = {
  Intermediate: {
    USDC: {
      symbol: "opAVUSDC-Int",
      name: "OptyFi AVUSDC Intermediate Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.kovan.USDC.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.kovan.USDC.hash,
      vaultConfig: vaultConfigRP1,
      userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256),
      minimumDepositValueUT: BigNumber.from("0"),
      totalValueLockedLimitUT: BigNumber.from(ethers.constants.MaxUint256),
    },
  },
};

const polygonVaults: VaultType = {
  Earn: {
    USDC: {
      symbol: "opUSDC-Earn",
      name: "OptyFi USDC Earn Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.polygon.USDC.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.polygon.USDC.hash,
      vaultConfig: vaultConfigRP1,
      userDepositCapUT: BigNumber.from("100000000000"), // 100,000 USDC user deposit cap
      minimumDepositValueUT: BigNumber.from("1000000000"), // 1000 USDC minimum deposit
      totalValueLockedLimitUT: BigNumber.from("10000000000000"), // 10,000,000 USDC TVL limit
    },

    WMATIC: {
      symbol: "opWMATIC-Earn",
      name: "OptyFi WMATIC Earn Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.polygon.WMATIC.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.polygon.WMATIC.hash,
      vaultConfig: vaultConfigRP1,
      userDepositCapUT: BigNumber.from("5000000000000000000"), // 5 WMATIC user deposit cap
      minimumDepositValueUT: BigNumber.from("250000000000000000"), // 0.25 WMATIC minimum deposit
      totalValueLockedLimitUT: BigNumber.from("5000000000000000000000"), // 5000 WMATIC TVL limit
    },
  },
};

const mumbaiVaults: VaultType = {
  Earn: {
    USDC: {
      symbol: "opUSDC-Earn",
      name: "OptyFi USDC Earn Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.mumbai.USDC.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.mumbai.USDC.hash,
      vaultConfig: vaultConfigRP1,
      userDepositCapUT: BigNumber.from(ethers.constants.MaxUint256),
      minimumDepositValueUT: BigNumber.from("0"),
      totalValueLockedLimitUT: BigNumber.from(ethers.constants.MaxUint256),
    },
  },
};

const avalancheVaults: VaultType = {
  Earn: {
    USDC: {
      symbol: "opUSDC-Earn",
      name: "OptyFi USDC Earn Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.avalanche.USDC.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.avalanche.USDC.hash,
      vaultConfig: vaultConfigRP1,
      userDepositCapUT: BigNumber.from("100000000000"), // 100,000 USDC user deposit cap
      minimumDepositValueUT: BigNumber.from("1000000000"), // 1000 USDC minimum deposit
      totalValueLockedLimitUT: BigNumber.from("10000000000000"), // 10,000,000 USDC TVL limit
    },

    "USDC.e": {
      symbol: "opUSDC.e-Earn",
      name: "OptyFi USDC.e Earn Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.avalanche["USDC.e"].address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.avalanche["USDC.e"].hash,
      vaultConfig: vaultConfigRP1,
      userDepositCapUT: BigNumber.from("100000000000"), // 100,000 USDCe user deposit cap
      minimumDepositValueUT: BigNumber.from("1000000000"), // 1000 USDCe minimum deposit
      totalValueLockedLimitUT: BigNumber.from("10000000000000"), // 10,000,000 USDCe TVL limit
    },

    WAVAX: {
      symbol: "opWAVAX-Earn",
      name: "OptyFi WAVAX Earn Vault",
      underlyingToken: MULTI_CHAIN_VAULT_TOKENS.avalanche.WAVAX.address,
      underlyingTokensHash: MULTI_CHAIN_VAULT_TOKENS.avalanche.WAVAX.hash,
      vaultConfig: vaultConfigRP1,
      userDepositCapUT: BigNumber.from("5000000000000000000"), // 5 WAVAX user deposit cap
      minimumDepositValueUT: BigNumber.from("250000000000000000"), // 0.25 WAVAX minimum deposit
      totalValueLockedLimitUT: BigNumber.from("5000000000000000000000"), // 5000 WAVAX TVL limit
    },
  },
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
