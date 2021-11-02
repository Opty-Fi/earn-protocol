import chai, { expect, assert } from "chai";
import { solidity } from "ethereum-waffle";
import hre from "hardhat";
import { Contract, Signer, BigNumber, utils } from "ethers";
import { CONTRACTS } from "../../../helpers/type";
import {
  VAULT_TOKENS,
  TESTING_DEPLOYMENT_ONCE,
  ADDRESS_ZERO,
  HARVEST_V1_ADAPTER_NAME,
  TESTING_CONTRACTS,
} from "../../../helpers/constants";
import { TypedAdapterStrategies, TypedMultiAssetTokens, TypedCurveTokens, TypedDefiPools } from "../../../helpers/data";
import { deployAdapter, deployAdapterPrerequisites } from "../../../helpers/contracts-deployments";
import { fundWalletToken, getBlockTimestamp, addWhiteListForHarvest } from "../../../helpers/contracts-actions";
import testDeFiAdapterScenario from "../scenarios/harvest-v1-test-defi-adapter.json";
import scenarios from "../scenarios/adapters.json";
import { deployContract, getDefaultFundAmountInDecimal } from "../../../helpers/helpers";
import { getAddress } from "ethers/lib/utils";
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
  isInvalidAddress?: string | null;
}

describe(`${HARVEST_V1_ADAPTER_NAME} Unit test`, () => {
  const strategies = TypedAdapterStrategies[HARVEST_V1_ADAPTER_NAME];
  const MAX_AMOUNT = BigNumber.from("20000000000000000000");
  let adapterPrerequisites: CONTRACTS;
  let harvestV1Adapter: Contract;
  let ownerAddress: string;
  let users: { [key: string]: Signer };

  before(async () => {
    try {
      const [owner, admin, user1] = await hre.ethers.getSigners();
      users = { owner, admin, user1 };
      ownerAddress = await owner.getAddress();
      adapterPrerequisites = await deployAdapterPrerequisites(hre, owner, TESTING_DEPLOYMENT_ONCE);
      assert.isDefined(adapterPrerequisites, "Adapter pre-requisites contracts not deployed");
      harvestV1Adapter = await deployAdapter(
        hre,
        owner,
        HARVEST_V1_ADAPTER_NAME,
        adapterPrerequisites["registry"].address,
        TESTING_DEPLOYMENT_ONCE,
      );

      assert.isDefined(harvestV1Adapter, "Adapter not deployed");
    } catch (error) {
      console.log(error);
    }
  });

  for (let i = 0; i < strategies.length; i++) {
    describe(`test getCodes() for ${strategies[i].strategyName}`, async () => {
      const strategy = strategies[i];
      const token = VAULT_TOKENS[strategy.token];
      let lpToken: string;
      before(async () => {
        try {
          const timestamp = (await getBlockTimestamp(hre)) * 2;
          await fundWalletToken(hre, token, users["owner"], MAX_AMOUNT, timestamp);
          lpToken = await harvestV1Adapter.getLiquidityPoolToken(token, strategy.strategy[0].contract);
        } catch (error) {
          console.error(error);
        }
      });

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
                    codes = await harvestV1Adapter[action.action](
                      ownerAddress,
                      token,
                      strategy.strategy[0].contract,
                      amount[strategy.token],
                    );
                    depositAmount = amount[strategy.token];
                  }
                } else {
                  codes = await harvestV1Adapter[action.action](ownerAddress, token, strategy.strategy[0].contract);
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
                    const inter = new utils.Interface(["function deposit(uint256)"]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                    expect(address).to.equal(strategy.strategy[0].contract);
                    const value = inter.decodeFunctionData("deposit", abiCode);
                    if (action.action === "getDepositSomeCodes(address,address,address,uint256)") {
                      expect(value[0]).to.equal(depositAmount);
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
                    codes = await harvestV1Adapter[action.action](
                      ownerAddress,
                      token,
                      strategy.strategy[0].contract,
                      amount[strategy.token],
                    );
                    withdrawAmount = amount[strategy.token];
                  }
                } else {
                  codes = await harvestV1Adapter[action.action](ownerAddress, token, strategy.strategy[0].contract);
                }

                for (let i = 0; i < codes.length; i++) {
                  const inter = new utils.Interface(["function withdraw(uint256)"]);
                  const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                  expect(address).to.be.equal(lpToken);
                  const value = inter.decodeFunctionData("withdraw", abiCode);
                  if (action.action === "getWithdrawSomeCodes(address,address,address,uint256)") {
                    expect(value[0]).to.be.equal(withdrawAmount);
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

  describe(`${testDeFiAdapterScenario.title} - HarvestV1Adapter`, () => {
    const adapterNames = Object.keys(TypedDefiPools);
    let testDeFiAdapter: Contract;
    const dummyContracts: CONTRACTS = {};
    before(async () => {
      testDeFiAdapter = await deployContract(hre, TESTING_CONTRACTS.TESTING_DEFI_ADAPTER, false, users["owner"], []);
      dummyContracts["liquidityPool"] = await deployContract(
        hre,
        TESTING_CONTRACTS.TEST_DUMMY_EMPTY_CONTRACT,
        false,
        users["owner"],
        [],
      );
      dummyContracts["stakingVault"] = await deployContract(
        hre,
        TESTING_CONTRACTS.TEST_DUMMY_EMPTY_CONTRACT,
        false,
        users["owner"],
        [],
      );
      await addWhiteListForHarvest(hre, testDeFiAdapter.address, users["admin"]);
    });

    const ValidatedPairTokens = Object.values(TypedMultiAssetTokens)
      .map(({ address }) => address)
      .map(t => getAddress(t));
    const ValidatedCurveTokens = Object.values(TypedCurveTokens)
      .map(({ address }) => address)
      .map(t => getAddress(t));
    for (const adapterName of adapterNames) {
      // TODO: In future it can be leverage across all the adapters
      if (adapterName == "HarvestV1Adapter") {
        const pools = Object.keys(TypedDefiPools[adapterName]);
        for (const pool of pools) {
          if (TypedDefiPools[adapterName][pool].tokens.length == 1) {
            const liquidityPool = TypedDefiPools[adapterName][pool].pool;
            for (const story of testDeFiAdapterScenario.stories) {
              it(`${pool} - ${story.description}`, async function () {
                if (TypedDefiPools[adapterName][pool].deprecated) {
                  this.skip();
                }
                const underlyingTokenAddress = getAddress(TypedDefiPools[adapterName][pool].tokens[0]);
                const stakingVaultAddress = getAddress(TypedDefiPools[adapterName][pool].stakingVault!);
                let limit: BigNumber = hre.ethers.BigNumber.from(0);
                const timestamp = (await getBlockTimestamp(hre)) * 2;
                const ERC20Instance = <ERC20>await hre.ethers.getContractAt("ERC20", underlyingTokenAddress);
                const vaultInstance = await hre.ethers.getContractAt("IHarvestDeposit", liquidityPool);
                const ERC20VaultInstance = await hre.ethers.getContractAt("ERC20", liquidityPool);
                const stakingVaultInstance = await hre.ethers.getContractAt("IHarvestFarm", stakingVaultAddress);
                const rewardTokenAddress = await harvestV1Adapter.getRewardToken(liquidityPool);
                let rewardTokenERC20Instance: Contract;
                if (rewardTokenAddress !== ADDRESS_ZERO) {
                  rewardTokenERC20Instance = await hre.ethers.getContractAt("ERC20", rewardTokenAddress);
                }
                const rewardTokenDecimals = await rewardTokenERC20Instance!.decimals();
                const decimals = await ERC20Instance.decimals();
                let defaultFundAmount: BigNumber = getDefaultFundAmountInDecimal(underlyingTokenAddress, decimals);
                const adapterAddress = harvestV1Adapter.address;
                let underlyingBalanceBefore: BigNumber = hre.ethers.BigNumber.from(0);
                let liquidityPoolTokenBalanceBefore: BigNumber = hre.ethers.BigNumber.from(0);
                let liquidityPoolTokenBalanceStakeBefore: BigNumber = hre.ethers.BigNumber.from(0);
                let rewardTokenBalanceBefore: BigNumber = hre.ethers.BigNumber.from(0);
                const previousBlockTimestamp = await getBlockTimestamp(hre);
                for (const action of story.setActions) {
                  switch (action.action) {
                    case "setMaxDepositProtocolMode(uint8)": {
                      const { mode } = action.args as TEST_DEFI_ADAPTER_ARGUMENTS;
                      const existingMode = await harvestV1Adapter.maxDepositProtocolMode();
                      if (existingMode != mode) {
                        await harvestV1Adapter[action.action](mode);
                      }
                      break;
                    }
                    case "setMaxDepositProtocolPct(uint256)": {
                      const existingPoolPct: BigNumber = await harvestV1Adapter.maxDepositPoolPct(liquidityPool);
                      if (!existingPoolPct.eq(BigNumber.from(0))) {
                        await harvestV1Adapter.setMaxDepositPoolPct(liquidityPool, 0);
                      }
                      const { maxDepositProtocolPct } = action.args as TEST_DEFI_ADAPTER_ARGUMENTS;
                      const existingProtocolPct: BigNumber = await harvestV1Adapter.maxDepositProtocolPct();
                      if (!existingProtocolPct.eq(BigNumber.from(maxDepositProtocolPct))) {
                        await harvestV1Adapter[action.action](maxDepositProtocolPct);
                      }
                      const poolValue: BigNumber = await harvestV1Adapter.getPoolValue(
                        liquidityPool,
                        underlyingTokenAddress,
                      );
                      limit = poolValue.mul(BigNumber.from(maxDepositProtocolPct)).div(BigNumber.from(10000));
                      defaultFundAmount = defaultFundAmount.lte(limit) ? defaultFundAmount : limit;
                      break;
                    }
                    case "setMaxDepositPoolPct(address,uint256)": {
                      const { maxDepositPoolPct } = action.args as TEST_DEFI_ADAPTER_ARGUMENTS;
                      const existingPoolPct: BigNumber = await harvestV1Adapter.maxDepositPoolPct(liquidityPool);
                      if (!existingPoolPct.eq(BigNumber.from(maxDepositPoolPct))) {
                        await harvestV1Adapter[action.action](liquidityPool, maxDepositPoolPct);
                      }
                      const poolValue: BigNumber = await harvestV1Adapter.getPoolValue(
                        liquidityPool,
                        underlyingTokenAddress,
                      );
                      limit = poolValue.mul(BigNumber.from(maxDepositPoolPct)).div(BigNumber.from(10000));
                      defaultFundAmount = defaultFundAmount.lte(limit) ? defaultFundAmount : limit;
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
                      const existingDepositAmount: BigNumber = await harvestV1Adapter.maxDepositAmount(
                        liquidityPool,
                        underlyingTokenAddress,
                      );
                      if (!existingDepositAmount.eq(amount)) {
                        await harvestV1Adapter[action.action](liquidityPool, underlyingTokenAddress, amount);
                      }
                      limit = await harvestV1Adapter.maxDepositAmount(liquidityPool, underlyingTokenAddress);
                      defaultFundAmount = defaultFundAmount.lte(limit) ? defaultFundAmount : limit;
                      break;
                    }
                    case "fundTestDeFiAdapterContract": {
                      const underlyingBalance: BigNumber = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      if (ValidatedPairTokens.includes(underlyingTokenAddress)) {
                        defaultFundAmount = defaultFundAmount.div(BigNumber.from(10).pow(10));
                      } else if (ValidatedCurveTokens.includes(underlyingTokenAddress)) {
                        defaultFundAmount = defaultFundAmount.div(BigNumber.from(10).pow(6));
                      }
                      if (underlyingBalance.lt(defaultFundAmount)) {
                        await fundWalletToken(
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
                      if (rewardTokenAddress !== ADDRESS_ZERO) {
                        let rewardTokenBalance: BigNumber = await rewardTokenERC20Instance!.balanceOf(
                          testDeFiAdapter.address,
                        );
                        if (rewardTokenBalance.lte(0)) {
                          await fundWalletToken(
                            hre,
                            rewardTokenERC20Instance!.address,
                            users["owner"],
                            getDefaultFundAmountInDecimal(rewardTokenAddress, rewardTokenDecimals),
                            timestamp,
                            testDeFiAdapter.address,
                          );
                          rewardTokenBalance = await rewardTokenERC20Instance!.balanceOf(testDeFiAdapter.address);
                          expect(rewardTokenBalance).to.be.gt(0);
                        }
                      }
                      break;
                    }
                    case "testGetDepositAllCodes(address,address,address)": {
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](underlyingTokenAddress, liquidityPool, adapterAddress);
                      break;
                    }
                    case "testGetDepositSomeCodes(address,address,address,uint256)": {
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](
                        underlyingTokenAddress,
                        liquidityPool,
                        adapterAddress,
                        underlyingBalanceBefore,
                      );
                      break;
                    }
                    case "testGetWithdrawAllCodes(address,address,address)": {
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](underlyingTokenAddress, liquidityPool, adapterAddress);
                      break;
                    }
                    case "testGetWithdrawSomeCodes(address,address,address,uint256)": {
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      const lpTokenBalance = await await harvestV1Adapter.getLiquidityPoolTokenBalance(
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
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      rewardTokenBalanceBefore = await rewardTokenERC20Instance!.balanceOf(testDeFiAdapter.address);
                      try {
                        await adapterPrerequisites.harvestCodeProvider.rewardBalanceInUnderlyingTokens(
                          rewardTokenAddress,
                          underlyingTokenAddress,
                          rewardTokenBalanceBefore,
                        );
                      } catch (e) {
                        this.skip();
                      }
                      await testDeFiAdapter[action.action](liquidityPool, underlyingTokenAddress, adapterAddress);
                      break;
                    }
                    case "testGetHarvestSomeCodes(address,address,address,uint256)": {
                      underlyingBalanceBefore = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      rewardTokenBalanceBefore = await rewardTokenERC20Instance!.balanceOf(testDeFiAdapter.address);
                      try {
                        await adapterPrerequisites.harvestCodeProvider.rewardBalanceInUnderlyingTokens(
                          rewardTokenAddress,
                          underlyingTokenAddress,
                          rewardTokenBalanceBefore,
                        );
                      } catch (e) {
                        this.skip();
                      }
                      await testDeFiAdapter[action.action](
                        liquidityPool,
                        underlyingTokenAddress,
                        adapterAddress,
                        rewardTokenBalanceBefore,
                      );
                      break;
                    }
                    case "getUnclaimedRewardTokenAmount(address,address,address)": {
                      const unclaimedRewardTokenAmount = await harvestV1Adapter[action.action](
                        testDeFiAdapter.address,
                        liquidityPool,
                        ADDRESS_ZERO,
                      );
                      const expectedUnclaimedRewardTokenAmount = await stakingVaultInstance.earned(
                        testDeFiAdapter.address,
                      );
                      expect(unclaimedRewardTokenAmount).to.be.eq(expectedUnclaimedRewardTokenAmount);
                      break;
                    }
                    case "testGetClaimRewardTokenCode(address,address)": {
                      rewardTokenBalanceBefore = await rewardTokenERC20Instance!.balanceOf(testDeFiAdapter.address);
                      await testDeFiAdapter[action.action](liquidityPool, harvestV1Adapter.address);
                      break;
                    }
                    case "testGetStakeAllCodes(address,address,address)": {
                      liquidityPoolTokenBalanceStakeBefore = await stakingVaultInstance.balanceOf(
                        testDeFiAdapter.address,
                      );
                      await testDeFiAdapter[action.action](liquidityPool, underlyingTokenAddress, adapterAddress);
                      break;
                    }
                    case "testGetStakeSomeCodes(address,uint256,address)": {
                      liquidityPoolTokenBalanceBefore = await ERC20VaultInstance.balanceOf(testDeFiAdapter.address);
                      liquidityPoolTokenBalanceStakeBefore = await stakingVaultInstance.balanceOf(
                        testDeFiAdapter.address,
                      );
                      await testDeFiAdapter[action.action](
                        liquidityPool,
                        liquidityPoolTokenBalanceBefore,
                        adapterAddress,
                      );
                      break;
                    }
                    case "wait10000Seconds": {
                      await hre.network.provider.send("evm_setNextBlockTimestamp", [previousBlockTimestamp + 10000]);
                      await hre.network.provider.send("evm_mine");
                      break;
                    }
                    case "testGetUnstakeAllCodes(address,address)": {
                      await testDeFiAdapter[action.action](liquidityPool, adapterAddress);
                      const liquidityPoolTokenBalanceStakeAfter = await stakingVaultInstance.balanceOf(
                        testDeFiAdapter.address,
                      );
                      expect(liquidityPoolTokenBalanceStakeAfter).to.be.eq(0);
                      break;
                    }
                    case "testGetUnstakeSomeCodes(address,uint256,address)": {
                      liquidityPoolTokenBalanceBefore = await ERC20VaultInstance.balanceOf(testDeFiAdapter.address);
                      liquidityPoolTokenBalanceStakeBefore = await stakingVaultInstance.balanceOf(
                        testDeFiAdapter.address,
                      );
                      await testDeFiAdapter[action.action](
                        liquidityPool,
                        liquidityPoolTokenBalanceStakeBefore,
                        adapterAddress,
                      );
                      break;
                    }
                    case "testGetUnstakeAndWithdrawAllCodes(address,address,address)": {
                      await testDeFiAdapter[action.action](liquidityPool, underlyingTokenAddress, adapterAddress);
                      const liquidityPoolTokenBalanceStakeAfter = await stakingVaultInstance.balanceOf(
                        testDeFiAdapter.address,
                      );
                      const liquidityPoolTokenBalanceAfter = await ERC20VaultInstance.balanceOf(
                        testDeFiAdapter.address,
                      );
                      expect(liquidityPoolTokenBalanceStakeAfter).to.be.eq(0);
                      expect(liquidityPoolTokenBalanceAfter).to.be.eq(0);
                      break;
                    }
                    case "testGetUnstakeAndWithdrawSomeCodes(address,address,uint256,address)": {
                      liquidityPoolTokenBalanceStakeBefore = await stakingVaultInstance.balanceOf(
                        testDeFiAdapter.address,
                      );
                      await testDeFiAdapter[action.action](
                        liquidityPool,
                        underlyingTokenAddress,
                        liquidityPoolTokenBalanceStakeBefore,
                        adapterAddress,
                      );
                      const liquidityPoolTokenBalanceStakeAfter = await stakingVaultInstance.balanceOf(
                        testDeFiAdapter.address,
                      );
                      const liquidityPoolTokenBalanceAfter = await ERC20VaultInstance.balanceOf(
                        testDeFiAdapter.address,
                      );
                      expect(liquidityPoolTokenBalanceStakeAfter).to.be.eq(0);
                      expect(liquidityPoolTokenBalanceAfter).to.be.eq(0);
                      break;
                    }
                    case "getUnderlyingTokens(address,address)": {
                      const expectedUnderlyingAddress = await harvestV1Adapter[action.action](
                        liquidityPool,
                        ADDRESS_ZERO,
                      );
                      const underlyingAddress = await vaultInstance.underlying();
                      expect([getAddress(expectedUnderlyingAddress[0])]).to.have.members([
                        getAddress(underlyingAddress),
                      ]);
                      break;
                    }
                    case "calculateAmountInLPToken(address,address,uint256)": {
                      const amountInLPToken = await harvestV1Adapter[action.action](
                        ADDRESS_ZERO,
                        liquidityPool,
                        defaultFundAmount,
                      );
                      const pricePerFullShare = await vaultInstance.getPricePerFullShare();
                      const expectedAmountInLPToken = defaultFundAmount
                        .mul(BigNumber.from(10).pow(decimals))
                        .div(BigNumber.from(pricePerFullShare));
                      expect(amountInLPToken).to.be.eq(expectedAmountInLPToken);
                      break;
                    }
                    case "getPoolValue(address,address)": {
                      const poolValue = await harvestV1Adapter[action.action](liquidityPool, ADDRESS_ZERO);
                      const expectedPoolValue = await vaultInstance.underlyingBalanceWithInvestment();
                      expect(poolValue).to.be.eq(expectedPoolValue);
                      break;
                    }
                    case "getLiquidityPoolToken(address,address)": {
                      const liquidityPoolFromAdapter = await harvestV1Adapter[action.action](
                        ADDRESS_ZERO,
                        liquidityPool,
                      );
                      expect(getAddress(liquidityPoolFromAdapter)).to.be.eq(getAddress(liquidityPool));
                      break;
                    }
                  }
                }
                for (const action of story.getActions) {
                  switch (action.action) {
                    case "getLiquidityPoolTokenBalance(address,address,address)": {
                      const expectedValue = action.expectedValue;
                      const lpTokenBalance = await harvestV1Adapter[action.action](
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      const poolValue = await harvestV1Adapter["getPoolValue(address,address)"](
                        liquidityPool,
                        underlyingTokenAddress,
                      );
                      const existingMode = await harvestV1Adapter.maxDepositProtocolMode();
                      if (existingMode == 0) {
                        const existingDepositAmount: BigNumber = await harvestV1Adapter.maxDepositAmount(
                          liquidityPool,
                          underlyingTokenAddress,
                        );
                        if (existingDepositAmount.eq(0)) {
                          expect(lpTokenBalance).to.be.eq(0);
                        } else {
                          expect(lpTokenBalance).to.be.gt(0);
                        }
                      } else {
                        const existingPoolPct: BigNumber = await harvestV1Adapter.maxDepositPoolPct(liquidityPool);
                        const existingProtocolPct: BigNumber = await harvestV1Adapter.maxDepositProtocolPct();
                        if ((existingPoolPct.eq(0) && existingProtocolPct.eq(0)) || poolValue.eq(0)) {
                          expect(lpTokenBalance).to.be.eq(0);
                        } else {
                          expectedValue == "=0"
                            ? expect(lpTokenBalance).to.be.eq(0)
                            : expect(lpTokenBalance).to.be.gt(0);
                        }
                      }
                      break;
                    }
                    case "balanceOf(address)": {
                      const expectedValue = action.expectedValue;
                      const underlyingBalanceAfter: BigNumber = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      if (underlyingBalanceBefore.lt(limit)) {
                        expectedValue == ">0"
                          ? expect(underlyingBalanceAfter).to.be.gt(underlyingBalanceBefore)
                          : expect(underlyingBalanceAfter).to.be.eq(0);
                      } else {
                        expectedValue == ">0"
                          ? expect(underlyingBalanceAfter).to.be.gt(underlyingBalanceBefore)
                          : expect(underlyingBalanceAfter).to.be.eq(underlyingBalanceBefore.sub(limit));
                      }
                      break;
                    }
                    case "getRewardTokenBalance(address)": {
                      const rewardTokenBalanceAfter: BigNumber = await rewardTokenERC20Instance!.balanceOf(
                        testDeFiAdapter.address,
                      );
                      const expectedValue = action.expectedValue;
                      expectedValue == ">0"
                        ? BigNumber.from(previousBlockTimestamp).lt(
                            await stakingVaultInstance.lastTimeRewardApplicable(),
                          )
                          ? expect(rewardTokenBalanceAfter).to.be.gt(rewardTokenBalanceBefore)
                          : expect(rewardTokenBalanceAfter).to.be.eq(rewardTokenBalanceBefore)
                        : expectedValue == "=0"
                        ? expect(rewardTokenBalanceAfter).to.be.eq(0)
                        : expect(rewardTokenBalanceAfter).to.be.lt(rewardTokenBalanceBefore);
                      break;
                    }
                    case "getLiquidityPoolTokenBalanceStake(address,address)": {
                      const liquidityPoolTokenBalanceStakeAfter: BigNumber = await stakingVaultInstance.balanceOf(
                        testDeFiAdapter.address,
                      );
                      const expectedValue = action.expectedValue;
                      expectedValue == ">0"
                        ? expect(liquidityPoolTokenBalanceStakeAfter).to.be.gt(liquidityPoolTokenBalanceStakeBefore)
                        : expectedValue == "=0"
                        ? expect(liquidityPoolTokenBalanceStakeAfter).to.be.eq(0)
                        : expect(liquidityPoolTokenBalanceStakeAfter).to.be.lt(liquidityPoolTokenBalanceStakeBefore);
                      break;
                    }
                    case "isRedeemableAmountSufficient(address,address,address,uint256)": {
                      const expectedValue = action.expectedValue;
                      try {
                        await adapterPrerequisites.harvestCodeProvider.rewardBalanceInUnderlyingTokens(
                          rewardTokenAddress,
                          underlyingTokenAddress,
                          await harvestV1Adapter.getUnclaimedRewardTokenAmount(
                            testDeFiAdapter.address,
                            liquidityPool,
                            underlyingTokenAddress,
                          ),
                        );
                      } catch (e) {
                        this.skip();
                      }
                      const amountInUnderlyingToken: BigNumber = await harvestV1Adapter.getAllAmountInToken(
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      if (expectedValue == ">") {
                        const isRedeemableAmountSufficient = await harvestV1Adapter[action.action](
                          testDeFiAdapter.address,
                          underlyingTokenAddress,
                          liquidityPool,
                          amountInUnderlyingToken.add(BigNumber.from(10)),
                        );
                        expect(isRedeemableAmountSufficient).to.be.eq(false);
                      } else if (expectedValue == "<") {
                        const isRedeemableAmountSufficient = await harvestV1Adapter[action.action](
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
                    case "isRedeemableAmountSufficientStake(address,address,address,uint256)": {
                      const expectedValue = action.expectedValue;
                      try {
                        await adapterPrerequisites.harvestCodeProvider.rewardBalanceInUnderlyingTokens(
                          rewardTokenAddress,
                          underlyingTokenAddress,
                          await harvestV1Adapter.getUnclaimedRewardTokenAmount(
                            testDeFiAdapter.address,
                            liquidityPool,
                            underlyingTokenAddress,
                          ),
                        );
                      } catch (e) {
                        this.skip();
                      }
                      const amountInUnderlyingToken: BigNumber = await harvestV1Adapter.getAllAmountInTokenStake(
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      if (expectedValue == ">") {
                        const isRedeemableAmountSufficientStake = await harvestV1Adapter[action.action](
                          testDeFiAdapter.address,
                          underlyingTokenAddress,
                          liquidityPool,
                          amountInUnderlyingToken.add(BigNumber.from(10)),
                        );
                        expect(isRedeemableAmountSufficientStake).to.be.eq(false);
                      } else if (expectedValue == "<") {
                        const isRedeemableAmountSufficientStake = await harvestV1Adapter[action.action](
                          testDeFiAdapter.address,
                          underlyingTokenAddress,
                          liquidityPool,
                          +amountInUnderlyingToken > 0
                            ? amountInUnderlyingToken.sub(BigNumber.from(1))
                            : BigNumber.from(0),
                        );
                        expect(isRedeemableAmountSufficientStake).to.be.eq(true);
                      }
                      break;
                    }
                    case "calculateRedeemableLPTokenAmount(address,address,address,uint256)": {
                      try {
                        await adapterPrerequisites.harvestCodeProvider.rewardBalanceInUnderlyingTokens(
                          rewardTokenAddress,
                          underlyingTokenAddress,
                          await harvestV1Adapter.getUnclaimedRewardTokenAmount(
                            testDeFiAdapter.address,
                            liquidityPool,
                            underlyingTokenAddress,
                          ),
                        );
                      } catch (e) {
                        this.skip();
                      }
                      const lpTokenBalance: BigNumber = await harvestV1Adapter.getLiquidityPoolTokenBalance(
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      const balanceInToken: BigNumber = await harvestV1Adapter.getAllAmountInToken(
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      const testRedeemAmount: BigNumber = lpTokenBalance;
                      const redeemableLpTokenAmt = await harvestV1Adapter[action.action](
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                        testRedeemAmount,
                      );
                      const expectedRedeemableLpTokenAmt = lpTokenBalance
                        .mul(testRedeemAmount)
                        .div(balanceInToken)
                        .add(BigNumber.from(1));
                      expect(redeemableLpTokenAmt).to.be.eq(expectedRedeemableLpTokenAmt);
                      break;
                    }
                    case "calculateRedeemableLPTokenAmountStake(address,address,address,uint256)": {
                      try {
                        await adapterPrerequisites.harvestCodeProvider.rewardBalanceInUnderlyingTokens(
                          rewardTokenAddress,
                          underlyingTokenAddress,
                          await harvestV1Adapter.getUnclaimedRewardTokenAmount(
                            testDeFiAdapter.address,
                            liquidityPool,
                            underlyingTokenAddress,
                          ),
                        );
                      } catch (e) {
                        this.skip();
                      }
                      const lpTokenBalance: BigNumber = await harvestV1Adapter.getLiquidityPoolTokenBalance(
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      const balanceInToken: BigNumber = await harvestV1Adapter.getAllAmountInTokenStake(
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      const testRedeemAmount: BigNumber = lpTokenBalance;
                      const redeemableLpTokenAmt = await harvestV1Adapter[action.action](
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                        testRedeemAmount,
                      );
                      const expectedRedeemableLpTokenAmt = lpTokenBalance
                        .mul(testRedeemAmount)
                        .div(balanceInToken)
                        .add(BigNumber.from(1));
                      expect(redeemableLpTokenAmt).to.be.eq(expectedRedeemableLpTokenAmt);
                      break;
                    }
                    case "getAllAmountInToken(address,address,address)": {
                      try {
                        await adapterPrerequisites.harvestCodeProvider.rewardBalanceInUnderlyingTokens(
                          rewardTokenAddress,
                          underlyingTokenAddress,
                          await harvestV1Adapter.getUnclaimedRewardTokenAmount(
                            testDeFiAdapter.address,
                            liquidityPool,
                            underlyingTokenAddress,
                          ),
                        );
                      } catch (e) {
                        this.skip();
                      }
                      const amountInUnderlyingToken = await harvestV1Adapter[action.action](
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      const pricePerFullShare = await vaultInstance.getPricePerFullShare();
                      const lpTokenBalance = await ERC20VaultInstance.balanceOf(testDeFiAdapter.address);
                      let expectedAmountInUnderlyingToken: BigNumber = lpTokenBalance
                        .mul(BigNumber.from(pricePerFullShare))
                        .div(BigNumber.from(10).pow(decimals));
                      const unclaimedReward: BigNumber = await harvestV1Adapter.getUnclaimedRewardTokenAmount(
                        testDeFiAdapter.address,
                        liquidityPool,
                        ADDRESS_ZERO,
                      );
                      if (+unclaimedReward > 0) {
                        expectedAmountInUnderlyingToken = expectedAmountInUnderlyingToken.add(
                          await adapterPrerequisites["harvestCodeProvider"].rewardBalanceInUnderlyingTokens(
                            rewardTokenAddress,
                            underlyingTokenAddress,
                            unclaimedReward,
                          ),
                        );
                      }
                      expect(+amountInUnderlyingToken).to.be.eq(+expectedAmountInUnderlyingToken);
                      break;
                    }
                    case "getSomeAmountInToken(address,address,uint256)": {
                      try {
                        await adapterPrerequisites.harvestCodeProvider.rewardBalanceInUnderlyingTokens(
                          rewardTokenAddress,
                          underlyingTokenAddress,
                          await harvestV1Adapter.getUnclaimedRewardTokenAmount(
                            testDeFiAdapter.address,
                            liquidityPool,
                            underlyingTokenAddress,
                          ),
                        );
                      } catch (e) {
                        this.skip();
                      }
                      const lpTokenDecimals = await vaultInstance.decimals();
                      const lpTokenAmount = getDefaultFundAmountInDecimal(liquidityPool, lpTokenDecimals);
                      if (+lpTokenAmount > 0) {
                        const _amountInUnderlyingToken = await harvestV1Adapter[action.action](
                          ADDRESS_ZERO,
                          liquidityPool,
                          lpTokenAmount,
                        );
                        const pricePerFullShare = await vaultInstance.getPricePerFullShare();
                        const expectedAmountInUnderlyingToken = lpTokenAmount
                          .mul(pricePerFullShare)
                          .div(BigNumber.from(10).pow(lpTokenDecimals));
                        expect(_amountInUnderlyingToken).to.be.eq(expectedAmountInUnderlyingToken);
                      }
                      break;
                    }
                    case "getAllAmountInTokenStake(address,address,address)": {
                      try {
                        await adapterPrerequisites.harvestCodeProvider.rewardBalanceInUnderlyingTokens(
                          rewardTokenAddress,
                          underlyingTokenAddress,
                          await harvestV1Adapter.getUnclaimedRewardTokenAmount(
                            testDeFiAdapter.address,
                            liquidityPool,
                            underlyingTokenAddress,
                          ),
                        );
                      } catch (e) {
                        this.skip();
                      }
                      const amountInUnderlyingToken = await harvestV1Adapter[action.action](
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      const lpTokenBalanceStake = await stakingVaultInstance.balanceOf(testDeFiAdapter.address);
                      const pricePerFullShare = await vaultInstance.getPricePerFullShare();
                      let expectedAmountInUnderlyingToken: BigNumber = lpTokenBalanceStake
                        .mul(BigNumber.from(pricePerFullShare))
                        .div(BigNumber.from(10).pow(decimals));
                      const unclaimedReward: BigNumber = await stakingVaultInstance.earned(testDeFiAdapter.address);
                      if (+unclaimedReward > 0) {
                        expectedAmountInUnderlyingToken = expectedAmountInUnderlyingToken.add(
                          await adapterPrerequisites["harvestCodeProvider"].rewardBalanceInUnderlyingTokens(
                            rewardTokenAddress,
                            underlyingTokenAddress,
                            unclaimedReward,
                          ),
                        );
                      }
                      expect(+amountInUnderlyingToken).to.be.eq(+expectedAmountInUnderlyingToken);
                      break;
                    }
                  }
                }
                for (const action of story.cleanActions) {
                  switch (action.action) {
                    case "testGetUnstakeAllCodes(address,address)": {
                      await testDeFiAdapter[action.action](liquidityPool, adapterAddress);
                      break;
                    }
                    case "testGetWithdrawAllCodes(address,address,address)": {
                      await testDeFiAdapter[action.action](underlyingTokenAddress, liquidityPool, adapterAddress);
                      break;
                    }
                    case "testGetUnstakeAndWithdrawAllCodes(address,address,address)": {
                      await testDeFiAdapter[action.action](liquidityPool, underlyingTokenAddress, adapterAddress);
                      break;
                    }
                  }
                }
                for (const action of story.getActions) {
                  switch (action.action) {
                    case "getLiquidityPoolTokenBalance(address,address,address)": {
                      const lpTokenBalance = await harvestV1Adapter[action.action](
                        testDeFiAdapter.address,
                        underlyingTokenAddress,
                        liquidityPool,
                      );
                      expect(+lpTokenBalance).to.be.eq(0);
                      break;
                    }
                    case "balanceOf(address)": {
                      const underlyingBalance: BigNumber = await ERC20Instance.balanceOf(testDeFiAdapter.address);
                      expect(+underlyingBalance).to.be.gt(0);
                      break;
                    }
                    case "getLiquidityPoolTokenBalanceStake(address,address)": {
                      const liquidityPoolTokenBalanceStakeAfter: BigNumber = await stakingVaultInstance.balanceOf(
                        testDeFiAdapter.address,
                      );
                      expect(+liquidityPoolTokenBalanceStakeAfter).to.be.eq(0);
                      break;
                    }
                  }
                }
              });
            }
          }
        }
        for (let i = 0; i < testDeFiAdapterScenario.adapterStandaloneStories.length; i++) {
          it(`${testDeFiAdapterScenario?.adapterStandaloneStories[i].description}`, async function () {
            const story = testDeFiAdapterScenario.adapterStandaloneStories[i];
            for (const action of story.setActions) {
              switch (action.action) {
                case "canStake(address)": {
                  const canStake = await harvestV1Adapter[action.action](ADDRESS_ZERO);
                  expect(canStake).to.be.eq(true);
                  break;
                }
                case "setLiquidityPoolToStakingVault(address,address)": {
                  if (action.expect == "success") {
                    await harvestV1Adapter
                      .connect(users[action.executer!])
                      [action.action](dummyContracts["liquidityPool"].address, dummyContracts["stakingVault"].address);
                  } else {
                    if (action.message === "!_liquidityPool.isContract()") {
                      const { isInvalidAddress } = action.args as TEST_DEFI_ADAPTER_ARGUMENTS;
                      await expect(
                        harvestV1Adapter
                          .connect(users[action.executer!])
                          [action.action](
                            isInvalidAddress === "zero" ? ADDRESS_ZERO : ownerAddress,
                            dummyContracts["stakingVault"].address,
                          ),
                      ).to.be.revertedWith(action.message);
                    } else if (action.message === "!_stakingVault.isContract()") {
                      const { isInvalidAddress } = action.args as TEST_DEFI_ADAPTER_ARGUMENTS;
                      await expect(
                        harvestV1Adapter
                          .connect(users[action.executer!])
                          [action.action](
                            dummyContracts["liquidityPool"].address,
                            isInvalidAddress === "zero" ? ADDRESS_ZERO : ownerAddress,
                          ),
                      ).to.be.revertedWith(action.message);
                    } else {
                      await expect(
                        harvestV1Adapter
                          .connect(users[action.executer!])
                          [action.action](
                            dummyContracts["liquidityPool"].address,
                            dummyContracts["stakingVault"].address,
                          ),
                      ).to.be.revertedWith(action.message!);
                    }
                  }
                  break;
                }
              }
            }
          });
        }
      }
    }
  });
});
