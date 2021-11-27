import { Contract, Signer, BigNumber } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getAddress } from "ethers/lib/utils";
import Compound from "@compound-finance/compound-js";
import { expect } from "chai";
import { Provider } from "@compound-finance/compound-js/dist/nodejs/types";
import { STRATEGY_DATA } from "./type";
import { TypedCurveTokens, TypedMultiAssetTokens, TypedTokens, TypedTokenHolders, TypedContracts } from "./data";
import {
  executeFunc,
  generateStrategyHash,
  generateStrategyStep,
  generateTokenHash,
  getEthValueGasOverrideOptions,
  isAddress,
} from "./helpers";
import { amountInHex } from "./utils";
import { TypedEOA } from "./data";
import { RISK_PROFILES } from "./constants/contracts-data";

export async function approveLiquidityPoolAndMapAdapter(
  owner: Signer,
  registryContract: Contract,
  adapter: string,
  lqPool: string,
): Promise<void> {
  const { isLiquidityPool } = await registryContract.getLiquidityPool(lqPool);
  if (!isLiquidityPool) {
    try {
      await expect(registryContract.connect(owner)["approveLiquidityPool(address)"](lqPool))
        .to.emit(registryContract, "LogLiquidityPool")
        .withArgs(getAddress(lqPool), true, await owner.getAddress());
      await expect(registryContract.connect(owner)["setLiquidityPoolToAdapter(address,address)"](lqPool, adapter))
        .to.emit(registryContract, "LogLiquidityPoolToAdapter")
        .withArgs(getAddress(lqPool), adapter, await owner.getAddress());
    } catch (error) {
      console.error(`contract-actions#approveLiquidityPoolAndMapAdapter: `, error);
      throw error;
    }
  }
}

export async function approveLiquidityPoolAndMapAdapters(
  owner: Signer,
  registryContract: Contract,
  lqPools: string[],
  lqPoolsMapToAdapter: string[][],
): Promise<void> {
  try {
    const approveLpList: string[] = [];
    for (let i = 0; i < lqPools.length; i++) {
      const { isLiquidityPool } = await registryContract.getLiquidityPool(lqPools[i]);
      if (!isLiquidityPool) {
        approveLpList.push(lqPools[i]);
      }
    }
    if (approveLpList.length > 0) {
      await executeFunc(registryContract, owner, "approveLiquidityPool(address[])", [approveLpList]);
    }
    await executeFunc(registryContract, owner, "setLiquidityPoolToAdapter((address,address)[])", [lqPoolsMapToAdapter]);
  } catch (error) {
    console.error(`contracts-actions#approveLiquidityPoolAndMapAdapters: `, error);
    throw error;
  }
}

export async function approveAndSetTokenHashToToken(
  owner: Signer,
  registryContract: Contract,
  tokenAddress: string,
): Promise<void> {
  try {
    const isApprovedToken = await registryContract.isApprovedToken(tokenAddress);
    if (!isApprovedToken) {
      await expect(executeFunc(registryContract, owner, "approveToken(address)", [tokenAddress]))
        .to.emit(registryContract, "LogToken")
        .withArgs(getAddress(tokenAddress), true, await owner.getAddress());
    }
    if (!(await isSetTokenHash(registryContract, [tokenAddress]))) {
      await executeFunc(registryContract, owner, "setTokensHashToTokens(address[])", [[tokenAddress]]);
    }
  } catch (error) {
    console.error(`contract-actions#approveAndSetTokenHashToToken : `, error);
    throw error;
  }
}

export async function approveAndSetTokenHashToTokens(
  owner: Signer,
  registryContract: Contract,
  tokenAddresses: string[],
  setTokenHashForEach: boolean,
): Promise<void> {
  try {
    const approveTokenLists: string[] = [];
    const setTokenHashLists: string[] = [];
    for (const tokenAddress of tokenAddresses) {
      const isApprovedToken = await registryContract.isApprovedToken(tokenAddress);
      if (!isApprovedToken) {
        approveTokenLists.push(tokenAddress);
      }
      if (setTokenHashForEach) {
        if (!(await isSetTokenHash(registryContract, [tokenAddress]))) {
          setTokenHashLists.push(tokenAddress);
        }
      }
    }
    if (approveTokenLists.length > 0) {
      await executeFunc(registryContract, owner, "approveToken(address[])", [approveTokenLists]);
    }
    if (setTokenHashLists.length > 0) {
      await executeFunc(registryContract, owner, "setTokensHashToTokens(address[][])", [
        setTokenHashLists.map(addr => [addr]),
      ]);
    } else {
      if (!(await isSetTokenHash(registryContract, tokenAddresses))) {
        await executeFunc(registryContract, owner, "setTokensHashToTokens(address[][])", [[tokenAddresses]]);
      }
    }
  } catch (error) {
    console.error(`contract-actions#approveAndSetTokenHashToTokens: `, error);
    throw error;
  }
}

