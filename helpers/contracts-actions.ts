import { TOKENS, MAPPING_CURVE_DEPOSIT_DATA, MAPPING_CURVE_SWAP_DATA } from "./constants";
import { Contract, Signer, BigNumber } from "ethers";
import { CONTRACTS, STRATEGY_DATA } from "./type";
import {
  TypedAdapterStrategies,
  TypedTokens,
  TypedCurveDepositPools,
  TypedCurveDepositPoolGauges,
  TypedCurveSwapPools,
} from "./data";
import { executeFunc, generateStrategyStep, getEthValueGasOverrideOptions } from "./helpers";
import { amountInHex, removeDuplicateFromStringArray } from "./utils";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import exchange from "./data/exchange.json";
import { expect } from "chai";
import { getAddress } from "ethers/lib/utils";

export async function approveLiquidityPoolAndMapAdapter(
  owner: Signer,
  registryContract: Contract,
  adapter: string,
  lqPool: string,
): Promise<void> {
  await executeFunc(registryContract, owner, "approveLiquidityPool(address)", [lqPool]);
  await executeFunc(registryContract, owner, "setLiquidityPoolToAdapter(address,address)", [lqPool, adapter]);
}

export async function approveLiquidityPoolAndMapAdapters(
  owner: Signer,
  registryContract: Contract,
  adapters: CONTRACTS,
): Promise<void> {
  const liquidityPools: string[] = [];
  const liquidityPoolsMapToAdapters: [string, string][] = [];
  const creditPools: string[] = [];
  for (const adapter in adapters) {
    if (TypedAdapterStrategies[adapter]) {
      for (const strategy of TypedAdapterStrategies[adapter]) {
        for (const pool of strategy.strategy) {
          if (pool.isBorrow) {
            creditPools.push(pool.contract);
          } else {
            liquidityPools.push(pool.contract);
            liquidityPoolsMapToAdapters.push([pool.contract, adapters[adapter].address]);
          }
        }
      }
    }
  }
  try {
    if (liquidityPools.length > 0) {
      await executeFunc(registryContract, owner, "approveLiquidityPool(address[])", [
        removeDuplicateFromStringArray(liquidityPools),
      ]);
    }
    if (liquidityPoolsMapToAdapters.length > 0) {
      await executeFunc(registryContract, owner, "setLiquidityPoolToAdapter((address,address)[])", [
        liquidityPoolsMapToAdapters,
      ]);
    }
    if (creditPools.length > 0) {
      await executeFunc(registryContract, owner, "approveCreditPool(address[])", [creditPools]);
    }
  } catch (error) {
    console.log(`Got error when executing approveLiquidityPoolAndMapAdapters : ${error}`);
  }
}

export async function approveToken(owner: Signer, registryContract: Contract, tokenAddresses: string[]): Promise<void> {
  if (tokenAddresses.length > 0) {
    await executeFunc(registryContract, owner, "approveToken(address[])", [tokenAddresses]);
    await executeFunc(registryContract, owner, "setTokensHashToTokens(address[][])", [
      tokenAddresses.map(addr => [addr]),
    ]);
  }
}

export async function approveTokens(owner: Signer, registryContract: Contract): Promise<void> {
  const tokenAddresses: string[] = [];
  for (const token in TOKENS) {
    tokenAddresses.push(TOKENS[token]);
  }
  try {
    await approveToken(owner, registryContract, tokenAddresses);
  } catch (error) {
    console.log(`Got error when executing approveTokens : ${error}`);
  }
}

export async function setAndApproveVaultRewardToken(
  owner: Signer,
  vaultContractAddress: string,
  rewardTokenAddress: string,
  registryContract: Contract,
): Promise<void> {
  try {
    if (vaultContractAddress.length > 0 && rewardTokenAddress.length > 0) {
      await executeFunc(registryContract, owner, "approveToken(address[])", [
        [vaultContractAddress, rewardTokenAddress],
      ]);
      await executeFunc(registryContract, owner, "setTokensHashToTokens(address[])", [
        [vaultContractAddress, rewardTokenAddress],
      ]);
    }
  } catch (error) {
    console.log(`Got error when executing approveTokens for vault and reward tokens : ${error}`);
  }
}

export async function setStrategy(
  strategy: STRATEGY_DATA[],
  tokensHash: string,
  vaultStepInvestStrategyDefinitionRegistry: Contract,
): Promise<string> {
  const strategySteps: [string, string, boolean][] = generateStrategyStep(strategy);

  const strategies = await vaultStepInvestStrategyDefinitionRegistry["setStrategy(bytes32,(address,address,bool)[])"](
    tokensHash,
    strategySteps,
  );
  const strategyReceipt = await strategies.wait();
  return strategyReceipt.events[0].args[1];
}

export async function setBestBasicStrategy(
  strategy: STRATEGY_DATA[],
  tokensHash: string,
  vaultStepInvestStrategyDefinitionRegistry: Contract,
  strategyProvider: Contract,
  riskProfile: string,
): Promise<string> {
  const strategyHash = await setStrategy(strategy, tokensHash, vaultStepInvestStrategyDefinitionRegistry);
  await strategyProvider.setBestStrategy(riskProfile, tokensHash, strategyHash);
  const strategyProviderStrategy = await strategyProvider.rpToTokenToBestStrategy(riskProfile, tokensHash);
  expect(strategyProviderStrategy).to.equal(strategyHash);
  return strategyHash;
}

