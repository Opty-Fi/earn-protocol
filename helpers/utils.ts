import abi from "ethereumjs-abi";
import { BigNumber, BigNumberish } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import fs from "fs";
import { AxiosRequestConfig, Method } from "axios";
import { Artifact } from "hardhat/types";
import {
  AaveV1Adapter,
  AaveV1ETHGateway,
  AaveV2Adapter,
  AdminUpgradeabilityProxy,
  APROracle,
  CompoundAdapter,
  CompoundETHGateway,
  CurveDepositPoolAdapter,
  CurveSwapETHGateway,
  CurveSwapPoolAdapter,
  ERC20,
  HarvestCodeProvider,
  InitializableImmutableAdminUpgradeabilityProxy,
  InvestStrategyRegistry,
  Registry,
  RegistryProxy,
  RegistryV2,
  RiskManager,
  RiskManagerProxy,
  RiskManagerV2,
  StrategyManager,
  StrategyProvider,
  StrategyProviderV2,
  Vault,
  VaultV2,
  TestVaultV2,
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
    registryV2Artifact: Artifact;
    registryV2: RegistryV2;
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
    strategyProviderV2: StrategyProviderV2;
    riskManagerProxy: RiskManagerProxy;
    riskManager: RiskManager;
    riskManagerV2: RiskManagerV2;
    aprOracle: APROracle;
    strategyManager: StrategyManager;
    vault: Vault;
    vaultProxy: InitializableImmutableAdminUpgradeabilityProxy;
    opUSDCgrow: Vault;
    opUSDCgrowProxy: InitializableImmutableAdminUpgradeabilityProxy;
    opWETHgrow: Vault;
    opWETHgrowProxy: InitializableImmutableAdminUpgradeabilityProxy;
    vaultV2Artifact: Artifact;
    vaultV2: VaultV2;
    vaultProxyV2: AdminUpgradeabilityProxy;
    testVaultV2: TestVaultV2;
    opUSDCgrowV2: VaultV2;
    opWETHgrowV2: VaultV2;
    erc20: ERC20;
    usdc: ERC20;
  }
}

export function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function to_10powNumber_BN(decimals: BigNumberish): BigNumber {
  return BigNumber.from(10).pow(decimals);
}

export function createDir(_dirPath: string): void {
  if (!fs.existsSync(_dirPath)) {
    try {
      fs.mkdirSync(process.cwd() + _dirPath, { recursive: true });
    } catch (error) {
      console.error(`An error occurred: `, error);
    }
  }
}

export function createFile(filePath: string, fileContent: string | NodeJS.ArrayBufferView): void {
  try {
    fs.writeFileSync(filePath, fileContent);
  } catch (error) {
    console.error(`An error occurred: `, error);
  }
}

export function getMoralisConfig(
  method: Method,
  functionName: string,
  args: { [key: string]: any },
): AxiosRequestConfig {
  const BASE_DATA_OPTIONS = {
    _ApplicationId: process.env.MORALIS_APP_ID,
    _ClientVersion: "js0.0.120",
    _InstallationId: "a4e82bcc-1ef9-4379-a92f-59f2ecd557db",
  };
  const config = {
    method,
    url: `${process.env.MORALIS_SERVER_URL}/functions/${functionName}`,
    headers: {
      "Content-Type": "application/json",
    },
    data: JSON.stringify({
      ...args,
      ...BASE_DATA_OPTIONS,
    }),
  };

  return config;
}
