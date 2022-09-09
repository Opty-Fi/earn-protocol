// !! Important !!
// Please do not keep this file under helpers/utils as it imports hre from hardhat
import { BigNumber, BigNumberish, Contract, Signature } from "ethers";
import { getAddress, parseEther, splitSignature } from "ethers/lib/utils";
import hre, { ethers } from "hardhat";
import ethTokens from "@optyfi/defi-legos/ethereum/tokens/wrapped_tokens";
import polygonTokens from "@optyfi/defi-legos/polygon/tokens";
import avaxTokens from "@optyfi/defi-legos/avalanche/tokens";
import { StrategyStepType } from "../../helpers/type";
import { ERC20, IAdapterFull, IWETH, Registry, Vault, ERC20Permit } from "../../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";

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
}

export async function getDepositInternalTransactionCount(
  investStrategySteps: StrategyStepType[],
  registryContract: Registry,
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
    amountUT = await adapterInstance.getSomeAmountInToken(inputTokenAddress, poolAddress, outputTokenAmount);
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
  const adapterInstance = <IAdapterFull>(
    await hre.ethers.getContractAt("IAdapterFull", await registryContract.getLiquidityPoolToAdapter(lastStepPool))
  );
  if (await adapterInstance.canStake(lastStepPool)) {
    return await adapterInstance.getLiquidityPoolTokenBalanceStake(vault.address, lastStepPool);
  }
  if (investStrategySteps.length > 1) {
    return await adapterInstance.getLiquidityPoolTokenBalance(
      vault.address,
      investStrategySteps[investStrategySteps.length - 2].outputToken,
      lastStepPool,
    );
  }
  return await adapterInstance.getLiquidityPoolTokenBalance(vault.address, underlyingToken.address, lastStepPool);
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

const EIP712Domain = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

const ForwardRequest = [
  { name: "from", type: "address" },
  { name: "to", type: "address" },
  { name: "value", type: "uint256" },
  { name: "gas", type: "uint256" },
  { name: "nonce", type: "uint256" },
  { name: "data", type: "bytes" },
];

function getMetaTxTypeData(chainId: number, verifyingContract: string) {
  return {
    types: {
      EIP712Domain,
      ForwardRequest,
    },
    domain: {
      name: "MinimalForwarder",
      version: "0.0.1",
      chainId,
      verifyingContract,
    },
    primaryType: "ForwardRequest",
  };
}

async function signTypedData(signer: any, from: string, data: any) {
  const isHardhat = data.domain.chainId == 31337;
  const [method, argData] = isHardhat ? ["eth_signTypedData", data] : ["eth_signTypedData_v4", JSON.stringify(data)];
  return await signer.send(method, [from, argData]);
}

async function buildRequest(forwarder: Contract, input: any) {
  const nonce = (await forwarder.getNonce(input.from)).toString();
  return { value: 0, gas: 1e6, nonce, ...input };
}

async function buildTypedData(forwarder: Contract, request: any) {
  const chainId = (await forwarder.provider.getNetwork()).chainId;
  const typeData = getMetaTxTypeData(chainId, forwarder.address);
  return { ...typeData, message: request };
}

export async function signMetaTxRequest(signer: any, forwarder: Contract, input: any) {
  const request = await buildRequest(forwarder, input);
  const toSign = await buildTypedData(forwarder, request);
  const signature = signTypedData(signer, input.from, toSign);
  return { signature, request };
}
