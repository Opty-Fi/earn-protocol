// !! Important !!
// Please do not keep this file under helpers/utils as it imports hre from hardhat
import { BigNumber, BigNumberish, Contract, Signature, Signer } from "ethers";
import { getAddress, parseEther, splitSignature } from "ethers/lib/utils";
import hre, { ethers } from "hardhat";
import ethTokens from "@optyfi/defi-legos/ethereum/tokens/wrapped_tokens";
import polygonTokens from "@optyfi/defi-legos/polygon/tokens";
import avaxTokens from "@optyfi/defi-legos/avalanche/tokens";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { StrategyStepType } from "../../helpers/type";
import {
  ERC20,
  IAdapterFull,
  IWETH,
  Registry,
  ERC20Permit,
  RelayHub__factory,
  RelayRegistrar__factory,
} from "../../typechain";
import { fundWalletToken, getBlockTimestamp } from "../../helpers/contracts-actions";
import { StakeManager, TokenGasCalculator, RelayHub, TestToken, RelayRegistrar } from "../../typechain";
import { deployContract } from "../../helpers/helpers";
import { PrefixedHexString } from "ethereumjs-util";
import { GasUsedEvent } from "../../typechain/TokenGasCalculator";
import {
  Environment,
  IntString,
  RelayHubConfiguration,
  constants,
  ForwardRequest,
  RelayData,
  RelayRequest,
  defaultEnvironment,
  splitRelayUrlForRegistrar,
  TypedRequestData,
} from "@opengsn/common";
import { defaultGsnConfig } from "@opengsn/provider";

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

const RelayRequest = [
  { name: "from", type: "address" },
  { name: "to", type: "address" },
  { name: "value", type: "uint256" },
  { name: "gas", type: "uint256" },
  { name: "nonce", type: "uint256" },
  { name: "data", type: "bytes" },
  { name: "validUntilTime", type: "uint256" },
];

const RelayData = [
  { name: "maxFeePerGas", type: "uint256" },
  { name: "maxPriorityFeePerGas", type: "uint256" },
  { name: "transactionCalldataGasUsed", type: "uint256" },
  { name: "relayWorker", type: "address" },
  { name: "paymaster", type: "address" },
  { name: "forwarder", type: "address" },
  { name: "paymasterData", type: "bytes" },
  { name: "clientId", type: "uint256" },
];

function getMetaTxTypeData(chainId: number, verifyingContract: string) {
  return {
    types: {
      EIP712Domain,
      RelayRequest,
      RelayData,
    },
    domain: {
      name: "GSN Relayed Transaction",
      version: 3,
      chainId,
      verifyingContract,
    },
    primaryType: "RelayRequest",
  };
}

export async function signTypedData(signer: any, from: string, data: any) {
  const isHardhat = data.domain.chainId == 31337;
  const [method, argData] = isHardhat ? ["eth_signTypedData", data] : ["eth_signTypedData_v4", JSON.stringify(data)];
  return await signer.send(method, [from, argData]);
}

export async function buildRequest(forwarder: Contract, input: any) {
  const nonce = (await forwarder.getNonce(input.from)).toString();
  return { value: 0, gas: 1e6, nonce, validUntilTime: ethers.constants.MaxUint256, ...input };
}

export async function buildTypedData(forwarder: Contract, request: any) {
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

export async function revertReason(func: Promise<any>): Promise<string> {
  try {
    await func;
    return "ok"; // no revert
  } catch (e: any) {
    return e.message.replace(/.*reverted with reason string /, "");
  }
}

export async function registerAsRelayServer(
  token: ERC20Permit,
  stakeManager: StakeManager,
  relay: SignerWithAddress,
  relayOwner: SignerWithAddress,
  stake: string,
  hub: RelayHub,
): Promise<void> {
  await stakeManager.connect(relay).setRelayManagerOwner(relayOwner.address);
  await stakeManager
    .connect(relayOwner)
    .stakeForRelayManager(token.address, relay.address, 7 * 24 * 3600, stake.toString());
  await stakeManager.connect(relayOwner).authorizeHubByOwner(relay.address, hub.address);
  await hub.setMinimumStakes([token.address], [stake]);
  await hub.connect(relay).addRelayWorkers([relay.address]);
  const relayRegistrar = <RelayRegistrar>(
    await hre.ethers.getContractAt("RelayRegistrar", await hub.getRelayRegistrar())
  );
  await relayRegistrar.connect(relay).registerRelayServer(hub.address, splitRelayUrlForRegistrar("url"));
}

export async function deployTestHub(calculator: boolean = false, signer: Signer): Promise<Contract> {
  const contract = calculator ? "TokenGasCalculator" : "TestHub";
  return deployContract(hre, contract, false, signer, [
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    defaultEnvironment.relayHubConfiguration,
  ]);
}

export function mergeRelayRequest(
  req: RelayRequest,
  overrideData: Partial<RelayData>,
  overrideRequest: Partial<ForwardRequest> = {},
): RelayRequest {
  return {
    relayData: { ...req.relayData, ...overrideData },
    request: { ...req.request, ...overrideRequest },
  };
}

export async function calculatePostGas(
  token: any,
  paymaster: any,
  paymasterData: string,
  account: Signer,
  tokenAmount: BigNumber,
  context: PrefixedHexString,
): Promise<BigNumber> {
  const calc = (await deployTestHub(true, account)) as TokenGasCalculator;
  await paymaster.connect(account).setRelayHub(calc.address);
  await token.connect(account).transfer(paymaster.address, tokenAmount);
  const res = await calc.calculatePostGas(paymaster.address, context, paymasterData);
  const receipt = await res.wait();
  const event = receipt.events?.find(it => it.event === "GasUsed") as unknown as GasUsedEvent;
  return event.args.gasUsedByPost;
}

export async function deployHub(
  stakeManager: string,
  penalizer: string,
  batchGateway: string,
  testToken: string,
  testTokenMinimumStake: IntString,
  signer: Signer,
  configOverride: Partial<RelayHubConfiguration> = {},
  environment: Environment = defaultEnvironment,
  relayRegistrationMaxAge = constants.yearInSec,
): Promise<RelayHub> {
  const relayHubConfiguration: RelayHubConfiguration = {
    ...environment.relayHubConfiguration,
    ...configOverride,
  };
  const relayRegistrar = await new RelayRegistrar__factory(signer).deploy(relayRegistrationMaxAge);
  const hub: RelayHub = await new RelayHub__factory(signer).deploy(
    stakeManager,
    penalizer,
    batchGateway,
    relayRegistrar.address,
    relayHubConfiguration,
  );

  await hub.connect(signer).setMinimumStakes([testToken], [testTokenMinimumStake]);

  // @ts-ignore
  hub._secretRegistrarInstance = relayRegistrar;
  return hub;
}
