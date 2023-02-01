import { ethers, deployments, artifacts, getChainId } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai, { expect } from "chai";
import { deployContract, solidity } from "ethereum-waffle";
import { BigNumber, ContractReceipt, Event, Contract } from "ethers";
import BN from "bignumber.js";
import { getAddress, parseUnits } from "ethers/lib/utils";
import { Planner as weirollPlanner, Contract as weirollContract } from "@weiroll/weiroll.js";
import { ethers as weirollEthers } from "@weiroll/weiroll.js/node_modules/ethers";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import UniswapV2 from "@optyfi/defi-legos/ethereum/uniswapV2/index";
import {
  assertVaultConfiguration,
  getAccountsMerkleProof,
  getAccountsMerkleRoot,
  getDepositFeePct,
  getDepositFeeUT,
  getSoliditySHA3Hash,
  getWithdrawalFeePct,
  getWithdrawalFeeUT,
  Signers,
  to_10powNumber_BN,
} from "../../helpers/utils";
import {
  ERC20,
  ERC20__factory,
  Registry,
  Registry__factory,
  Vault,
  Vault__factory,
  TestVault,
  ERC20Permit,
  ERC20Permit__factory,
  StrategyRegistry__factory,
  StrategyRegistry,
  SwapHelper__factory,
  AaveV1Helper__factory,
  CompoundHelper__factory,
  CurveHelper__factory,
  VaultHelper,
  VaultHelper__factory,
} from "../../typechain";
import { getPermitSignature, getPermitLegacySignature, setTokenBalanceInStorage } from "./utils";
import { generateStrategyHashV2, generateTokenHashV2 } from "../../helpers/helpers";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";
import { eEVMNetwork, NETWORKS_CHAIN_ID_HEX } from "../../helper-hardhat-config";
import { Artifact } from "hardhat/types";
import { StrategyManager } from "../../helpers/strategy-manager";
import { StrategiesByTokenByChain, strategyHashReadIndexes } from "../../helpers/data/adapter-with-strategies";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;

const EIP712_DOMAIN = ethers.utils.id(
  "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)",
);
const EIP712_REVISION = ethers.utils.id("1");

const USER_WITHDRAW_INSUFFICIENT_VT = "1";
const RISK_PROFILE_EXISTS = "3";
const EOA_NOT_WHITELISTED = "4";
const TOTAL_VALUE_LOCKED_LIMIT_UT = "5";
const USER_DEPOSIT_CAP_UT = "6";
const VAULT_EMERGENCY_SHUTDOWN = "7";
const VAULT_PAUSED = "8";
const UNDERLYING_TOKENS_HASH_EXISTS = "10";
const TRANSFER_TO_THIS_CONTRACT = "11";
const ZERO_ADDRESS_NOT_VALID = "16";
const INVALID_EXPIRATION = "17";
const INVALID_SIGNATURE = "18";
const LENGTH_MISMATCH = "19";

