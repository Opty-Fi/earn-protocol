import { BigNumber, BytesLike } from "ethers";

export interface Order {
  liquidationAmount: BigNumber;
  expiration: BigNumber;
  lowerBound: BigNumber;
  upperBound: BigNumber;
  returnLimitBP: BigNumber;
  maker: string;
  vault: string;
  stablecoinVault: string;
  dexRouter: string;
  swapOnUniV3: boolean;
  direction: BigNumber;
  uniV3Path: BytesLike;
  uniV2Path: string[];
}

export interface OrderParams {
  liquidationAmount: BigNumber;
  expiration: BigNumber;
  lowerBound: BigNumber;
  upperBound: BigNumber;
  returnLimitBP: BigNumber;
  vault: string;
  stablecoinVault: string;
  dexRouter: string;
  swapOnUniV3: boolean;
  direction: BigNumber;
  uniV3Path: BytesLike;
  uniV2Path: string[];
}

export interface SwapData {
  fromToken: string;
  toToken: string;
  fromAmount: BigNumber;
  toAmount: BigNumber;
  callees: string[];
  exchangeData: BytesLike;
  startIndexes: BigNumber[];
  values: BigNumber[];
  beneficiary: string;
  permit: BytesLike;
  deadline: BigNumber;
}

export interface SwapParams {
  deadline: BigNumber;
  startIndexes: BigNumber[];
  values: BigNumber[];
  callees: string[];
  exchangeData: BytesLike;
  permit: BytesLike;
}

export interface TokenPairPriceFeed {
  tokenA: string;
  tokenB: string;
  priceFeed: string;
}

export type EventParamType = {
  name: string;
  type: string;
  value: string;
};

export type DecodedLogType = {
  name: string;
  events: EventParamType[];
  address: string;
};
