import { AAVE_V1_ADAPTER_NAME, AAVE_V2_ADAPTER_NAME, COMPOUND_ADAPTER_NAME } from "../constants/adapters";

import { DEFI_POOLS_DATA } from "../type";

export const TypedDefiPools: DEFI_POOLS_DATA = {
  [COMPOUND_ADAPTER_NAME]: {
    usdc: {
      pool: "0x39AA39c021dfbaE8faC545936693aC917d5E7563",
      lpToken: "0x39AA39c021dfbaE8faC545936693aC917d5E7563",
      tokens: ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
      rewardTokens: ["0xc00e94Cb662C3520282E6f5717214004A7f26888"],
    },
  },
  [AAVE_V1_ADAPTER_NAME]: {
    usdc: {
      pool: "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8",
      lpToken: "0x9bA00D6856a4eDF4665BcA2C2309936572473B7E",
      tokens: ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
      rewardTokens: ["0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"],
    },
  },
  [AAVE_V2_ADAPTER_NAME]: {
    usdc: {
      pool: "0x52D306e36E3B6B02c153d0266ff0f85d18BCD413",
      lpToken: "0xBcca60bB61934080951369a648Fb03DF4F96263C",
      tokens: ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"],
      rewardTokens: ["0x4da27a545c0c5B758a6BA100e3a049001de870f5"],
    },
  },
};
