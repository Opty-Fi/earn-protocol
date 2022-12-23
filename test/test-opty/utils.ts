// !! Important !!
// Please do not keep this file under helpers/utils as it imports hre from hardhat
import { BigNumber, BigNumberish, Contract, Signature } from "ethers";
import { getAddress, parseEther, splitSignature } from "ethers/lib/utils";
import hre, { ethers } from "hardhat";
import ethTokens from "@optyfi/defi-legos/ethereum/tokens/wrapped_tokens";
import polygonTokens from "@optyfi/defi-legos/polygon/tokens";
import avaxTokens from "@optyfi/defi-legos/avalanche/tokens";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { StrategyStepType } from "../../helpers/type";
import { ERC20, IAdapterFull, IWETH, Registry, ERC20Permit, Vault } from "../../typechain";
import { fundWalletToken, getBlockTimestamp } from "../../helpers/contracts-actions";
import { RegistryV1 } from "../../helpers/types/registryV1";
import { StrategyManager } from "../../helpers/strategy-manager";

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
export async function setTokenBalanceInStorage(
  token: ERC20,
  account: string,
  amount: string,
): Promise<number | void | BigNumber> {
  try {
    if (
      [getAddress(ethTokens.WETH), getAddress(polygonTokens.WMATIC), getAddress(avaxTokens.WAVAX)].includes(
        getAddress(token.address),
      )
    ) {
      const weth = <IWETH>(
        await ethers.getContractAt("@uniswap/v2-periphery/contracts/interfaces/IWETH.sol:IWETH", token.address)
      );
      await weth.deposit({ value: parseEther(amount) });
      await weth.transfer(account, parseEther(amount));
    } else {
      const balancesSlot = await tokenBalancesSlot(token);
      if (balancesSlot.isVyper) {
        return setStorageAt(
          token.address,
          ethers.utils
            .keccak256(ethers.utils.defaultAbiCoder.encode(["uint256", "address"], [balancesSlot.index, account]))
            .replace("0x0", "0x"),
          "0x" +
            ethers.utils
              .parseUnits(amount, await token.decimals())
              .toHexString()
              .slice(2)
              .padStart(64, "0"),
        );
      } else {
        let slot = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(["address", "uint256"], [account, balancesSlot.index]),
        );
        if (slot.startsWith("0x0")) {
          slot = slot.replace("0x0", "0x");
        }
        return setStorageAt(
          token.address,
          slot.replace("0x0", "0x"),
          "0x" +
            ethers.utils
              .parseUnits(amount, await token.decimals())
              .toHexString()
              .slice(2)
              .padStart(64, "0"),
        );
      }
    }
  } catch (e) {
    if (e === "balances slot not found!") {
      const timestamp = (await getBlockTimestamp(hre)) * 2;
      return await await fundWalletToken(
        hre,
        token.address,
        await ethers.getSigner((await hre.ethers.getSigners())[0].address),
        ethers.utils.parseUnits(amount, await token.decimals()),
        timestamp,
        account,
      );
    } else {
      throw e;
    }
  }
}

export async function getDepositInternalTransactionCount(
  investStrategySteps: StrategyStepType[],
  registryContract: Registry,
): Promise<BigNumberish> {
  const strategyStepCount = BigNumber.from(investStrategySteps.length);
  const lastStepPool = investStrategySteps[strategyStepCount.sub("1").toNumber()].pool;
  const isSwap = investStrategySteps[strategyStepCount.sub("1").toNumber()].isSwap;
  const adapterInstance = isSwap
    ? <IAdapterFull>(
        await hre.ethers.getContractAt("IAdapterFull", await registryContract.getSwapPoolToAdapter(lastStepPool))
      )
    : <IAdapterFull>(
        await hre.ethers.getContractAt("IAdapterFull", await registryContract.getLiquidityPoolToAdapter(lastStepPool))
      );
  if (await adapterInstance.canStake(lastStepPool)) {
    return strategyStepCount.add("1");
  }
  return strategyStepCount;
}