export async function fundWalletToken(
  hre: HardhatRuntimeEnvironment,
  tokenAddress: string,
  wallet: Signer,
  fundAmount: BigNumber,
  deadlineTimestamp: number,
  toAddress?: string,
): Promise<void> {
  const amount = amountInHex(fundAmount);
  const address = toAddress == null ? await wallet.getAddress() : toAddress;

  if (getAddress(tokenAddress) == getAddress(TypedTokens.WETH)) {
    const wEthInstance = await hre.ethers.getContractAt(exchange.weth.abi, exchange.weth.address);
    //  Funding user's wallet with WETH tokens
    await wEthInstance.deposit({ value: amount });
    await wEthInstance.transfer(address, amount);
  } else if (getAddress(tokenAddress) == getAddress(TypedTokens["SLP_WETH_USDC"])) {
    const sushiswapInstance = new hre.ethers.Contract(exchange.sushiswap.address, exchange.uniswap.abi, wallet);
    const USDCInstance = await hre.ethers.getContractAt("ERC20", TypedTokens["USDC"]);
    await sushiswapInstance.swapExactETHForTokens(
      1,
      [TypedTokens["WETH"], TypedTokens["USDC"]],
      address,
      deadlineTimestamp,
      getEthValueGasOverrideOptions(hre, "500"),
    );
    await USDCInstance.connect(wallet).approve(exchange.sushiswap.address, await USDCInstance.balanceOf(address));
    await sushiswapInstance.addLiquidityETH(
      TypedTokens["USDC"],
      await USDCInstance.balanceOf(address),
      0,
      0,
      address,
      deadlineTimestamp,
      getEthValueGasOverrideOptions(hre, "500"),
    );
  } else {
    const uniswapInstance = new hre.ethers.Contract(exchange.uniswap.address, exchange.uniswap.abi, wallet);
    await uniswapInstance.swapETHForExactTokens(
      amount,
      [TypedTokens["WETH"], tokenAddress],
      address,
      deadlineTimestamp,
      getEthValueGasOverrideOptions(hre, "9500"),
    );
  }
}

export async function getBlockTimestamp(hre: HardhatRuntimeEnvironment): Promise<number> {
  const blockNumber = await hre.ethers.provider.getBlockNumber();
  const block = await hre.ethers.provider.getBlock(blockNumber);
  const timestamp = block.timestamp;
  return timestamp;
}

export async function getTokenName(hre: HardhatRuntimeEnvironment, tokenName: string): Promise<string> {
  if (tokenName.toLowerCase() == "mkr") {
    return "Maker";
  } else {
    const ERC20Instance = await hre.ethers.getContractAt("ERC20", TypedTokens[tokenName.toUpperCase()]);
    const name: string = await ERC20Instance.name();
    return name;
  }
}

export async function getTokenSymbol(hre: HardhatRuntimeEnvironment, tokenName: string): Promise<string> {
  if (tokenName.toLowerCase() == "mkr") {
    return "MKR";
  } else {
    const ERC20Instance = await hre.ethers.getContractAt("ERC20", TypedTokens[tokenName.toUpperCase()]);
    const symbol = await ERC20Instance.symbol();
    return symbol;
  }
}

export async function getTokenInforWithAddress(
  hre: HardhatRuntimeEnvironment,
  address: string,
): Promise<{ name: string; symbol: string }> {
  const ERC20Instance = await hre.ethers.getContractAt("ERC20", address);
  const symbol = await ERC20Instance.symbol();
  const name: string = await ERC20Instance.name();
  return { name, symbol };
}

export async function unpauseVault(
  owner: Signer,
  registryContract: Contract,
  vaultAddr: string,
  unpaused: boolean,
): Promise<void> {
  await executeFunc(registryContract, owner, "unpauseVaultContract(address,bool)", [vaultAddr, unpaused]);
}

export async function insertDataCurveDeposit(owner: Signer, curveDeposit: Contract): Promise<void> {
  for (let i = 0; i < MAPPING_CURVE_DEPOSIT_DATA.length; i++) {
    const data = MAPPING_CURVE_DEPOSIT_DATA[i];
    try {
      await executeFunc(curveDeposit, owner, "setLiquidityPoolToUnderlyingTokens(address,address[])", [
        TypedCurveDepositPools[data.lp],
        data.tokens.map(token => TypedTokens[token]),
      ]);

      await executeFunc(curveDeposit, owner, "setLiquidityPoolToSwap(address,address)", [
        TypedCurveDepositPools[data.lp],
        TypedCurveSwapPools[data.swap],
      ]);

      if (TypedCurveDepositPoolGauges[data.gauges]) {
        await executeFunc(curveDeposit, owner, "setLiquidityPoolToGauges(address,address)", [
          TypedCurveDepositPools[data.lp],
          TypedCurveDepositPoolGauges[data.gauges],
        ]);
      }
    } catch (error) {
      console.log("Got error in insertDataCurveDeposit() ", error);
    }
  }
}

export async function insertDataCurveSwap(owner: Signer, curveSwap: Contract): Promise<void> {
  for (let i = 0; i < MAPPING_CURVE_SWAP_DATA.length; i++) {
    const data = MAPPING_CURVE_SWAP_DATA[i];
    try {
      await executeFunc(curveSwap, owner, "setSwapPoolToLiquidityPoolToken(address,address)", [
        TypedCurveSwapPools[data.swap],
        TypedTokens[data.lpToken],
      ]);

      await executeFunc(curveSwap, owner, "setSwapPoolToUnderlyingTokens(address,address[])", [
        TypedCurveSwapPools[data.swap],
        data.tokens.map(token => TypedTokens[token]),
      ]);

      if (TypedCurveDepositPoolGauges[data.gauges]) {
        await executeFunc(curveSwap, owner, "setSwapPoolToGauges(address,address)", [
          TypedCurveSwapPools[data.swap],
          TypedCurveDepositPoolGauges[data.gauges],
        ]);
      }
    } catch (error) {
      console.log("Got error in insertDataCurveSwap() ", error);
    }
  }
}
