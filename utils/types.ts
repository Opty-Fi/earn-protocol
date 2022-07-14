import { BigNumber, BytesLike } from 'ethers';

export interface Order {
  priceTarget: BigNumber;
  liquidationShare: BigNumber;
  endTime: BigNumber;
  lowerBound: BigNumber;
  upperBound: BigNumber;
  maker: string;
  vault: string;
  depositUSDC: boolean;
}

export interface OrderParams {
  priceTarget: BigNumber;
  liquidationShare: BigNumber;
  endTime: BigNumber;
  lowerBound: BigNumber;
  upperBound: BigNumber;
  vault: string;
  depositUSDC: boolean;
}

export interface SwapData {
  fromToken: string;
  toToken: string;
  fromAmount: BigNumber;
  toAmount: BigNumber;
  expectedAmount: BigNumber;
  callees: string[];
  exchangeData: BytesLike;
  startIndexes: BigNumber[];
  values: BigNumber[];
  permit: BytesLike;
  deadline: BigNumber;
}
