import abi from "ethereumjs-abi";
import { BigNumber, BigNumberish } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import fs from "fs";
import { AxiosRequestConfig, Method } from "axios";
import { Artifact } from "hardhat/types";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { ethers } from "ethers";
import {
  AaveV1Adapter,
  AaveV1ETHGateway,
  AaveV2Adapter,
  AdminUpgradeabilityProxy,
  CompoundAdapter,
  CompoundETHGateway,
  CurveDepositPoolAdapter,
  CurveSwapETHGateway,
  CurveSwapPoolAdapter,
  ERC20,
  HarvestCodeProvider,
  ERC20Permit,
  InitializableImmutableAdminUpgradeabilityProxy,
  Registry,
  RegistryProxy,
  RiskManager,
  StrategyProvider,
  TestVault,
  Vault,
  TestStrategyManager,
  UniswapV2ExchangeAdapter,
  CurveExchangeAdapter,
  StrategyRegistry,
} from "../typechain";
import { VaultV3 } from "./types/vaultv3";
import { expect } from "chai";
import { RegistryProxyV1, RegistryV1 } from "./types/registryV1";
import { StrategyProviderV1 } from "./types/strategyProviderv1";
import { VaultV5 } from "./types/vaultv5/VaultV5";
import { VaultV6 } from "./types/vaultv6";
import { RiskManagerProxyV1 } from "./types/riskManagerv1";
import { RegistryV2 } from "./types/registryV2/RegistryV2";
import { RiskManagerV2 } from "./types/riskManagerv2";
import { StrategyManager } from "./strategy-manager";
import { VaultHelper } from "../typechain/VaultHelper";
import { StrategyStepType } from "./type";
import { JsonRpcProvider } from "@ethersproject/providers";
import { parseEther, parseUnits } from "ethers/lib/utils";

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
    registryV1: RegistryV1;
    registryV2: RegistryV2;
    registryArtifact: Artifact;
    registryProxy: RegistryProxy;
    registryProxyV1: RegistryProxyV1;
    harvestCodeProvider: HarvestCodeProvider;
    compoundAdapter: CompoundAdapter;
    compoundEthGateway: CompoundETHGateway;
    aavev1Adapter: AaveV1Adapter;
    aaveV1EthGateway: AaveV1ETHGateway;
    aaveV2Adapter: AaveV2Adapter;
    curveDepositPoolAdapter: CurveDepositPoolAdapter;
    curveSwapPoolAdapter: CurveSwapPoolAdapter;
    curveSwapEthGateway: CurveSwapETHGateway;
    // strategyProvider: StrategyProvider;
    strategyRegistry: StrategyRegistry;
    strategyManager: StrategyManager;
    strategyProviderV1: StrategyProviderV1;
    riskManagerProxy: RiskManagerProxyV1;
    riskManager: RiskManager;
    riskManagerV2: RiskManagerV2;
    vault: Vault;
    vaultProxy: InitializableImmutableAdminUpgradeabilityProxy;
    vaultHelper: VaultHelper;
    opUSDCearn: Vault;
    opUSDCearnProxy: InitializableImmutableAdminUpgradeabilityProxy;
    opWETHearn: Vault;
    opWETHearnProxy: InitializableImmutableAdminUpgradeabilityProxy;
    vaultArtifact: Artifact;
    vaultProxyV2: AdminUpgradeabilityProxy;
    testVaultArtifact: Artifact;
    testVault: TestVault;
    erc20: ERC20;
    token: ERC20;
    usdc: ERC20Permit;
    weth: ERC20;
    vaults: { [key: string]: { [name: string]: Vault } };
    vaultsV6: { [key: string]: { [name: string]: VaultV6 } };
    vaultsV5: { [key: string]: { [name: string]: VaultV5 } };
    vaultsV5Obj: {
      [key: string]: {
        [name: string]: {
          instance: VaultV5;
          registryContract: string;
          pendingDeposits: BigNumber;
          totalDeposits: BigNumber;
          blockToBlockVaultValues: {
            actualVaultValue: BigNumber;
            blockMinVaultValue: BigNumber;
            blockMaxVaultValue: BigNumber;
          }[];
          investStrategyHash: string;
          userDepositCap: BigNumber;
          minimumDepositValueUT: BigNumber;
          vaultConfiguration: BigNumber;
          underlyingToken: string;
          whitelistedAccountsRoot: string;
          totalValueLockedLimitUT: BigNumber;
          domainSeparator: string;
          underlyingTokensHash: string;
          investStrategySteps: { pool: string; outputToken: string; isBorrow: boolean }[];
        };
      };
    };
    vaultsV3: {
      [key: string]: {
        [name: string]: {
          instance: VaultV3;
          registryContract: string;
          pendingDeposits: BigNumber;
          totalDeposits: BigNumber;
          blockToBlockVaultValues: {
            actualVaultValue: BigNumber;
            blockMinVaultValue: BigNumber;
            blockMaxVaultValue: BigNumber;
          }[];
          investStrategyHash: string;
          userDepositCap: BigNumber;
          minimumDepositValueUT: BigNumber;
          vaultConfiguration: BigNumber;
          underlyingToken: string;
          whitelistedAccountsRoot: string;
          totalValueLockedLimitUT: BigNumber;
          whitelistedCodesRoot: string;
          underlyingTokensHash: string;
          investStrategySteps: { pool: string; outputToken: string; isBorrow: boolean }[];
        };
      };
    };
    tokens: { [key: string]: ERC20 };
    testStrategyManager: TestStrategyManager;
    sushiswapExchangeAdapter: UniswapV2ExchangeAdapter;
    curveExchangeAdapter: CurveExchangeAdapter;
    registryV1Obj: {
      instance: RegistryV1;
      governance: string;
      financeOperator: string;
      riskOperator: string;
      strategyOperator: string;
      operator: string;
      treasury: string;
      optyDistributor: string;
      pendingGovernance: string;
      registryImplementation: string;
      pendingRegistryImplementation: string;
      tokens: boolean;
      tokensHashIndexByHash: BigNumber;
      tokensHashToTokenList: string[];
      liquidityPools: { rating: number; isLiquidityPool: boolean };
      creditPools: { rating: number; isLiquidityPool: boolean };
      liquidityPoolToAdapter: string;
      riskProfiles: {
        index: BigNumber;
        canBorrow: boolean;
        poolRatingsRange: [number, number] & {
          lowerLimit: number;
          upperLimit: number;
        };
        exists: boolean;
        name: string;
        symbol: string;
      };
      vaultToVaultConfiguration: {
        discontinued: boolean;
        unpaused: boolean;
        isLimitedState: boolean;
        allowWhitelistedState: boolean;
        withdrawalFee: BigNumber;
        userDepositCap: BigNumber;
        minimumDepositAmount: BigNumber;
        totalValueLockedLimitInUnderlying: BigNumber;
        queueCap: BigNumber;
      };
      whitelistedUsers: boolean;
      withdrawalFeeRange: {
        lowerLimit: BigNumber;
        upperLimit: BigNumber;
      };
      tokensHashIndexes: string;
      riskProfilesArray: BigNumber;
      strategyProvider: string;
      investStrategyRegistry: string;
      riskManager: string;
      harvestCodeProvider: string;
      strategyManager: string;
      opty: string;
      aprOracle: string;
      optyStakingRateBalancer: string;
      odefiVaultBooster: string;
      swapPoolToAdapter: string;
    };
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