export async function setStrategy(
  strategy: STRATEGY_DATA[],
  signer: Signer,
  tokens: string[],
  investStrategyRegistry: Contract,
): Promise<string> {
  const strategySteps: [string, string, boolean][] = generateStrategyStep(strategy);
  const tokensHash = generateTokenHash(tokens);
  const strategyHash = generateStrategyHash(strategy, tokens[0]);
  await expect(
    investStrategyRegistry.connect(signer)["setStrategy(bytes32,(address,address,bool)[])"](tokensHash, strategySteps),
  )
    .to.emit(investStrategyRegistry, "LogSetVaultInvestStrategy")
    .withArgs(tokensHash, strategyHash, await signer.getAddress());
  return strategyHash;
}

export async function setBestStrategy(
  strategy: STRATEGY_DATA[],
  signer: Signer,
  tokenAddress: string,
  investStrategyRegistry: Contract,
  strategyProvider: Contract,
  riskProfileCode: number,
  isDefault: boolean,
): Promise<string> {
  const strategyHash = generateStrategyHash(strategy, tokenAddress);

  const tokenHash = generateTokenHash([tokenAddress]);

  const strategyDetail = await investStrategyRegistry.getStrategy(strategyHash);

  if (strategyDetail[1].length === 0) {
    await setStrategy(strategy, signer, [tokenAddress], investStrategyRegistry);
  }

  if (isDefault) {
    await strategyProvider.setBestDefaultStrategy(riskProfileCode, tokenHash, strategyHash);
  } else {
    await strategyProvider.setBestStrategy(riskProfileCode, tokenHash, strategyHash);
  }
  return strategyHash;
}

