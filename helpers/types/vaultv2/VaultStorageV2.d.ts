/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import {
  ethers,
  EventFilter,
  Signer,
  BigNumber,
  BigNumberish,
  PopulatedTransaction,
  BaseContract,
  ContractTransaction,
  CallOverrides,
} from "ethers";
import { BytesLike } from "@ethersproject/bytes";
import { Listener, Provider } from "@ethersproject/providers";
import { FunctionFragment, EventFragment, Result } from "@ethersproject/abi";
import type { TypedEventFilter, TypedEvent, TypedListener } from "./common";

interface VaultStorageV2Interface extends ethers.utils.Interface {
  functions: {
    "blockToBlockVaultValues(uint256,uint256)": FunctionFragment;
    "depositQueue()": FunctionFragment;
    "gasOwedToOperator()": FunctionFragment;
    "investStrategyHash()": FunctionFragment;
    "maxVaultValueJump()": FunctionFragment;
    "pendingDeposits(address)": FunctionFragment;
    "pricePerShareWrite()": FunctionFragment;
    "queue(uint256)": FunctionFragment;
    "riskProfileCode()": FunctionFragment;
    "totalDeposits(address)": FunctionFragment;
    "underlyingToken()": FunctionFragment;
  };

  encodeFunctionData(functionFragment: "blockToBlockVaultValues", values: [BigNumberish, BigNumberish]): string;
  encodeFunctionData(functionFragment: "depositQueue", values?: undefined): string;
  encodeFunctionData(functionFragment: "gasOwedToOperator", values?: undefined): string;
  encodeFunctionData(functionFragment: "investStrategyHash", values?: undefined): string;
  encodeFunctionData(functionFragment: "maxVaultValueJump", values?: undefined): string;
  encodeFunctionData(functionFragment: "pendingDeposits", values: [string]): string;
  encodeFunctionData(functionFragment: "pricePerShareWrite", values?: undefined): string;
  encodeFunctionData(functionFragment: "queue", values: [BigNumberish]): string;
  encodeFunctionData(functionFragment: "riskProfileCode", values?: undefined): string;
  encodeFunctionData(functionFragment: "totalDeposits", values: [string]): string;
  encodeFunctionData(functionFragment: "underlyingToken", values?: undefined): string;

  decodeFunctionResult(functionFragment: "blockToBlockVaultValues", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "depositQueue", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "gasOwedToOperator", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "investStrategyHash", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "maxVaultValueJump", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "pendingDeposits", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "pricePerShareWrite", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "queue", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "riskProfileCode", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "totalDeposits", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "underlyingToken", data: BytesLike): Result;

  events: {
    "DepositQueue(address,uint256,uint256)": EventFragment;
  };

  getEvent(nameOrSignatureOrTopic: "DepositQueue"): EventFragment;
}

export type DepositQueueEvent = TypedEvent<
  [string, BigNumber, BigNumber] & {
    sender: string;
    index: BigNumber;
    amount: BigNumber;
  }
>;