export function waitforme(milisec: number): Promise<string> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve("");
    }, milisec);
  });
}

function hashToken(account: string) {
  return Buffer.from(ethers.utils.solidityKeccak256(["address"], [account]).slice(2), "hex");
}

export function generateMerkleTree(addresses: string[]): MerkleTree {
  const leaves = addresses.map((addr: string) => hashToken(addr));
  return new MerkleTree(leaves, keccak256, { sortPairs: true });
}

export const getProof = (tree: MerkleTree, address: string): string[] => {
  return tree.getHexProof(hashToken(address));
};

export const getAccountsMerkleRoot = (goodAddresses: string[]): string => {
  const tree: MerkleTree = generateMerkleTree(goodAddresses);
  return tree.getHexRoot();
};

export const getAccountsMerkleProof = (goodAddresses: string[], address: string): string[] => {
  const tree: MerkleTree = generateMerkleTree(goodAddresses);
  return getProof(tree, address);
};

export function assertVaultConfiguration(
  vaultConfigurationV2: BigNumber | string,
  expectedDepositFeeUT: BigNumber | string,
  expectedDepositFeePct: BigNumber | string,
  expectedWithdrawalFeeUT: BigNumber | string,
  expectedWithdrawalFeePct: BigNumber | string,
  expectedMaxVaultValueJump: BigNumber | string,
  expectedVaultFeeCollector: string,
  expectedRiskProfileCode: BigNumber | string,
  expectedEmergencyShutdown: boolean,
  expectedUnpause: boolean,
  expectedAllowWhitelistedState: boolean,
): void {
  expect(getDepositFeeUT(vaultConfigurationV2)).to.eq(expectedDepositFeeUT);
  expect(getDepositFeePct(vaultConfigurationV2)).to.eq(expectedDepositFeePct);
  expect(getWithdrawalFeeUT(vaultConfigurationV2)).to.eq(expectedWithdrawalFeeUT);
  expect(getWithdrawalFeePct(vaultConfigurationV2)).to.eq(expectedWithdrawalFeePct);
  expect(getMaxVaultValueJump(vaultConfigurationV2)).to.eq(expectedMaxVaultValueJump);
  expect(ethers.utils.getAddress(getVaultFeeCollectorAddress(vaultConfigurationV2))).to.eq(
    ethers.utils.getAddress(expectedVaultFeeCollector),
  );
  expect(getRiskProfileCode(vaultConfigurationV2)).to.eq(expectedRiskProfileCode);
  expect(getEmergencyShutdown(vaultConfigurationV2)).to.eq(expectedEmergencyShutdown);
  expect(getUnpause(vaultConfigurationV2)).to.eq(expectedUnpause);
  expect(getAllowWhitelistState(vaultConfigurationV2)).to.eq(expectedAllowWhitelistedState);
}

