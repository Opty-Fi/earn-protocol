import abi from "ethereumjs-abi";
import { BigNumber, BigNumberish } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import {
  AaveV1Adapter,
  AaveV1ETHGateway,
  AaveV2Adapter,
  APROracle,
  CompoundAdapter,
  CompoundETHGateway,
  CurveDepositPoolAdapter,
  CurveSwapETHGateway,
  CurveSwapPoolAdapter,
  ERC20,
  HarvestCodeProvider,
  InvestStrategyRegistry,
  Registry,
  RegistryProxy,
  RiskManager,
  RiskManagerProxy,
  StrategyManager,
  StrategyProvider,
  Vault,
} from "../typechain";

// function to get the equivalent hash (as generated by the solidity) of data passed in args
export function getSoliditySHA3Hash(argTypes: string[], args: any[]): string {
  const soliditySHA3Hash = "0x" + abi.soliditySHA3(argTypes, args).toString("hex");
  return soliditySHA3Hash;
}

export function amountInHex(fundAmount: BigNumber): string {
  const amount: string = "0x" + Number(fundAmount).toString(16);
  return amount;
}

export function delay(ms: number): Promise<unknown> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function removeDuplicateFromStringArray(list: string[]): string[] {
  return list.filter((x, i, a) => a.indexOf(x) == i);
}

export interface Signers {
  admin: SignerWithAddress;
  owner: SignerWithAddress;
  deployer: SignerWithAddress;
  alice: SignerWithAddress;
  bob: SignerWithAddress;
  financeOperator: SignerWithAddress;
  riskOperator: SignerWithAddress;
  strategyOperator: SignerWithAddress;
  operator: SignerWithAddress;
  governance: SignerWithAddress;
  eve: SignerWithAddress;
}

declare module "mocha" {
  export interface Context {
    signers: Signers;
    registry: Registry;
    registryProxy: RegistryProxy;
    harvestCodeProvider: HarvestCodeProvider;
    compoundAdapter: CompoundAdapter;
    compoundEthGateway: CompoundETHGateway;
    aavev1Adapter: AaveV1Adapter;
    aaveV1EthGateway: AaveV1ETHGateway;
    aaveV2Adapter: AaveV2Adapter;
    curveDepositPoolAdapter: CurveDepositPoolAdapter;
    curveSwapPoolAdapter: CurveSwapPoolAdapter;
    curveSwapEthGateway: CurveSwapETHGateway;
    investStrategyRegistry: InvestStrategyRegistry;
    strategyProvider: StrategyProvider;
    riskManager: RiskManager;
    riskManagerProxy: RiskManagerProxy;
    aprOracle: APROracle;
    strategyManager: StrategyManager;
    vault: Vault;
    erc20: ERC20;
  }
}

export function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function to_10powNumber_BN(decimals: BigNumberish): BigNumber {
  return BigNumber.from(10).pow(decimals);
}
