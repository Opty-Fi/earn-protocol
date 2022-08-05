import { BigNumber, BytesLike } from 'ethers';

export interface Order {
  priceTarget: BigNumber;
  liquidationShareBP: BigNumber;
  expiration: BigNumber;
  lowerBound: BigNumber;
  upperBound: BigNumber;
  returnLimitBP: BigNumber;
  maker: string;
  vault: string;
  depositUSDC: boolean;
}

export interface OrderParams {
  priceTarget: BigNumber;
  liquidationShareBP: BigNumber;
  expiration: BigNumber;
  lowerBound: BigNumber;
  upperBound: BigNumber;
  returnLimitBP: BigNumber;
  vault: string;
  depositUSDC: boolean;
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