export async function assertPostUserDepositState(
  signer: SignerWithAddress,
  underlyingTokenInstance: ERC20,
  vaultInstance: Vault,
  strategyManager: StrategyManager,
  steps: StrategyStepType[],
  provider: JsonRpcProvider,
  userBalanceBeforeUT: BigNumber,
  _userDepositInDecimals: BigNumber,
  vaultTotalSupplyBeforeVT: BigNumber,
  vaultValueBeforeUT: BigNumber,
  userBalanceBeforeVT: BigNumber,
): Promise<void> {
  const userBalanceAfterUT = await underlyingTokenInstance.balanceOf(signer.address);
  const userBalanceAfterVT = await vaultInstance.balanceOf(signer.address);
  const vaultBalanceAfterUT = await underlyingTokenInstance.balanceOf(vaultInstance.address);
  const vaultBalanceAfterLP = await strategyManager.liquidityPoolToAdapter[
    steps[steps.length - 1].pool
  ].getOutputTokenBalance(
    vaultInstance,
    steps.length === 1 ? underlyingTokenInstance.address : steps[steps.length - 2].outputToken,
    steps[steps.length - 1].pool,
    steps[steps.length - 1].outputToken,
    steps[steps.length - 1].isSwap,
    provider,
  );
  const ppsAfter = await vaultInstance.getPricePerFullShare();
  const vaultTotalSupplyAfterVT = await vaultInstance.totalSupply();
  const expectedUserBalanceUT = userBalanceBeforeUT.sub(_userDepositInDecimals);
  let expectedUserVT: BigNumber = BigNumber.from(0);
  if (vaultTotalSupplyBeforeVT.eq(0) || vaultValueBeforeUT.eq(0)) {
    expectedUserVT = _userDepositInDecimals;
  } else {
    expectedUserVT = _userDepositInDecimals.mul(vaultTotalSupplyBeforeVT).div(vaultValueBeforeUT);
  }
  const actualUserMintedVT = userBalanceAfterVT.sub(userBalanceBeforeVT);
  const expectedTotalSupplyVT = vaultTotalSupplyBeforeVT.add(expectedUserVT);
  const expectedPPS = expectedTotalSupplyVT.eq("0")
    ? BigNumber.from("0")
    : (
        await strategyManager.getValueInInputToken(
          underlyingTokenInstance.address,
          steps,
          vaultInstance,
          vaultBalanceAfterLP,
          provider,
        )
      )
        .add(vaultBalanceAfterUT)
        .mul(parseEther("1"))
        .div(expectedTotalSupplyVT);

  expect(userBalanceBeforeUT).gt(userBalanceAfterUT);
  expect(userBalanceAfterUT).to.eq(expectedUserBalanceUT);
  expect(actualUserMintedVT).to.closeTo(
    expectedUserVT,
    parseUnits("9", (await vaultInstance.decimals()) / 2).toNumber(),
  );
  expect(vaultTotalSupplyAfterVT).to.closeTo(
    expectedTotalSupplyVT,
    parseUnits("9", (await vaultInstance.decimals()) / 2).toNumber(),
  );
  expect(ppsAfter).to.closeTo(expectedPPS, parseUnits("9", 9).toNumber());
}

