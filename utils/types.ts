import { BigNumber, BytesLike } from "ethers";

export interface Order {
  liquidationAmountVT: BigNumber;
  expectedOutputUT: BigNumber;
  expiration: BigNumber;
  lowerBound: BigNumber;
  upperBound: BigNumber;
  returnLimitUT: BigNumber;
  expectedOutputVT: BigNumber;
  taskId: string;
  maker: string;
  vault: string;
  stablecoinVault: string;
  dexRouter: string;
  swapOnUniV3: boolean;
  direction: number;
  uniV3Path: string;
  permitParams: string;
  uniV2Path: string[];
}

export interface OrderParams {
  liquidationAmountVT: BigNumber;
  expectedOutputUT: BigNumber;
  expiration: BigNumber;
  lowerBound: BigNumber;
  upperBound: BigNumber;
  returnLimitUT: BigNumber;
  expectedOutputVT: BigNumber;
  vault: string;
  stablecoinVault: string;
  dexRouter: string;
  swapOnUniV3: boolean;
  direction: BigNumber;
  uniV3Path: BytesLike;
  permitParams: BytesLike;
  uniV2Path: string[];
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
