import { TOKENS } from "./constants";
import { Contract, Signer, BigNumber } from "ethers";
import { CONTRACTS, STRATEGY_DATA } from "./type";
import { TypedAdapterStrategies } from "./data";
import { executeFunc } from "./helpers";
import { getSoliditySHA3Hash, amountInHex } from "./utils";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import exchange from "./data/exchange.json";
import tokenAddresses from "./data/TokenAddresses.json";

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
      await executeFunc(registryContract, owner, "approveLiquidityPools(address[])", [liquidityPools]);
    }
    if (liquidityPoolsMapToAdapters.length > 0) {
      await executeFunc(registryContract, owner, "setLiquidityPoolsToAdapters((address,address)[])", [
        liquidityPoolsMapToAdapters,
      ]);
    }
    if (creditPools.length > 0) {
      await executeFunc(registryContract, owner, "approveCreditPools(address[])", [creditPools]);
    }
  } catch (error) {
    console.log(`Got error when executing approveLiquidityPoolAndMapAdapters : ${error}`);
  }
}

export async function approveTokens(owner: Signer, registryContract: Contract): Promise<void> {
  const tokenAddresses: string[] = [];
  for (const token in TOKENS) {
    tokenAddresses.push(TOKENS[token]);
  }
  try {
    if (tokenAddresses.length > 0) {
      await executeFunc(registryContract, owner, "approveTokens(address[])", [tokenAddresses]);
      await executeFunc(registryContract, owner, "setMultipleTokensHashToTokens(address[][])", [
        tokenAddresses.map(addr => [addr]),
      ]);
    }
  } catch (error) {
    console.log(`Got error when executing approveTokens : ${error}`);
  }
}

export async function setBestBasicStrategy(
  strategy: STRATEGY_DATA[],
  tokensHash: string,
  registry: Contract,
  strategyProvider: Contract,
  riskProfile: string,
): Promise<void> {
  const strategySteps: [string, string, boolean][] = [];
  const strategyStepsHash: string[] = [];
  for (let index = 0; index < strategy.length; index++) {
    const tempArr: [string, string, boolean] = [
      strategy[index].contract,
      strategy[index].outputToken,
      strategy[index].isBorrow,
    ];
    strategyStepsHash[index] = getSoliditySHA3Hash(
      ["address", "address", "bool"],
      [strategy[index].contract, strategy[index].outputToken, strategy[index].isBorrow],
    );
    strategySteps.push(tempArr);
  }

  const strategies = await registry["setStrategy(bytes32,(address,address,bool)[])"](tokensHash, strategySteps);
  const strategyReceipt = await strategies.wait();
  const strategyHash = strategyReceipt.events[0].args[2];
  await strategyProvider.setBestStrategy(riskProfile, tokensHash, strategyHash);
  return strategyHash;
}

export async function fundWalletToken(
  hre: HardhatRuntimeEnvironment,
  tokenAddress: string,
  wallet: Signer,
  fundAmount: BigNumber,
  deadlineTimestamp: number,
): Promise<void> {
  const amount = amountInHex(fundAmount);
  const uniswapInstance = new hre.ethers.Contract(exchange.uniswap.address, exchange.uniswap.abi, wallet);
  const ETH_VALUE_GAS_OVERIDE_OPTIONS = {
    value: hre.ethers.utils.hexlify(hre.ethers.utils.parseEther("9500")),
    gasLimit: 6721975,
  };
  const address = await wallet.getAddress();
  await uniswapInstance.swapETHForExactTokens(
    amount,
    [tokenAddresses.underlyingTokens.weth, tokenAddress],
    address,
    deadlineTimestamp,
    ETH_VALUE_GAS_OVERIDE_OPTIONS,
  );
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
    const ERC20Instance = await hre.ethers.getContractAt(
      "ERC20",
      tokenAddresses.underlyingTokens[<keyof typeof tokenAddresses.underlyingTokens>tokenName.toLowerCase()],
    );
    const name: string = await ERC20Instance.name();
    return name;
  }
}

export async function getTokenSymbol(hre: HardhatRuntimeEnvironment, tokenName: string): Promise<string> {
  if (tokenName.toLowerCase() == "mkr") {
    return "MKR";
  } else {
    const ERC20Instance = await hre.ethers.getContractAt(
      "ERC20",
      tokenAddresses.underlyingTokens[<keyof typeof tokenAddresses.underlyingTokens>tokenName.toLowerCase()],
    );
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