export async function getOraValueUT(
  investStrategySteps: StrategyStepType[],
  registryContract: Registry,
  vault: Contract,
  underlyingToken: ERC20,
): Promise<BigNumberish> {
  let outputTokenAmount = BigNumber.from("0");
  let amountUT = BigNumber.from("0");
  const strategyStepCount = BigNumber.from(investStrategySteps.length);
  let index = 0;
  for (const _ of investStrategySteps) {
    const iterator = strategyStepCount.sub("1").sub(index);
    const poolAddress = investStrategySteps[iterator.toNumber()].pool;
    const isSwap = investStrategySteps[iterator.toNumber()].isSwap;
    const adapterInstance = isSwap
      ? <IAdapterFull>(
          await hre.ethers.getContractAt("IAdapterFull", await registryContract.getSwapPoolToAdapter(poolAddress))
        )
      : <IAdapterFull>(
          await hre.ethers.getContractAt("IAdapterFull", await registryContract.getLiquidityPoolToAdapter(poolAddress))
        );
    let inputTokenAddress = underlyingToken.address;
    const outputToken = investStrategySteps[iterator.toNumber()].outputToken;
    if (!iterator.eq("0")) {
      inputTokenAddress = investStrategySteps[iterator.sub("1").toNumber()].outputToken;
    }
    if (iterator.eq(strategyStepCount.sub("1"))) {
      if (await adapterInstance.canStake(poolAddress)) {
        amountUT = await adapterInstance.getAllAmountInTokenStake(vault.address, inputTokenAddress, poolAddress);
      } else {
        amountUT = isSwap
          ? await adapterInstance["getAllAmountInToken(address,address,address,address)"](
              vault.address,
              inputTokenAddress,
              poolAddress,
              outputToken,
            )
          : await adapterInstance["getAllAmountInToken(address,address,address)"](
              vault.address,
              inputTokenAddress,
              poolAddress,
            );
      }
    } else {
      amountUT = isSwap
        ? await adapterInstance["getSomeAmountInToken(address,address,address,uint256)"](
            inputTokenAddress,
            poolAddress,
            outputToken,
            outputTokenAmount,
          )
        : await adapterInstance["getSomeAmountInToken(address,address,uint256)"](
            inputTokenAddress,
            poolAddress,
            outputTokenAmount,
          );
    }
    index++;
    outputTokenAmount = amountUT;
  }
  return amountUT;
}

export async function getOraValueUTOld(
  investStrategySteps: {
    pool: string;
    outputToken: string;
    isBorrow: boolean;
  }[],
  registryContract: RegistryV1,
  vault: Contract,
  underlyingToken: ERC20,
): Promise<BigNumberish> {
  let outputTokenAmount = BigNumber.from("0");
  let amountUT = BigNumber.from("0");
  const strategyStepCount = BigNumber.from(investStrategySteps.length);
  let index = 0;
  for (const _ of investStrategySteps) {
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
        amountUT = await adapterInstance["getAllAmountInToken(address,address,address)"](
          vault.address,
          inputTokenAddress,
          poolAddress,
        );
      }
    } else {
      amountUT = await adapterInstance["getSomeAmountInToken(address,address,uint256)"](
        inputTokenAddress,
        poolAddress,
        outputTokenAmount,
      );
    }
    index++;
    outputTokenAmount = amountUT;
  }
  return amountUT;
}

export async function getOraSomeValueUT(
  investStrategySteps: StrategyStepType[],
  registryContract: Registry,
  underlyingToken: ERC20,
  lpTokenAmount: BigNumberish,
): Promise<BigNumberish> {
  let outputTokenAmount = lpTokenAmount;
  let amountUT = BigNumber.from("0");
  const strategyStepCount = BigNumber.from(investStrategySteps.length);
  let index = 0;
  for (const _ of investStrategySteps) {
    const iterator = strategyStepCount.sub("1").sub(index);
    const poolAddress = investStrategySteps[iterator.toNumber()].pool;
    const adapterInstance = <IAdapterFull>(
      await hre.ethers.getContractAt("IAdapterFull", await registryContract.getLiquidityPoolToAdapter(poolAddress))
    );
    let inputTokenAddress = underlyingToken.address;
    if (!iterator.eq("0")) {
      inputTokenAddress = investStrategySteps[iterator.sub("1").toNumber()].outputToken;
    }
    amountUT = await adapterInstance["getSomeAmountInToken(address,address,uint256)"](
      inputTokenAddress,
      poolAddress,
      outputTokenAmount,
    );
    index++;
    outputTokenAmount = amountUT;
  }
  return amountUT;
}

