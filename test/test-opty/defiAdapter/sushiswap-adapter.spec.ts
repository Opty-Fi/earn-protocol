import hre from "hardhat";
import chai, { expect, assert } from "chai";
import { solidity } from "ethereum-waffle";
import { Contract, Signer, utils, BigNumber } from "ethers";
import { CONTRACTS } from "../../../helpers/type";
import { TESTING_DEPLOYMENT_ONCE, ADDRESS_ZERO } from "../../../helpers/constants/utils";
import { VAULT_TOKENS } from "../../../helpers/constants/tokens";
import { SUSHISWAP_ADAPTER_NAME } from "../../../helpers/constants/adapters";
import { TypedAdapterStrategies, TypedTokens, TypedDefiPools, TypedContracts } from "../../../helpers/data";
import { deployAdapter, deployAdapterPrerequisites } from "../../../helpers/contracts-deployments";
import { deployContract, getDefaultFundAmountInDecimal } from "../../../helpers/helpers";
import { to_10powNumber_BN } from "../../../helpers/utils";
import { getAddress } from "ethers/lib/utils";
import { fundWalletToken, getBlockTimestamp } from "../../../helpers/contracts-actions";
import scenarios from "../scenarios/adapters.json";
import testDeFiAdapterScenario from "../scenarios/sushiswap-test-defi-adapter.json";
import { ERC20 } from "../../../typechain/ERC20";

chai.use(solidity);

type ARGUMENTS = {
  amount?: { [key: string]: string };
};

interface TEST_DEFI_ADAPTER_ARGUMENTS {
  maxDepositProtocolPct?: string | null;
  maxDepositPoolPct?: string | null;
  maxDepositAmount?: string | null;
  mode?: string | null;
}

