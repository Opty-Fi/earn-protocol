import { BigNumber } from 'ethers';

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
