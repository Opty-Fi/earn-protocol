// !! Important !!
// Please do not keep this file under helpers/utils as it is import hre from hardhat
import { BigNumber, BigNumberish } from "ethers";
import hre, { ethers } from "hardhat";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
import { StrategyStepType } from "../../helpers/type";
import { ERC20, IAdapterFull, RegistryV2, VaultV2 } from "../../typechain";
import { expect } from "chai";

const setStorageAt = (address: string, slot: string, val: string): Promise<any> =>
  hre.network.provider.send("hardhat_setStorageAt", [address, slot, val]);

const tokenBalancesSlot = async (token: ERC20) => {
  const val: string = "0x" + "12345".padStart(64, "0");
  const account: string = ethers.constants.AddressZero;

  for (let i = 0; i < 100; i++) {
    let slot = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["address", "uint256"], [account, i]));
    while (slot.startsWith("0x0")) slot = "0x" + slot.slice(3);

    const prev = await hre.network.provider.send("eth_getStorageAt", [account, slot, "latest"]);
    await setStorageAt(token.address, slot, val);
    const balance = await token.balanceOf(account);
    await setStorageAt(token.address, slot, prev);
    if (balance.eq(ethers.BigNumber.from(val))) {
      return { index: i, isVyper: false };
    }
  }

  for (let i = 0; i < 100; i++) {
    let slot = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["uint256", "address"], [i, account]));
    while (slot.startsWith("0x0")) slot = "0x" + slot.slice(3);

    const prev = await hre.network.provider.send("eth_getStorageAt", [account, slot, "latest"]);
    await setStorageAt(token.address, slot, val);
    const balance = await token.balanceOf(account);
    await setStorageAt(token.address, slot, prev);
    if (balance.eq(ethers.BigNumber.from(val))) {
      return { index: i, isVyper: true };
    }
  }
  throw "balances slot not found!";
};

// Source : https://github.com/Opty-Fi/defi-adapter-kit/blob/e41ab7607f737b9322b3d19d2144b0f94efc692d/test/utils.ts
export async function setTokenBalanceInStorage(token: ERC20, account: string, amount: string): Promise<number | void> {
  const balancesSlot = await tokenBalancesSlot(token);
  if (balancesSlot.isVyper) {
    return setStorageAt(
      token.address,
      ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["uint256", "address"], [balancesSlot.index, account]),
      ),
      "0x" +
        ethers.utils
          .parseUnits(amount, await token.decimals())
          .toHexString()
          .slice(2)
          .padStart(64, "0"),
    );
  } else {
    return setStorageAt(
      token.address,
      ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["address", "uint256"], [account, balancesSlot.index]),
      ),
      "0x" +
        ethers.utils
          .parseUnits(amount, await token.decimals())
          .toHexString()
          .slice(2)
          .padStart(64, "0"),
    );
  }
}

export async function getDepositInternalTransactionCount(
  investStrategySteps: StrategyStepType[],
  registryContract: RegistryV2,
): Promise<BigNumberish> {
  const strategyStepCount = BigNumber.from(investStrategySteps.length);
  const lastStepPool = investStrategySteps[strategyStepCount.sub("1").toNumber()].pool;
  const adapterInstance = <IAdapterFull>(
    await hre.ethers.getContractAt("IAdapterFull", await registryContract.getLiquidityPoolToAdapter(lastStepPool))
  );
  if (await adapterInstance.canStake(lastStepPool)) {
    return strategyStepCount.add("1");
  }
  return strategyStepCount;
}

export async function getOraValueUT(
  investStrategySteps: StrategyStepType[],
  registryContract: RegistryV2,
  vault: VaultV2,
  underlyingToken: ERC20,
): Promise<BigNumberish> {
  let outputTokenAmount = BigNumber.from("0");
  let amountUT = BigNumber.from("0");
  const strategyStepCount = BigNumber.from(investStrategySteps.length);
  investStrategySteps.forEach(async (_: StrategyStepType, index: number, investStrategySteps: StrategyStepType[]) => {
    const iterator = strategyStepCount.sub("1").sub(index);
    const poolAddress = investStrategySteps[iterator.toNumber()].pool;
    const adapterInstance = <IAdapterFull>(
      await hre.ethers.getContractAt("IAdapterFull", await registryContract.getLiquidityPoolToAdapter(poolAddress))
    );
    let inputTokenAddress = underlyingToken.address;
    if (!iterator.eq("0")) {
      inputTokenAddress = investStrategySteps[iterator.sub("1").toNumber()].outputToken;
    }
    if (iterator.eq(strategyStepCount.sub("1"))) {
      if (await adapterInstance.canStake(poolAddress)) {
        amountUT = await adapterInstance.getAllAmountInTokenStake(vault.address, inputTokenAddress, poolAddress);
      } else {
        amountUT = await adapterInstance.getAllAmountInToken(vault.address, inputTokenAddress, poolAddress);
      }
    } else {
      amountUT = await adapterInstance.getSomeAmountInToken(inputTokenAddress, poolAddress, outputTokenAmount);
    }
    outputTokenAmount = amountUT;
  });
  return amountUT;
}

