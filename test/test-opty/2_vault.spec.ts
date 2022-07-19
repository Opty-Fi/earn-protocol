import { ethers, deployments, artifacts } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai, { expect } from "chai";
import { deployContract, solidity } from "ethereum-waffle";
import { BigNumber, ContractReceipt, Event } from "ethers";
import BN from "bignumber.js";
import { getAddress } from "ethers/lib/utils";
import {
  assertVaultConfiguration,
  getAccountsMerkleProof,
  getAccountsMerkleRoot,
  getCodesMerkleProof,
  getCodesMerkleRoot,
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
  RiskManager,
  RiskManager__factory,
  StrategyProvider,
  StrategyProvider__factory,
  Vault,
  Vault__factory,
  TestVault,
  IncentivisedERC20,
  IncentivisedERC20__factory,
} from "../../typechain";
import { getPermitSignature, setTokenBalanceInStorage } from "./utils";
import { TypedDefiPools } from "../../helpers/data/defiPools";
import { generateStrategyHashV2 } from "../../helpers/helpers";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";
import { eEVMNetwork, NETWORKS_CHAIN_ID } from "../../helper-hardhat-config";
import { Artifact } from "hardhat/types";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;

const testStrategy: {
  [key: string]: {
    [name: string]: { steps: { pool: string; outputToken: string; isBorrow: boolean }[]; hash: string };
  };
} = {
  [eEVMNetwork.mainnet || NETWORKS_CHAIN_ID[eEVMNetwork.mainnet]]: {
    USDC_COMPOUND: {
      steps: [
        {
          pool: TypedDefiPools.CompoundAdapter.usdc.pool,
          outputToken: TypedDefiPools.CompoundAdapter.usdc.lpToken,
          isBorrow: false,
        },
      ],
      hash: generateStrategyHashV2(
        [
          {
            contract: TypedDefiPools.CompoundAdapter.usdc.pool,
            outputToken: TypedDefiPools.CompoundAdapter.usdc.lpToken,
            isBorrow: false,
          },
        ],
        MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash,
      ),
    },
    USDC_AAVEV1: {
      steps: [
        {
          pool: TypedDefiPools.AaveV1Adapter.usdc.pool,
          outputToken: TypedDefiPools.AaveV1Adapter.usdc.lpToken,
          isBorrow: false,
        },
      ],
      hash: generateStrategyHashV2(
        [
          {
            contract: TypedDefiPools.AaveV2Adapter.usdc.pool,
            outputToken: TypedDefiPools.AaveV2Adapter.usdc.lpToken,
            isBorrow: false,
          },
        ],
        MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash,
      ),
    },
    USDC_AAVEV2: {
      steps: [
        {
          pool: TypedDefiPools.AaveV2Adapter.usdc.pool,
          outputToken: TypedDefiPools.AaveV2Adapter.usdc.lpToken,
          isBorrow: false,
        },
      ],
      hash: generateStrategyHashV2(
        [
          {
            contract: TypedDefiPools.CompoundAdapter.usdc.pool,
            outputToken: TypedDefiPools.CompoundAdapter.usdc.lpToken,
            isBorrow: false,
          },
        ],
        MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash,
      ),
    },
  },
  [eEVMNetwork.polygon || NETWORKS_CHAIN_ID[eEVMNetwork.polygon]]: {},
};

const strategyKeys = Object.keys(testStrategy[fork]);

