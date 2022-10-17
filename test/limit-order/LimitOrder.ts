import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import { deployments, ethers, network } from "hardhat";
import ethereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { Signers } from "../../helpers/utils";
import { describeBehaviorOfLimitOrder } from "./spec/LimitOrder.behavior";
import {
  Vault,
  OptyFiOracle,
  IOps__factory,
  ITaskTreasury,
  ITaskTreasury__factory,
  IUniswapV2Router02,
  IUniswapV2Router02__factory,
  OptyFiOracle__factory,
  Vault__factory,
  ISwapRouter,
  ISwapRouter__factory,
  LimitOrder__factory,
  ERC20Permit__factory,
  ERC20__factory,
  Registry__factory,
  StrategyProvider__factory,
  LimitOrder,
  StrategyProvider,
  ERC20Permit,
  ERC20,
  Registry,
} from "../../typechain";
import { StrategiesByTokenByChain, vaultConfigRP2 } from "../../helpers/data/adapter-with-strategies";
import { eEVMNetwork, NETWORKS_CHAIN_ID, NETWORKS_CHAIN_ID_HEX } from "../../helper-hardhat-config";
import { generateTokenHashV2 } from "../../helpers/helpers";
import { setTokenBalanceInStorage } from "../test-opty/utils";
import { parseEther, parseUnits } from "ethers/lib/utils";

chai.use(solidity);

const UniswapV2Router02Address = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D"; //mainnet
const UniswapV3RouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564"; //mainnet
const Gelato_Network = "0x3CACa7b48D0573D793d3b0279b5F0029180E83b6"; // mainnet
const Gelato_Pokeme = "0xB3f5503f93d5Ef84b06993a1975B9D21B962892F"; // mainnet
const Gelato_Task_Treasury = "0x2807B4aE232b624023f87d0e237A3B1bf200Fd99"; // mainnet

const fork = process.env.FORK as eEVMNetwork;

describe("::LimitOrder Contracts", () => {
  let snapshotId: number;

  before(async function () {
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.deployer = signers[0];
    this.signers.admin = signers[1];
    this.signers.alice = signers[3];
    this.signers.bob = signers[4];
    this.signers.eve = signers[10];
    this.signers.gelatoNetworkSigner = await ethers.getSigner(Gelato_Network);
    const aaveInvestVaultAddress = (await deployments.get("opAAVE-Invst")).address;
    const usdcSaveVaultAddress = (await deployments.get("opUSDC-Save")).address;
    this.opAAVEInvst = <Vault>await ethers.getContractAt(Vault__factory.abi, aaveInvestVaultAddress);
    this.opUSDCSave = <Vault>await ethers.getContractAt(Vault__factory.abi, usdcSaveVaultAddress);
    this.usdc = <ERC20Permit>await ethers.getContractAt(ERC20Permit__factory.abi, ethereumTokens.PLAIN_TOKENS.USDC);
    this.aave = <ERC20>await ethers.getContractAt(ERC20__factory.abi, ethereumTokens.REWARD_TOKENS.AAVE);
    this.uniV2Router = <IUniswapV2Router02>(
      await ethers.getContractAt(IUniswapV2Router02__factory.abi, UniswapV2Router02Address)
    );
    this.uniV3Router = <ISwapRouter>await ethers.getContractAt(ISwapRouter__factory.abi, UniswapV3RouterAddress);
    this.gelatoOps = await ethers.getContractAt(IOps__factory.abi, Gelato_Pokeme);
    this.gelatoTaskTreasury = <ITaskTreasury>(
      await ethers.getContractAt(ITaskTreasury__factory.abi, Gelato_Task_Treasury)
    );
    this.limitOrder = <LimitOrder>(
      await ethers.getContractAt(LimitOrder__factory.abi, (await deployments.get("LimitOrder")).address)
    );
    this.registry = <Registry>(
      await ethers.getContractAt(Registry__factory.abi, (await deployments.get("RegistryProxy")).address)
    );
    this.signers.strategyOperator = await ethers.getSigner(await this.registry.strategyOperator());
    this.signers.governance = await ethers.getSigner(await this.registry.governance());
    this.strategyProvider = <StrategyProvider>(
      await ethers.getContractAt(StrategyProvider__factory.abi, (await deployments.get("StrategyProvider")).address)
    );
    let tx = await this.limitOrder
      .connect(this.signers.deployer)
      .giveAllowances(
        [this.aave.address, this.aave.address, this.usdc.address],
        [UniswapV2Router02Address, UniswapV3RouterAddress, this.opUSDCSave.address],
      );
    await tx.wait(1);
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [this.signers.gelatoNetworkSigner.address],
    });
    this.optyfiOracle = <OptyFiOracle>(
      await ethers.getContractAt(OptyFiOracle__factory.abi, (await deployments.get("OptyFiOracle")).address)
    );

    // opAAVE-Invst vault
    let steps = StrategiesByTokenByChain[NETWORKS_CHAIN_ID[fork]]["Invest"]["AAVE"][
      "aave-DEPOSIT-Compound-cAAVE"
    ].strategy.map(item => ({
      pool: item.contract,
      outputToken: item.outputToken,
      isBorrow: item.isBorrow,
    }));
    tx = await this.strategyProvider
      .connect(this.signers.strategyOperator)
      .setBestStrategy(
        "2",
        generateTokenHashV2([ethereumTokens.REWARD_TOKENS.AAVE], NETWORKS_CHAIN_ID_HEX[fork]),
        steps,
      );
    await tx.wait(1);
    await setTokenBalanceInStorage(this.aave, this.signers.alice.address, "200");
    tx = await this.aave.connect(this.signers.alice).approve(this.opAAVEInvst.address, parseEther("100"));
    await tx.wait(1);
    tx = await this.opAAVEInvst.connect(this.signers.governance).setVaultConfiguration(vaultConfigRP2);
    await tx.wait(1);
    tx = await this.opAAVEInvst
      .connect(this.signers.alice)
      .userDepositVault(this.signers.alice.address, parseEther("100"), 0, "0x", []);
    await tx.wait(1);
    tx = await this.opAAVEInvst.connect(this.signers.alice).rebalance();
    await tx.wait(1);
    // opUSDC-Save vault
    steps = StrategiesByTokenByChain[NETWORKS_CHAIN_ID[fork]]["Save"]["USDC"][
      "usdc-DEPOSIT-Compound-cUSDC"
    ].strategy.map(item => ({
      pool: item.contract,
      outputToken: item.outputToken,
      isBorrow: item.isBorrow,
    }));
    tx = await this.strategyProvider
      .connect(this.signers.strategyOperator)
      .setBestStrategy(
        "0",
        generateTokenHashV2([ethereumTokens.PLAIN_TOKENS.USDC], NETWORKS_CHAIN_ID_HEX[fork]),
        steps,
      );
    await tx.wait(1);
    await setTokenBalanceInStorage(this.usdc, this.signers.bob.address, "100");
    tx = await this.usdc.connect(this.signers.bob).approve(this.opUSDCSave.address, parseUnits("100", 6));
    await tx.wait(1);
    tx = await this.opUSDCSave
      .connect(this.signers.bob)
      .userDepositVault(this.signers.bob.address, parseUnits("100", 6), 0, "0x", []);
    await tx.wait(1);
    await this.opUSDCSave.connect(this.signers.bob).rebalance();
    await tx.wait(1);
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describeBehaviorOfLimitOrder();
});