export class VaultStorageV2 extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this;
  attach(addressOrName: string): this;
  deployed(): Promise<this>;

  listeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter?: TypedEventFilter<EventArgsArray, EventArgsObject>,
  ): Array<TypedListener<EventArgsArray, EventArgsObject>>;
  off<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>,
  ): this;
  on<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>,
  ): this;
  once<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>,
  ): this;
  removeListener<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
    listener: TypedListener<EventArgsArray, EventArgsObject>,
  ): this;
  removeAllListeners<EventArgsArray extends Array<any>, EventArgsObject>(
    eventFilter: TypedEventFilter<EventArgsArray, EventArgsObject>,
  ): this;

  listeners(eventName?: string): Array<Listener>;
  off(eventName: string, listener: Listener): this;
  on(eventName: string, listener: Listener): this;
  once(eventName: string, listener: Listener): this;
  removeListener(eventName: string, listener: Listener): this;
  removeAllListeners(eventName?: string): this;

  queryFilter<EventArgsArray extends Array<any>, EventArgsObject>(
    event: TypedEventFilter<EventArgsArray, EventArgsObject>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined,
  ): Promise<Array<TypedEvent<EventArgsArray & EventArgsObject>>>;

  interface: VaultStoragev2Interface;

  functions: {
    blockToBlockVaultValues(
      arg0: BigNumberish,
      arg1: BigNumberish,
      overrides?: CallOverrides,
    ): Promise<
      [BigNumber, BigNumber, BigNumber] & {
        actualVaultValue: BigNumber;
        blockMinVaultValue: BigNumber;
        blockMaxVaultValue: BigNumber;
      }
    >;

    depositQueue(overrides?: CallOverrides): Promise<[BigNumber]>;

    gasOwedToOperator(overrides?: CallOverrides): Promise<[BigNumber]>;

    investStrategyHash(overrides?: CallOverrides): Promise<[string]>;

    maxVaultValueJump(overrides?: CallOverrides): Promise<[BigNumber]>;

    pendingDeposits(arg0: string, overrides?: CallOverrides): Promise<[BigNumber]>;

    pricePerShareWrite(overrides?: CallOverrides): Promise<[BigNumber]>;

    queue(
      arg0: BigNumberish,
      overrides?: CallOverrides,
    ): Promise<[string, BigNumber] & { account: string; value: BigNumber }>;

    riskProfileCode(overrides?: CallOverrides): Promise<[BigNumber]>;

    totalDeposits(arg0: string, overrides?: CallOverrides): Promise<[BigNumber]>;

    underlyingToken(overrides?: CallOverrides): Promise<[string]>;
  };

  blockToBlockVaultValues(
    arg0: BigNumberish,
    arg1: BigNumberish,
    overrides?: CallOverrides,
  ): Promise<
    [BigNumber, BigNumber, BigNumber] & {
      actualVaultValue: BigNumber;
      blockMinVaultValue: BigNumber;
      blockMaxVaultValue: BigNumber;
    }
  >;

  depositQueue(overrides?: CallOverrides): Promise<BigNumber>;

  gasOwedToOperator(overrides?: CallOverrides): Promise<BigNumber>;

  investStrategyHash(overrides?: CallOverrides): Promise<string>;

  maxVaultValueJump(overrides?: CallOverrides): Promise<BigNumber>;

  pendingDeposits(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;

  pricePerShareWrite(overrides?: CallOverrides): Promise<BigNumber>;

  queue(
    arg0: BigNumberish,
    overrides?: CallOverrides,
  ): Promise<[string, BigNumber] & { account: string; value: BigNumber }>;

  riskProfileCode(overrides?: CallOverrides): Promise<BigNumber>;

  totalDeposits(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;

  underlyingToken(overrides?: CallOverrides): Promise<string>;

  callStatic: {
    blockToBlockVaultValues(
      arg0: BigNumberish,
      arg1: BigNumberish,
      overrides?: CallOverrides,
    ): Promise<
      [BigNumber, BigNumber, BigNumber] & {
        actualVaultValue: BigNumber;
        blockMinVaultValue: BigNumber;
        blockMaxVaultValue: BigNumber;
      }
    >;

    depositQueue(overrides?: CallOverrides): Promise<BigNumber>;

    gasOwedToOperator(overrides?: CallOverrides): Promise<BigNumber>;

    investStrategyHash(overrides?: CallOverrides): Promise<string>;

    maxVaultValueJump(overrides?: CallOverrides): Promise<BigNumber>;

    pendingDeposits(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;

    pricePerShareWrite(overrides?: CallOverrides): Promise<BigNumber>;

    queue(
      arg0: BigNumberish,
      overrides?: CallOverrides,
    ): Promise<[string, BigNumber] & { account: string; value: BigNumber }>;

    riskProfileCode(overrides?: CallOverrides): Promise<BigNumber>;

    totalDeposits(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;

    underlyingToken(overrides?: CallOverrides): Promise<string>;
  };

  filters: {
    "DepositQueue(address,uint256,uint256)"(
      sender?: string | null,
      index?: BigNumberish | null,
      amount?: BigNumberish | null,
    ): TypedEventFilter<[string, BigNumber, BigNumber], { sender: string; index: BigNumber; amount: BigNumber }>;

    DepositQueue(
      sender?: string | null,
      index?: BigNumberish | null,
      amount?: BigNumberish | null,
    ): TypedEventFilter<[string, BigNumber, BigNumber], { sender: string; index: BigNumber; amount: BigNumber }>;
  };

  estimateGas: {
    blockToBlockVaultValues(arg0: BigNumberish, arg1: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;

    depositQueue(overrides?: CallOverrides): Promise<BigNumber>;

    gasOwedToOperator(overrides?: CallOverrides): Promise<BigNumber>;

    investStrategyHash(overrides?: CallOverrides): Promise<BigNumber>;

    maxVaultValueJump(overrides?: CallOverrides): Promise<BigNumber>;

    pendingDeposits(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;

    pricePerShareWrite(overrides?: CallOverrides): Promise<BigNumber>;

    queue(arg0: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;

    riskProfileCode(overrides?: CallOverrides): Promise<BigNumber>;

    totalDeposits(arg0: string, overrides?: CallOverrides): Promise<BigNumber>;

    underlyingToken(overrides?: CallOverrides): Promise<BigNumber>;
  };

  populateTransaction: {
    blockToBlockVaultValues(
      arg0: BigNumberish,
      arg1: BigNumberish,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>;

    depositQueue(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    gasOwedToOperator(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    investStrategyHash(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    maxVaultValueJump(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    pendingDeposits(arg0: string, overrides?: CallOverrides): Promise<PopulatedTransaction>;

    pricePerShareWrite(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    queue(arg0: BigNumberish, overrides?: CallOverrides): Promise<PopulatedTransaction>;

    riskProfileCode(overrides?: CallOverrides): Promise<PopulatedTransaction>;

    totalDeposits(arg0: string, overrides?: CallOverrides): Promise<PopulatedTransaction>;

    underlyingToken(overrides?: CallOverrides): Promise<PopulatedTransaction>;
  };
}
