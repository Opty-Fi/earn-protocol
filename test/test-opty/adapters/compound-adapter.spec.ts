import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import hre from "hardhat";
import { ethers } from "@weiroll/weiroll.js/node_modules/ethers";
import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";

import { LiquidityPool, PoolItem } from "./types";
import { Contract as weirollContract, Planner as weirollPlanner } from "@weiroll/weiroll.js";
import { setTokenBalanceInStorage } from "../utils";
import CompoundAdapterParticulars from "@optyfi/defi-legos/ethereum/compound";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";

import {
  ICompound,
  ERC20,
  CompoundAdapter,
  CompoundAdapter__factory,
  ERC20__factory,
  IComptroller,
  TestDeFiAdapterWeiroll,
  VaultHelperMainnet,
  VaultHelperMainnet__factory,
} from "../../../typechain";
import { CompoundAdapter as CompoundAdapterClass } from "../../../helpers/adapters/ethereum/CompoundAdapter";
const { pools }: { pools: LiquidityPool } = CompoundAdapterParticulars;

import { Signers } from "../../../helpers/utils";

import { COMPOUND_ADAPTER_NAME } from "../../../helpers/constants/adapters";
import { ReturnValue } from "../../../helpers/type";
import { uniswapV3Router, ETH } from "../../../helpers/constants/utils";

chai.use(solidity);

describe(`${COMPOUND_ADAPTER_NAME} Unit test`, () => {
  before(async function () {
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await hre.ethers.getSigners();
    this.signers.deployer = signers[0];
    this.signers.alice = signers[3];
    const Lib = await hre.ethers.getContractFactory("contracts/protocol/lib/CommandBuilder.sol:CommandBuilder");
    const lib = await Lib.deploy();
    await lib.deployed();
    const TESTADAPTER = await hre.ethers.getContractFactory("TestDeFiAdapterWeiroll", {
      signer: signers[0],
      libraries: {
        CommandBuilder: lib.address,
      },
    });
    this.testAdapter = <TestDeFiAdapterWeiroll>await TESTADAPTER.deploy();
    const vaultHelperMainnetFactory: VaultHelperMainnet__factory = await hre.ethers.getContractFactory(
      "VaultHelperMainnet",
    );
    this.vaultHelperMainnet = <VaultHelperMainnet>(
      await vaultHelperMainnetFactory.deploy(EthereumTokens.WRAPPED_TOKENS.WETH, uniswapV3Router)
    );
    this.optyOracle = await hre.ethers.getContractAt(
      "contracts/utils/optyfi-oracle/contracts/OptyFiOracle.sol:OptyFiOracle",
      "0xC77AFEf1deeeF80Eb814aD159c93B28026FEbbe2",
    );
  });
  Object.keys(pools).map((token: string) => {
    const poolItem: PoolItem = pools[token];
    shouldBeHaveLikeCompoundAdapter(token, poolItem);
  });
});

