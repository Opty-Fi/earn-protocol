import { RISK_PROFILE_DATA, OPTY_STAKING_VAULT } from "../type";

export const RISK_PROFILES: RISK_PROFILE_DATA = [
  {
    code: 0,
    name: "RP0",
    symbol: "RP0",
    canBorrow: false,
    poolRating: [0, 5],
  },
  {
    code: 1,
    name: "Basic",
    symbol: "bas",
    canBorrow: false,
    poolRating: [0, 10],
  },
  {
    code: 2,
    name: "Intermediate",
    symbol: "int",
    canBorrow: true,
    poolRating: [0, 20],
  },
  {
    code: 3,
    name: "Advanced",
    symbol: "adv",
    canBorrow: true,
    poolRating: [0, 30],
  },
];

export const OPTY_STAKING_VAULTS: OPTY_STAKING_VAULT[] = [
  {
    name: "optyStakingVault1D",
    numberOfDays: "1D",
    lockTime: 86400,
    multiplier: 10000,
  },
  {
    name: "optyStakingVault30D",
    numberOfDays: "30D",
    lockTime: 2592000,
    multiplier: 12000,
  },
  {
    name: "optyStakingVault60D",
    numberOfDays: "60D",
    lockTime: 5184000,
    multiplier: 15000,
  },
  {
    name: "optyStakingVault180D",
    numberOfDays: "180D",
    lockTime: 15552000,
    multiplier: 20000,
  },
];