export async function getLastStrategyStepBalanceLP(
  investStrategySteps: StrategyStepType[],
  registryContract: RegistryV2,
  vault: VaultV2,
  underlyingToken: ERC20,
): Promise<BigNumberish> {
  const strategyStepCount = BigNumber.from(investStrategySteps.length);
  const lastStepPool = investStrategySteps[strategyStepCount.sub("1").toNumber()].pool;
  const adapterInstance = <IAdapterFull>(
    await hre.ethers.getContractAt("IAdapterFull", await registryContract.getLiquidityPoolToAdapter(lastStepPool))
  );
  if (await adapterInstance.canStake(lastStepPool)) {
    return await adapterInstance.getLiquidityPoolTokenBalanceStake(vault.address, lastStepPool);
  }
  return await adapterInstance.getLiquidityPoolTokenBalance(vault.address, underlyingToken.address, lastStepPool);
}

export async function getOraSomeValueLP(
  investStrategySteps: StrategyStepType[],
  registryContract: RegistryV2,
  underlyingToken: ERC20,
  wantAmount: BigNumber,
): Promise<BigNumberish> {
  let amountLP = BigNumber.from("0");
  let index = 0;
  for (const investStrategyStep of investStrategySteps) {
    const poolAddress = investStrategyStep.pool;
    const adapterInstance = <IAdapterFull>(
      await hre.ethers.getContractAt("IAdapterFull", await registryContract.getLiquidityPoolToAdapter(poolAddress))
    );
    let inputToken = underlyingToken.address;
    if (index != 0) {
      inputToken = investStrategySteps[index - 1].outputToken;
    }
    amountLP = await adapterInstance.calculateAmountInLPToken(
      inputToken,
      poolAddress,
      index == 0 ? wantAmount : amountLP,
    );
    index++;
  }
  return amountLP;
}

function hashToken(account: string) {
  return Buffer.from(ethers.utils.solidityKeccak256(["address"], [account]).slice(2), "hex");
}

function hashCodehash(hash: string) {
  return Buffer.from(ethers.utils.solidityKeccak256(["bytes32"], [hash]).slice(2), "hex");
}

export function generateMerkleTree(addresses: string[]): MerkleTree {
  const leaves = addresses.map((addr: string) => hashToken(addr));
  return new MerkleTree(leaves, keccak256, { sortPairs: true });
}

export function generateMerkleTreeForCodehash(hashes: string[]): MerkleTree {
  const leaves = hashes.map((hash: string) => hashCodehash(hash));
  return new MerkleTree(leaves, keccak256, { sortPairs: true });
}

export const getProof = (tree: MerkleTree, address: string): string[] => {
  return tree.getHexProof(hashToken(address));
};

export const getProofForCode = (tree: MerkleTree, codeHash: string): string[] => {
  return tree.getHexProof(hashCodehash(codeHash));
};

export const getAccountsMerkleRoot = (goodAddresses: string[]): string => {
  const tree: MerkleTree = generateMerkleTree(goodAddresses);
  return tree.getHexRoot();
};

export const getAccountsMerkleProof = (goodAddresses: string[], address: string): string[] => {
  const tree: MerkleTree = generateMerkleTree(goodAddresses);
  return getProof(tree, address);
};

export const getCodesMerkleRoot = (goodCodehashes: string[]): string => {
  const tree: MerkleTree = generateMerkleTreeForCodehash(goodCodehashes);
  return tree.getHexRoot();
};

export const getCodesMerkleProof = (goodCodehashes: string[], codehash: string): string[] => {
  const tree: MerkleTree = generateMerkleTree(goodCodehashes);
  return getProofForCode(tree, codehash);
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