export async function fundWalletToken(
  hre: HardhatRuntimeEnvironment,
  tokenAddress: string,
  wallet: Signer,
  fundAmount: BigNumber,
  deadlineTimestamp: number,
  toAddress?: string,
): Promise<BigNumber> {
  const amount = amountInHex(fundAmount);
  const address = toAddress === undefined ? await wallet.getAddress() : toAddress;
  const ValidatedPairTokens = Object.values(TypedMultiAssetTokens).map(({ address }) => getAddress(address));
  const ValidatedCurveTokens = Object.values(TypedCurveTokens).map(({ address }) => getAddress(address));
  const uniswapV2Router02Instance = await hre.ethers.getContractAt(
    "IUniswapV2Router02",
    TypedContracts.UNISWAPV2_ROUTER,
  );
  const sushiswapRouterInstance = await hre.ethers.getContractAt("IUniswapV2Router02", TypedContracts.SUSHISWAP_ROUTER);
  const tokenInstance = await hre.ethers.getContractAt("ERC20", tokenAddress);
  const walletAddress = await wallet.getAddress();
  try {
    if (ValidatedPairTokens.includes(getAddress(tokenAddress))) {
      const pairInstance = await hre.ethers.getContractAt("IUniswapV2Pair", tokenAddress);
      const pairSymbol = await pairInstance.symbol();
      if (["SLP", "UNI-V2"].includes(pairSymbol)) {
        const TOKEN0 = await pairInstance.token0();
        const TOKEN1 = await pairInstance.token1();
        let token0Path: string[] = [],
          token1Path: string[] = [];
        for (let i = 0; i < Object.values(TypedMultiAssetTokens).length; i++) {
          const value = Object.values(TypedMultiAssetTokens)[i];
          if (getAddress(value.address) === getAddress(tokenAddress)) {
            if (value.path0) {
              token0Path.push(getAddress(TypedTokens[value.path0[0]]));
            }
            if (value.path1) {
              token1Path.push(getAddress(TypedTokens[value.path1[0]]));
            }
            if (token0Path.length > 0 || getAddress(TOKEN0) !== getAddress(TypedTokens["WETH"])) {
              token0Path = [TypedTokens["WETH"], ...token0Path, getAddress(TOKEN0)];
            }
            if (token1Path.length > 0 || getAddress(TOKEN1) !== getAddress(TypedTokens["WETH"])) {
              token1Path = [TypedTokens["WETH"], ...token1Path, getAddress(TOKEN1)];
            }
          }
        }
        const routerInstance = await hre.ethers.getContractAt(
          "IUniswapV2Router02",
          pairSymbol === "SLP" ? TypedContracts.SUSHISWAP_ROUTER : TypedContracts.UNISWAP_V2_ROUTER,
        );

        if (getAddress(TOKEN1) === getAddress(TypedTokens["WETH"])) {
          await transferSLPOrUNI(
            hre,
            routerInstance,
            pairInstance,
            [{ path: token0Path, address: TOKEN0 }],
            wallet,
            deadlineTimestamp,
            address,
          );
        } else if (getAddress(TOKEN0) === getAddress(TypedTokens["WETH"])) {
          await transferSLPOrUNI(
            hre,
            routerInstance,
            pairInstance,
            [{ path: token1Path, address: TOKEN1 }],
            wallet,
            deadlineTimestamp,
            address,
          );
        } else {
          await transferSLPOrUNI(
            hre,
            routerInstance,
            pairInstance,
            [
              { path: token0Path, address: TOKEN0 },
              { path: token1Path, address: TOKEN1 },
            ],
            wallet,
            deadlineTimestamp,
            address,
          );
        }
      }
    } else if (ValidatedCurveTokens.includes(getAddress(tokenAddress))) {
      const curveToken = Object.values(TypedCurveTokens).find(
        ({ address }) => getAddress(tokenAddress) === getAddress(address),
      );
      if (curveToken) {
        const pool = curveToken.pool;
        const swap = curveToken?.swap;
        const old = curveToken?.old;
        const curveRegistryInstance = await hre.ethers.getContractAt("ICurveRegistry", TypedContracts.CURVE_REGISTRY);
        const tokenAddressInstance = await hre.ethers.getContractAt("ERC20", tokenAddress);
        const instance = await hre.ethers.getContractAt(swap ? "ICurveSwap" : "ICurveDeposit", pool);
        const coin = swap
          ? await instance.coins(0)
          : old
          ? await instance.underlying_coins(0)
          : await instance.base_coins(0);
        const coinInstance = await hre.ethers.getContractAt("ERC20", coin);
        await uniswapV2Router02Instance
          .connect(wallet)
          .swapExactETHForTokens(
            1,
            [TypedTokens["WETH"], coin],
            walletAddress,
            deadlineTimestamp,
            getEthValueGasOverrideOptions(hre, "9500"),
          );

        await coinInstance.connect(wallet).approve(pool, await coinInstance.balanceOf(walletAddress));
        const N_COINS = (
          await curveRegistryInstance.get_n_coins(swap ? pool : old ? await instance.curve() : await instance.pool())
        )[1];

        if (N_COINS.toString() === "2") {
          await instance
            .connect(wallet)
            ["add_liquidity(uint256[2],uint256)"]([await coinInstance.balanceOf(walletAddress), "0"], "1");
          await tokenAddressInstance.connect(wallet).transfer(address, amount);
        } else if (N_COINS.toString() === "3") {
          await instance
            .connect(wallet)
            ["add_liquidity(uint256[3],uint256)"]([await coinInstance.balanceOf(walletAddress), "0", "0"], 1);
          await tokenAddressInstance.connect(wallet).transfer(address, amount);
        } else if (N_COINS.toString() === "4") {
          if (old) {
            await instance
              .connect(wallet)
              ["add_liquidity(uint256[4],uint256)"]([await coinInstance.balanceOf(walletAddress), 0, 0, 0], 1);
            await tokenAddressInstance.connect(wallet).transfer(address, amount);
          } else {
            await instance
              .connect(wallet)
              ["add_liquidity(uint256[4],uint256)"]([0, await coinInstance.balanceOf(walletAddress), 0, 0], 1);
            await tokenAddressInstance.connect(wallet).transfer(address, amount);
          }
        } else if (getAddress(coin) === getAddress(TypedTokens.ETH)) {
          await instance
            .connect(wallet)
            ["add_liquidity(uint256[2],uint256)"](["9500", "0"], "1", getEthValueGasOverrideOptions(hre, "9500"));
          await tokenAddressInstance
            .connect(wallet)
            .transfer(address, await tokenAddressInstance.balanceOf(walletAddress));
        }
      }
    } else if (getAddress(tokenAddress) === getAddress(TypedTokens["WETH"])) {
      const wEthInstance = await hre.ethers.getContractAt("IWETH", TypedTokens["WETH"]);
      //  Funding user's wallet with WETH tokens
      await wEthInstance.deposit({ value: amount });
      await wEthInstance.transfer(address, amount);
    } else if (getAddress(tokenAddress) === getAddress(TypedTokens["YWETH"])) {
      const yEthInstance = await hre.ethers.getContractAt("IYWETH", TypedTokens["YWETH"]);
      //  Funding user's wallet with WETH tokens
      await yEthInstance.depositETH({ value: amount });
      const balance = await yEthInstance.balanceOf(await wallet.getAddress());
      await yEthInstance.transfer(address, balance);
    } else {
      try {
        await uniswapV2Router02Instance.swapETHForExactTokens(
          amount,
          [TypedTokens["WETH"], tokenAddress],
          address,
          deadlineTimestamp,
          getEthValueGasOverrideOptions(hre, "9500"),
        );
      } catch (error) {
        await sushiswapRouterInstance.swapETHForExactTokens(
          amount,
          [TypedTokens["WETH"], tokenAddress],
          address,
          deadlineTimestamp,
          getEthValueGasOverrideOptions(hre, "9500"),
        );
      }
    }
  } catch (error) {
    const tokenHolder = Object.keys(TypedTokenHolders).filter(
      holder => getAddress(TypedTokens[holder]) === getAddress(tokenAddress),
    );
    if (tokenHolder.length > 0) {
      await fundWalletFromImpersonatedAccount(
        hre,
        tokenAddress,
        TypedTokenHolders[tokenHolder[0]],
        fundAmount,
        address,
      );
    } else {
      throw error;
    }
  }

  return await tokenInstance.balanceOf(address);
}