function shouldBeHaveLikeCompoundAdapter(token: string, pool: PoolItem): void {
  describe(`${token}, pool address : ${pool.pool}, lpToken address: ${pool.lpToken}`, async function () {
    const { tokens, lpToken } = pool;
    let compound: ICompound;
    let comptroller: IComptroller;
    let lpTokenContract: ERC20;
    let erc20Contract: ERC20;
    let compoundAdapterClass: CompoundAdapterClass;
    let rewardContract: ERC20;
    const inputToken = tokens[0] === ETH ? EthereumTokens.WRAPPED_TOKENS.WETH : tokens[0];
    let compoundAdapter: CompoundAdapter;

    let vaultHelperMainnetContract: weirollContract;
    const outputTokenContract = weirollContract.createContract(new ethers.Contract(lpToken, ERC20__factory.abi));
    const inputTokenContract = weirollContract.createContract(new ethers.Contract(inputToken, ERC20__factory.abi));
    before(async function () {
      vaultHelperMainnetContract = weirollContract.createContract(
        new ethers.Contract(this.vaultHelperMainnet.address, VaultHelperMainnet__factory.abi),
      );
      compoundAdapter = <CompoundAdapter>(
        await hre.ethers.getContractAt(CompoundAdapter__factory.abi, "0x9680624ad6bf5a34ce496a483400585136c575a4")
      );
      erc20Contract = await hre.ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", inputToken);
      lpTokenContract = await hre.ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", lpToken);
      compound = await hre.ethers.getContractAt("ICompound", pool.pool);
      comptroller = await hre.ethers.getContractAt("IComptroller", await compound.comptroller());
      compoundAdapterClass = new CompoundAdapterClass(this.vaultHelperMainnet, this.optyOracle.address);
      rewardContract = await hre.ethers.getContractAt(
        "@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20",
        await compoundAdapter.getRewardToken(lpToken),
      );

      if (await comptroller.mintGuardianPaused(compound.address)) {
        this.skip();
      }
    });
    it("1. getDepositPlan() should deposit successfully", async function () {
      await setTokenBalanceInStorage(erc20Contract, this.testAdapter.address, "10");

      const depositPlanner = new weirollPlanner();

      const beforeERC20Value = await erc20Contract.balanceOf(this.testAdapter.address);
      const beforeLPValue = await lpTokenContract.balanceOf(this.testAdapter.address);

      const inputTokenAmount = <ReturnValue>(
        depositPlanner.add(inputTokenContract["balanceOf(address)"](this.testAdapter.address).staticcall())
      );

      compoundAdapterClass.getDepositPlan(
        depositPlanner,
        this.testAdapter,
        erc20Contract.address,
        compound.address,
        lpTokenContract.address,
        false,
        inputTokenAmount,
      );

      await this.testAdapter.giveAllowances(
        [erc20Contract.address],
        [tokens[0] !== ETH ? compound.address : this.vaultHelperMainnet.address],
      );

      await this.testAdapter.executeVMCommands(depositPlanner.plan().commands, depositPlanner.plan().state);

      const afterERC20Value = await erc20Contract.balanceOf(this.testAdapter.address);
      const afterLPValue = await lpTokenContract.balanceOf(this.testAdapter.address);
      expect(afterERC20Value).to.be.lt(beforeERC20Value);
      expect(afterLPValue).to.be.gt(beforeLPValue);
    });
    it("2. getAmountInInputTokenPlan() should return the value as expected", async function () {
      const depositPlanner = new weirollPlanner();
      const outputTokenAmount = <ReturnValue>(
        depositPlanner.add(outputTokenContract["balanceOf(address)"](this.testAdapter.address).staticcall())
      );
      const amountLP = <ReturnValue>(
        compoundAdapterClass.getAmountInInputTokenPlan(
          depositPlanner,
          this.testAdapter,
          erc20Contract.address,
          compound.address,
          lpTokenContract.address,
          false,
          outputTokenAmount,
        )
      );
      depositPlanner.add(vaultHelperMainnetContract["pureFunctionUint256(uint256)"](amountLP).staticcall());
      const value = await this.testAdapter.executeReadUint256Commands(
        depositPlanner.plan().commands,
        depositPlanner.plan().state,
        0,
      );
      expect(value).to.be.eq(
        await this.vaultHelperMainnet.calculateAmountInToken_Compound(
          lpTokenContract.address,
          await lpTokenContract.balanceOf(this.testAdapter.address),
        ),
      );
    });
    it("3. getAmountInOutputTokenPlan() should return the value as expected", async function () {
      const depositPlanner = new weirollPlanner();
      const inputTokenAmount = <ReturnValue>(
        depositPlanner.add(inputTokenContract["balanceOf(address)"](this.testAdapter.address).staticcall())
      );
      const amountLP = <ReturnValue>(
        compoundAdapterClass.getAmountInOutputTokenPlan(
          depositPlanner,
          this.testAdapter,
          erc20Contract.address,
          compound.address,
          lpTokenContract.address,
          false,
          inputTokenAmount,
        )
      );
      depositPlanner.add(vaultHelperMainnetContract["pureFunctionUint256(uint256)"](amountLP).staticcall());
      const value = await this.testAdapter.executeReadUint256Commands(
        depositPlanner.plan().commands,
        depositPlanner.plan().state,
        0,
      );
      expect(value).to.be.eq(
        await this.vaultHelperMainnet.calculateAmountInLPToken_Compound(
          lpTokenContract.address,
          await erc20Contract.balanceOf(this.testAdapter.address),
        ),
      );
    });
    it("4. getOutputTokenBalancePlan() should return the value as expected", async function () {
      const depositPlanner = new weirollPlanner();
      const amountLP = <ReturnValue>(
        compoundAdapterClass.getOutputTokenBalancePlan(
          depositPlanner,
          this.testAdapter,
          erc20Contract.address,
          compound.address,
          lpTokenContract.address,
          false,
        )
      );
      depositPlanner.add(vaultHelperMainnetContract["pureFunctionUint256(uint256)"](amountLP).staticcall());
      const value = await this.testAdapter.executeReadUint256Commands(
        depositPlanner.plan().commands,
        depositPlanner.plan().state,
        1,
      );
      expect(value).to.be.eq(
        await this.vaultHelperMainnet.getERC20Balance(lpTokenContract.address, this.testAdapter.address),
      );
    });
    it("5. getOutputTokenBalance() should return the value as expected", async function () {
      const value = await compoundAdapterClass.getOutputTokenBalance(
        this.testAdapter,
        erc20Contract.address,
        compound.address,
        lpTokenContract.address,
        false,
        hre.ethers.provider,
      );
      expect(value).to.be.eq(
        await this.vaultHelperMainnet.getERC20Balance(lpTokenContract.address, this.testAdapter.address),
      );
    });
    it("6. getValueInInputToken() should return the value as expected", async function () {
      const outputTokenAmount = await lpTokenContract.balanceOf(this.testAdapter.address);
      const value = await compoundAdapterClass.getValueInInputToken(
        this.testAdapter,
        erc20Contract.address,
        compound.address,
        lpTokenContract.address,
        outputTokenAmount,
        false,
        hre.ethers.provider,
      );
      const exchangeRateStored = await compound.exchangeRateStored();
      const calculatedValue = BigNumber.from(outputTokenAmount).mul(exchangeRateStored).div(parseEther("1"));
      expect(value).to.be.eq(calculatedValue);
    });
    it("7. getValueInOutputToken() should return the value as expected", async function () {
      const inputTokenAmount = await erc20Contract.balanceOf(this.testAdapter.address);
      const value = await compoundAdapterClass.getValueInOutputToken(
        this.testAdapter,
        erc20Contract.address,
        compound.address,
        lpTokenContract.address,
        inputTokenAmount,
        false,
        hre.ethers.provider,
      );
      const exchangeRateStored = await compound.exchangeRateStored();
      const calculatedValue = BigNumber.from(inputTokenAmount).mul(parseEther("1")).div(exchangeRateStored);
      expect(value).to.be.eq(calculatedValue);
    });
    it("8. getClaimRewardsPlan() should claim successfully", async function () {
      const compSupplySpeeds = await comptroller.compSupplySpeeds(lpToken);

      if (BigNumber.from(compSupplySpeeds).eq(0)) {
        this.skip();
      }
      const depositPlanner = new weirollPlanner();

      const beforeRewardValue = await rewardContract.balanceOf(this.testAdapter.address);

      compoundAdapterClass.getClaimRewardsPlan(
        depositPlanner,
        this.testAdapter,
        erc20Contract.address,
        compound.address,
        lpTokenContract.address,
      );

      await this.testAdapter.executeVMCommands(depositPlanner.plan().commands, depositPlanner.plan().state);

      const afterRewardValue = await rewardContract.balanceOf(this.testAdapter.address);

      expect(afterRewardValue).to.be.gt(beforeRewardValue);
    });
    it("9. getHarvestRewardsPlan() should harvest successfully", async function () {
      const depositPlanner = new weirollPlanner();
      const tokenPrice = await this.optyOracle.getTokenPrice(rewardContract.address, erc20Contract.address);
      if (BigNumber.from(tokenPrice).eq(0)) {
        this.skip();
      }
      const beforeRewardValue = await rewardContract.balanceOf(this.testAdapter.address);

      compoundAdapterClass.getHarvestRewardsPlan(depositPlanner, this.testAdapter, erc20Contract.address);

      await this.testAdapter.executeVMCommands(depositPlanner.plan().commands, depositPlanner.plan().state);

      const afterRewardValue = await rewardContract.balanceOf(this.testAdapter.address);
      expect(afterRewardValue).to.be.lt(beforeRewardValue);
    });
  });
}