const usdcTokenHash = generateTokenHashV2([EthereumTokens.PLAIN_TOKENS.USDC], NETWORKS_CHAIN_ID_HEX[fork]);
const cUSDCStrategySteps = StrategiesByTokenByChain[fork]["Save"]["USDC"]["usdc-DEPOSIT-Compound-cUSDC"].strategy.map(
  item => ({
    pool: item.contract,
    outputToken: item.outputToken,
    isSwap: item.isSwap,
  }),
);
const cUSDCStrategyHash = generateStrategyHashV2(
  StrategiesByTokenByChain[fork]["Save"]["USDC"]["usdc-DEPOSIT-Compound-cUSDC"].strategy,
  usdcTokenHash,
);
const aUSDCV1StrategySteps = StrategiesByTokenByChain[fork]["Earn"]["USDC"]["usdc-DEPOSIT-AaveV1-aUSDC"].strategy.map(
  item => ({
    pool: item.contract,
    outputToken: item.outputToken,
    isSwap: item.isSwap,
  }),
);
const aUSDCV1StrategyHash = generateStrategyHashV2(
  StrategiesByTokenByChain[fork]["Earn"]["USDC"]["usdc-DEPOSIT-AaveV1-aUSDC"].strategy,
  usdcTokenHash,
);
const aUSDCV2StrategySteps = StrategiesByTokenByChain[fork]["Earn"]["USDC"]["usdc-DEPOSIT-AaveV2-aUSDC"].strategy.map(
  item => ({
    pool: item.contract,
    outputToken: item.outputToken,
    isSwap: item.isSwap,
  }),
);
const aUSDCV2StrategyHash = generateStrategyHashV2(
  StrategiesByTokenByChain[fork]["Earn"]["USDC"]["usdc-DEPOSIT-AaveV2-aUSDC"].strategy,
  usdcTokenHash,
);
describe(`::${fork}-Vault-rev7`, function () {
  before(async function () {
    await deployments.fixture();
    this.testVaultArtifact = <Artifact>await artifacts.readArtifact("TestVault");
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.deployer = signers[0];
    this.signers.admin = signers[1];
    this.signers.alice = signers[3];
    this.signers.bob = signers[4];
    this.signers.eve = signers[10];
    const REGISTRY_PROXY_ADDRESS = (await deployments.get("RegistryProxy")).address;
    const OPUSDCEARN_VAULT_ADDRESS = (await deployments.get("opUSDC-Earn_Proxy")).address;
    const DAISAVE_VAULT_ADDRESS = (await deployments.get("opDAI-Save_Proxy")).address;
    this.registry = <Registry>await ethers.getContractAt(Registry__factory.abi, REGISTRY_PROXY_ADDRESS);
    const operatorAddress = await this.registry.getOperator();
    const financeOperatorAddress = await this.registry.getFinanceOperator();
    const governanceAddress = await this.registry.getGovernance();
    const strategyOperatorAddress = await this.registry.getStrategyOperator();
    this.signers.operator = await ethers.getSigner(operatorAddress);
    this.signers.financeOperator = await ethers.getSigner(financeOperatorAddress);
    this.signers.governance = await ethers.getSigner(governanceAddress);
    this.signers.strategyOperator = await ethers.getSigner(strategyOperatorAddress);
    this.signers.riskOperator = await ethers.getSigner(await this.registry.riskOperator());
    this.strategyRegistry = <StrategyRegistry>(
      await ethers.getContractAt(StrategyRegistry__factory.abi, (await deployments.get("StrategyRegistry")).address)
    );
    this.opUSDCearn = <Vault>await ethers.getContractAt(Vault__factory.abi, OPUSDCEARN_VAULT_ADDRESS);
    this.opDAIsave = <Vault>await ethers.getContractAt(Vault__factory.abi, DAISAVE_VAULT_ADDRESS);
    this.vaultHelper = <VaultHelper>(
      await ethers.getContractAt(VaultHelper__factory.abi, (await deployments.get("VaultHelper")).address)
    );
    this.swapHelper = await ethers.getContractAt(
      SwapHelper__factory.abi,
      (
        await deployments.get("SwapHelper")
      ).address,
    );
    this.aaveV1Helper = await ethers.getContractAt(
      AaveV1Helper__factory.abi,
      (
        await deployments.get("AaveV1Helper")
      ).address,
    );
    this.compoundHelper = await ethers.getContractAt(
      CompoundHelper__factory.abi,
      (
        await deployments.get("CompoundHelper")
      ).address,
    );
    this.curveHelper = await ethers.getContractAt(
      CurveHelper__factory.abi,
      (
        await deployments.get("CurveHelper")
      ).address,
    );

    this.strategyManager = new StrategyManager(
      (await deployments.get("OptyFiOracle")).address,
      <Contract>this.vaultHelper,
      this.swapHelper,
      this.compoundHelper,
      this.aaveV1Helper,
      this.curveHelper,
    );

    this.usdc = <ERC20Permit>(
      await ethers.getContractAt(ERC20Permit__factory.abi, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address)
    );
    await setTokenBalanceInStorage(this.usdc, this.signers.admin.address, "20000");

    this.dai = <ERC20Permit>(
      await ethers.getContractAt(ERC20Permit__factory.abi, MULTI_CHAIN_VAULT_TOKENS[fork].DAI.address)
    );
    await setTokenBalanceInStorage(this.dai, this.signers.admin.address, "20000");

    this.testVault = <TestVault>await deployContract(this.signers.deployer, this.testVaultArtifact, []);

    // add cUSDC strategy
    const addcUSDCStrategyPlanTx = await this.strategyRegistry
      .connect(this.signers.strategyOperator)
      .addStrategyPlan(this.opUSDCearn.address, cUSDCStrategyHash, {
        oraValueUTPlan: {
          ...this.strategyManager.getOraValueUTPlan(this.usdc.address, cUSDCStrategySteps, this.opUSDCearn),
          outputIndex: strategyHashReadIndexes[cUSDCStrategyHash].oraValueUTIndex,
        },
        oraValueLPPlan: {
          ...this.strategyManager.getOraSomeValueLPPlan(this.usdc.address, cUSDCStrategySteps, this.opUSDCearn),
          outputIndex: strategyHashReadIndexes[cUSDCStrategyHash].oraValueLPIndex,
        },
        lastStepBalanceLPPlan: {
          ...this.strategyManager.getLastStrategyStepBalancePlan(
            this.usdc.address,
            cUSDCStrategySteps,
            this.opUSDCearn,
          ),
          outputIndex: strategyHashReadIndexes[cUSDCStrategyHash].lastStepLPBalanceIndex,
        },
        depositSomeToStrategyPlan: this.strategyManager.getDepositPlan(
          this.usdc.address,
          cUSDCStrategySteps,
          this.opUSDCearn,
        ),
        withdrawSomeFromStrategyPlan: this.strategyManager.getWithdrawPlan(
          this.usdc.address,
          cUSDCStrategySteps,
          this.opUSDCearn,
        ),
        claimRewardsPlan: this.strategyManager.getClaimRewardsPlan(
          this.usdc.address,
          cUSDCStrategySteps,
          this.opUSDCearn,
        ),
        harvestRewardsPlan: this.strategyManager.getHarvestRewardsPlan(
          this.usdc.address,
          cUSDCStrategySteps,
          this.opUSDCearn,
        ),
      });
    await addcUSDCStrategyPlanTx.wait(1);

    const addcUSDCStrategyTx = await this.opUSDCearn
      .connect(this.signers.strategyOperator)
      .addStrategy(cUSDCStrategyHash);
    await addcUSDCStrategyTx.wait(1);

    // add aUSDC v1 strategy

    const addaUSDCV1StrategyPlanTx = await this.strategyRegistry
      .connect(this.signers.strategyOperator)
      .addStrategyPlan(this.opUSDCearn.address, aUSDCV1StrategyHash, {
        oraValueUTPlan: {
          ...this.strategyManager.getOraValueUTPlan(this.usdc.address, aUSDCV1StrategySteps, this.opUSDCearn),
          outputIndex: strategyHashReadIndexes[aUSDCV1StrategyHash].oraValueUTIndex,
        },
        oraValueLPPlan: {
          ...this.strategyManager.getOraSomeValueLPPlan(this.usdc.address, aUSDCV1StrategySteps, this.opUSDCearn),
          outputIndex: strategyHashReadIndexes[aUSDCV1StrategyHash].oraValueLPIndex,
        },
        lastStepBalanceLPPlan: {
          ...this.strategyManager.getLastStrategyStepBalancePlan(
            this.usdc.address,
            aUSDCV1StrategySteps,
            this.opUSDCearn,
          ),
          outputIndex: strategyHashReadIndexes[aUSDCV1StrategyHash].lastStepLPBalanceIndex,
        },
        depositSomeToStrategyPlan: this.strategyManager.getDepositPlan(
          this.usdc.address,
          aUSDCV1StrategySteps,
          this.opUSDCearn,
        ),
        withdrawSomeFromStrategyPlan: this.strategyManager.getWithdrawPlan(
          this.usdc.address,
          aUSDCV1StrategySteps,
          this.opUSDCearn,
        ),
        claimRewardsPlan: this.strategyManager.getClaimRewardsPlan(
          this.usdc.address,
          aUSDCV1StrategySteps,
          this.opUSDCearn,
        ),
        harvestRewardsPlan: this.strategyManager.getHarvestRewardsPlan(
          this.usdc.address,
          aUSDCV1StrategySteps,
          this.opUSDCearn,
        ),
      });
    await addaUSDCV1StrategyPlanTx.wait(1);

    const addcUSDCV1StrategyTx = await this.opUSDCearn
      .connect(this.signers.strategyOperator)
      .addStrategy(aUSDCV1StrategyHash);
    await addcUSDCV1StrategyTx.wait(1);

    // add aUSDC v2 strategy

    const addaUSDCV2StrategyPlanTx = await this.strategyRegistry
      .connect(this.signers.strategyOperator)
      .addStrategyPlan(this.opUSDCearn.address, aUSDCV2StrategyHash, {
        oraValueUTPlan: {
          ...this.strategyManager.getOraValueUTPlan(this.usdc.address, aUSDCV2StrategySteps, this.opUSDCearn),
          outputIndex: strategyHashReadIndexes[aUSDCV2StrategyHash].oraValueUTIndex,
        },
        oraValueLPPlan: {
          ...this.strategyManager.getOraSomeValueLPPlan(this.usdc.address, aUSDCV2StrategySteps, this.opUSDCearn),
          outputIndex: strategyHashReadIndexes[aUSDCV2StrategyHash].oraValueLPIndex,
        },
        lastStepBalanceLPPlan: {
          ...this.strategyManager.getLastStrategyStepBalancePlan(
            this.usdc.address,
            aUSDCV2StrategySteps,
            this.opUSDCearn,
          ),
          outputIndex: strategyHashReadIndexes[aUSDCV2StrategyHash].lastStepLPBalanceIndex,
        },
        depositSomeToStrategyPlan: this.strategyManager.getDepositPlan(
          this.usdc.address,
          aUSDCV2StrategySteps,
          this.opUSDCearn,
        ),
        withdrawSomeFromStrategyPlan: this.strategyManager.getWithdrawPlan(
          this.usdc.address,
          aUSDCV2StrategySteps,
          this.opUSDCearn,
        ),
        claimRewardsPlan: this.strategyManager.getClaimRewardsPlan(
          this.usdc.address,
          aUSDCV2StrategySteps,
          this.opUSDCearn,
        ),
        harvestRewardsPlan: this.strategyManager.getHarvestRewardsPlan(
          this.usdc.address,
          aUSDCV2StrategySteps,
          this.opUSDCearn,
        ),
      });
    await addaUSDCV2StrategyPlanTx.wait(1);
    const addaUSDCV2StrategyTx = await this.opUSDCearn
      .connect(this.signers.strategyOperator)
      .addStrategy(aUSDCV2StrategyHash);
    await addaUSDCV2StrategyTx.wait(1);
  });

  describe(`${fork}-#constructor(address,string,string,string,string)`, function () {
    it(`name,symbol,decimals, domainSeparator as expected`, async function () {
      const expectedName = "OptyFi USDC Earn Vault";
      const expectedSymbol = "opUSDC-Earn";
      const expectedDomainSeparator = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["bytes32", "bytes32", "bytes32", "uint256", "address"],
          [EIP712_DOMAIN, ethers.utils.id(expectedName), EIP712_REVISION, await getChainId(), this.opUSDCearn.address],
        ),
      );
      expect(await this.opUSDCearn.name()).to.eq(expectedName);
      expect(await this.opUSDCearn.symbol()).to.eq(expectedSymbol);
      expect(await this.opUSDCearn.decimals()).to.eq(6);
      expect(await this.opUSDCearn._domainSeparator()).to.eq(expectedDomainSeparator);
      expect(await this.opUSDCearn.DOMAIN_SEPARATOR()).to.eq(expectedDomainSeparator);
    });

    it(`registry as expected`, async function () {
      expect(await this.opUSDCearn.registryContract()).to.eq((await deployments.get("RegistryProxy")).address);
    });

    it(`opTOKEN_REVISION as expected`, async function () {
      expect(await this.opUSDCearn.opTOKEN_REVISION()).to.eq("7");
    });
  });

  describe(`${fork}-#setValueControlParams(uint256,uint256,uint256)`, function () {
    it("fail setValueControlParams() by non Finance operator", async function () {
      await expect(
        this.opUSDCearn.connect(this.signers.bob).setValueControlParams("10000000000", "1000000000", "1000000000000"),
      ).to.be.revertedWith("caller is not the financeOperator");
    });

    it("setValueControlParams() by Finance operator", async function () {
      const tx = await this.opUSDCearn.connect(this.signers.financeOperator).setValueControlParams(
        "10000000000", // 10,000 USDC
        "1000000000", // 1000 USDC
        "1000000000000", // 1,000,000 USDC
      );
      const { events }: ContractReceipt = await tx.wait();
      const eventsArr = events as Event[];
      expect(eventsArr[0]).to.include({
        address: this.opUSDCearn.address,
        event: "LogUserDepositCapUT",
        eventSignature: "LogUserDepositCapUT(uint256,address)",
      });
      expect(eventsArr[0].args?.userDepositCapUT).to.eq("10000000000");
      expect(eventsArr[0].args?.caller).to.eq(this.signers.financeOperator.address);
      expect(eventsArr[1]).to.include({
        address: this.opUSDCearn.address,
        event: "LogMinimumDepositValueUT",
        eventSignature: "LogMinimumDepositValueUT(uint256,address)",
      });
      expect(eventsArr[1].args?.minimumDepositValueUT).to.eq("1000000000");
      expect(eventsArr[1].args?.caller).to.eq(this.signers.financeOperator.address);
      expect(eventsArr[2]).to.include({
        address: this.opUSDCearn.address,
        event: "LogTotalValueLockedLimitUT",
        eventSignature: "LogTotalValueLockedLimitUT(uint256,address)",
      });
      expect(eventsArr[2].args?.totalValueLockedLimitUT).to.eq("1000000000000");
      expect(eventsArr[2].args?.caller).to.eq(this.signers.financeOperator.address);
      expect(await this.opUSDCearn.userDepositCapUT()).to.eq("10000000000");
      expect(await this.opUSDCearn.minimumDepositValueUT()).to.eq("1000000000");
      expect(await this.opUSDCearn.totalValueLockedLimitUT()).to.eq("1000000000000");
    });
  });

  describe(`${fork}-#setVaultConfiguration(uint256)`, function () {
    it("fail setVaultConfiguration() by non governance", async function () {
      const _vaultConfiguration = BigNumber.from(
        "3533694129556768659166595001485837031654967793751237934691363855473639425",
      );
      await expect(
        this.opUSDCearn.connect(this.signers.bob).setVaultConfiguration(_vaultConfiguration),
      ).to.be.revertedWith("caller is not having governance");
    });

    it("setVaultConfiguration() by governance", async function () {
      // (0-15) Deposit fee UT = 1 USDC = 0001
      // (16-31) Deposit fee % = 0.05% = 0005
      // (32-47) Withdrawal fee UT = 1 USDC = 0001
      // (48-63) Withdrawal fee % = 0.05% = 0005
      // (64-79) Max vault value jump % = 0.01% = 0001
      // (80-239) vault fee address = 0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5
      // (240-247) risk profile code = 2 = 02
      // (248) emergency shutdown = false = 0
      // (249) unpause = true = 1
      // (250) allow whitelisted state = true = 1
      // (251) - 0
      // (252) - 0
      // (253) - 0
      // (254) - 0
      // (255) - 0
      // 0x060219cDeDF678aBE15a921a2AB26C9Bc8867fc35cE500010005000100050001
      const _vaultConfiguration = BigNumber.from(
        "2717588881137297196073629478594403830637904256449768059589359748078440349697",
      );
      await this.opUSDCearn.connect(this.signers.governance).setVaultConfiguration(_vaultConfiguration);
      const vaultConfiguration = await this.opUSDCearn.vaultConfiguration();
      assertVaultConfiguration(
        vaultConfiguration,
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("1"),
        "0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5",
        BigNumber.from("2"),
        false,
        true,
        true,
      );
    });

    it("setVaultConfiguration() - MaxVaultValueJump call by governance", async function () {
      // (64-79) Max vault value jump % = 1% = 0064
      await this.opUSDCearn
        .connect(this.signers.governance)
        .setVaultConfiguration("2717588881137297196073629478594403830637904256449768061415587411375685959681");
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("100"),
        "0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5",
        BigNumber.from("2"),
        false,
        true,
        true,
      );
    });

    it("setVaultConfiguration - AllowWhitelistedState() call by governance", async function () {
      // (250) allow whitelisted state = false = 0
      await this.opUSDCearn
        .connect(this.signers.governance)
        .setVaultConfiguration("908337486804231642580332837833655270430560746049134248299062661252043309057");

      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("100"),
        "0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5",
        BigNumber.from("2"),
        false,
        true,
        false,
      );
    });
  });

  describe(`${fork}-#setUserDepositCapUT(uint256)`, function () {
    it("fails setUserDepositCapUT() call by non finance operator", async function () {
      await expect(this.opUSDCearn.connect(this.signers.bob).setUserDepositCapUT("4000")).to.be.revertedWith(
        "caller is not the financeOperator",
      );
    });

    it("setUserDepositCapUT() call by finance operator", async function () {
      await expect(this.opUSDCearn.connect(this.signers.operator).setUserDepositCapUT("2000000000"))
        .to.emit(this.opUSDCearn, "LogUserDepositCapUT")
        .withArgs("2000000000", this.signers.operator.address);
      expect(await this.opUSDCearn.userDepositCapUT()).to.eq("2000000000");
    });
  });

  describe(`${fork}-#setMinimumDepositValueUT(uint256)`, function () {
    it("fails setMinimumDepositValueUT() call by non finance operator", async function () {
      await expect(this.opUSDCearn.connect(this.signers.bob).setMinimumDepositValueUT("1000")).to.be.revertedWith(
        "caller is not the financeOperator",
      );
    });

    it("setMinimumDepositValueUT() call by finance operator", async function () {
      await expect(
        this.opUSDCearn
          .connect(this.signers.operator)
          .setMinimumDepositValueUT(BigNumber.from("1000").mul(to_10powNumber_BN("6"))),
      )
        .to.emit(this.opUSDCearn, "LogMinimumDepositValueUT")
        .withArgs("1000000000", this.signers.operator.address);
      expect(await this.opUSDCearn.minimumDepositValueUT()).to.eq(BigNumber.from("1000").mul(to_10powNumber_BN("6")));
    });
  });

  describe(`${fork}-#setTotalValueLockedLimitUT(uint256)`, function () {
    it("fails setTotalValueLockedLimitUT() call by non finance operator", async function () {
      await expect(
        this.opUSDCearn.connect(this.signers.bob).setTotalValueLockedLimitUT("100000000"),
      ).to.be.revertedWith("caller is not the financeOperator");
    });

    it("setTotalValueLockedLimitUT() call by finance operator", async function () {
      await expect(
        this.opUSDCearn
          .connect(this.signers.operator)
          .setTotalValueLockedLimitUT(BigNumber.from("10000").mul(to_10powNumber_BN("6"))),
      )
        .to.emit(this.opUSDCearn, "LogTotalValueLockedLimitUT")
        .withArgs("10000000000", this.signers.operator.address);
      expect(await this.opUSDCearn.totalValueLockedLimitUT()).to.eq(
        BigNumber.from("10000").mul(to_10powNumber_BN("6")),
      );
    });
  });

  describe(`${fork}-#setWhitelistedAccountsRoot(bytes32)`, function () {
    it("fails setWhitelistedAccountsRoot() call by non governance", async function () {
      await expect(
        this.opUSDCearn.connect(this.signers.bob).setWhitelistedAccountsRoot(ethers.constants.HashZero),
      ).to.be.revertedWith("caller is not having governance");
    });

    it("setWhitelistedAccountsRoot() call by governance", async function () {
      const _root = getAccountsMerkleRoot([this.signers.alice.address, this.signers.bob.address]);
      await this.opUSDCearn.connect(this.signers.governance).setWhitelistedAccountsRoot(_root);
      expect(await this.opUSDCearn.whitelistedAccountsRoot()).to.eq(_root);
    });
  });

  describe(`${fork}-#setEmergencyShutdown(bool)`, function () {
    it("fail setEmergencyShutdown() call by non governance", async function () {
      await expect(this.opUSDCearn.connect(this.signers.bob).setEmergencyShutdown(true)).to.be.revertedWith(
        "caller is not having governance",
      );
    });

    it("setEmergencyShutdown() call by governance", async function () {
      await expect(this.opUSDCearn.connect(this.signers.governance).setEmergencyShutdown(true))
        .to.emit(this.opUSDCearn, "LogEmergencyShutdown")
        .withArgs(true, this.signers.governance.address);
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("100"),
        "0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5",
        BigNumber.from("2"),
        true,
        true,
        false,
      );
    });
  });

  describe(`${fork}-#setUnpaused(bool)`, function () {
    it("fail setUnpaused() call by non governance", async function () {
      await expect(this.opUSDCearn.connect(this.signers.bob).setUnpaused(false)).to.be.revertedWith(
        "caller is not having governance",
      );
    });

    it("setUnpaused() call by governance (null strategy)", async function () {
      await expect(this.opUSDCearn.connect(this.signers.governance).setUnpaused(true))
        .to.emit(this.opUSDCearn, "LogUnpause")
        .withArgs(true, this.signers.governance.address);
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("100"),
        "0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5",
        BigNumber.from("2"),
        true,
        true,
        false,
      );
    });
  });

  describe(`${fork}-#setRiskProfileCode(uint256)`, function () {
    it("fail setRiskProfileCode() call by non governance", async function () {
      await expect(this.opUSDCearn.connect(this.signers.bob).setRiskProfileCode(1)).to.be.revertedWith(
        "caller is not having governance",
      );
    });

    it("fail setRiskProfileCode(), non-existant code", async function () {
      await expect(
        this.opUSDCearn.connect(this.signers.bob).connect(this.signers.operator).setRiskProfileCode(3),
      ).to.be.revertedWith(RISK_PROFILE_EXISTS);
    });

    it("setRiskProfileCode() call by governance", async function () {
      await this.opUSDCearn.connect(this.signers.governance).setRiskProfileCode("1");
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("100"),
        "0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5",
        BigNumber.from("1"),
        true,
        true,
        false,
      );
    });
  });

  describe(`${fork}-#adminCall(bytes32[],bytes[])`, function () {
    it("fail adminCall() call by non governance", async function () {
      const planner = new weirollPlanner();
      const usdcContract = weirollContract.createContract(
        new weirollEthers.Contract(this.usdc.address, this.usdc.interface),
      );
      planner.add(usdcContract["approve(address,uint256)"](this.signers.alice.address, "200"));
      const { commands, state } = planner.plan();
      await expect(this.opUSDCearn.connect(this.signers.bob).adminCall(commands, state)).to.be.revertedWith(
        "caller is not having governance",
      );
    });
  });

  describe(`${fork}-#getLastStrategyStepBalanceLP(DataTypes.StrategyStep[])`, function () {
    it("getLastStrategyStepBalanceLP() return 0", async function () {
      expect(await this.opUSDCearn.getLastStrategyStepBalanceLP(cUSDCStrategyHash)).to.eq("0");
      expect(await this.opUSDCearn.getLastStrategyStepBalanceLP(aUSDCV1StrategyHash)).to.eq("0");
      expect(await this.opUSDCearn.getLastStrategyStepBalanceLP(aUSDCV2StrategyHash)).to.eq("0");
    });
  });

  describe(`${fork}-#vaultDepositSomeToStrategy(bytes32,uint256)`, function () {
    it("fail vaultDepositSomeToStrategy(bytes32,uint256) call, vault is paused", async function () {
      // (249) unpause = false = 0
      await expect(this.opUSDCearn.connect(this.signers.governance).setUnpaused(false))
        .to.emit(this.opUSDCearn, "LogUnpause")
        .withArgs(false, this.signers.governance.address);
      await expect(this.opUSDCearn.vaultDepositSomeToStrategy(cUSDCStrategyHash, 1)).to.be.revertedWith(VAULT_PAUSED);
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("100"),
        "0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5",
        BigNumber.from("1"),
        true,
        false,
        false,
      );
    });

    it("vaultDepositSomeToStrategy(bytes32,uint256), deposit asset into strategy", async function () {
      await this.opUSDCearn.connect(this.signers.governance).setEmergencyShutdown(false);
      await this.opUSDCearn.connect(this.signers.governance).setUnpaused(true);
      const _totalSupply = BigNumber.from("1000").mul(to_10powNumber_BN("6"));
      await this.opUSDCearn.vaultDepositSomeToStrategy(cUSDCStrategyHash, 1);
      const _expectedVaultUsdcBalance = BigNumber.from("0");
      expect(await this.usdc.balanceOf(this.opUSDCearn.address)).to.eq(_expectedVaultUsdcBalance);
      const expectedlpTokenBalance = await this.strategyManager.getValueInOutputToken(
        this.usdc.address,
        cUSDCStrategySteps,
        this.opUSDCearn,
        _expectedVaultUsdcBalance,
        ethers.provider,
      );
      const _lpTokenAddress = cUSDCStrategySteps[0].outputToken;
      const _lpTokenInstance: ERC20 = <ERC20>await ethers.getContractAt(ERC20__factory.abi, _lpTokenAddress);
      const _actuallpTokenBalance = await _lpTokenInstance.balanceOf(this.opUSDCearn.address);
      expect(_actuallpTokenBalance).to.eq(expectedlpTokenBalance);
      const _allAmountInToken = await this.strategyManager.getValueInInputToken(
        this.usdc.address,
        cUSDCStrategySteps,
        this.opUSDCearn,
        _actuallpTokenBalance,
        ethers.provider,
      );
      const _expectedPricePerFullShare = _allAmountInToken.mul(to_10powNumber_BN("18")).div(_totalSupply);
      expect(await this.opUSDCearn.getPricePerFullShare()).to.eq(_expectedPricePerFullShare);
    });
  });

  describe(`${fork}-#balanceUT()`, function () {
    it("balanceUT() return 0", async function () {
      expect(await this.opUSDCearn.balanceUT()).to.eq("0");
    });
  });

  describe(`${fork}-#getPricePerFullShare()`, function () {
    it("getPricePerFullShare() return 0", async function () {
      expect(await this.opUSDCearn.getPricePerFullShare()).to.eq("0");
    });
  });

  describe(`${fork}-#userDepositPermitted(address,bool,uint256,uint256,bytes32[])`, function () {
    it("userDepositPermitted() return false,EOA_NOT_WHITELISTED", async function () {
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address],
        this.signers.eve.address,
      );
      // (250) allow whitelisted state = true = 1
      await this.opUSDCearn
        .connect(this.signers.governance)
        .setVaultConfiguration("2263509185489252423370722020903473772070240894952733989178334617643482677249");
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("100"),
        "0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5",
        BigNumber.from("1"),
        true,
        false,
        true,
      );
      expect(
        await this.opUSDCearn.userDepositPermitted(this.signers.eve.address, true, "1", "0", _proof),
      ).to.have.members([false, EOA_NOT_WHITELISTED]);
    });

    it("userDepositPermitted() return false,MINIMUM_USER_DEPOSIT_VALUE_UT", async function () {
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address],
        this.signers.alice.address,
      );
      expect(
        await this.opUSDCearn
          .connect(this.signers.alice)
          .userDepositPermitted(this.signers.alice.address, true, "100", "0", _proof),
      ).to.have.members([false, EOA_NOT_WHITELISTED]);
    });

    it("userDepositPermitted() return false,TOTAL_VALUE_LOCKED_LIMIT_UT", async function () {
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address],
        this.signers.alice.address,
      );
      expect(
        await this.opUSDCearn
          .connect(this.signers.alice)
          .userDepositPermitted(this.signers.alice.address, true, "100000000000", "0", _proof),
      ).to.have.members([false, TOTAL_VALUE_LOCKED_LIMIT_UT]);
    });

    it("userDepositPermitted() return false,USER_DEPOSIT_CAP_UT", async function () {
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address],
        this.signers.alice.address,
      );
      expect(
        await this.opUSDCearn
          .connect(this.signers.alice)
          .userDepositPermitted(this.signers.alice.address, true, "4000000000", "0", _proof),
      ).to.have.members([false, USER_DEPOSIT_CAP_UT]);
    });

    it('call userDepositPermitted() from EOA return true,""', async function () {
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address],
        this.signers.alice.address,
      );
      expect(
        await this.opUSDCearn
          .connect(this.signers.alice)
          .userDepositPermitted(this.signers.alice.address, true, "1500000000", "0", _proof),
      ).to.have.members([true, ""]);
    });

    it('call userDepositPermitted() from CA return true,""', async function () {
      const _accountRoot = getAccountsMerkleRoot([
        this.signers.alice.address,
        this.signers.bob.address,
        this.testVault.address,
      ]);
      await this.opUSDCearn.connect(this.signers.governance).setWhitelistedAccountsRoot(_accountRoot);
      const _accountProof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address],
        this.testVault.address,
      );
      expect(
        await this.testVault.testUserDepositPermitted(this.opUSDCearn.address, "1500000000", _accountProof),
      ).to.have.members([true, ""]);
    });
  });

  describe(`${fork}-#vaultDepositPermitted()`, function () {
    it("vaultDepositPermitted() return false,VAULT_PAUSED", async function () {
      expect(await this.opUSDCearn.vaultDepositPermitted()).to.have.members([false, VAULT_PAUSED]);
    });

    it("vaultDepositPermitted() return false,VAULT_EMERGENCY_SHUTDOWN", async function () {
      await expect(this.opUSDCearn.connect(this.signers.governance).setUnpaused(true))
        .to.emit(this.opUSDCearn, "LogUnpause")
        .withArgs(true, this.signers.governance.address);
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("100"),
        "0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5",
        BigNumber.from("1"),
        true,
        true,
        true,
      );
      expect(await this.opUSDCearn.vaultDepositPermitted()).to.have.members([false, VAULT_EMERGENCY_SHUTDOWN]);
    });

    it('vaultDepositPermitted() return true,""', async function () {
      // (248) emergency shutdown = false = 0
      // 249 unpause = true = 1
      // (250) allow whitelisted state = false = 0
      await this.opUSDCearn
        .connect(this.signers.governance)
        .setVaultConfiguration("906570639739453258250749540332912351914733262152258629340941055050750689281");
      expect(await this.opUSDCearn.vaultDepositPermitted()).to.have.members([true, ""]);
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("100"),
        "0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5",
        BigNumber.from("1"),
        false,
        true,
        false,
      );
    });
  });

  describe(`${fork}-#userDepositVault(address,uint256,bytes,bytes32[])`, function () {
    it("userDepositVault() using permit", async function () {
      const _proofs = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address],
        this.signers.alice.address,
      );
      // (0-15) Deposit fee UT = 0 USDC = 0000
      // (16-31) Deposit fee % = 0% = 0000
      // (32-47) Withdrawal fee UT = 0 USDC = 0000
      // (48-63) Withdrawal fee % = 0% = 0000
      // (80-239) vault fee address = 0000000000000000000000000000000000000000
      await this.opUSDCearn
        .connect(this.signers.governance)
        .setVaultConfiguration("906392544231311161076231617881117198619499239097192527361058388634069106688");
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("100"),
        "0x0000000000000000000000000000000000000000",
        BigNumber.from("1"),
        false,
        true,
        false,
      );
      const _depositAmountUSDC = BigNumber.from("1000").mul(to_10powNumber_BN("6"));
      const _depositFee = await this.opUSDCearn.calcDepositFeeUT(_depositAmountUSDC);
      const _depositAmountUSDCWithFee = _depositAmountUSDC.sub(_depositFee);
      const _previousBalance = await this.opUSDCearn.balanceOf(this.signers.alice.address);
      const _previousVaultBalance = await this.opUSDCearn.balanceUT();
      await this.opUSDCearn.connect(this.signers.financeOperator).setMinimumDepositValueUT(_depositAmountUSDC);
      const deadline = ethers.constants.MaxUint256;
      const { v, r, s } = await getPermitSignature(
        this.signers.alice,
        this.usdc,
        this.opUSDCearn.address,
        _depositAmountUSDC,
        deadline,
        { version: "2" },
      );
      const dataPermit = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint8", "bytes32", "bytes32"],
        [this.signers.alice.address, this.opUSDCearn.address, _depositAmountUSDC, deadline, v, r, s],
      );
      await this.usdc.connect(this.signers.admin).transfer(this.signers.alice.address, _depositAmountUSDC);
      await expect(
        this.opUSDCearn
          .connect(this.signers.alice)
          .userDepositVault(this.signers.alice.address, _depositAmountUSDC, dataPermit, _proofs),
      )
        .to.emit(this.opUSDCearn, "Transfer")
        .withArgs(ethers.constants.AddressZero, this.signers.alice.address, _depositAmountUSDCWithFee);
      expect(await this.usdc.balanceOf(this.opUSDCearn.address)).to.eq(
        _previousVaultBalance.add(_depositAmountUSDCWithFee),
      );
      expect(await this.opUSDCearn.totalSupply()).to.eq(_previousVaultBalance.add(_depositAmountUSDCWithFee));
      expect(await this.opUSDCearn.totalDeposits(this.signers.alice.address)).to.eq(
        _previousBalance.add(_depositAmountUSDCWithFee),
      );
      // the vault shares VT will be same as total supply is zero
      expect(await this.opUSDCearn.balanceOf(this.signers.alice.address)).to.eq(
        _previousBalance.add(_depositAmountUSDCWithFee),
      );
    });

    it("userDepositVault() using permit legacy", async function () {
      const _proofs = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address],
        this.signers.alice.address,
      );
      // (0-15) Deposit fee UT = 0 USDC = 0000
      // (16-31) Deposit fee % = 0% = 0000
      // (32-47) Withdrawal fee UT = 0 USDC = 0000
      // (48-63) Withdrawal fee % = 0% = 0000
      // (80-239) vault fee address = 0000000000000000000000000000000000000000
      await this.opDAIsave
        .connect(this.signers.governance)
        .setVaultConfiguration("906392544231311161076231617881117198619499239097192527361058388634069106688");
      assertVaultConfiguration(
        await this.opDAIsave.vaultConfiguration(),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("100"),
        "0x0000000000000000000000000000000000000000",
        BigNumber.from("1"),
        false,
        true,
        false,
      );
      await this.opDAIsave.connect(this.signers.financeOperator).setValueControlParams(
        parseUnits("10000", BigNumber.from(18)), // 10,000
        parseUnits("10000", BigNumber.from(18)), // 1,000
        parseUnits("1000000000000", BigNumber.from(18)), // 1,000,000
      );
      const _depositAmountDAI = BigNumber.from("1000").mul(to_10powNumber_BN("18"));
      const _depositFee = await this.opDAIsave.calcDepositFeeUT(_depositAmountDAI);
      const _depositAmountDAIWithFee = _depositAmountDAI.sub(_depositFee);
      const _previousBalance = await this.opDAIsave.balanceOf(this.signers.alice.address);
      const _previousVaultBalance = await this.opDAIsave.balanceUT();
      await this.opDAIsave.connect(this.signers.financeOperator).setMinimumDepositValueUT(_depositAmountDAI);
      const deadline = ethers.constants.MaxUint256;
      const { v, r, s } = await getPermitLegacySignature(
        this.signers.alice,
        this.dai,
        this.opDAIsave.address,
        deadline,
      );
      const dataPermit = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "bool", "uint8", "bytes32", "bytes32"],
        [this.signers.alice.address, this.opDAIsave.address, 0, deadline, true, v, r, s],
      );
      await this.dai.connect(this.signers.admin).transfer(this.signers.alice.address, _depositAmountDAI);
      await expect(
        this.opDAIsave
          .connect(this.signers.alice)
          .userDepositVault(this.signers.alice.address, _depositAmountDAI, dataPermit, _proofs),
      )
        .to.emit(this.opDAIsave, "Transfer")
        .withArgs(ethers.constants.AddressZero, this.signers.alice.address, _depositAmountDAIWithFee);
      expect(await this.dai.balanceOf(this.opDAIsave.address)).to.eq(
        _previousVaultBalance.add(_depositAmountDAIWithFee),
      );
      expect(await this.opDAIsave.totalSupply()).to.eq(_previousVaultBalance.add(_depositAmountDAIWithFee));
      expect(await this.opDAIsave.totalDeposits(this.signers.alice.address)).to.eq(
        _previousBalance.add(_depositAmountDAIWithFee),
      );
      // the vault shares VT will be same as total supply is zero
      expect(await this.opDAIsave.balanceOf(this.signers.alice.address)).to.eq(
        _previousBalance.add(_depositAmountDAIWithFee),
      );
    });

    it("fail userDepositVault() call, vault is paused", async function () {
      await this.opUSDCearn.connect(this.signers.governance).setUnpaused(false);
      const _accountRoot = getAccountsMerkleRoot([
        this.signers.alice.address,
        this.signers.bob.address,
        this.testVault.address,
        this.signers.eve.address,
      ]);
      await this.opUSDCearn.connect(this.signers.governance).setWhitelistedAccountsRoot(_accountRoot);
      await this.opUSDCearn.connect(this.signers.governance).setEmergencyShutdown(false);
      const usdcDepositAmount = BigNumber.from("1000").mul(to_10powNumber_BN("6"));
      await this.usdc.connect(this.signers.admin).transfer(this.signers.alice.address, usdcDepositAmount);
      await this.usdc.connect(this.signers.alice).approve(this.opUSDCearn.address, usdcDepositAmount);
      await expect(
        this.opUSDCearn
          .connect(this.signers.alice)
          .userDepositVault(this.signers.alice.address, usdcDepositAmount, [], []),
      ).to.be.revertedWith(VAULT_PAUSED);
    });

    it("first userDepositVault(), mint same shares as deposit", async function () {
      const _proofs = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address],
        this.signers.alice.address,
      );
      // (0-15) Deposit fee UT = 0 USDC = 0000
      // (16-31) Deposit fee % = 0% = 0000
      // (32-47) Withdrawal fee UT = 0 USDC = 0000
      // (48-63) Withdrawal fee % = 0% = 0000
      // (80-239) vault fee address = 0000000000000000000000000000000000000000
      await this.opUSDCearn
        .connect(this.signers.governance)
        .setVaultConfiguration("906392544231311161076231617881117198619499239097192527361058388634069106688");
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("100"),
        "0x0000000000000000000000000000000000000000",
        BigNumber.from("1"),
        false,
        true,
        false,
      );
      const _depositAmountUSDC = BigNumber.from("1000").mul(to_10powNumber_BN("6"));
      const _depositFee = await this.opUSDCearn.calcDepositFeeUT(_depositAmountUSDC);
      const _depositAmountUSDCWithFee = _depositAmountUSDC.sub(_depositFee);
      const _previousBalance = await this.opUSDCearn.balanceOf(this.signers.alice.address);
      const _previousVaultBalance = await this.opUSDCearn.balanceUT();
      await this.opUSDCearn.connect(this.signers.financeOperator).setMinimumDepositValueUT(_depositAmountUSDC);
      await expect(
        this.opUSDCearn
          .connect(this.signers.alice)
          .userDepositVault(this.signers.alice.address, _depositAmountUSDC, [], _proofs),
      )
        .to.emit(this.opUSDCearn, "Transfer")
        .withArgs(ethers.constants.AddressZero, this.signers.alice.address, _depositAmountUSDCWithFee);
      expect(await this.usdc.balanceOf(this.opUSDCearn.address)).to.eq(
        _previousVaultBalance.add(_depositAmountUSDCWithFee),
      );
      expect(await this.opUSDCearn.totalSupply()).to.eq(_previousVaultBalance.add(_depositAmountUSDCWithFee));
      expect(await this.opUSDCearn.totalDeposits(this.signers.alice.address)).to.eq(
        _previousBalance.add(_depositAmountUSDCWithFee),
      );
      // the vault shares VT will be same as total supply is zero
      expect(await this.opUSDCearn.balanceOf(this.signers.alice.address)).to.eq(
        _previousBalance.add(_depositAmountUSDCWithFee),
      );
    });

    it("fail userDepositVault() for non-whitelisted, EOA_NOT_WHITELISTED", async function () {
      const _proofs = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address],
        this.signers.eve.address,
      );
      await this.opUSDCearn
        .connect(this.signers.governance)
        .setVaultConfiguration("2715643938564376714569528258641865758826842749497826340477583138757711757312");
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("100"),
        "0x0000000000000000000000000000000000000000",
        BigNumber.from("1"),
        false,
        true,
        true,
      );
      const _depositAmountUSDC = BigNumber.from("1000").mul(to_10powNumber_BN("6"));
      await this.usdc.connect(this.signers.admin).transfer(this.signers.eve.address, _depositAmountUSDC);
      await this.usdc.connect(this.signers.eve).approve(this.opUSDCearn.address, _depositAmountUSDC);
      await expect(
        this.opUSDCearn
          .connect(this.signers.eve)
          .userDepositVault(this.signers.eve.address, _depositAmountUSDC, [], _proofs),
      ).to.revertedWith(EOA_NOT_WHITELISTED);
    });

    it("fail userDepositVault() good user alice calls on bob's proof,EOA_NOT_WHITELISTED", async function () {
      const _bobProofs = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address],
        this.signers.bob.address,
      );
      await this.opUSDCearn
        .connect(this.signers.governance)
        .setVaultConfiguration("2715643938564376714569528258641865758826842749497826340477583138757711757312");
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("100"),
        "0x0000000000000000000000000000000000000000",
        BigNumber.from("1"),
        false,
        true,
        true,
      );
      const _depositAmountUSDC = BigNumber.from("1000").mul(to_10powNumber_BN("6"));
      await this.usdc.connect(this.signers.admin).transfer(this.signers.alice.address, _depositAmountUSDC);
      await this.usdc.connect(this.signers.alice).approve(this.opUSDCearn.address, _depositAmountUSDC);
      await expect(
        this.opUSDCearn
          .connect(this.signers.alice)
          .userDepositVault(this.signers.alice.address, _depositAmountUSDC, [], _bobProofs),
      ).to.revertedWith(EOA_NOT_WHITELISTED);
    });

    it("userDepositVault, deposit fees", async function () {
      // set 5% deposit fee, 10 UT flat fee, set vaultFeeCollector address = 0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5
      // 0x060119cDeDF678aBE15a921a2AB26C9Bc8867fc35cE500640000000001f4000A
      // 2715822034072518811744046181093660912122076772552892442457464397795247259658
      await this.opUSDCearn
        .connect(this.signers.governance)
        .setVaultConfiguration("2715822034072518811744046181093660912122076772552892442457464397795247259658");
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("10"),
        BigNumber.from("500"),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("100"),
        "0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5",
        BigNumber.from("1"),
        false,
        true,
        true,
      );
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address, this.signers.eve.address],
        this.signers.eve.address,
      );
      const _depositAmountUSDC = BigNumber.from("1100000000");
      await this.usdc.connect(this.signers.admin).transfer(this.signers.eve.address, _depositAmountUSDC);
      await this.usdc.connect(this.signers.eve).approve(this.opUSDCearn.address, _depositAmountUSDC);
      const _expectedDepositFee = new BN(new BN(_depositAmountUSDC.toString()).multipliedBy("0.05")).plus(
        new BN("10000000"),
      );
      const _expectedShares = BigNumber.from(
        _depositAmountUSDC.sub(BigNumber.from(Math.floor(_expectedDepositFee.toNumber()))),
      )
        .mul(await this.opUSDCearn.totalSupply())
        .div(await this.usdc.balanceOf(this.opUSDCearn.address));
      const _balanceBeforeVT = await this.opUSDCearn.balanceOf(this.signers.eve.address);
      await expect(
        this.opUSDCearn
          .connect(this.signers.eve)
          .userDepositVault(this.signers.eve.address, _depositAmountUSDC, [], _proof),
      )
        .to.emit(this.usdc, "Transfer")
        .withArgs(
          getAddress(this.opUSDCearn.address),
          getAddress("0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5"),
          BigNumber.from(_expectedDepositFee.toString()),
        );
      const _balanceAfterVT = await this.opUSDCearn.balanceOf(this.signers.eve.address);
      expect(_balanceAfterVT.sub(_balanceBeforeVT)).to.eq(_expectedShares);
    });

    it("userDepositVault, withdrawal fees", async function () {
      // set 5% withdrawal fee, 10 UT flat fee
      // 0x060119cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5006401f4000A01f4000A
      // 2715822034072518811744046181093660912122076772552892442457605135326552260618
      await this.opUSDCearn
        .connect(this.signers.governance)
        .setVaultConfiguration("2715822034072518811744046181093660912122076772552892442457605135326552260618");
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("10"),
        BigNumber.from("500"),
        BigNumber.from("10"),
        BigNumber.from("500"),
        BigNumber.from("100"),
        "0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5",
        BigNumber.from("1"),
        false,
        true,
        true,
      );
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address, this.signers.eve.address],
        this.signers.eve.address,
      );
      const _withdrawAmountVT = (await this.opUSDCearn.balanceOf(this.signers.eve.address)).div("2");
      const _expectedUT = (await this.usdc.balanceOf(this.opUSDCearn.address))
        .mul(_withdrawAmountVT)
        .div(await this.opUSDCearn.totalSupply());
      const _expectedWithdrawalFee = new BN(new BN(_expectedUT.toString()).multipliedBy("0.05")).plus(
        new BN("10000000"),
      );
      const _expectedWithdrawAmount = _expectedUT.sub(BigNumber.from(Math.floor(_expectedWithdrawalFee.toNumber())));
      const _balanceBeforeUT = await this.usdc.balanceOf(this.signers.eve.address);
      await expect(
        this.opUSDCearn
          .connect(this.signers.eve)
          .userWithdrawVault(this.signers.eve.address, _withdrawAmountVT, _proof),
      )
        .to.emit(this.usdc, "Transfer")
        .withArgs(
          getAddress(this.opUSDCearn.address),
          getAddress("0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5"),
          BigNumber.from(Math.floor(_expectedWithdrawalFee.toNumber())),
        );
      const _balanceAfterUT = await this.usdc.balanceOf(this.signers.eve.address);
      const _actualReceivedUT = _balanceAfterUT.sub(_balanceBeforeUT);
      expect(_actualReceivedUT).to.eq(_expectedUT.sub(BigNumber.from(Math.floor(_expectedWithdrawalFee.toNumber()))));
    });

    it("fail userDepositVault, VAULT_EMERGENCY_SHUTDOWN", async function () {
      await this.opUSDCearn.connect(this.signers.governance).setEmergencyShutdown(true);
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address, this.signers.eve.address],
        this.signers.eve.address,
      );
      const _depositAmountUSDC = BigNumber.from("1000").mul(to_10powNumber_BN("6"));
      await expect(
        this.opUSDCearn
          .connect(this.signers.eve)
          .userDepositVault(this.signers.eve.address, _depositAmountUSDC, [], _proof),
      ).to.revertedWith(VAULT_EMERGENCY_SHUTDOWN);
    });
  });

  describe(`${fork}-#permit(address,address,uint256,uint256,uint8,bytes32,bytes32`, function () {
    it("success, gasless approval and vault token transferfrom", async function () {
      const vaultTokenBalanceAlice = await this.opUSDCearn.balanceOf(this.signers.alice.address);
      expect(vaultTokenBalanceAlice).to.be.gt("0");
      const deadline = (await ethers.provider.getBlock("latest")).timestamp;
      const { v, r, s } = await getPermitSignature(
        this.signers.alice,
        this.opUSDCearn,
        this.signers.bob.address,
        vaultTokenBalanceAlice,
        BigNumber.from(deadline).add(1800),
        { version: "1" },
      );
      const nonceBeforeAlice = await this.opUSDCearn.nonces(this.signers.alice.address);
      const tx = await this.opUSDCearn
        .connect(this.signers.operator)
        .permit(
          this.signers.alice.address,
          this.signers.bob.address,
          vaultTokenBalanceAlice,
          BigNumber.from(deadline).add(1800),
          v,
          r,
          s,
        );
      await tx.wait(1);
      expect(await this.opUSDCearn.allowance(this.signers.alice.address, this.signers.bob.address)).to.eq(
        vaultTokenBalanceAlice,
      );
      expect(await this.opUSDCearn.nonces(this.signers.alice.address)).to.eq(nonceBeforeAlice.add("1"));

      const vaultTokenBalanceBeforeBob = await this.opUSDCearn.balanceOf(this.signers.bob.address);
      const tx1 = await this.opUSDCearn
        .connect(this.signers.bob)
        .transferFrom(this.signers.alice.address, this.signers.bob.address, vaultTokenBalanceAlice);
      await tx1.wait(1);
      const vaultTokenBalanceAfterBob = await this.opUSDCearn.balanceOf(this.signers.bob.address);
      const vaultTokenBalanceAfterAlice = await this.opUSDCearn.balanceOf(this.signers.alice.address);
      expect(vaultTokenBalanceAfterBob).to.eq(vaultTokenBalanceBeforeBob.add(vaultTokenBalanceAlice));
      expect(vaultTokenBalanceAfterAlice).to.eq("0");
      // send vault token back to alice
      const tx3 = await this.opUSDCearn
        .connect(this.signers.bob)
        .transfer(this.signers.alice.address, vaultTokenBalanceAlice);
      await tx3.wait(1);
      expect(await this.opUSDCearn.balanceOf(this.signers.alice.address)).to.eq(vaultTokenBalanceAlice);
    });

    it("fail, zero address not valid", async function () {
      const vaultTokenBalanceAlice = await this.opUSDCearn.balanceOf(this.signers.alice.address);
      expect(vaultTokenBalanceAlice).to.be.gt("0");
      const deadline = (await ethers.provider.getBlock("latest")).timestamp;
      const { v, r, s } = await getPermitSignature(
        this.signers.alice,
        this.opUSDCearn,
        this.signers.bob.address,
        vaultTokenBalanceAlice,
        BigNumber.from(deadline).add(1800),
        { version: "1" },
      );
      await expect(
        this.opUSDCearn
          .connect(this.signers.operator)
          .permit(
            ethers.constants.AddressZero,
            this.signers.bob.address,
            vaultTokenBalanceAlice,
            BigNumber.from(deadline).add(1800),
            v,
            r,
            s,
          ),
      ).to.be.revertedWith(ZERO_ADDRESS_NOT_VALID);
    });
    it("fail, expired timestamp", async function () {
      const vaultTokenBalanceAlice = await this.opUSDCearn.balanceOf(this.signers.alice.address);
      expect(vaultTokenBalanceAlice).to.be.gt("0");
      const deadline = (await ethers.provider.getBlock("latest")).timestamp;
      const { v, r, s } = await getPermitSignature(
        this.signers.alice,
        this.opUSDCearn,
        this.signers.bob.address,
        vaultTokenBalanceAlice,
        BigNumber.from(deadline).add(1800),
        { version: "1" },
      );
      await expect(
        this.opUSDCearn
          .connect(this.signers.operator)
          .permit(
            this.signers.alice.address,
            this.signers.bob.address,
            vaultTokenBalanceAlice,
            BigNumber.from(deadline).sub(1800),
            v,
            r,
            s,
          ),
      ).to.be.revertedWith(INVALID_EXPIRATION);
    });

    it("fail, invalid signature(wrong signer)", async function () {
      const vaultTokenBalanceAlice = await this.opUSDCearn.balanceOf(this.signers.alice.address);
      expect(vaultTokenBalanceAlice).to.be.gt("0");
      const deadline = (await ethers.provider.getBlock("latest")).timestamp;
      const { v, r, s } = await getPermitSignature(
        this.signers.bob,
        this.opUSDCearn,
        this.signers.bob.address,
        vaultTokenBalanceAlice,
        BigNumber.from(deadline).add(1800),
        { version: "1" },
      );
      await expect(
        this.opUSDCearn
          .connect(this.signers.operator)
          .permit(
            this.signers.alice.address,
            this.signers.bob.address,
            vaultTokenBalanceAlice,
            BigNumber.from(deadline).add(1800),
            v,
            r,
            s,
          ),
      ).to.be.revertedWith(INVALID_SIGNATURE);
    });
    it("fail, invalid signature(reuse nonce)", async function () {
      const vaultTokenBalanceAlice = await this.opUSDCearn.balanceOf(this.signers.alice.address);
      expect(vaultTokenBalanceAlice).to.be.gt("0");
      const deadline = (await ethers.provider.getBlock("latest")).timestamp;
      const { v, r, s } = await getPermitSignature(
        this.signers.bob,
        this.opUSDCearn,
        this.signers.bob.address,
        vaultTokenBalanceAlice,
        BigNumber.from(deadline).add(1800),
        { version: "1", nonce: BigNumber.from("0") },
      );
      await expect(
        this.opUSDCearn
          .connect(this.signers.operator)
          .permit(
            this.signers.alice.address,
            this.signers.bob.address,
            vaultTokenBalanceAlice,
            BigNumber.from(deadline).add(1800),
            v,
            r,
            s,
          ),
      ).to.be.revertedWith(INVALID_SIGNATURE);
    });
  });

  describe(`${fork}-#userWithdrawPermitted(address,uint256,uint256,bytes32[])`, function () {
    it("userWithdrawPermitted() return false,USER_WITHDRAW_INSUFFICIENT_VT", async function () {
      const _accountProof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address],
        this.signers.alice.address,
      );
      await this.opUSDCearn
        .connect(this.signers.governance)
        .setVaultConfiguration("906570639739453258250749540332912351914733262152258629340941055050750689281");
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("100"),
        "0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5",
        BigNumber.from("1"),
        false,
        true,
        false,
      );
      const _userBalance = await this.opUSDCearn.balanceOf(this.signers.alice.address);
      expect(
        await this.opUSDCearn
          .connect(this.signers.alice)
          .userWithdrawPermitted(this.signers.alice.address, _userBalance.add(1), _accountProof),
      ).to.have.members([false, USER_WITHDRAW_INSUFFICIENT_VT]);
    });

    it('userWithdrawPermitted() return true,""', async function () {
      const _proofs = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address],
        this.signers.alice.address,
      );
      const _balanceVT = await this.opUSDCearn.balanceOf(this.signers.alice.address);
      expect(
        await this.opUSDCearn
          .connect(this.signers.alice)
          .userWithdrawPermitted(this.signers.alice.address, _balanceVT, _proofs),
      ).members([true, ""]);
    });
  });

  describe(`${fork}-#vaultWithdrawPermitted()`, function () {
    it("vaultWithdrawPermitted() return false,VAULT_PAUSED", async function () {
      await expect(this.opUSDCearn.connect(this.signers.governance).setUnpaused(false))
        .to.emit(this.opUSDCearn, "LogUnpause")
        .withArgs(false, this.signers.governance.address);
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("100"),
        "0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5",
        BigNumber.from("1"),
        false,
        false,
        false,
      );
      expect(await this.opUSDCearn.vaultWithdrawPermitted()).to.have.members([false, VAULT_PAUSED]);
    });

    it('vaultWithdrawPermitted() return true,""', async function () {
      await expect(this.opUSDCearn.connect(this.signers.governance).setUnpaused(true))
        .to.emit(this.opUSDCearn, "LogUnpause")
        .withArgs(true, this.signers.governance.address);
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("100"),
        "0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5",
        BigNumber.from("1"),
        false,
        true,
        false,
      );
      expect(await this.opUSDCearn.vaultWithdrawPermitted()).to.have.members([true, ""]);
    });
  });

  describe(`${fork}-#vaultDepositSomeToStrategy(bytes32,uint256)`, function () {
    it("fail vaultDepositSomeToStrategy() call, vault is paused", async function () {
      await this.opUSDCearn.connect(this.signers.governance).setUnpaused(false);
      await expect(
        this.opUSDCearn.connect(this.signers.strategyOperator).vaultDepositSomeToStrategy(cUSDCStrategyHash, 1),
      ).to.be.revertedWith(VAULT_PAUSED);
    });

    it("vaultDepositSomeToStrategy() by any user", async function () {
      await expect(this.opUSDCearn.connect(this.signers.governance).setUnpaused(true))
        .to.emit(this.opUSDCearn, "LogUnpause")
        .withArgs(true, this.signers.governance.address);
      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("100"),
        "0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5",
        BigNumber.from("1"),
        false,
        true,
        false,
      );
      const _balanceUTBeforeDepositSomeToStrategy = await this.usdc.balanceOf(this.opUSDCearn.address);
      await this.opUSDCearn.vaultDepositSomeToStrategy(cUSDCStrategyHash, _balanceUTBeforeDepositSomeToStrategy);
      const _balanceUTAfterDepositSomeToStrategy = await this.usdc.balanceOf(this.opUSDCearn.address);
      expect(_balanceUTBeforeDepositSomeToStrategy).to.gt(_balanceUTAfterDepositSomeToStrategy);
      await this.usdc.connect(this.signers.eve).transfer(this.opUSDCearn.address, "1000000000");
      const _balanceUTBeforeDepositAllToStrategy = await this.usdc.balanceOf(this.opUSDCearn.address);
      await this.opUSDCearn.vaultDepositSomeToStrategy(cUSDCStrategyHash, _balanceUTBeforeDepositAllToStrategy);
      const _balanceUTAfterDepositAllToStrategy = await this.usdc.balanceOf(this.opUSDCearn.address);
      expect(_balanceUTBeforeDepositAllToStrategy).to.gt(_balanceUTAfterDepositAllToStrategy);
    });

    it("fail vaultDepositSomeToStrategy(), VAULT_EMERGENCY_SHUTDOWN", async function () {
      const _balanceUTBefore = await this.usdc.balanceOf(this.opUSDCearn.address);
      await expect(this.opUSDCearn.connect(this.signers.governance).setEmergencyShutdown(true))
        .to.emit(this.opUSDCearn, "LogEmergencyShutdown")
        .withArgs(true, this.signers.governance.address);
      const _balanceUTAfter = await this.usdc.balanceOf(this.opUSDCearn.address);
      expect(_balanceUTAfter).to.gt(_balanceUTBefore);

      assertVaultConfiguration(
        await this.opUSDCearn.vaultConfiguration(),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("1"),
        BigNumber.from("5"),
        BigNumber.from("100"),
        "0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5",
        BigNumber.from("1"),
        true,
        true,
        false,
      );
      await expect(
        this.opUSDCearn.connect(this.signers.strategyOperator).vaultDepositSomeToStrategy(cUSDCStrategyHash, 1),
      ).to.revertedWith(VAULT_EMERGENCY_SHUTDOWN);
    });
  });

  describe(`${fork}-#setUnderlyingTokensHash(bytes32)`, function () {
    it("fail setUnderlyingTokensHash() call by non operator", async function () {
      await expect(
        this.opUSDCearn.connect(this.signers.bob).setUnderlyingTokensHash(ethers.constants.HashZero),
      ).to.be.revertedWith("caller is not the operator");
    });

    it("fail setUnderlyingTokensHash(), registry not approved", async function () {
      await expect(
        this.opUSDCearn
          .connect(this.signers.operator)
          .setUnderlyingTokensHash(
            getSoliditySHA3Hash(["address", "uint256"], [MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address, "a"]),
          ),
      ).to.be.revertedWith(UNDERLYING_TOKENS_HASH_EXISTS);
    });

    it("setUnderlyingTokensHash() call by operator", async function () {
      await this.opUSDCearn
        .connect(this.signers.operator)
        .setUnderlyingTokensHash(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash);
      expect(await this.opUSDCearn.underlyingToken()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address);
      expect(await this.opUSDCearn.underlyingTokensHash()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash);
    });
  });

  describe(`${fork}-#calcDepositFeeUT(uint256)`, function () {
    it("calcDepositFeeUT()", async function () {
      const vaultConfiguration = await this.opUSDCearn.vaultConfiguration();
      const amount = BigNumber.from("10000000");
      const expectedFee = amount
        .mul(getDepositFeePct(vaultConfiguration))
        .div(10000)
        .add(getDepositFeeUT(vaultConfiguration).mul(to_10powNumber_BN("6")));
      expect(await this.opUSDCearn.calcDepositFeeUT(amount)).to.eq(expectedFee);
    });
  });

  describe(`${fork}-#calcWithdrawalFeeUT(uint256)`, function () {
    it("calcWithdrawalFeeUT()", async function () {
      const vaultConfiguration = await this.opUSDCearn.vaultConfiguration();
      const amount = BigNumber.from("10000000");
      const expectedFee = amount
        .mul(getWithdrawalFeePct(vaultConfiguration))
        .div(10000)
        .add(getWithdrawalFeeUT(vaultConfiguration).mul(to_10powNumber_BN("6")));
      expect(await this.opUSDCearn.calcWithdrawalFeeUT(amount)).to.eq(expectedFee);
    });
  });

  describe(`${fork}-#claimRewardToken(bytes32)`, function () {
    it("fail claimRewardToken() call by non strategyOperator", async function () {
      await expect(this.opUSDCearn.connect(this.signers.bob).claimRewardToken(cUSDCStrategyHash)).to.be.revertedWith(
        "caller is not the strategyOperator",
      );
    });

    it("claimRewardToken(), fails nothing to claim", async function () {
      const _rewardTokenInstance: ERC20 = <ERC20>(
        await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.REWARD_TOKENS.COMP)
      );
      const _balanceRTBefore = await _rewardTokenInstance.balanceOf(this.opUSDCearn.address);
      await this.opUSDCearn.claimRewardToken(cUSDCStrategyHash);
      const _balanceRTAfter = await _rewardTokenInstance.balanceOf(this.opUSDCearn.address);
      expect(_balanceRTAfter).to.gt(_balanceRTBefore);
    });
  });

  describe(`${fork}-#giveAllowances()`, function () {
    const _pool = cUSDCStrategySteps[0].pool;

    it("fail giveAllowances by non risk operator", async function () {
      await expect(
        this.opUSDCearn.connect(this.signers.bob).giveAllowances([await this.opUSDCearn.underlyingToken()], [_pool]),
      ).to.be.revertedWith("caller is not the riskOperator");
    });
    it("fail giveAllowances mismatch length", async function () {
      await expect(
        this.opUSDCearn
          .connect(this.signers.riskOperator)
          .giveAllowances([await this.opUSDCearn.underlyingToken()], []),
      ).to.be.revertedWith(LENGTH_MISMATCH);
    });
    it("success giveAllowances", async function () {
      await expect(
        this.opUSDCearn
          .connect(this.signers.riskOperator)
          .removeAllowances([await this.opUSDCearn.underlyingToken()], [_pool]),
      )
        .to.emit(this.usdc, "Approval")
        .withArgs(this.opUSDCearn.address, getAddress(_pool), "0");
      await expect(
        this.opUSDCearn
          .connect(this.signers.riskOperator)
          .giveAllowances([await this.opUSDCearn.underlyingToken()], [_pool]),
      )
        .to.emit(this.usdc, "Approval")
        .withArgs(this.opUSDCearn.address, getAddress(_pool), ethers.constants.MaxUint256);
    });
  });
  describe(`${fork}-#removesAllowance()`, function () {
    const _pool = cUSDCStrategySteps[0].pool;

    it("fail removeAllowances by non risk operator", async function () {
      await expect(
        this.opUSDCearn.connect(this.signers.bob).removeAllowances([await this.opUSDCearn.underlyingToken()], [_pool]),
      ).to.be.revertedWith("caller is not the riskOperator");
    });
    it("fail removeAllowances mismatch length", async function () {
      await expect(
        this.opUSDCearn
          .connect(this.signers.riskOperator)
          .removeAllowances([await this.opUSDCearn.underlyingToken()], []),
      ).to.be.revertedWith(LENGTH_MISMATCH);
    });
    it("success removeAllowances", async function () {
      await expect(
        this.opUSDCearn
          .connect(this.signers.riskOperator)
          .removeAllowances([await this.opUSDCearn.underlyingToken()], [_pool]),
      )
        .to.emit(this.usdc, "Approval")
        .withArgs(this.opUSDCearn.address, getAddress(_pool), 0);
    });
  });

  describe(`${fork}-#harvestRewards(strategyHash)`, function () {
    it("fail harvestRewards() call by non strategyOperator", async function () {
      await expect(this.opUSDCearn.connect(this.signers.bob).harvestRewards(cUSDCStrategyHash)).to.be.revertedWith(
        "caller is not the strategyOperator",
      );
    });

    it("harvestRewards()", async function () {
      const _balanceBeforeUT = await this.opUSDCearn.balanceUT();
      const _rewardTokenInstance = <ERC20>(
        await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.REWARD_TOKENS.COMP)
      );
      await expect(
        this.opUSDCearn
          .connect(this.signers.governance)
          .giveAllowances([EthereumTokens.REWARD_TOKENS.COMP], [UniswapV2.router02.address]),
      )
        .to.emit(_rewardTokenInstance, "Approval")
        .withArgs(
          this.opUSDCearn.address,
          getAddress(UniswapV2.router02.address),
          BigNumber.from("0xffffffffffffffffffffffff"),
        ); // in COMP uint96 is used
      const tx = await this.opUSDCearn.harvestRewards(cUSDCStrategyHash);
      await tx.wait(1);
      const _balanceAfterUT = await this.opUSDCearn.balanceUT();
      expect(_balanceAfterUT).gt(_balanceBeforeUT);
    });
  });

  describe(`${fork}-#userWithdrawVault(address,uint256,bytes32[])`, function () {
    it("userWithdrawVault()", async function () {
      const _proofs = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address],
        this.signers.alice.address,
      );
      const _redeemVT = (await this.opUSDCearn.balanceOf(this.signers.alice.address)).div("2");
      const _userbalanceBefore = await this.usdc.balanceOf(this.signers.alice.address);
      const _allAmountInToken = await this.strategyManager.getValueInInputToken(
        this.usdc.address,
        cUSDCStrategySteps,
        this.opUSDCearn,
        await this.strategyManager.getLastStepBalance(
          this.usdc.address,
          cUSDCStrategySteps,
          this.opUSDCearn,
          ethers.provider,
        ),
        ethers.provider,
      );
      const _vaultBalanceUT = await this.usdc.balanceOf(this.opUSDCearn.address);
      const _totalSupply = await this.opUSDCearn.totalSupply();
      const _calculatedReceivableUT = _redeemVT.mul(_allAmountInToken.add(_vaultBalanceUT)).div(_totalSupply);
      const _calculatedWithdrawalFee = await this.opUSDCearn.calcWithdrawalFeeUT(_calculatedReceivableUT);
      const _calculatedReceivableUTWithFee = _calculatedReceivableUT.sub(_calculatedWithdrawalFee);
      await expect(
        this.opUSDCearn.connect(this.signers.alice).userWithdrawVault(this.signers.alice.address, _redeemVT, _proofs),
      )
        .to.emit(this.opUSDCearn, "Transfer")
        .withArgs(this.signers.alice.address, ethers.constants.AddressZero, _redeemVT);
      const _userBalanceAfter = await this.usdc.balanceOf(this.signers.alice.address);
      const _actualReceivedUT = _userBalanceAfter.sub(_userbalanceBefore);
      expect(_actualReceivedUT).to.eq(_calculatedReceivableUTWithFee);
      expect(await this.opUSDCearn.totalSupply()).to.eq(_totalSupply.sub(_redeemVT));
    });

    it("userWithdrawVault, during emergency shutdown", async function () {
      await this.opUSDCearn.connect(this.signers.governance).setUnpaused(true);
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address, this.signers.eve.address],
        this.signers.alice.address,
      );
      const _redeemVT = (await this.opUSDCearn.balanceOf(this.signers.alice.address)).div("2");
      await expect(
        this.opUSDCearn.connect(this.signers.alice).userWithdrawVault(this.signers.alice.address, _redeemVT, _proof),
      )
        .to.emit(this.opUSDCearn, "Transfer")
        .withArgs(this.signers.alice.address, ethers.constants.AddressZero, _redeemVT);
    });
  });

  describe(`${fork}-_beforeTokenTransfer()`, function () {
    it("fail _beforeTokenTransfer() TRANSFER_TO_THIS_CONTRACT", async function () {
      const _redeemVT = await this.opUSDCearn.balanceOf(this.signers.alice.address);
      await expect(this.opUSDCearn.transfer(this.opUSDCearn.address, _redeemVT)).to.revertedWith(
        TRANSFER_TO_THIS_CONTRACT,
      );
    });
  });

  describe(`${fork}-#setName()`, function () {
    it("success, only governance can change name", async function () {
      const setNameStr = "OptyFi USD Coin Earn Vault";
      const expectedDomainSeparator = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
          ["bytes32", "bytes32", "bytes32", "uint256", "address"],
          [EIP712_DOMAIN, ethers.utils.id(setNameStr), EIP712_REVISION, await getChainId(), this.opUSDCearn.address],
        ),
      );
      const tx = await this.opUSDCearn.connect(this.signers.governance).setName(setNameStr);
      await tx.wait(1);
      expect(await this.opUSDCearn.name()).to.eq(setNameStr);
      expect(await this.opUSDCearn._domainSeparator()).to.eq(expectedDomainSeparator);
      expect(await this.opUSDCearn.DOMAIN_SEPARATOR()).to.eq(expectedDomainSeparator);
    });
    it("fail, only governance can change name", async function () {
      const setNameStr = "OptyFi USD Coin Earn Vault";
      await expect(this.opUSDCearn.connect(this.signers.bob).setName(setNameStr)).to.be.revertedWith(
        "caller is not having governance",
      );
    });
    it("success, gasless approval and vault token transferfrom", async function () {
      const vaultTokenBalanceAlice = await this.opUSDCearn.balanceOf(this.signers.alice.address);
      expect(vaultTokenBalanceAlice).to.be.gt("0");
      const deadline = (await ethers.provider.getBlock("latest")).timestamp;
      const { v, r, s } = await getPermitSignature(
        this.signers.alice,
        this.opUSDCearn,
        this.signers.bob.address,
        vaultTokenBalanceAlice,
        BigNumber.from(deadline).add(1800),
        { version: "1" },
      );
      const nonceBeforeAlice = await this.opUSDCearn.nonces(this.signers.alice.address);
      const tx = await this.opUSDCearn
        .connect(this.signers.operator)
        .permit(
          this.signers.alice.address,
          this.signers.bob.address,
          vaultTokenBalanceAlice,
          BigNumber.from(deadline).add(1800),
          v,
          r,
          s,
        );
      await tx.wait(1);
      expect(await this.opUSDCearn.allowance(this.signers.alice.address, this.signers.bob.address)).to.eq(
        vaultTokenBalanceAlice,
      );
      expect(await this.opUSDCearn.nonces(this.signers.alice.address)).to.eq(nonceBeforeAlice.add("1"));

      const vaultTokenBalanceBeforeBob = await this.opUSDCearn.balanceOf(this.signers.bob.address);
      const tx1 = await this.opUSDCearn
        .connect(this.signers.bob)
        .transferFrom(this.signers.alice.address, this.signers.bob.address, vaultTokenBalanceAlice);
      await tx1.wait(1);
      const vaultTokenBalanceAfterBob = await this.opUSDCearn.balanceOf(this.signers.bob.address);
      const vaultTokenBalanceAfterAlice = await this.opUSDCearn.balanceOf(this.signers.alice.address);
      expect(vaultTokenBalanceAfterBob).to.eq(vaultTokenBalanceBeforeBob.add(vaultTokenBalanceAlice));
      expect(vaultTokenBalanceAfterAlice).to.eq("0");
      // send vault token back to alice
      const tx3 = await this.opUSDCearn
        .connect(this.signers.bob)
        .transfer(this.signers.alice.address, vaultTokenBalanceAlice);
      await tx3.wait(1);
      expect(await this.opUSDCearn.balanceOf(this.signers.alice.address)).to.eq(vaultTokenBalanceAlice);
    });
  });

  describe(`${fork}-#setSymbol`, function () {
    it("success, only governance can change symbol", async function () {
      const setSymbolStr = "opUSDCearn";
      const tx = await this.opUSDCearn.connect(this.signers.governance).setSymbol(setSymbolStr);
      await tx.wait(1);
      expect(await this.opUSDCearn.symbol()).to.eq(setSymbolStr);
    });
    it("fail, only governance can change symbol", async function () {
      const setSymbolStr = "opUSDCearn";
      await expect(this.opUSDCearn.connect(this.signers.bob).setSymbol(setSymbolStr)).to.be.revertedWith(
        "caller is not having governance",
      );
    });
  });
});
