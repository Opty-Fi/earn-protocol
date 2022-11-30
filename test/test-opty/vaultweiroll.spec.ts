import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { deployContract, solidity } from "ethereum-waffle";
import { artifacts, ethers as ethers } from "hardhat";
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
  let vaultWeiroll: VaultWeiroll;
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
    vaultWeiroll = <VaultWeiroll>(
      await deployContract(this.signers.deployer, await artifacts.readArtifact("VaultWeiroll"), [
        EthereumTokens.PLAIN_TOKENS.USDC,
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
    await usdc.connect(this.signers.alice).approve(vaultWeiroll.address, parseUnits("20", "6"));
    await setTokenBalanceInStorage(cToken, vaultWeiroll.address, "20");
    await vaultWeiroll.connect(this.signers.alice).giveAllowances([usdc.address], [cUSDC.address]);
    compoundContract = weirollContract.createContract(cUSDC);
    cTokenContract = weirollContract.createContract(cToken);
    vaultWeirollContract = weirollContract.createContract(vaultWeiroll);
    compoundAdapterContract = weirollContract.createContract(compoundAdapter);
    testVaultContract = weirollContract.createContract(testVault);
    usdcContract = weirollContract.createContract(usdc);
  });

  it("userDepositVault", async function () {
    // oraValueUT planner
    const oraValueUTPlanner = new weirollPlanner();
    const lpTokenBalance = oraValueUTPlanner.add(cTokenContract.balanceOf(vaultWeiroll.address).staticcall());
    const amountInToken = oraValueUTPlanner.add(
      compoundAdapterContract.getSomeAmountInToken(usdc.address, cUSDC.address, lpTokenBalance).staticcall(),
    );
    oraValueUTPlanner.add(testVaultContract.pureFunctionUint256(amountInToken).staticcall());
    await vaultWeiroll.setOraValueUT(oraValueUTPlanner.plan().commands, oraValueUTPlanner.plan().state);

    // lastStepBalanceLP planner
    const lastStepBalanceLPPlanner = new weirollPlanner();
    const lastStepBalance = lastStepBalanceLPPlanner.add(cTokenContract.balanceOf(vaultWeiroll.address).staticcall());
    lastStepBalanceLPPlanner.add(testVaultContract.pureFunctionUint256(lastStepBalance).staticcall());
    await vaultWeiroll.setLastStepBalanceLP(
      lastStepBalanceLPPlanner.plan().commands,
      lastStepBalanceLPPlanner.plan().state,
    );

    // depositToStrategy planner
    const depositToStrategyPlanner = new weirollPlanner();
    const usdcBalance = depositToStrategyPlanner.add(usdcContract.balanceOf(vaultWeiroll.address).staticcall());
    depositToStrategyPlanner.add(compoundContract["mint(uint256)"](usdcBalance));
    await vaultWeiroll.setDepositToStrategy(
      depositToStrategyPlanner.plan().commands,
      depositToStrategyPlanner.plan().state,
    );

    // user deposit no strategy
    await expect(vaultWeiroll.connect(this.signers.alice).userDepositVault(parseUnits("20", "6")))
      .to.emit(vaultWeiroll, "Transfer")
      .withArgs(ethers.constants.AddressZero, this.signers.alice.address, parseUnits("20", "6"));

    // deposit all to strategy
    await vaultWeiroll.connect(this.signers.alice).vaultDepositAllToStrategy();

    // last strategy step balance
    console.log("last strategy step balance ", (await vaultWeiroll.getLastStrategyStepBalance()).toString());

    // price per full share
    console.log("price per full share ", (await vaultWeiroll.getPPS()).toString());

    // 2. user deposit
    await setTokenBalanceInStorage(usdc, this.signers.alice.address, "20");
    await usdc.connect(this.signers.alice).approve(vaultWeiroll.address, parseUnits("20", "6"));
    await expect(vaultWeiroll.connect(this.signers.alice).userDepositVault(parseUnits("20", "6")))
      .to.emit(vaultWeiroll, "Transfer")
      .withArgs(ethers.constants.AddressZero, this.signers.alice.address, parseUnits("19.556383", "6"));

    // 2. deposit all to strategy
    await vaultWeiroll.connect(this.signers.alice).vaultDepositAllToStrategy();

    // 2. last strategy step balance
    console.log("last strategy step balance ", (await vaultWeiroll.getLastStrategyStepBalance()).toString());

    // 2. price per full share
    console.log("price per full share ", (await vaultWeiroll.getPPS()).toString());
  });
});
