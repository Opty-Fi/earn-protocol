import { BigNumber, BytesLike } from 'ethers';

export interface Order {
  liquidationAmount: BigNumber;
  expiration: BigNumber;
  lowerBound: BigNumber;
  upperBound: BigNumber;
  direction: BigNumber;
  returnLimitBP: BigNumber;
  maker: string;
  vault: string;
}

export interface OrderParams {
  liquidationShareBP: BigNumber;
  expiration: BigNumber;
  lowerBound: BigNumber;
  upperBound: BigNumber;
  direction: BigNumber;
  returnLimitBP: BigNumber;
  vault: string;
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