export function getDepositFeeUT(vaultConfigurationV2: BigNumber | string): BigNumber {
  return BigNumber.from(BigInt(vaultConfigurationV2.toString()) & BigInt(65535));
}

export function getDepositFeePct(vaultConfigurationV2: BigNumber | string): BigNumber {
  return BigNumber.from((BigInt(vaultConfigurationV2.toString()) >> BigInt(16)) & BigInt(65535));
}

export function getWithdrawalFeeUT(vaultConfigurationV2: BigNumber | string): BigNumber {
  return BigNumber.from((BigInt(vaultConfigurationV2.toString()) >> BigInt(32)) & BigInt(65535));
}

export function getWithdrawalFeePct(vaultConfigurationV2: BigNumber | string): BigNumber {
  return BigNumber.from((BigInt(vaultConfigurationV2.toString()) >> BigInt(48)) & BigInt(65535));
}

export function getMaxVaultValueJump(vaultConfigurationV2: BigNumber | string): BigNumber {
  return BigNumber.from((BigInt(vaultConfigurationV2.toString()) >> BigInt(64)) & BigInt(65535));
}

export function getVaultFeeCollectorAddress(vaultConfigurationV2: BigNumber | string): string {
  return `0x${ethers.utils.hexlify(BigInt(vaultConfigurationV2.toString()) >> BigInt(80)).slice(-40)}`;
}

export function getRiskProfileCode(vaultConfigurationV2: BigNumber | string): BigNumber {
  return BigNumber.from(`0x${ethers.utils.hexlify(BigInt(vaultConfigurationV2.toString()) >> BigInt(240)).slice(-2)}`);
}

export function getEmergencyShutdown(vaultConfigurationV2: BigNumber | string): boolean {
  return (BigInt(vaultConfigurationV2.toString()) & (BigInt(1) << BigInt(248))) != BigInt(0);
}

export function getUnpause(vaultConfigurationV2: BigNumber | string): boolean {
  return (BigInt(vaultConfigurationV2.toString()) & (BigInt(1) << BigInt(249))) != BigInt(0);
}

export function getAllowWhitelistState(vaultConfigurationV2: BigNumber | string): boolean {
  return (BigInt(vaultConfigurationV2.toString()) & (BigInt(1) << BigInt(250))) != BigInt(0);
}