export async function getLastStrategyStepBalanceLP(
  investStrategySteps: StrategyStepType[],
  registryContract: Registry,
  vault: Contract,
  underlyingToken: ERC20,
): Promise<BigNumberish> {
  const strategyStepCount = BigNumber.from(investStrategySteps.length);
  const lastStepPool = investStrategySteps[strategyStepCount.sub("1").toNumber()].pool;
  const isSwap = investStrategySteps[strategyStepCount.sub("1").toNumber()].isSwap;
  const outputToken = investStrategySteps[strategyStepCount.sub("1").toNumber()].outputToken;
  const adapterInstance = isSwap
    ? <IAdapterFull>(
        await hre.ethers.getContractAt("IAdapterFull", await registryContract.getSwapPoolToAdapter(lastStepPool))
      )
    : <IAdapterFull>(
        await hre.ethers.getContractAt("IAdapterFull", await registryContract.getLiquidityPoolToAdapter(lastStepPool))
      );
  if (await adapterInstance.canStake(lastStepPool)) {
    return await adapterInstance.getLiquidityPoolTokenBalanceStake(vault.address, lastStepPool);
  }
  if (investStrategySteps.length > 1) {
    return isSwap
      ? await adapterInstance["getLiquidityPoolTokenBalance(address,address,address,address)"](
          vault.address,
          investStrategySteps[investStrategySteps.length - 2].outputToken,
          lastStepPool,
          outputToken,
        )
      : await adapterInstance["getLiquidityPoolTokenBalance(address,address,address)"](
          vault.address,
          investStrategySteps[investStrategySteps.length - 2].outputToken,
          lastStepPool,
        );
  }
  return isSwap
    ? await adapterInstance["getLiquidityPoolTokenBalance(address,address,address,address)"](
        vault.address,
        underlyingToken.address,
        lastStepPool,
        outputToken,
      )
    : await adapterInstance["getLiquidityPoolTokenBalance(address,address,address)"](
        vault.address,
        underlyingToken.address,
        lastStepPool,
      );
}

export async function getLastStrategyStepBalanceLPOld(
  investStrategySteps: {
    pool: string;
    outputToken: string;
    isBorrow: boolean;
  }[],
  registryContract: RegistryV1,
  vault: Contract,
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
  if (investStrategySteps.length > 1) {
    return await adapterInstance["getLiquidityPoolTokenBalance(address,address,address)"](
      vault.address,
      investStrategySteps[investStrategySteps.length - 2].outputToken,
      lastStepPool,
    );
  }
  return await adapterInstance["getLiquidityPoolTokenBalance(address,address,address)"](
    vault.address,
    underlyingToken.address,
    lastStepPool,
  );
}

export async function getOraSomeValueLP(
  investStrategySteps: StrategyStepType[],
  registryContract: Registry,
  underlyingToken: ERC20,
  wantAmount: BigNumber,
): Promise<BigNumberish> {
  let amountLP = BigNumber.from("0");
  let index = 0;
  for (const investStrategyStep of investStrategySteps) {
    const poolAddress = investStrategyStep.pool;
    const isSwap = investStrategyStep.isSwap;
    const outputToken = investStrategyStep.outputToken;
    const adapterInstance = isSwap
      ? <IAdapterFull>(
          await hre.ethers.getContractAt("IAdapterFull", await registryContract.getSwapPoolToAdapter(poolAddress))
        )
      : <IAdapterFull>(
          await hre.ethers.getContractAt("IAdapterFull", await registryContract.getLiquidityPoolToAdapter(poolAddress))
        );
    let inputToken = underlyingToken.address;
    if (index != 0) {
      inputToken = investStrategySteps[index - 1].outputToken;
    }
    amountLP = isSwap
      ? await adapterInstance["calculateAmountInLPToken(address,address,address,uint256)"](
          inputToken,
          poolAddress,
          outputToken,
          index == 0 ? wantAmount : amountLP,
        )
      : await adapterInstance["calculateAmountInLPToken(address,address,uint256)"](
          inputToken,
          poolAddress,
          index == 0 ? wantAmount : amountLP,
        );
    index++;
  }
  return amountLP;
}

