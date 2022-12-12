import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { deployContract, solidity } from "ethereum-waffle";
import { artifacts, ethers } from "hardhat";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { Contract as weirollContract, Planner as weirollPlanner } from "@weiroll/weiroll.js";
import { Signers } from "../../helpers/utils";
import {
  CompoundAdapter,
  CompoundAdapter__factory,
  ERC20,
  ERC20__factory,
  ICompound,
  ICompound__factory,
  TestVault,
  VaultWeiroll,
} from "../../typechain";
import { setTokenBalanceInStorage } from "./utils";
import { parseUnits } from "ethers/lib/utils";
import { Contract } from "ethers";
import chai, { expect } from "chai";

chai.use(solidity);

describe("VaultWeiroll", async function () {
  let vaultWeirollUSDC: VaultWeiroll;
  let usdc: ERC20;
  let cUSDC: ICompound;
  let cToken: ERC20;
  let compoundAdapter: CompoundAdapter;
  let testVault: TestVault;
  let compoundContract: Contract;
  let cTokenContract: Contract;
  let vaultWeirollContract: Contract;
  let compoundAdapterContract: Contract;
  let testVaultContract: Contract;
  let usdcContract: Contract;
  before(async function () {
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.deployer = signers[0];
    this.signers.alice = signers[3];
    vaultWeirollUSDC = <VaultWeiroll>(
      await deployContract(this.signers.deployer, await artifacts.readArtifact("VaultWeiroll"), [
        EthereumTokens.PLAIN_TOKENS.USDC,
        "6",
        "USD Coin",
        "USDC",
      ])
    );
    testVault = <TestVault>await deployContract(this.signers.deployer, await artifacts.readArtifact("TestVault"));
    usdc = await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.PLAIN_TOKENS.USDC);
    cUSDC = <ICompound>await ethers.getContractAt(ICompound__factory.abi, "0x39AA39c021dfbaE8faC545936693aC917d5E7563");
    cToken = <ERC20>await ethers.getContractAt(ERC20__factory.abi, "0x39AA39c021dfbaE8faC545936693aC917d5E7563");
    compoundAdapter = <CompoundAdapter>(
      await ethers.getContractAt(CompoundAdapter__factory.abi, "0x9680624ad6bf5a34ce496a483400585136c575a4")
    );
    await setTokenBalanceInStorage(usdc, this.signers.alice.address, "20");
    await usdc.connect(this.signers.alice).approve(vaultWeirollUSDC.address, parseUnits("20", "6"));
    await vaultWeirollUSDC.connect(this.signers.alice).giveAllowances([usdc.address], [cUSDC.address]);
    compoundContract = weirollContract.createContract(cUSDC);
    cTokenContract = weirollContract.createContract(cToken);
    vaultWeirollContract = weirollContract.createContract(vaultWeirollUSDC);
    compoundAdapterContract = weirollContract.createContract(compoundAdapter);
    testVaultContract = weirollContract.createContract(testVault);
    usdcContract = weirollContract.createContract(usdc);
  });

  it("userDepositVault", async function () {
    // oraValueUT planner
    const oraValueUTPlanner = new weirollPlanner();
    const lpTokenBalance = oraValueUTPlanner.add(cTokenContract.balanceOf(vaultWeirollUSDC.address).staticcall());
    const amountInToken = oraValueUTPlanner.add(
      compoundAdapterContract.getSomeAmountInToken(usdc.address, cUSDC.address, lpTokenBalance).staticcall(),
    );
    oraValueUTPlanner.add(testVaultContract.pureFunctionUint256(amountInToken).staticcall());
    await vaultWeirollUSDC.setOraValueUT(oraValueUTPlanner.plan().commands, oraValueUTPlanner.plan().state, 0);

    // lastStepBalanceLP planner
    const lastStepBalanceLPPlanner = new weirollPlanner();
    const lastStepBalance = lastStepBalanceLPPlanner.add(
      cTokenContract.balanceOf(vaultWeirollUSDC.address).staticcall(),
    );
    lastStepBalanceLPPlanner.add(testVaultContract.pureFunctionUint256(lastStepBalance).staticcall());
    await vaultWeirollUSDC.setLastStepBalanceLP(
      lastStepBalanceLPPlanner.plan().commands,
      lastStepBalanceLPPlanner.plan().state,
    );

    // depositToStrategy planner
    const depositToStrategyPlanner = new weirollPlanner();
    const usdcBalance = depositToStrategyPlanner.add(usdcContract.balanceOf(vaultWeirollUSDC.address).staticcall());
    depositToStrategyPlanner.add(compoundContract["mint(uint256)"](usdcBalance));
    await vaultWeirollUSDC.setDepositToStrategy(
      depositToStrategyPlanner.plan().commands,
      depositToStrategyPlanner.plan().state,
    );

    // oraValueLP planner
    const oraValueLPPlanner = new weirollPlanner();
    const expectedStratWithdrawUT = oraValueLPPlanner.add(
      vaultWeirollContract.getCacheExpectedStratWithdrawUT().staticcall(),
    );
    const amountInLP = oraValueLPPlanner.add(
      compoundAdapterContract
        .calculateAmountInLPToken(usdc.address, cUSDC.address, expectedStratWithdrawUT)
        .staticcall(),
    );
    oraValueLPPlanner.add(testVaultContract.pureFunctionUint256(amountInLP).staticcall());
    await vaultWeirollUSDC.setOraValueLP(oraValueLPPlanner.plan().commands, oraValueLPPlanner.plan().state);

    // withdrawSomeFromStrategy planner
    const withdrawSomeFromStrategyPlanner = new weirollPlanner();
    const oraAmountLP = withdrawSomeFromStrategyPlanner.add(vaultWeirollContract.getCacheOraAmountLP().staticcall());
    withdrawSomeFromStrategyPlanner.add(compoundContract["redeem(uint256)"](oraAmountLP));
    await vaultWeirollUSDC.setWithdrawSomeFromStrategy(
      withdrawSomeFromStrategyPlanner.plan().commands,
      withdrawSomeFromStrategyPlanner.plan().state,
    );

    // withdrawAllFromStrategy planner
    const withdrawAllFromStrategyPlanner = new weirollPlanner();
    const lpTokenBalanceAll = withdrawAllFromStrategyPlanner.add(
      vaultWeirollContract.getLastStrategyStepBalance().staticcall(),
    );
    withdrawAllFromStrategyPlanner.add(compoundContract["redeem(uint256)"](lpTokenBalanceAll));
    await vaultWeirollUSDC.setWithdrawAllFromStrategy(
      withdrawAllFromStrategyPlanner.plan().commands,
      withdrawAllFromStrategyPlanner.plan().state,
    );

    // user deposit no strategy
    await expect(vaultWeirollUSDC.connect(this.signers.alice).userDepositVault(parseUnits("20", "6")))
      .to.emit(vaultWeirollUSDC, "Transfer")
      .withArgs(ethers.constants.AddressZero, this.signers.alice.address, parseUnits("20", "6"));

    // user withdraw no strategy
    await expect(vaultWeirollUSDC.connect(this.signers.alice).userWithdrawVault(parseUnits("10", "6")))
      .to.emit(vaultWeirollUSDC, "Transfer")
      .withArgs(this.signers.alice.address, ethers.constants.AddressZero, parseUnits("10", "6"));
    expect(await await usdc.balanceOf(this.signers.alice.address)).to.eq(parseUnits("10", "6"));

    // deposit all to strategy
    await vaultWeirollUSDC.connect(this.signers.alice).vaultDepositAllToStrategy();

    // last strategy step balance
    console.log("last strategy step balance ", (await vaultWeirollUSDC.getLastStrategyStepBalance()).toString());

    // price per full share
    console.log("price per full share ", (await vaultWeirollUSDC.getPPS()).toString());

    // 2. user deposit
    await usdc.connect(this.signers.alice).approve(vaultWeirollUSDC.address, parseUnits("10", "6"));
    await expect(vaultWeirollUSDC.connect(this.signers.alice).userDepositVault(parseUnits("10", "6")))
      .to.emit(vaultWeirollUSDC, "Transfer")
      .withArgs(ethers.constants.AddressZero, this.signers.alice.address, parseUnits("10.000001", "6"));

    // 2. deposit all to strategy
    await vaultWeirollUSDC.connect(this.signers.alice).vaultDepositAllToStrategy();

    // 2. last strategy step balance
    console.log("last strategy step balance ", (await vaultWeirollUSDC.getLastStrategyStepBalance()).toString());

    // 2. price per full share
    console.log("price per full share ", (await vaultWeirollUSDC.getPPS()).toString());

    // 2. user withdraw
    console.log("balance USDC ", await usdc.balanceOf(this.signers.alice.address));
    await expect(await vaultWeirollUSDC.connect(this.signers.alice).userWithdrawVault(parseUnits("5", "6")))
      .to.emit(usdc, "Transfer")
      .withArgs(vaultWeirollUSDC.address, this.signers.alice.address, parseUnits("4.999999", "6"));
    console.log("balance USDC ", await usdc.balanceOf(this.signers.alice.address));
    console.log("PPS ", (await vaultWeirollUSDC.getPPS()).toString());
    console.log("Total Supply ", (await vaultWeirollUSDC.totalSupply()).toString());
    console.log("Last strategy step balance ", (await vaultWeirollUSDC.getLastStrategyStepBalance()).toString());
    console.log("withdraw all from strategy");
    await vaultWeirollUSDC.vaultWithdrawAllFromStrategy();
    console.log("balance USDC ", await usdc.balanceOf(this.signers.alice.address));
    console.log("PPS ", (await vaultWeirollUSDC.getPPS()).toString());
    console.log("Total Supply ", (await vaultWeirollUSDC.totalSupply()).toString());
    console.log("Last strategy step balance ", (await vaultWeirollUSDC.getLastStrategyStepBalance()).toString());
  });
});
