import { TOKENS, RISK_PROFILES, TOKEN_HOLDERS } from "./constants";
import { Contract, Signer, BigNumber } from "ethers";
import { CONTRACTS, STRATEGY_DATA } from "./type";
import { TypedAdapterStrategies, TypedTokens } from "./data";
import { executeFunc, generateStrategyStep, generateTokenHash, getEthValueGasOverrideOptions } from "./helpers";
import { amountInHex, removeDuplicateFromStringArray } from "./utils";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import exchange from "./data/exchange.json";
import { expect } from "chai";
import { getAddress } from "ethers/lib/utils";
import Compound from "@compound-finance/compound-js";
import { Provider } from "@compound-finance/compound-js/dist/nodejs/types";

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
  tokens: string[],
  vaultStepInvestStrategyDefinitionRegistry: Contract,
): Promise<string> {
  const strategySteps: [string, string, boolean][] = generateStrategyStep(strategy);
  const tokensHash = generateTokenHash(tokens);
  const strategies = await vaultStepInvestStrategyDefinitionRegistry["setStrategy(bytes32,(address,address,bool)[])"](
    tokensHash,
    strategySteps,
  );
  const strategyReceipt = await strategies.wait();
  return strategyReceipt.events[0].args[1];
}

export async function setBestBasicStrategy(
  strategy: STRATEGY_DATA[],
  tokens: string[],
  vaultStepInvestStrategyDefinitionRegistry: Contract,
  strategyProvider: Contract,
  riskProfile: string,
): Promise<string> {
  const tokensHash = generateTokenHash(tokens);
  const strategyHash = await setStrategy(strategy, tokens, vaultStepInvestStrategyDefinitionRegistry);
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
  } else if (getAddress(tokenAddress) == getAddress(TypedTokens.YETH)) {
    const yEthInstance = await hre.ethers.getContractAt(exchange.yweth.abi, exchange.yweth.address);
    //  Funding user's wallet with WETH tokens
    await yEthInstance.connect(wallet).depositETH({ value: amount });
    const balance = await yEthInstance.balanceOf(await wallet.getAddress());
    await yEthInstance.transfer(address, balance);
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
    const tokenHolder = Object.keys(TOKEN_HOLDERS).filter(
      holder => getAddress(TypedTokens[holder]) === getAddress(tokenAddress),
    );
    if (tokenHolder.length > 0) {
      await fundWalletFromImpersonatedAccount(hre, tokenAddress, TOKEN_HOLDERS[tokenHolder[0]], fundAmount, address);
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
}

export async function fundWalletFromImpersonatedAccount(
  hre: HardhatRuntimeEnvironment,
  tokenAddress: string,
  impersonatedAccountAddr: string,
  fundAmount: BigNumber,
  toAddress: string,
): Promise<void> {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [impersonatedAccountAddr],
  });
  const impersonatedAccount = await hre.ethers.getSigner(impersonatedAccountAddr);
  const erc20Instance = await hre.ethers.getContractAt("ERC20", tokenAddress);
  const balance = await erc20Instance.balanceOf(impersonatedAccountAddr);
  if (+balance >= +fundAmount) {
    await erc20Instance.connect(impersonatedAccount).transfer(toAddress, fundAmount);
  } else {
    throw new Error("not enough amount");
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

export async function addRiskProfiles(owner: Signer, registry: Contract): Promise<void> {
  const profiles = Object.keys(RISK_PROFILES);
  for (let i = 0; i < profiles.length; i++) {
    const profile = await registry.getRiskProfile(RISK_PROFILES[profiles[i]].name);
    if (!profile.exists) {
      await executeFunc(registry, owner, "addRiskProfile(string,bool,(uint8,uint8))", [
        RISK_PROFILES[profiles[i]].name,
        RISK_PROFILES[profiles[i]].canBorrow,
        RISK_PROFILES[profiles[i]].poolRating,
      ]);
    }
  }
}

//  Function to check if cToken/crToken Pool is paused or not.
//  @dev: SAI,REP = Mint is paused for cSAI, cREP
//  @dev: WBTC has mint paused for latest blockNumbers, However WBTC2 works fine with the latest blockNumber (For Compound)
export async function lpPausedStatus(
  hre: HardhatRuntimeEnvironment,
  pool: string,
  comptrollerAddress: string,
): Promise<boolean> {
  return await executeComptrollerFunc(hre, comptrollerAddress, "function mintGuardianPaused(address) returns (bool)", [
    pool,
  ]);
}

export async function executeComptrollerFunc(
  hre: HardhatRuntimeEnvironment,
  comptrollerAddress: string,
  functionSignature: string,
  params: any[],
) {
  return await Compound.eth.read(comptrollerAddress, functionSignature, [...params], {
    provider: <Provider>(<unknown>hre.network.provider),
  });
}