describe(`${SUSHISWAP_ADAPTER_NAME} Unit test`, () => {
  const strategies = TypedAdapterStrategies[SUSHISWAP_ADAPTER_NAME];
  let adapterPrerequisites: CONTRACTS;
  let sushiswapAdapter: Contract;
  let ownerAddress: string;
  let users: { [key: string]: Signer };
  before(async () => {
    try {
      const [owner, admin, user1] = await hre.ethers.getSigners();
      users = { owner, admin, user1 };
      ownerAddress = await owner.getAddress();
      adapterPrerequisites = await deployAdapterPrerequisites(hre, owner, TESTING_DEPLOYMENT_ONCE);
      assert.isDefined(adapterPrerequisites, "Adapter pre-requisites contracts not deployed");
      sushiswapAdapter = await deployAdapter(
        hre,
        owner,
        SUSHISWAP_ADAPTER_NAME,
        adapterPrerequisites["registry"].address,
        TESTING_DEPLOYMENT_ONCE,
      );
      assert.isDefined(sushiswapAdapter, "Adapter not deployed");
    } catch (error) {
      console.log(error);
    }
  });

  for (let i = 0; i < strategies.length; i++) {
    describe(`test getCodes() for ${strategies[i].strategyName}`, async () => {
      const strategy = strategies[i];
      const token = VAULT_TOKENS[strategy.token].address;
      const masterChef = "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd";
      for (let i = 0; i < scenarios.stories.length; i++) {
        it(scenarios.stories[i].description, async () => {
          const story = scenarios.stories[i];
          for (let i = 0; i < story.actions.length; i++) {
            const action = story.actions[i];
            switch (action.action) {
              case "getDepositSomeCodes(address,address,address,uint256)":
              case "getDepositAllCodes(address,address,address)": {
                let codes;
                let depositAmount;
                if (action.action === "getDepositSomeCodes(address,address,address,uint256)") {
                  const { amount }: ARGUMENTS = action.args;
                  if (amount) {
                    codes = await sushiswapAdapter[action.action](
                      ownerAddress,
                      token,
                      masterChef,
                      amount[strategy.token],
                    );
                    depositAmount = amount[strategy.token];
                  }
                } else {
                  codes = await sushiswapAdapter[action.action](ownerAddress, token, masterChef);
                }
                for (let i = 0; i < codes.length; i++) {
                  if (i < 2) {
                    const inter = new utils.Interface(["function approve(address,uint256)"]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                    expect(address).to.equal(token);
                    const value = inter.decodeFunctionData("approve", abiCode);
                    expect(value[0]).to.equal(strategy.strategy[0].contract);
                    if (action.action === "getDepositSomeCodes(address,address,address,uint256)") {
                      expect(value[1]).to.equal(i === 0 ? 0 : depositAmount);
                    }
                  } else {
                    const inter = new utils.Interface(["function deposit(uint256,uint256)"]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                    expect(address).to.equal(masterChef);
                    const value = inter.decodeFunctionData("deposit", abiCode);
                    if (action.action === "getDepositSomeCodes(address,address,address,uint256)") {
                      expect(value[0]).to.equal(1);
                      expect(value[1]).to.equal(depositAmount);
                    }
                  }
                }
                break;
              }
              case "getWithdrawAllCodes(address,address,address)":
              case "getWithdrawSomeCodes(address,address,address,uint256)": {
                let codes;
                let withdrawAmount;
                if (action.action === "getWithdrawSomeCodes(address,address,address,uint256)") {
                  const { amount }: ARGUMENTS = action.args;
                  if (amount) {
                    codes = await sushiswapAdapter[action.action](
                      ownerAddress,
                      token,
                      masterChef,
                      amount[strategy.token],
                    );
                    withdrawAmount = amount[strategy.token];
                  }
                } else {
                  codes = await sushiswapAdapter[action.action](ownerAddress, token, masterChef);
                }

                for (let i = 0; i < codes.length; i++) {
                  const inter = new utils.Interface(["function withdraw(uint256,uint256)"]);
                  const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                  expect(address).to.be.equal(masterChef);
                  const value = inter.decodeFunctionData("withdraw", abiCode);
                  if (action.action === "getWithdrawSomeCodes(address,address,address,uint256)") {
                    expect(value[0]).to.equal(1);
                    expect(value[1]).to.equal(withdrawAmount);
                  }
                }
                break;
              }
            }
          }
        }).timeout(150000);
      }
    });
  }

  describe(`${testDeFiAdapterScenario.title} - ${SUSHISWAP_ADAPTER_NAME}`, () => {
    const adapterNames = Object.keys(TypedDefiPools);
    let testDeFiAdapter: Contract;
    let masterChefInstance: Contract;

    before(async () => {
      testDeFiAdapter = await deployContract(hre, "TestDeFiAdapter", false, users["owner"], []);
      masterChefInstance = await hre.ethers.getContractAt("ISushiswapMasterChef", TypedContracts.SUSHI_MASTER_CHEF);
    });

    for (const adapterName of adapterNames) {
      // TODO: In future it can be leverage across all the adapters
      if (adapterName == SUSHISWAP_ADAPTER_NAME) {
        const pools = Object.keys(TypedDefiPools[adapterName]);
        for (const pool of pools) {
          const underlyingTokenAddress = getAddress(TypedDefiPools[adapterName][pool].tokens[0]);
          const liquidityPool = TypedDefiPools[adapterName][pool].pool;
          const pid = TypedDefiPools[adapterName][pool].pid;
          if (TypedDefiPools[adapterName][pool].tokens.length == 1) {
            for (const story of testDeFiAdapterScenario.stories) {
              it(`${pool} - ${story.description}`, async () => {
                const adapterAddress = sushiswapAdapter.address;
                if (
                  (
                    await sushiswapAdapter.underlyingTokenToMasterChefToPid(
                      underlyingTokenAddress,
                      masterChefInstance.address,
                    )
                  ).eq(0)
                ) {
                  await sushiswapAdapter.setUnderlyingTokenToMasterChefToPid(
                    underlyingTokenAddress,
                    masterChefInstance.address,
                    pid,
                  );
                }
                const pairInstance = await hre.ethers.getContractAt("IUniswapV2Pair", underlyingTokenAddress);
                const token0Instance = await hre.ethers.getContractAt("ERC20", await pairInstance.token0());
                const token1Instance = await hre.ethers.getContractAt("ERC20", await pairInstance.token1());
                const rewardTokenAddress = getAddress(TypedTokens.SUSHI);
                const rewardTokenERC20Instance: ERC20 = <ERC20>(
                  await hre.ethers.getContractAt("ERC20", rewardTokenAddress)
                );
                const rewardTokenDecimals: number = <number>await rewardTokenERC20Instance.decimals();
                const decimals = await pairInstance.decimals();
                let defaultFundAmount: BigNumber = BigNumber.from("2").mul(to_10powNumber_BN(decimals - 10));
                let limit: BigNumber = hre.ethers.BigNumber.from(0);
                const timestamp = (await getBlockTimestamp(hre)) * 2;
                let underlyingBalanceBefore: BigNumber = hre.ethers.BigNumber.from(0);
                let token0BalanceBefore: BigNumber = hre.ethers.BigNumber.from(0);
                let token1BalanceBefore: BigNumber = hre.ethers.BigNumber.from(0);
                let rewardTokenBalanceBefore: BigNumber = hre.ethers.BigNumber.from(0);
                let isTestingAddLiquidity = false;
                for (const action of story.setActions) {
                  switch (action.action) {
                    case "setMaxDepositProtocolMode(uint8)": {
                      const { mode } = action.args as TEST_DEFI_ADAPTER_ARGUMENTS;
                      const existingMode = await sushiswapAdapter.maxDepositProtocolMode();
                      if (existingMode != mode) {
                        await sushiswapAdapter[action.action](mode);
                      }

                      break;
                    }
                    case "setMaxDepositProtocolPct(uint256)": {
                      const existingPoolPct: BigNumber = await sushiswapAdapter.maxDepositPoolPct(liquidityPool);
                      if (!existingPoolPct.eq(BigNumber.from(0))) {
                        await sushiswapAdapter.setMaxDepositPoolPct(liquidityPool, 0);
                        expect(await sushiswapAdapter.maxDepositPoolPct(liquidityPool)).to.be.eq(0);
                      }
                      const { maxDepositProtocolPct }: any = action.args!;
                      const existingProtocolPct: BigNumber = await sushiswapAdapter.maxDepositProtocolPct();
                      if (!existingProtocolPct.eq(BigNumber.from(maxDepositProtocolPct))) {
                        await expect(sushiswapAdapter[action.action](maxDepositProtocolPct))
                          .to.emit(sushiswapAdapter, "LogMaxDepositProtocolPct")
                          .withArgs(+maxDepositProtocolPct, ownerAddress);
                        expect(await sushiswapAdapter.maxDepositProtocolPct()).to.equal(+maxDepositProtocolPct);
                      }
                      const poolValue: BigNumber = await sushiswapAdapter.getPoolValue(
                        liquidityPool,
                        underlyingTokenAddress,
                      );

                      limit = poolValue.mul(BigNumber.from(maxDepositProtocolPct)).div(BigNumber.from(10000));
                      defaultFundAmount = defaultFundAmount.lte(limit) || poolValue.eq(0) ? defaultFundAmount : limit;
                      break;
                    }
                    case "setMaxDepositPoolPct(address,uint256)": {
                      const { maxDepositPoolPct } = action.args as TEST_DEFI_ADAPTER_ARGUMENTS;
                      const existingPoolPct: BigNumber = await sushiswapAdapter.maxDepositPoolPct(
                        underlyingTokenAddress,
                      );
                      if (!existingPoolPct.eq(BigNumber.from(maxDepositPoolPct))) {
                        await sushiswapAdapter[action.action](underlyingTokenAddress, maxDepositPoolPct);
                      }
                      const poolValue: BigNumber = await sushiswapAdapter.getPoolValue(
                        liquidityPool,
                        underlyingTokenAddress,
                      );

                      limit = poolValue.mul(BigNumber.from(maxDepositPoolPct)).div(BigNumber.from(10000));
                      defaultFundAmount = defaultFundAmount.lte(limit) || poolValue.eq(0) ? defaultFundAmount : limit;
                      break;
                    }
                    case "setMaxDepositAmount(address,address,uint256)": {
                      const { maxDepositAmount } = action.args as TEST_DEFI_ADAPTER_ARGUMENTS;
                      let amount = BigNumber.from("0");
                      if (maxDepositAmount === ">") {
                        amount = defaultFundAmount.mul(BigNumber.from("10"));
                      } else if (maxDepositAmount === "<") {
                        amount = defaultFundAmount.div(BigNumber.from("10"));
                      }
                      const existingDepositAmount: BigNumber = await sushiswapAdapter.maxDepositAmount(
                        liquidityPool,
                        underlyingTokenAddress,
                      );
                      if (!existingDepositAmount.eq(amount)) {
                        await expect(sushiswapAdapter[action.action](liquidityPool, underlyingTokenAddress, amount))
                          .to.emit(sushiswapAdapter, "LogMaxDepositAmount")
                          .withArgs(amount, ownerAddress);
                        expect(
                          +(await sushiswapAdapter.maxDepositAmount(liquidityPool, underlyingTokenAddress)),
                        ).to.equal(+amount);
                      }
                      limit = amount;
                      break;
                    }
                    case "fundTestDeFiAdapterContract": {
                      const underlyingBalance: BigNumber = await pairInstance.balanceOf(testDeFiAdapter.address);
                      const totalSupply: BigNumber = await pairInstance.totalSupply();
                      if (underlyingBalance.lt(defaultFundAmount) && totalSupply.gt(defaultFundAmount)) {
                        defaultFundAmount = await fundWalletToken(
                          hre,
                          underlyingTokenAddress,
                          users["owner"],
                          defaultFundAmount,
                          timestamp,
                          testDeFiAdapter.address,
                        );
                      }
                      break;
                    }
                    case "fundTestDeFiAdapterContractWithRewardToken": {
                      let rewardTokenBalance: BigNumber = await rewardTokenERC20Instance.balanceOf(
                        testDeFiAdapter.address,
                      );
                      if (rewardTokenBalance.lte(0)) {
                        await fundWalletToken(
                          hre,
                          rewardTokenERC20Instance.address,
                          users["owner"],
                          getDefaultFundAmountInDecimal(rewardTokenAddress, rewardTokenDecimals),
                          timestamp,
                          testDeFiAdapter.address,
                        );
                        rewardTokenBalance = await rewardTokenERC20Instance.balanceOf(testDeFiAdapter.address);
                        expect(rewardTokenBalance).to.be.gt(0);
                      }
                      break;
                    }
                    case "testGetDepositAllCodes(address,address,address)": {
                      underlyingBalanceBefore = await pairInstance.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](underlyingTokenAddress, liquidityPool, adapterAddress);
                      break;
                    }
                    case "testGetDepositSomeCodes(address,address,address,uint256)": {
                      underlyingBalanceBefore = await pairInstance.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](
                        underlyingTokenAddress,
                        liquidityPool,
                        adapterAddress,
                        underlyingBalanceBefore,
                      );
                      break;
                    }
                    case "testGetWithdrawAllCodes(address,address,address)": {
                      underlyingBalanceBefore = await pairInstance.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](underlyingTokenAddress, liquidityPool, adapterAddress);
                      break;
                    }
                    case "testGetWithdrawSomeCodes(address,address,address,uint256)": {
                      underlyingBalanceBefore = await pairInstance.balanceOf(testDeFiAdapter.address);
                      const lpTokenBalance = await await sushiswapAdapter.getLiquidityPoolTokenBalance(
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      await testDeFiAdapter[action.action](
                        underlyingTokenAddress,
                        liquidityPool,
                        adapterAddress,
                        lpTokenBalance,
                      );
                      break;
                    }
                    case "testGetHarvestAllCodes(address,address,address)": {
                      underlyingBalanceBefore = await pairInstance.balanceOf(testDeFiAdapter.address);
                      rewardTokenBalanceBefore = await rewardTokenERC20Instance.balanceOf(testDeFiAdapter.address);
                      token0BalanceBefore = await token0Instance.balanceOf(testDeFiAdapter.address);
                      token1BalanceBefore = await token1Instance.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](liquidityPool, underlyingTokenAddress, adapterAddress);
                      break;
                    }
                    case "testGetHarvestSomeCodes(address,address,address,uint256)": {
                      underlyingBalanceBefore = await pairInstance.balanceOf(testDeFiAdapter.address);
                      rewardTokenBalanceBefore = await rewardTokenERC20Instance.balanceOf(testDeFiAdapter.address);
                      token0BalanceBefore = await token0Instance.balanceOf(testDeFiAdapter.address);
                      token1BalanceBefore = await token1Instance.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](
                        liquidityPool,
                        underlyingTokenAddress,
                        adapterAddress,
                        rewardTokenBalanceBefore,
                      );
                      break;
                    }
                    case "testGetAddLiquidityCodes(address,address)": {
                      underlyingBalanceBefore = await pairInstance.balanceOf(testDeFiAdapter.address);
                      token0BalanceBefore = await token0Instance.balanceOf(testDeFiAdapter.address);
                      token1BalanceBefore = await token1Instance.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](underlyingTokenAddress, adapterAddress);
                      isTestingAddLiquidity = true;
                      break;
                    }
                    case "getUnclaimedRewardTokenAmount(address,address,address)": {
                      const unclaimedRewardTokenAmount = await sushiswapAdapter[action.action](
                        testDeFiAdapter.address,
                        liquidityPool,
                        underlyingTokenAddress,
                      );
                      const expectedUnclaimedRewardTokenAmount = await masterChefInstance.pendingSushi(
                        pid,
                        testDeFiAdapter.address,
                      );
                      expect(unclaimedRewardTokenAmount).to.be.eq(expectedUnclaimedRewardTokenAmount);
                      break;
                    }
                    case "testGetClaimRewardTokenCodes(address,address)": {
                      rewardTokenBalanceBefore = await rewardTokenERC20Instance.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](liquidityPool, sushiswapAdapter.address);
                      break;
                    }
                    case "getUnderlyingTokens(address,address)": {
                      await expect(sushiswapAdapter[action.action](ADDRESS_ZERO, ADDRESS_ZERO)).to.be.revertedWith(
                        "!empty",
                      );
                      break;
                    }
                    case "calculateAmountInLPToken(address,address,uint256)": {
                      await expect(sushiswapAdapter[action.action](ADDRESS_ZERO, ADDRESS_ZERO, 0)).to.be.revertedWith(
                        "!empty",
                      );
                      break;
                    }
                    case "getPoolValue(address,address)": {
                      const poolValue = await sushiswapAdapter[action.action](liquidityPool, underlyingTokenAddress);
                      const expectedPoolValue = await pairInstance.balanceOf(masterChefInstance.address);
                      expect(poolValue).to.be.eq(expectedPoolValue);
                      break;
                    }
                    case "getLiquidityPoolToken(address,address)": {
                      const liquidityPoolFromAdapter = await sushiswapAdapter[action.action](
                        underlyingTokenAddress,
                        ADDRESS_ZERO,
                      );
                      expect(getAddress(liquidityPoolFromAdapter)).to.be.eq(getAddress(underlyingTokenAddress));
                      break;
                    }
                    case "wait10000Seconds": {
                      const blockNumber = await hre.ethers.provider.getBlockNumber();
                      const block = await hre.ethers.provider.getBlock(blockNumber);
                      await hre.network.provider.send("evm_setNextBlockTimestamp", [block.timestamp + 10000]);
                      await hre.network.provider.send("evm_mine");
                      break;
                    }
                  }
                }
                for (const action of story.getActions) {
                  switch (action.action) {
                    case "getLiquidityPoolTokenBalance(address,address,address)": {
                      const expectedValue = action.expectedValue;
                      const lpTokenBalance = await sushiswapAdapter[action.action](
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      const poolValue = await sushiswapAdapter["getPoolValue(address,address)"](
                        liquidityPool,
                        underlyingTokenAddress,
                      );
                      const existingMode = await sushiswapAdapter.maxDepositProtocolMode();
                      if (existingMode == 0) {
                        const existingDepositAmount: BigNumber = await sushiswapAdapter.maxDepositAmount(
                          liquidityPool,
                          underlyingTokenAddress,
                        );
                        if (existingDepositAmount.eq(0)) {
                          expect(+lpTokenBalance).to.be.eq(0);
                        } else {
                          expect(+lpTokenBalance).to.be.gt(0);
                        }
                      } else {
                        const existingPoolPct: BigNumber = await sushiswapAdapter.maxDepositPoolPct(liquidityPool);
                        const existingProtocolPct: BigNumber = await sushiswapAdapter.maxDepositProtocolPct();
                        if ((existingPoolPct.eq(0) && existingProtocolPct.eq(0)) || poolValue.eq(0)) {
                          expect(lpTokenBalance).to.be.eq(0);
                        } else {
                          expectedValue == "=0" || limit.eq(0)
                            ? expect(lpTokenBalance).to.be.eq(0)
                            : expect(lpTokenBalance).to.be.gt(0);
                        }
                      }

                      break;
                    }
                    case "balanceOf(address)": {
                      const expectedValue = action.expectedValue;
                      const underlyingBalanceAfter: BigNumber = await pairInstance.balanceOf(testDeFiAdapter.address);
                      const poolValue = await sushiswapAdapter["getPoolValue(address,address)"](
                        liquidityPool,
                        underlyingTokenAddress,
                      );
                      if (underlyingBalanceBefore.lt(limit)) {
                        expectedValue == ">0"
                          ? expect(underlyingBalanceAfter).to.be.gt(underlyingBalanceBefore)
                          : +rewardTokenBalanceBefore > 0
                          ? expect(underlyingBalanceAfter).to.be.eq(underlyingBalanceBefore)
                          : expect(underlyingBalanceAfter).to.be.eq(0);
                      } else if (isTestingAddLiquidity) {
                        expect(underlyingBalanceAfter).to.be.gt(underlyingBalanceBefore);
                      } else {
                        poolValue.eq(0)
                          ? expect(underlyingBalanceAfter).to.be.eq(underlyingBalanceBefore)
                          : expectedValue == ">0"
                          ? expect(underlyingBalanceAfter).to.be.gt(underlyingBalanceBefore)
                          : expect(underlyingBalanceAfter).to.be.eq(underlyingBalanceBefore.sub(limit));
                      }

                      break;
                    }
                    case "getRewardTokenBalance(address)": {
                      const rewardTokenBalanceAfter: BigNumber = await rewardTokenERC20Instance.balanceOf(
                        testDeFiAdapter.address,
                      );
                      const token0BalanceAfter: BigNumber = await token0Instance.balanceOf(testDeFiAdapter.address);
                      const token1BalanceAfter: BigNumber = await token1Instance.balanceOf(testDeFiAdapter.address);
                      const expectedValue = action.expectedValue;
                      if (expectedValue == ">0") {
                        expect(rewardTokenBalanceAfter).to.be.gt(rewardTokenBalanceBefore);
                      } else if (expectedValue == "=0") {
                        if (getAddress(token0Instance.address) !== getAddress(rewardTokenAddress)) {
                          expect(token0BalanceAfter).to.be.gt(token0BalanceBefore);
                        }
                        if (getAddress(token0Instance.address) !== getAddress(rewardTokenAddress)) {
                          expect(token1BalanceAfter).to.be.gt(token1BalanceBefore);
                        }

                        expect(rewardTokenBalanceAfter).to.be.lt(rewardTokenBalanceBefore);
                      } else {
                        expect(token0BalanceAfter).to.be.lt(token0BalanceBefore);
                        expect(token1BalanceAfter).to.be.lt(token1BalanceBefore);
                        expect(rewardTokenBalanceAfter).to.be.lt(rewardTokenBalanceBefore);
                      }
                      break;
                    }
                    case "isRedeemableAmountSufficient(address,address,address,uint256)": {
                      const expectedValue = action.expectedValue;
                      const amountInUnderlyingToken: BigNumber = await sushiswapAdapter.getAllAmountInToken(
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      if (expectedValue == ">") {
                        const isRedeemableAmountSufficient = await sushiswapAdapter[action.action](
                          testDeFiAdapter.address,
                          underlyingTokenAddress,
                          liquidityPool,
                          amountInUnderlyingToken.add(BigNumber.from(10)),
                        );
                        expect(isRedeemableAmountSufficient).to.be.eq(false);
                      } else if (expectedValue == "<") {
                        const isRedeemableAmountSufficient = await sushiswapAdapter[action.action](
                          testDeFiAdapter.address,
                          underlyingTokenAddress,
                          liquidityPool,
                          +amountInUnderlyingToken > 0
                            ? amountInUnderlyingToken.sub(BigNumber.from(1))
                            : BigNumber.from(0),
                        );
                        expect(isRedeemableAmountSufficient).to.be.eq(true);
                      }
                      break;
                    }
                    case "calculateRedeemableLPTokenAmount(address,address,address,uint256)": {
                      const lpTokenBalance: BigNumber = await sushiswapAdapter.getLiquidityPoolTokenBalance(
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      const expectedRedeemableLpTokenAmt = (
                        await masterChefInstance.userInfo(pid, testDeFiAdapter.address)
                      )[0];
                      expect(+lpTokenBalance).to.be.eq(+expectedRedeemableLpTokenAmt);
                      break;
                    }
                    case "getAllAmountInToken(address,address,address)": {
                      const amountInUnderlyingToken = await sushiswapAdapter[action.action](
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      let expectedAmountInUnderlyingToken = (
                        await masterChefInstance.userInfo(pid, testDeFiAdapter.address)
                      )[0];
                      const expectedUnclaimedRewardTokenAmount = await masterChefInstance.pendingSushi(
                        pid,
                        testDeFiAdapter.address,
                      );
                      if (+expectedUnclaimedRewardTokenAmount > 0) {
                        expectedAmountInUnderlyingToken = expectedAmountInUnderlyingToken.add(
                          await adapterPrerequisites["harvestCodeProvider"].rewardBalanceInUnderlyingTokens(
                            rewardTokenAddress,
                            underlyingTokenAddress,
                            expectedUnclaimedRewardTokenAmount,
                          ),
                        );
                      }
                      expect(+amountInUnderlyingToken).to.be.eq(+expectedAmountInUnderlyingToken);
                      break;
                    }
                    case "getSomeAmountInToken(address,address,uint256)": {
                      await expect(sushiswapAdapter[action.action](ADDRESS_ZERO, ADDRESS_ZERO, 0)).to.be.revertedWith(
                        "!empty",
                      );
                      break;
                    }
                  }
                }
                for (const action of story.cleanActions) {
                  switch (action.action) {
                    case "testGetWithdrawAllCodes(address,address,address)": {
                      await testDeFiAdapter[action.action](underlyingTokenAddress, liquidityPool, adapterAddress);
                      break;
                    }
                  }
                }
                for (const action of story.getActions) {
                  switch (action.action) {
                    case "getLiquidityPoolTokenBalance(address,address,address)": {
                      const lpTokenBalance = await sushiswapAdapter[action.action](
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      expect(lpTokenBalance).to.be.eq(0);
                      break;
                    }
                    case "balanceOf(address)": {
                      const underlyingBalance: BigNumber = await pairInstance.balanceOf(testDeFiAdapter.address);
                      expect(underlyingBalance).to.be.gt(0);
                      break;
                    }
                  }
                }
              });
            }
            for (let i = 0; i < testDeFiAdapterScenario.adapterStandaloneStories.length; i++) {
              it(`${testDeFiAdapterScenario?.adapterStandaloneStories[i].description}`, async function () {
                const story = testDeFiAdapterScenario.adapterStandaloneStories[i];
                for (const action of story.setActions) {
                  switch (action.action) {
                    case "canStake(address)": {
                      const canStake = await sushiswapAdapter[action.action](ADDRESS_ZERO);
                      expect(canStake).to.be.eq(false);
                      break;
                    }
                  }
                }
              });
            }
          }
        }
      }
    }
  });
});