describe("::Vault", function () {
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
    const RISKMANAGER_PROXY_ADDRESS = (await deployments.get("RiskManagerProxy")).address;
    const STRATEGYPROVIDER_ADDRESS = (await deployments.get("StrategyProvider")).address;
    const OPUSDCGROW_VAULT_ADDRESS = (await deployments.get("opUSDCgrow")).address;
    this.registry = <Registry>await ethers.getContractAt(Registry__factory.abi, REGISTRY_PROXY_ADDRESS);
    const operatorAddress = await this.registry.getOperator();
    const financeOperatorAddress = await this.registry.getFinanceOperator();
    const governanceAddress = await this.registry.getGovernance();
    const strategyOperatorAddress = await this.registry.getStrategyOperator();
    this.signers.operator = await ethers.getSigner(operatorAddress);
    this.signers.financeOperator = await ethers.getSigner(financeOperatorAddress);
    this.signers.governance = await ethers.getSigner(governanceAddress);
    this.signers.strategyOperator = await ethers.getSigner(strategyOperatorAddress);
    this.riskManager = <RiskManager>await ethers.getContractAt(RiskManager__factory.abi, RISKMANAGER_PROXY_ADDRESS);
    this.strategyProvider = <StrategyProvider>(
      await ethers.getContractAt(StrategyProvider__factory.abi, STRATEGYPROVIDER_ADDRESS)
    );
    this.vault = <Vault>await ethers.getContractAt(Vault__factory.abi, OPUSDCGROW_VAULT_ADDRESS);
    this.usdc = <IncentivisedERC20>(
      await ethers.getContractAt(IncentivisedERC20__factory.abi, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address)
    );
    await setTokenBalanceInStorage(this.usdc, this.signers.admin.address, "20000");

    this.testVault = <TestVault>await deployContract(this.signers.deployer, this.testVaultArtifact, []);
  });

  describe("#constructor(address,string,string,string,string)", function () {
    it("name,symbol,decimals as expected", async function () {
      expect(await this.vault.name()).to.eq("op USD Coin Growth");
      expect(await this.vault.symbol()).to.eq("opUSDCgrow");
      expect(await this.vault.decimals()).to.eq(6);
    });

    it("registry as expected", async function () {
      expect(await this.vault.registryContract()).to.eq((await deployments.get("RegistryProxy")).address);
    });
  });

  describe("#setValueControlParams(uint256,uint256,uint256)", function () {
    it("fail setValueControlParams() by non Finance operator", async function () {
      await expect(
        this.vault.connect(this.signers.bob).setValueControlParams("10000000000", "1000000000", "1000000000000"),
      ).to.be.revertedWith("caller is not the financeOperator");
    });

    it("setValueControlParams() by Finance operator", async function () {
      const tx = await this.vault.connect(this.signers.financeOperator).setValueControlParams(
        "10000000000", // 10,000 USDC
        "1000000000", // 1000 USDC
        "1000000000000", // 1,000,000 USDC
      );
      const { events }: ContractReceipt = await tx.wait();
      const eventsArr = events as Event[];
      expect(eventsArr[0]).to.include({
        address: this.vault.address,
        event: "LogUserDepositCapUT",
        eventSignature: "LogUserDepositCapUT(uint256,address)",
      });
      expect(eventsArr[0].args?.userDepositCapUT).to.eq("10000000000");
      expect(eventsArr[0].args?.caller).to.eq(this.signers.financeOperator.address);
      expect(eventsArr[1]).to.include({
        address: this.vault.address,
        event: "LogMinimumDepositValueUT",
        eventSignature: "LogMinimumDepositValueUT(uint256,address)",
      });
      expect(eventsArr[1].args?.minimumDepositValueUT).to.eq("1000000000");
      expect(eventsArr[1].args?.caller).to.eq(this.signers.financeOperator.address);
      expect(eventsArr[2]).to.include({
        address: this.vault.address,
        event: "LogTotalValueLockedLimitUT",
        eventSignature: "LogTotalValueLockedLimitUT(uint256,address)",
      });
      expect(eventsArr[2].args?.totalValueLockedLimitUT).to.eq("1000000000000");
      expect(eventsArr[2].args?.caller).to.eq(this.signers.financeOperator.address);
      expect(await this.vault.userDepositCapUT()).to.eq("10000000000");
      expect(await this.vault.minimumDepositValueUT()).to.eq("1000000000");
      expect(await this.vault.totalValueLockedLimitUT()).to.eq("1000000000000");
    });
  });

  describe("#setVaultConfiguration(uint256)", function () {
    it("fail setVaultConfiguration() by non governance", async function () {
      const _vaultConfiguration = BigNumber.from(
        "3533694129556768659166595001485837031654967793751237934691363855473639425",
      );
      await expect(this.vault.connect(this.signers.bob).setVaultConfiguration(_vaultConfiguration)).to.be.revertedWith(
        "caller is not having governance",
      );
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
      await this.vault.connect(this.signers.governance).setVaultConfiguration(_vaultConfiguration);
      const vaultConfiguration = await this.vault.vaultConfiguration();
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
      await this.vault
        .connect(this.signers.governance)
        .setVaultConfiguration("2717588881137297196073629478594403830637904256449768061415587411375685959681");
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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
      await this.vault
        .connect(this.signers.governance)
        .setVaultConfiguration("908337486804231642580332837833655270430560746049134248299062661252043309057");

      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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

  describe("#setUserDepositCapUT(uint256)", function () {
    it("fails setUserDepositCapUT() call by non finance operator", async function () {
      await expect(this.vault.connect(this.signers.bob).setUserDepositCapUT("4000")).to.be.revertedWith(
        "caller is not the financeOperator",
      );
    });

    it("setUserDepositCapUT() call by finance operator", async function () {
      await expect(this.vault.connect(this.signers.operator).setUserDepositCapUT("2000000000"))
        .to.emit(this.vault, "LogUserDepositCapUT")
        .withArgs("2000000000", this.signers.operator.address);
      expect(await this.vault.userDepositCapUT()).to.eq("2000000000");
    });
  });

  describe("#setMinimumDepositValueUT(uint256)", function () {
    it("fails setMinimumDepositValueUT() call by non finance operator", async function () {
      await expect(this.vault.connect(this.signers.bob).setMinimumDepositValueUT("1000")).to.be.revertedWith(
        "caller is not the financeOperator",
      );
    });

    it("setMinimumDepositValueUT() call by finance operator", async function () {
      await expect(
        this.vault
          .connect(this.signers.operator)
          .setMinimumDepositValueUT(BigNumber.from("1000").mul(to_10powNumber_BN("6"))),
      )
        .to.emit(this.vault, "LogMinimumDepositValueUT")
        .withArgs("1000000000", this.signers.operator.address);
      expect(await this.vault.minimumDepositValueUT()).to.eq(BigNumber.from("1000").mul(to_10powNumber_BN("6")));
    });
  });

  describe("#setTotalValueLockedLimitUT(uint256)", function () {
    it("fails setTotalValueLockedLimitUT() call by non finance operator", async function () {
      await expect(this.vault.connect(this.signers.bob).setTotalValueLockedLimitUT("100000000")).to.be.revertedWith(
        "caller is not the financeOperator",
      );
    });

    it("setTotalValueLockedLimitUT() call by finance operator", async function () {
      await expect(
        this.vault
          .connect(this.signers.operator)
          .setTotalValueLockedLimitUT(BigNumber.from("10000").mul(to_10powNumber_BN("6"))),
      )
        .to.emit(this.vault, "LogTotalValueLockedLimitUT")
        .withArgs("10000000000", this.signers.operator.address);
      expect(await this.vault.totalValueLockedLimitUT()).to.eq(BigNumber.from("10000").mul(to_10powNumber_BN("6")));
    });
  });

  describe("#setWhitelistedAccountsRoot(bytes32)", function () {
    it("fails setWhitelistedAccountsRoot() call by non governance", async function () {
      await expect(
        this.vault.connect(this.signers.bob).setWhitelistedAccountsRoot(ethers.constants.HashZero),
      ).to.be.revertedWith("caller is not having governance");
    });

    it("setWhitelistedAccountsRoot() call by governance", async function () {
      const _root = getAccountsMerkleRoot([this.signers.alice.address, this.signers.bob.address]);
      await this.vault.connect(this.signers.governance).setWhitelistedAccountsRoot(_root);
      expect(await this.vault.whitelistedAccountsRoot()).to.eq(_root);
    });
  });

  describe("#setWhitelistedCodesRoot(bytes32)", function () {
    it("fails setWhitelistedCodesRoot() call by non governance", async function () {
      await expect(
        this.vault.connect(this.signers.bob).setWhitelistedCodesRoot(ethers.constants.HashZero),
      ).to.be.revertedWith("caller is not having governance");
    });

    it("setWhitelistedCodesRoot() call by governance", async function () {
      const code = await ethers.provider.getCode(this.vault.address);
      const codeHash = ethers.utils.keccak256(code);
      const _root = getCodesMerkleRoot([codeHash]);
      await this.vault.connect(this.signers.governance).setWhitelistedCodesRoot(_root);
      expect(await this.vault.whitelistedCodesRoot()).to.eq(_root);
    });
  });

  describe("#setEmergencyShutdown(bool)", function () {
    it("fail setEmergencyShutdown() call by non governance", async function () {
      await expect(this.vault.connect(this.signers.bob).setEmergencyShutdown(true)).to.be.revertedWith(
        "caller is not having governance",
      );
    });

    it("setEmergencyShutdown() call by governance", async function () {
      await expect(this.vault.connect(this.signers.governance).setEmergencyShutdown(true))
        .to.emit(this.vault, "LogEmergencyShutdown")
        .withArgs(true, this.signers.governance.address);
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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
      expect(await this.vault.investStrategyHash()).to.eq(ethers.constants.HashZero);
      expect((await this.vault.getInvestStrategySteps()).length).to.eq(0);
    });
  });

  describe("#setUnpaused(bool)", function () {
    it("fail setUnpaused() call by non governance", async function () {
      await expect(this.vault.connect(this.signers.bob).setUnpaused(false)).to.be.revertedWith(
        "caller is not having governance",
      );
    });

    it("setUnpaused() call by governance (null strategy)", async function () {
      await expect(this.vault.connect(this.signers.governance).setUnpaused(true))
        .to.emit(this.vault, "LogUnpause")
        .withArgs(true, this.signers.governance.address);
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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
      expect(await this.vault.investStrategyHash()).to.eq(ethers.constants.HashZero);
      expect((await this.vault.getInvestStrategySteps()).length).to.eq(0);
    });
  });

  describe("#setRiskProfileCode(uint256)", function () {
    it("fail setRiskProfileCode() call by non governance", async function () {
      await expect(this.vault.connect(this.signers.bob).setRiskProfileCode(1)).to.be.revertedWith(
        "caller is not having governance",
      );
    });

    it("fail setRiskProfileCode(), non-existant code", async function () {
      await expect(
        this.vault.connect(this.signers.bob).connect(this.signers.operator).setRiskProfileCode(3),
      ).to.be.revertedWith("5");
    });

    it("setRiskProfileCode() call by governance", async function () {
      await this.vault.connect(this.signers.governance).setRiskProfileCode("1");
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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

  describe("#adminCall(bytes[])", function () {
    it("fail adminCall() call by non operator", async function () {
      const _codes = [];
      const iface = new ethers.utils.Interface(["function approve(address,uint256)"]);
      _codes.push(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "bytes"],
          [this.usdc.address, iface.encodeFunctionData("approve", [this.signers.alice.address, "200"])],
        ),
      );
      await expect(this.vault.connect(this.signers.bob).adminCall(_codes)).to.be.revertedWith(
        "caller is not the operator",
      );
    });
  });

  describe("#getNextBestInvestStrategy()", function () {
    it("getNextBestInvestStrategy()", async function () {
      expect((await this.vault.getInvestStrategySteps()).length).to.eq(0);
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, testStrategy[fork][strategyKeys[0]].steps);
      expect(await this.vault.getNextBestInvestStrategy()).to.deep.eq([
        Object.values(testStrategy[fork][strategyKeys[0]].steps[0]),
      ]);
    });
  });

  describe("#getLastStrategyStepBalanceLP(DataTypes.StrategyStep[])", function () {
    it("getLastStrategyStepBalanceLP() return 0", async function () {
      expect(await this.vault.getLastStrategyStepBalanceLP(testStrategy[fork][strategyKeys[0]].steps)).to.eq("0");
    });
  });

  describe("#rebalance()", function () {
    it("fail rebalance() call, vault is paused", async function () {
      // (249) unpause = false = 0
      await expect(this.vault.connect(this.signers.governance).setUnpaused(false))
        .to.emit(this.vault, "LogUnpause")
        .withArgs(false, this.signers.governance.address);
      expect(await this.vault.investStrategyHash()).to.eq(ethers.constants.HashZero);
      expect((await this.vault.getInvestStrategySteps()).length).to.eq(0);
      await expect(this.vault.rebalance()).to.be.revertedWith("14");
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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

    it("rebalance(), deposit asset into strategy", async function () {
      await this.vault.connect(this.signers.governance).setEmergencyShutdown(false);
      await this.vault.connect(this.signers.governance).setUnpaused(true);
      const _totalSupply = BigNumber.from("1000").mul(to_10powNumber_BN("6"));
      const _pool = testStrategy[fork][strategyKeys[0]].steps[0].pool;
      const _adapterAddress = await this.registry.liquidityPoolToAdapter(_pool);
      const _adapterInstance = await ethers.getContractAt("IAdapterFull", _adapterAddress);
      await this.vault.rebalance();
      const _expectedVaultUsdcBalance = BigNumber.from("0");
      expect(await this.usdc.balanceOf(this.vault.address)).to.eq(_expectedVaultUsdcBalance);
      const canStake: boolean = await _adapterInstance.canStake(_pool);
      let expectedlpTokenBalance = BigNumber.from("0");
      if (canStake) {
        expectedlpTokenBalance = await _adapterInstance.getLiquidityPoolTokenBalanceStake(this.vault.address, _pool);
      }
      expectedlpTokenBalance = await _adapterInstance.getLiquidityPoolTokenBalance(
        this.vault.address,
        MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address,
        _pool,
      );
      const _lpTokenAddress = testStrategy[fork][strategyKeys[0]].steps[0].outputToken;
      const _lpTokenInstance: ERC20 = <ERC20>await ethers.getContractAt(ERC20__factory.abi, _lpTokenAddress);
      const _actuallpTokenBalance = await _lpTokenInstance.balanceOf(this.vault.address);
      expect(_actuallpTokenBalance).to.eq(expectedlpTokenBalance);
      let _allAmountInToken = BigNumber.from("0");
      if (canStake) {
        _allAmountInToken = await _adapterInstance.getAllAmountInTokenStake(
          this.vault.address,
          MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address,
          _pool,
        );
      } else {
        _allAmountInToken = await _adapterInstance.getAllAmountInToken(
          this.vault.address,
          MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address,
          _pool,
        );
      }
      const _expectedPricePerFullShare = _allAmountInToken.mul(to_10powNumber_BN("18")).div(_totalSupply);
      expect(await this.vault.getPricePerFullShare()).to.eq(_expectedPricePerFullShare);

      expect(await this.vault.investStrategyHash()).to.eq(testStrategy[fork][strategyKeys[0]].hash);
    });
  });

  describe("#getInvestStrategySteps(DataTypes.StrategyStep[])", function () {
    it("getInvestStrategySteps(), return the strategy steps correctly", async function () {
      expect(await this.vault.getInvestStrategySteps()).to.deep.eq([
        Object.values(testStrategy[fork][strategyKeys[0]].steps[0]),
      ]);
    });
  });

  describe("#balanceUT()", function () {
    it("balanceUT() return 0", async function () {
      expect(await this.vault.balanceUT()).to.eq("0");
    });
  });

  describe("#getPricePerFullShare()", function () {
    it("getPricePerFullShare() return 0", async function () {
      expect(await this.vault.getPricePerFullShare()).to.eq("0");
    });
  });

  describe("#userDepositPermitted(address,bool,uint256,uint256,bytes32[],bytes32[])", function () {
    it("userDepositPermitted() return false,EOA_NOT_WHITELISTED", async function () {
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address],
        this.signers.eve.address,
      );
      // (250) allow whitelisted state = true = 1
      await this.vault
        .connect(this.signers.governance)
        .setVaultConfiguration("2263509185489252423370722020903473772070240894952733989178334617643482677249");
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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
        await this.vault.userDepositPermitted(this.signers.eve.address, true, "1", "0", _proof, []),
      ).to.have.members([false, "8"]);
    });

    it("userDepositPermitted() return false,CA_NOT_WHITELISTED", async function () {
      expect(await this.testVault.testUserDepositPermitted(this.vault.address, "1000000000", [], [])).to.have.members([
        false,
        "8",
      ]);
    });

    it("userDepositPermitted() return false,MINIMUM_USER_DEPOSIT_VALUE_UT", async function () {
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address],
        this.signers.alice.address,
      );
      expect(
        await this.vault
          .connect(this.signers.alice)
          .userDepositPermitted(this.signers.alice.address, true, "100", "0", _proof, []),
      ).to.have.members([false, "10"]);
    });

    it("userDepositPermitted() return false,TOTAL_VALUE_LOCKED_LIMIT_UT", async function () {
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address],
        this.signers.alice.address,
      );
      expect(
        await this.vault
          .connect(this.signers.alice)
          .userDepositPermitted(this.signers.alice.address, true, "100000000000", "0", _proof, []),
      ).to.have.members([false, "11"]);
    });

    it("userDepositPermitted() return false,USER_DEPOSIT_CAP_UT", async function () {
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address],
        this.signers.alice.address,
      );
      expect(
        await this.vault
          .connect(this.signers.alice)
          .userDepositPermitted(this.signers.alice.address, true, "4000000000", "0", _proof, []),
      ).to.have.members([false, "12"]);
    });

    it('call userDepositPermitted() from EOA return true,""', async function () {
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address],
        this.signers.alice.address,
      );
      expect(
        await this.vault
          .connect(this.signers.alice)
          .userDepositPermitted(this.signers.alice.address, true, "1500000000", "0", _proof, []),
      ).to.have.members([true, ""]);
    });

    it('call userDepositPermitted() from CA return true,""', async function () {
      const _accountRoot = getAccountsMerkleRoot([
        this.signers.alice.address,
        this.signers.bob.address,
        this.testVault.address,
      ]);
      await this.vault.connect(this.signers.governance).setWhitelistedAccountsRoot(_accountRoot);
      const code = await ethers.provider.getCode(this.testVault.address);
      const codeHash = ethers.utils.keccak256(code);
      const _codeRoot = getCodesMerkleRoot([codeHash]);
      await this.vault.connect(this.signers.governance).setWhitelistedCodesRoot(_codeRoot);
      const _accountProof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address],
        this.testVault.address,
      );
      const _codeProof = getCodesMerkleProof([codeHash], ethers.constants.HashZero);
      expect(
        await this.testVault.testUserDepositPermitted(this.vault.address, "1500000000", _accountProof, _codeProof),
      ).to.have.members([true, ""]);
    });
  });

  describe("#vaultDepositPermitted()", function () {
    it("vaultDepositPermitted() return false,VAULT_PAUSED", async function () {
      expect(await this.vault.vaultDepositPermitted()).to.have.members([false, "14"]);
    });

    it("vaultDepositPermitted() return false,VAULT_EMERGENCY_SHUTDOWN", async function () {
      await expect(this.vault.connect(this.signers.governance).setUnpaused(true))
        .to.emit(this.vault, "LogUnpause")
        .withArgs(true, this.signers.governance.address);
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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
      expect(await this.vault.vaultDepositPermitted()).to.have.members([false, "13"]);
    });

    it('vaultDepositPermitted() return true,""', async function () {
      // (248) emergency shutdown = false = 0
      // 249 unpause = true = 1
      // (250) allow whitelisted state = false = 0
      await this.vault
        .connect(this.signers.governance)
        .setVaultConfiguration("906570639739453258250749540332912351914733262152258629340941055050750689281");
      expect(await this.vault.vaultDepositPermitted()).to.have.members([true, ""]);
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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

  describe("#userDepositVault(uint256,bytes,bytes32[],bytes32[])", function () {
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
      await this.vault
        .connect(this.signers.governance)
        .setVaultConfiguration("906392544231311161076231617881117198619499239097192527361058388634069106688");
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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
      const _depositFee = await this.vault.calcDepositFeeUT(_depositAmountUSDC);
      const _depositAmountUSDCWithFee = _depositAmountUSDC.sub(_depositFee);
      const _previousBalance = await this.vault.balanceOf(this.signers.alice.address);
      const _previousVaultBalance = await this.vault.balanceUT();
      await this.vault.connect(this.signers.financeOperator).setMinimumDepositValueUT(_depositAmountUSDC);
      const deadline = ethers.constants.MaxUint256;
      const { v, r, s } = await getPermitSignature(
        this.signers.alice,
        this.usdc,
        this.vault.address,
        _depositAmountUSDC,
        deadline,
        { version: "2" },
      );
      const dataPermit = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256", "uint256", "uint8", "bytes32", "bytes32"],
        [this.signers.alice.address, this.vault.address, _depositAmountUSDC, deadline, v, r, s],
      );
      await this.usdc.connect(this.signers.admin).transfer(this.signers.alice.address, _depositAmountUSDC);
      await expect(
        this.vault
          .connect(this.signers.alice)
          .userDepositVault(this.signers.alice.address, _depositAmountUSDC, dataPermit, _proofs, []),
      )
        .to.emit(this.vault, "Transfer")
        .withArgs(ethers.constants.AddressZero, this.signers.alice.address, _depositAmountUSDCWithFee);
      expect(await this.usdc.balanceOf(this.vault.address)).to.eq(_previousVaultBalance.add(_depositAmountUSDCWithFee));
      expect(await this.vault.totalSupply()).to.eq(_previousVaultBalance.add(_depositAmountUSDCWithFee));
      expect(await this.vault.totalDeposits(this.signers.alice.address)).to.eq(
        _previousBalance.add(_depositAmountUSDCWithFee),
      );
      // the vault shares VT will be same as total supply is zero
      expect(await this.vault.balanceOf(this.signers.alice.address)).to.eq(
        _previousBalance.add(_depositAmountUSDCWithFee),
      );
    });

    it("fail userDepositVault() call, vault is paused", async function () {
      await this.vault.connect(this.signers.governance).setUnpaused(false);
      const _accountRoot = getAccountsMerkleRoot([
        this.signers.alice.address,
        this.signers.bob.address,
        this.testVault.address,
        this.signers.eve.address,
      ]);
      await this.vault.connect(this.signers.governance).setWhitelistedAccountsRoot(_accountRoot);
      await this.vault.connect(this.signers.governance).setEmergencyShutdown(false);
      const usdcDepositAmount = BigNumber.from("1000").mul(to_10powNumber_BN("6"));
      await this.usdc.connect(this.signers.admin).transfer(this.signers.alice.address, usdcDepositAmount);
      await this.usdc.connect(this.signers.alice).approve(this.vault.address, usdcDepositAmount);
      await expect(
        this.vault
          .connect(this.signers.alice)
          .userDepositVault(this.signers.alice.address, usdcDepositAmount, [], [], []),
      ).to.be.revertedWith("14");
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
      await this.vault
        .connect(this.signers.governance)
        .setVaultConfiguration("906392544231311161076231617881117198619499239097192527361058388634069106688");
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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
      const _depositFee = await this.vault.calcDepositFeeUT(_depositAmountUSDC);
      const _depositAmountUSDCWithFee = _depositAmountUSDC.sub(_depositFee);
      const _previousBalance = await this.vault.balanceOf(this.signers.alice.address);
      const _previousVaultBalance = await this.vault.balanceUT();
      await this.vault.connect(this.signers.financeOperator).setMinimumDepositValueUT(_depositAmountUSDC);
      await expect(
        this.vault
          .connect(this.signers.alice)
          .userDepositVault(this.signers.alice.address, _depositAmountUSDC, [], _proofs, []),
      )
        .to.emit(this.vault, "Transfer")
        .withArgs(ethers.constants.AddressZero, this.signers.alice.address, _depositAmountUSDCWithFee);
      expect(await this.usdc.balanceOf(this.vault.address)).to.eq(_previousVaultBalance.add(_depositAmountUSDCWithFee));
      expect(await this.vault.totalSupply()).to.eq(_previousVaultBalance.add(_depositAmountUSDCWithFee));
      expect(await this.vault.totalDeposits(this.signers.alice.address)).to.eq(
        _previousBalance.add(_depositAmountUSDCWithFee),
      );
      // the vault shares VT will be same as total supply is zero
      expect(await this.vault.balanceOf(this.signers.alice.address)).to.eq(
        _previousBalance.add(_depositAmountUSDCWithFee),
      );
    });

    it("fail userDepositVault() for non-whitelisted,EOA_NOT_WHITELISTED", async function () {
      const _proofs = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address],
        this.signers.eve.address,
      );
      await this.vault
        .connect(this.signers.governance)
        .setVaultConfiguration("2715643938564376714569528258641865758826842749497826340477583138757711757312");
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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
      await this.usdc.connect(this.signers.eve).approve(this.vault.address, _depositAmountUSDC);
      await expect(
        this.vault
          .connect(this.signers.eve)
          .userDepositVault(ethers.constants.AddressZero, _depositAmountUSDC, [], _proofs, []),
      ).to.revertedWith("8");
    });

    it("fail userDepositVault() good user alice calls on bob's proof,EOA_NOT_WHITELISTED", async function () {
      const _bobProofs = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address],
        this.signers.bob.address,
      );
      await this.vault
        .connect(this.signers.governance)
        .setVaultConfiguration("2715643938564376714569528258641865758826842749497826340477583138757711757312");
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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
      await this.usdc.connect(this.signers.alice).approve(this.vault.address, _depositAmountUSDC);
      await expect(
        this.vault
          .connect(this.signers.alice)
          .userDepositVault(ethers.constants.AddressZero, _depositAmountUSDC, [], _bobProofs, []),
      ).to.revertedWith("8");
    });

    it("userDepositVault, deposit fees", async function () {
      // lift emergency shutdown
      await expect(this.vault.connect(this.signers.governance).setEmergencyShutdown(false))
        .to.emit(this.vault, "LogEmergencyShutdown")
        .withArgs(false, this.signers.governance.address);
      // set 5% deposit fee, 10 UT flat fee, set vaultFeeCollector address = 0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5
      // 0x060119cDeDF678aBE15a921a2AB26C9Bc8867fc35cE500640000000001f4000A
      // 2715822034072518811744046181093660912122076772552892442457464397795247259658
      await this.vault
        .connect(this.signers.governance)
        .setVaultConfiguration("2715822034072518811744046181093660912122076772552892442457464397795247259658");
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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
      await this.usdc.connect(this.signers.eve).approve(this.vault.address, _depositAmountUSDC);
      const _expectedDepositFee = new BN(new BN(_depositAmountUSDC.toString()).multipliedBy("0.05")).plus(
        new BN("10000000"),
      );
      const _expectedShares = BigNumber.from(
        _depositAmountUSDC.sub(BigNumber.from(Math.floor(_expectedDepositFee.toNumber()))),
      )
        .mul(await this.vault.totalSupply())
        .div(await this.usdc.balanceOf(this.vault.address));
      const _balanceBeforeVT = await this.vault.balanceOf(this.signers.eve.address);
      await expect(
        this.vault
          .connect(this.signers.eve)
          .userDepositVault(ethers.constants.AddressZero, _depositAmountUSDC, [], _proof, []),
      )
        .to.emit(this.usdc, "Transfer")
        .withArgs(
          getAddress(this.vault.address),
          getAddress("0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5"),
          BigNumber.from(_expectedDepositFee.toString()),
        );
      const _balanceAfterVT = await this.vault.balanceOf(this.signers.eve.address);
      expect(_balanceAfterVT.sub(_balanceBeforeVT)).to.eq(_expectedShares);
    });

    it("fail userDepositVault, deposit fees, MINIMUM_USER_DEPOSIT_VALUE_UT", async function () {
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address, this.signers.eve.address],
        this.signers.eve.address,
      );
      const _depositAmountUSDC = BigNumber.from("1000").mul(to_10powNumber_BN("6"));
      await this.usdc.connect(this.signers.admin).transfer(this.signers.eve.address, _depositAmountUSDC);
      await this.usdc.connect(this.signers.eve).approve(this.vault.address, _depositAmountUSDC);
      await expect(
        this.vault
          .connect(this.signers.eve)
          .userDepositVault(ethers.constants.AddressZero, _depositAmountUSDC, [], _proof, []),
      ).to.revertedWith("10");
    });

    it("userDepositVault, withdrawal fees", async function () {
      // set 5% withdrawal fee, 10 UT flat fee
      // 0x060119cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5006401f4000A01f4000A
      // 2715822034072518811744046181093660912122076772552892442457605135326552260618
      await this.vault
        .connect(this.signers.governance)
        .setVaultConfiguration("2715822034072518811744046181093660912122076772552892442457605135326552260618");
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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
      const _withdrawAmountVT = (await this.vault.balanceOf(this.signers.eve.address)).div("2");
      const _expectedUT = (await this.usdc.balanceOf(this.vault.address))
        .mul(_withdrawAmountVT)
        .div(await this.vault.totalSupply());
      const _expectedWithdrawalFee = new BN(new BN(_expectedUT.toString()).multipliedBy("0.05")).plus(
        new BN("10000000"),
      );
      const _balanceBeforeUT = await this.usdc.balanceOf(this.signers.eve.address);
      await expect(
        this.vault
          .connect(this.signers.eve)
          .userWithdrawVault(ethers.constants.AddressZero, _withdrawAmountVT, _proof, []),
      )
        .to.emit(this.usdc, "Transfer")
        .withArgs(
          getAddress(this.vault.address),
          getAddress("0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5"),
          BigNumber.from(Math.floor(_expectedWithdrawalFee.toNumber())),
        );
      const _balanceAfterUT = await this.usdc.balanceOf(this.signers.eve.address);
      const _actualReceivedUT = _balanceAfterUT.sub(_balanceBeforeUT);
      expect(_actualReceivedUT).to.eq(_expectedUT.sub(BigNumber.from(Math.floor(_expectedWithdrawalFee.toNumber()))));
    });

    it("fail userDepositVault, VAULT_EMERGENCY_SHUTDOWN", async function () {
      await this.vault.connect(this.signers.governance).setEmergencyShutdown(true);
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address, this.signers.eve.address],
        this.signers.eve.address,
      );
      const _depositAmountUSDC = BigNumber.from("1000").mul(to_10powNumber_BN("6"));
      await expect(
        this.vault
          .connect(this.signers.eve)
          .userDepositVault(ethers.constants.AddressZero, _depositAmountUSDC, [], _proof, []),
      ).to.revertedWith("13");
    });
  });

  describe("#userWithdrawPermitted(address,uint256,bytes32[],bytes32[])", function () {
    it("userWithdrawPermitted() return false,VAULT_PAUSED", async function () {
      expect(await this.vault.investStrategyHash()).to.eq(ethers.constants.HashZero);
      expect((await this.vault.getInvestStrategySteps()).length).to.eq(0);
      await this.vault
        .connect(this.signers.governance)
        .setVaultConfiguration("906570639739453258250749540332912351914733262152258629340941055050750689281");
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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
      await this.vault.connect(this.signers.governance).setUnpaused(false);
      expect(
        await this.vault.connect(this.signers.alice).userWithdrawPermitted(this.signers.alice.address, 1, [], []),
      ).to.have.members([false, "14"]);
    });

    it("userWithdrawPermitted() return false,USER_WITHDRAW_INSUFFICIENT_VT", async function () {
      const _accountProof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address],
        this.signers.alice.address,
      );
      await expect(this.vault.connect(this.signers.governance).setUnpaused(true))
        .to.emit(this.vault, "LogUnpause")
        .withArgs(true, this.signers.governance.address);
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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
      const _userBalance = await this.vault.balanceOf(this.signers.alice.address);
      expect(
        await this.vault
          .connect(this.signers.alice)
          .userWithdrawPermitted(this.signers.alice.address, _userBalance.add(1), _accountProof, []),
      ).to.have.members([false, "1"]);
    });

    it('userWithdrawPermitted() return true,""', async function () {
      const _proofs = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address],
        this.signers.alice.address,
      );
      const _balanceVT = await this.vault.balanceOf(this.signers.alice.address);
      expect(
        await this.vault
          .connect(this.signers.alice)
          .userWithdrawPermitted(this.signers.alice.address, _balanceVT, _proofs, []),
      ).members([true, ""]);
    });
  });

  describe("#vaultWithdrawPermitted()", function () {
    it("vaultWithdrawPermitted() return false,VAULT_PAUSED", async function () {
      await expect(this.vault.connect(this.signers.governance).setUnpaused(false))
        .to.emit(this.vault, "LogUnpause")
        .withArgs(false, this.signers.governance.address);
      expect(await this.vault.investStrategyHash()).to.eq(ethers.constants.HashZero);
      expect((await this.vault.getInvestStrategySteps()).length).to.eq(0);
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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
      expect(await this.vault.vaultWithdrawPermitted()).to.have.members([false, "14"]);
    });

    it('vaultWithdrawPermitted() return true,""', async function () {
      await expect(this.vault.connect(this.signers.governance).setUnpaused(true))
        .to.emit(this.vault, "LogUnpause")
        .withArgs(true, this.signers.governance.address);
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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
      expect(await this.vault.vaultWithdrawPermitted()).to.have.members([true, ""]);
    });
  });

  describe("#vaultDepositAllToStrategy()", function () {
    it("fail vaultDepositAllToStrategy() call, vault is paused", async function () {
      await this.vault.connect(this.signers.governance).setUnpaused(false);
      await expect(this.vault.vaultDepositAllToStrategy()).to.be.revertedWith("14");
    });

    it("vaultDepositAllToStrategy() by any user", async function () {
      await expect(this.vault.connect(this.signers.governance).setUnpaused(true))
        .to.emit(this.vault, "LogUnpause")
        .withArgs(true, this.signers.governance.address);
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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
      const _balanceUTBeforeRebalance = await this.usdc.balanceOf(this.vault.address);
      await this.vault.rebalance();
      expect(await this.vault.getInvestStrategySteps()).to.deep.eq([
        Object.values(testStrategy[fork][strategyKeys[0]].steps[0]),
      ]);
      expect(await this.vault.investStrategyHash()).to.eq(testStrategy[fork][strategyKeys[0]].hash);
      const _balanceUTAfterRebalance = await this.usdc.balanceOf(this.vault.address);
      expect(_balanceUTBeforeRebalance).to.gt(_balanceUTAfterRebalance);
      await this.usdc.connect(this.signers.eve).transfer(this.vault.address, "1000000000");
      const _balanceUTBeforeDepositToStrategy = await this.usdc.balanceOf(this.vault.address);
      await this.vault.vaultDepositAllToStrategy();
      expect(await this.vault.getInvestStrategySteps()).to.deep.eq([
        Object.values(testStrategy[fork][strategyKeys[0]].steps[0]),
      ]);
      expect(await this.vault.investStrategyHash()).to.eq(testStrategy[fork][strategyKeys[0]].hash);
      const _balanceUTAfterDepositToStrategy = await this.usdc.balanceOf(this.vault.address);
      expect(_balanceUTBeforeDepositToStrategy).to.gt(_balanceUTAfterDepositToStrategy);
    });

    it("fail vaultDepositAllToStrategy(), VAULT_EMERGENCY_SHUTDOWN", async function () {
      const _balanceUTBefore = await this.usdc.balanceOf(this.vault.address);
      await expect(this.vault.connect(this.signers.governance).setEmergencyShutdown(true))
        .to.emit(this.vault, "LogEmergencyShutdown")
        .withArgs(true, this.signers.governance.address);
      const _balanceUTAfter = await this.usdc.balanceOf(this.vault.address);
      expect(_balanceUTAfter).to.gt(_balanceUTBefore);
      expect(await this.vault.investStrategyHash()).to.eq(ethers.constants.HashZero);
      expect((await this.vault.getInvestStrategySteps()).length).to.eq(0);
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
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
      await expect(this.vault.vaultDepositAllToStrategy()).to.revertedWith("13");
    });
  });

  describe("#setUnderlyingTokensHash(bytes32)", function () {
    it("fail setUnderlyingTokensHash() call by non operator", async function () {
      await expect(
        this.vault.connect(this.signers.bob).setUnderlyingTokensHash(ethers.constants.HashZero),
      ).to.be.revertedWith("caller is not the operator");
    });

    it("fail setUnderlyingTokensHash(), registry not approved", async function () {
      await expect(
        this.vault
          .connect(this.signers.operator)
          .setUnderlyingTokensHash(
            getSoliditySHA3Hash(["address", "uint256"], [MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address, "a"]),
          ),
      ).to.be.revertedWith("17");
    });

    it("setUnderlyingTokensHash() call by operator", async function () {
      await this.vault.connect(this.signers.operator).setUnderlyingTokensHash(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash);
      expect(await this.vault.underlyingToken()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address);
      expect(await this.vault.underlyingTokensHash()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash);
    });
  });

  describe("#isMaxVaultValueJumpAllowed(uint256,uint256)", function () {
    it("isMaxVaultValueJumpAllowed() return true", async function () {
      expect(await this.vault.isMaxVaultValueJumpAllowed("1", "10000")).to.be.true;
    });

    it("isMaxVaultValueJumpAllowed() return false", async function () {
      expect(await this.vault.isMaxVaultValueJumpAllowed("10000", "1")).to.be.false;
    });
  });

  describe("#calcDepositFeeUT(uint256)", function () {
    it("calcDepositFeeUT()", async function () {
      const vaultConfiguration = await this.vault.vaultConfiguration();
      const amount = BigNumber.from("10000000");
      const expectedFee = amount
        .mul(getDepositFeePct(vaultConfiguration))
        .div(10000)
        .add(getDepositFeeUT(vaultConfiguration).mul(to_10powNumber_BN("6")));
      expect(await this.vault.calcDepositFeeUT(amount)).to.eq(expectedFee);
    });
  });

  describe("#calcWithdrawalFeeUT(uint256)", function () {
    it("calcWithdrawalFeeUT()", async function () {
      const vaultConfiguration = await this.vault.vaultConfiguration();
      const amount = BigNumber.from("10000000");
      const expectedFee = amount
        .mul(getWithdrawalFeePct(vaultConfiguration))
        .div(10000)
        .add(getWithdrawalFeeUT(vaultConfiguration).mul(to_10powNumber_BN("6")));
      expect(await this.vault.calcWithdrawalFeeUT(amount)).to.eq(expectedFee);
    });
  });

  describe("#computeInvestStrategyHash(DataTypes.StrategyStep[])", function () {
    it("computeInvestStrategyHash()", async function () {
      expect(await this.vault.computeInvestStrategyHash(testStrategy[fork][strategyKeys[0]].steps)).to.eq(
        testStrategy[fork][strategyKeys[0]].hash,
      );
    });
  });

  describe("#balanceUnclaimedRewardToken()", function () {
    it("balanceUnclaimedRewardToken() return 0", async function () {
      // CompoundAdapter: Requires write call to get unclaimed COMP tokens
      await this.vault.connect(this.signers.governance).setEmergencyShutdown(false);
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, testStrategy[fork][strategyKeys[0]].steps);
      await this.vault.rebalance();
      const _pool = testStrategy[fork][strategyKeys[0]].steps[0].pool;
      expect(await this.vault.balanceUnclaimedRewardToken(_pool)).to.eq(0);
    });
  });

  describe("#claimRewardToken(address)", function () {
    const _pool = testStrategy[fork][strategyKeys[0]].steps[0].pool;

    it("fail claimRewardToken() call by non strategyOperator", async function () {
      await expect(this.vault.connect(this.signers.bob).claimRewardToken(_pool)).to.be.revertedWith(
        "caller is not the strategyOperator",
<<<<<<< HEAD
      );
    });

    it("claimRewardToken(), fails nothing to claim", async function () {
      const _adapterAddress = await this.registry.liquidityPoolToAdapter(_pool);
      const _adapterInstance = await ethers.getContractAt("IAdapterFull", _adapterAddress);
      const _rewardToken = await _adapterInstance.getRewardToken(_pool);
      const _rewardTokenInstance: ERC20 = <ERC20>await ethers.getContractAt(ERC20__factory.abi, _rewardToken);
      const _balanceRTBefore = await _rewardTokenInstance.balanceOf(this.vault.address);
      await expect(this.vault.claimRewardToken(_pool)).to.emit(this.vault, "RewardTokenClaimed");
      const _balanceRTAfter = await _rewardTokenInstance.balanceOf(this.vault.address);
      expect(_balanceRTAfter).to.gt(_balanceRTBefore);
    });
  });

  describe("#harvestSome(address,uint256)", function () {
    const _pool = testStrategy[fork][strategyKeys[0]].steps[0].pool;

    it("fail harvestSome() call by non strategyOperator", async function () {
      await expect(this.vault.connect(this.signers.bob).harvestSome(_pool, BigNumber.from(1000))).to.be.revertedWith(
        "caller is not the strategyOperator",
=======
>>>>>>> da2c66e2 (fix(vault): harvest and claim by strategyoperator)
      );
    });

    it("claimRewardToken(), fails nothing to claim", async function () {
      const _adapterAddress = await this.registry.liquidityPoolToAdapter(_pool);
      const _adapterInstance = await ethers.getContractAt("IAdapterFull", _adapterAddress);
      const _rewardToken = await _adapterInstance.getRewardToken(_pool);
      const _rewardTokenInstance: ERC20 = <ERC20>await ethers.getContractAt(ERC20__factory.abi, _rewardToken);
      const _balanceRTBefore = await _rewardTokenInstance.balanceOf(this.vault.address);
      await expect(this.vault.claimRewardToken(_pool)).to.emit(this.vault, "RewardTokenClaimed");
      const _balanceRTAfter = await _rewardTokenInstance.balanceOf(this.vault.address);
      expect(_balanceRTAfter).to.gt(_balanceRTBefore);
    });
  });

  describe("#harvestSome(address,uint256)", function () {
    const _pool = testStrategy[fork][strategyKeys[0]].steps[0].pool;

    it("fail harvestSome() call by non strategyOperator", async function () {
      await expect(this.vault.connect(this.signers.bob).harvestSome(_pool, BigNumber.from(1000))).to.be.revertedWith(
        "caller is not the strategyOperator",
      );
    });

    it("harvestSome()", async function () {
      const _balanceClaimed = await this.vault.balanceClaimedRewardToken(_pool);
      const _balanceBeforeUT = await this.vault.balanceUT();
      await expect(this.vault.harvestSome(_pool, BigNumber.from(_balanceClaimed.div(2)))).to.emit(
        this.vault,
        "Harvested",
      );
      const _balanceAfterUT = await this.vault.balanceUT();
      expect(_balanceAfterUT).gt(_balanceBeforeUT);
    });
  });

  describe("#harvestAll(address)", function () {
    const _pool = testStrategy[fork][strategyKeys[0]].steps[0].pool;

    it("fail harvestAll() call by non strategyOperator", async function () {
      await expect(this.vault.connect(this.signers.bob).harvestAll(_pool)).to.be.revertedWith(
        "caller is not the strategyOperator",
      );
    });

    it("harvestAll()", async function () {
      const _balanceBeforeUT = await this.vault.balanceUT();
      await expect(this.vault.harvestAll(_pool)).to.emit(this.vault, "Harvested");
      const _balanceAfterUT = await this.vault.balanceUT();
      expect(_balanceAfterUT).gt(_balanceBeforeUT);
    });
  });

  describe("#userWithdrawVault(uint256,bytes32[],bytes32[])", function () {
    it("userWithdrawVault()", async function () {
      const _proofs = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address],
        this.signers.alice.address,
      );
      const _redeemVT = (await this.vault.balanceOf(this.signers.alice.address)).div("2");
      const _userbalanceBefore = await this.usdc.balanceOf(this.signers.alice.address);
      const _pool = testStrategy[fork][strategyKeys[0]].steps[0].pool;
      const _adapterAddress = await this.registry.liquidityPoolToAdapter(_pool);
      const _adapterInstance = await ethers.getContractAt("IAdapterFull", _adapterAddress);
      const canStake: boolean = await _adapterInstance.canStake(_pool);
      let _allAmountInToken = BigNumber.from("0");
      if (canStake) {
        _allAmountInToken = await _adapterInstance.getAllAmountInTokenStake(
          this.vault.address,
          MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address,
          _pool,
        );
      } else {
        _allAmountInToken = await _adapterInstance.getAllAmountInToken(
          this.vault.address,
          MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address,
          _pool,
        );
      }
      const _vaultBalanceUT = await this.usdc.balanceOf(this.vault.address);
      const _totalSupply = await this.vault.totalSupply();
      const _calculatedReceivableUT = _redeemVT.mul(_allAmountInToken.add(_vaultBalanceUT)).div(_totalSupply);
      const _calculatedWithdrawalFee = await this.vault.calcWithdrawalFeeUT(_calculatedReceivableUT);
      const _calculatedReceivableUTWithFee = _calculatedReceivableUT.sub(_calculatedWithdrawalFee);
      await expect(
        this.vault.connect(this.signers.alice).userWithdrawVault(ethers.constants.AddressZero, _redeemVT, _proofs, []),
      )
        .to.emit(this.vault, "Transfer")
        .withArgs(this.signers.alice.address, ethers.constants.AddressZero, _redeemVT);
      const _userBalanceAfter = await this.usdc.balanceOf(this.signers.alice.address);
      const _actualReceivedUT = _userBalanceAfter.sub(_userbalanceBefore);
      expect(_actualReceivedUT).to.eq(_calculatedReceivableUTWithFee);
      expect(await this.vault.totalSupply()).to.eq(_totalSupply.sub(_redeemVT));
    });

    it("fail userWithdrawVault, VAULT_PAUSED", async function () {
      await this.vault.connect(this.signers.governance).setUnpaused(false);
      const _proofs = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address],
        this.signers.alice.address,
      );
      const _redeemVT = (await this.vault.balanceOf(this.signers.alice.address)).div("2");
      await expect(
        this.vault.connect(this.signers.alice).userWithdrawVault(ethers.constants.AddressZero, _redeemVT, _proofs, []),
      ).to.revertedWith("14");
    });

    it("userWithdrawVault, during emergency shutdown", async function () {
      await this.vault.connect(this.signers.governance).setUnpaused(true);
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address, this.testVault.address, this.signers.eve.address],
        this.signers.alice.address,
      );
      const _redeemVT = (await this.vault.balanceOf(this.signers.alice.address)).div("2");
      await expect(
        this.vault.connect(this.signers.alice).userWithdrawVault(ethers.constants.AddressZero, _redeemVT, _proof, []),
      )
        .to.emit(this.vault, "Transfer")
        .withArgs(this.signers.alice.address, ethers.constants.AddressZero, _redeemVT);
    });
  });

  describe("_beforeTokenTransfer()", function () {
    it("fail _beforeTokenTransfer() TRANSFER_TO_THIS_CONTRACT", async function () {
      const _redeemVT = await this.vault.balanceOf(this.signers.alice.address);
      await expect(this.vault.transfer(this.vault.address, _redeemVT)).to.revertedWith("18");
    });
  });
});