async function transferSLPOrUNI(
  hre: HardhatRuntimeEnvironment,
  routerInstance: Contract,
  pairInstance: Contract,
  tokens: { path: string[]; address: string }[],
  wallet: Signer,
  deadlineTimestamp: number,
  toAddress: string,
) {
  for (let i = 0; i < tokens.length; i++) {
    await swapAndApproveToken(hre, routerInstance, wallet, deadlineTimestamp, tokens[i].address, tokens[i].path);
  }
  if (tokens.length === 1) {
    const tokenInstance = await hre.ethers.getContractAt("ERC20", tokens[0].address);
    await routerInstance
      .connect(wallet)
      .addLiquidityETH(
        tokens[0].address,
        await tokenInstance.balanceOf(await wallet.getAddress()),
        0,
        0,
        await wallet.getAddress(),
        deadlineTimestamp,
        getEthValueGasOverrideOptions(hre, "9500"),
      );
  } else {
    const token0Instance = await hre.ethers.getContractAt("ERC20", tokens[0].address);
    const token1Instance = await hre.ethers.getContractAt("ERC20", tokens[1].address);
    await routerInstance
      .connect(wallet)
      .addLiquidity(
        tokens[0].address,
        tokens[1].address,
        await token0Instance.balanceOf(await wallet.getAddress()),
        await token1Instance.balanceOf(await wallet.getAddress()),
        0,
        0,
        await wallet.getAddress(),
        deadlineTimestamp,
      );
  }
  await pairInstance.connect(wallet).transfer(toAddress, await pairInstance.balanceOf(await wallet.getAddress()));
}

async function swapAndApproveToken(
  hre: HardhatRuntimeEnvironment,
  routerInstance: Contract,
  wallet: Signer,
  deadlineTimestamp: number,
  tokenAddress: string,
  tokenPath: string[],
) {
  const tokenInstance = await hre.ethers.getContractAt("ERC20", tokenAddress);
  await routerInstance
    .connect(wallet)
    .swapExactETHForTokens(
      1,
      tokenPath,
      await wallet.getAddress(),
      deadlineTimestamp,
      getEthValueGasOverrideOptions(hre, "9500"),
    );
  await tokenInstance.connect(wallet).approve(routerInstance.address, 0);
  await tokenInstance
    .connect(wallet)
    .approve(routerInstance.address, await tokenInstance.balanceOf(await wallet.getAddress()));
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

  const symbol = getAddress(address) == getAddress(TypedTokens.MKR) ? "MKR" : await ERC20Instance.symbol();
  const name: string = getAddress(address) == getAddress(TypedTokens.MKR) ? "MAKER" : await ERC20Instance.name();
  return { name, symbol };
}