export async function getPermitSignature(
  signer: SignerWithAddress,
  token: ERC20Permit,
  spender: string,
  value: BigNumber,
  deadline: BigNumber,
  permitConfig?: { nonce?: BigNumber; name?: string; chainId?: number; version?: string },
): Promise<Signature> {
  const [nonce, name, version, chainId] = await Promise.all([
    permitConfig?.nonce ?? token.nonces(signer.address),
    permitConfig?.name ?? token.name(),
    permitConfig?.version ?? "1",
    permitConfig?.chainId ?? signer.getChainId(),
  ]);

  return splitSignature(
    await signer._signTypedData(
      {
        name,
        version,
        chainId,
        verifyingContract: token.address,
      },
      {
        Permit: [
          {
            name: "owner",
            type: "address",
          },
          {
            name: "spender",
            type: "address",
          },
          {
            name: "value",
            type: "uint256",
          },
          {
            name: "nonce",
            type: "uint256",
          },
          {
            name: "deadline",
            type: "uint256",
          },
        ],
      },
      {
        owner: signer.address,
        spender,
        value,
        nonce,
        deadline,
      },
    ),
  );
}

export async function getPermitLegacySignature(
  signer: SignerWithAddress,
  token: ERC20Permit,
  spender: string,
  expiry: BigNumber,
  permitConfig?: { nonce?: BigNumber; name?: string; chainId?: number; version?: string },
): Promise<Signature> {
  const [nonce, name, version, chainId] = await Promise.all([
    permitConfig?.nonce ?? token.nonces(signer.address),
    permitConfig?.name ?? token.name(),
    permitConfig?.version ?? "1",
    permitConfig?.chainId ?? signer.getChainId(),
  ]);

  return splitSignature(
    await signer._signTypedData(
      {
        name,
        version,
        chainId,
        verifyingContract: token.address,
      },
      {
        Permit: [
          {
            name: "holder",
            type: "address",
          },
          {
            name: "spender",
            type: "address",
          },
          {
            name: "nonce",
            type: "uint256",
          },
          {
            name: "expiry",
            type: "uint256",
          },
          {
            name: "allowed",
            type: "bool",
          },
        ],
      },
      {
        holder: signer.address,
        spender,
        nonce,
        expiry,
        allowed: true,
      },
    ),
  );
}

export async function getPreActionState(
  signer: SignerWithAddress,
  underlyingTokenInstance: ERC20,
  vaultInstance: Vault,
  strategyManager: StrategyManager,
  steps: StrategyStepType[],
): Promise<{
  userBalanceBeforeUT: BigNumber;
  userBalanceBeforeVT: BigNumber;
  vaultTotalSupplyBeforeVT: BigNumber;
  vaultValueBeforeUT: BigNumber;
  vaultBalanceBeforeLP: BigNumber;
  vaultBalanceBeforeUT: BigNumber;
}> {
  const userBalanceBeforeUT = await underlyingTokenInstance.balanceOf(signer.address);
  const userBalanceBeforeVT = await vaultInstance.balanceOf(signer.address);
  const vaultBalanceBeforeUT = await underlyingTokenInstance.balanceOf(vaultInstance.address);
  const vaultBalanceBeforeLP = await strategyManager.liquidityPoolToAdapter[
    steps[steps.length - 1].pool
  ].getOutputTokenBalance(
    vaultInstance,
    steps.length === 1 ? underlyingTokenInstance.address : steps[steps.length - 2].outputToken,
    steps[steps.length - 1].pool,
    steps[steps.length - 1].outputToken,
    steps[steps.length - 1].isSwap,
    ethers.provider,
  );
  const vaultTotalSupplyBeforeVT = await vaultInstance.totalSupply();
  const vaultValueBeforeUT = (
    await strategyManager.getValueInInputToken(
      underlyingTokenInstance.address,
      steps,
      vaultInstance,
      vaultBalanceBeforeLP,
      ethers.provider,
    )
  ).add(vaultBalanceBeforeUT);

  return {
    userBalanceBeforeUT,
    userBalanceBeforeVT,
    vaultTotalSupplyBeforeVT,
    vaultValueBeforeUT,
    vaultBalanceBeforeLP,
    vaultBalanceBeforeUT,
  };
}