export async function unpauseVault(
  owner: Signer,
  registryContract: Contract,
  vaultAddr: string,
  unpaused: boolean,
): Promise<void> {
  await expect(executeFunc(registryContract, owner, "unpauseVaultContract(address,bool)", [vaultAddr, unpaused]))
    .to.emit(registryContract, "LogUnpauseVault")
    .withArgs(vaultAddr, unpaused, await owner.getAddress());
}

export async function isSetTokenHash(registryContract: Contract, tokenAddresses: string[]): Promise<boolean> {
  const tokensHash = generateTokenHash(tokenAddresses);
  const tokenAddressesInContract = await registryContract.getTokensHashToTokenList(tokensHash);
  if (tokenAddressesInContract.length === 0) {
    return false;
  }
  for (let i = 0; i < tokenAddresses.length; i++) {
    if (
      isAddress(tokenAddressesInContract[i]) &&
      getAddress(tokenAddressesInContract[i]) !== getAddress(tokenAddresses[i])
    ) {
      return false;
    }
  }
  return true;
}
export async function addRiskProfiles(owner: Signer, registry: Contract): Promise<void> {
  for (let i = 0; i < RISK_PROFILES.length; i++) {
    await addRiskProfile(
      registry,
      owner,
      RISK_PROFILES[i].code,
      RISK_PROFILES[i].name,
      RISK_PROFILES[i].symbol,
      RISK_PROFILES[i].canBorrow,
      RISK_PROFILES[i].poolRating,
    );
  }
}

export async function addRiskProfile(
  registry: Contract,
  owner: Signer,
  riskProfileCode: number,
  name: string,
  symbol: string,
  canBorrow: boolean,
  poolRating: number[],
): Promise<void> {
  const profile = await registry.getRiskProfile(riskProfileCode);
  if (!profile.exists) {
    const _addRiskProfileTx = await registry
      .connect(owner)
      ["addRiskProfile(uint256,string,string,bool,(uint8,uint8))"](
        riskProfileCode,
        name,
        symbol,
        canBorrow,
        poolRating,
      );
    const ownerAddress = await owner.getAddress();
    const addRiskProfileTx = await _addRiskProfileTx.wait(1);
    const { index } = await registry.getRiskProfile(riskProfileCode);
    expect(addRiskProfileTx.events[0].event).to.equal("LogRiskProfile");
    expect(addRiskProfileTx.events[0].args[0]).to.equal(+index);
    expect(addRiskProfileTx.events[0].args[1]).to.equal(true);
    expect(addRiskProfileTx.events[0].args[2]).to.equal(canBorrow);
    expect(addRiskProfileTx.events[0].args[3]).to.equal(ownerAddress);
    expect(addRiskProfileTx.events[1].event).to.equal("LogRPPoolRatings");
    expect(addRiskProfileTx.events[1].args[0]).to.equal(+index);
    expect(addRiskProfileTx.events[1].args[1]).to.equal(poolRating[0]);
    expect(addRiskProfileTx.events[1].args[2]).to.equal(poolRating[1]);
    expect(addRiskProfileTx.events[1].args[3]).to.equal(ownerAddress);
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
): Promise<any> {
  return await Compound.eth.read(comptrollerAddress, functionSignature, [...params], {
    provider: <Provider>(<unknown>hre.network.provider),
  });
}

export async function addWhiteListForHarvest(
  hre: HardhatRuntimeEnvironment,
  contractAddress: string,
  admin: Signer,
): Promise<void> {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [TypedEOA.HARVEST_GOVERNANCE],
  });
  const harvestController = await hre.ethers.getContractAt(
    "IHarvestController",
    TypedContracts.HARVEST_CONTROLLER,
    await hre.ethers.getSigner(TypedEOA.HARVEST_GOVERNANCE),
  );
  await admin.sendTransaction({
    to: TypedEOA.HARVEST_GOVERNANCE,
    value: hre.ethers.utils.parseEther("1000"),
  });
  await harvestController.addToWhitelist(contractAddress);
  await harvestController.addCodeToWhitelist(contractAddress);
}
