import { artifacts, waffle, ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import { deployContract, solidity } from "ethereum-waffle";
import { Artifact } from "hardhat/types";
import { BigNumber, ContractReceipt, Event } from "ethers";
import { getSoliditySHA3Hash, Signers, to_10powNumber_BN } from "../../helpers/utils";
import {
  AdminUpgradeabilityProxy,
  ERC20,
  Registry,
  RegistryProxy,
  RegistryV2,
  RiskManagerProxy,
  RiskManagerV2,
  StrategyProviderV2,
  TestVaultV2,
  Vault,
  VaultV2,
} from "../../typechain";
import {
  opUSDCgrow,
  opWETHgrow,
  RegistryProxy as RegistryProxyAddress,
  RiskManagerProxy as RiskManagerProxyAddress,
} from "../../_deployments/mainnet.json";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { setTokenBalanceInStorage } from "./utils";
import { TypedDefiPools } from "../../helpers/data/defiPools";
import { generateStrategyHashV2 } from "../../helpers/helpers";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";
import { eEVMNetwork, NETWORKS_CHAIN_ID } from "../../helper-hardhat-config";
import { StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;
const OPUSDCGROW_VAULT_ADDRESS = opUSDCgrow.Vault;
const OPWETHGROW_VAULT_ADDRESS = opWETHgrow.Vault;
const REGISTRY_PROXY_ADDRESS = RegistryProxyAddress;
const RISK_MANAGER_PROXY = RiskManagerProxyAddress;

const testStrategy: {
  [key: string]: {
    [name: string]: { steps: { pool: string; outputToken: string; isBorrow: boolean }[]; hash: string };
  };
} = {
  [eEVMNetwork.ethereum || NETWORKS_CHAIN_ID[eEVMNetwork.ethereum]]: {
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
  [eEVMNetwork.matic || eEVMNetwork.polygon || NETWORKS_CHAIN_ID[eEVMNetwork.matic]]: {},
};

const strategyKeys = Object.keys(testStrategy[fork]);

describe("VaultV2", () => {
  before(async function () {
    this.vaultV2Artifact = <Artifact>await artifacts.readArtifact(ESSENTIAL_CONTRACTS.VAULT_V2);
    this.registryV2Artifact = <Artifact>await artifacts.readArtifact(ESSENTIAL_CONTRACTS.REGISTRY_V2);
    this.testVaultV2Artifact = <Artifact>await artifacts.readArtifact(ESSENTIAL_CONTRACTS.TEST_VAULT_V2);
    const riskManagerV2Artifact: Artifact = await artifacts.readArtifact(ESSENTIAL_CONTRACTS.RISK_MANAGER_V2);
    const strategyProviderV2Artifact: Artifact = await artifacts.readArtifact(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER_V2);
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.deployer = signers[0];
    this.signers.admin = signers[1];
    this.signers.alice = signers[3];
    this.signers.bob = signers[4];
    this.signers.eve = signers[10];
    this.registryProxy = <RegistryProxy>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, REGISTRY_PROXY_ADDRESS)
    );
    this.registry = <Registry>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, REGISTRY_PROXY_ADDRESS);
    const operatorAddress = await this.registry.getOperator();
    const financeOperatorAddress = await this.registry.getFinanceOperator();
    const governanceAddress = await this.registry.getGovernance();
    const strategyOperatorAddress = await this.registry.getStrategyOperator();
    [operatorAddress, financeOperatorAddress, governanceAddress, strategyOperatorAddress].forEach(async addr => {
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [addr],
      });
    });
    this.signers.operator = await ethers.getSigner(operatorAddress);
    this.signers.financeOperator = await ethers.getSigner(financeOperatorAddress);
    this.signers.governance = await ethers.getSigner(governanceAddress);
    this.signers.strategyOperator = await ethers.getSigner(strategyOperatorAddress);
    this.registryV2 = <RegistryV2>await waffle.deployContract(this.signers.deployer, this.registryV2Artifact);
    await this.registryProxy.connect(this.signers.operator).setPendingImplementation(this.registryV2.address);
    await this.registryV2.connect(this.signers.operator).become(this.registryProxy.address);
    this.registryV2 = <RegistryV2>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, this.registryProxy.address)
    );
    this.riskManagerProxy = <RiskManagerProxy>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY, RISK_MANAGER_PROXY)
    );
    this.riskManagerV2 = <RiskManagerV2>(
      await deployContract(this.signers.deployer, riskManagerV2Artifact, [REGISTRY_PROXY_ADDRESS])
    );
    await this.riskManagerProxy.connect(this.signers.operator).setPendingImplementation(this.riskManagerV2.address);
    await this.riskManagerV2.connect(this.signers.operator).become(this.riskManagerProxy.address);
    this.strategyProviderV2 = <StrategyProviderV2>(
      await deployContract(this.signers.deployer, strategyProviderV2Artifact, [REGISTRY_PROXY_ADDRESS])
    );

    await this.registryV2.connect(this.signers.operator).setStrategyProvider(this.strategyProviderV2.address);
    await this.registryV2.connect(this.signers.operator).setRiskManager(this.riskManagerV2.address);
    this.opUSDCgrow = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, OPUSDCGROW_VAULT_ADDRESS);
    this.opWETHgrow = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, OPWETHGROW_VAULT_ADDRESS);
    this.usdc = <ERC20>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address)
    );
    await setTokenBalanceInStorage(this.usdc, this.signers.admin.address, "20000");
  });
  describe("VaultV2 unit testing", () => {
    before(async function () {
      this.vaultV2 = <VaultV2>(
        await waffle.deployContract(this.signers.deployer, this.vaultV2Artifact, [
          REGISTRY_PROXY_ADDRESS,
          "USD Coin",
          "USDC",
          "Growth",
          "grow",
        ])
      );
      const vaultProxyV2Artifact: Artifact = await artifacts.readArtifact(ESSENTIAL_CONTRACTS.VAULT_PROXY_V2);
      this.vaultProxyV2 = <AdminUpgradeabilityProxy>(
        await waffle.deployContract(this.signers.deployer, vaultProxyV2Artifact, [
          this.vaultV2.address,
          this.signers.admin.address,
          "0x",
        ])
      );
      this.vaultV2 = <VaultV2>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_V2, this.vaultProxyV2.address);
      await this.registryV2
        .connect(this.signers.operator)
        ["setTokensHashToTokens(bytes32,address[])"](MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, [
          MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address,
        ]);
      await this.vaultV2.initialize(
        this.registryV2.address,
        MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address,
        MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash,
        "USD Coin",
        "USDC",
        "1",
      );
      this.testVaultV2 = <TestVaultV2>await deployContract(this.signers.deployer, this.testVaultV2Artifact, []);
    });
    it("name,symbol,decimals as expected", async function () {
      expect(await this.vaultV2.name()).to.eq("op USD Coin Growth");
      expect(await this.vaultV2.symbol()).to.eq("opUSDCgrow");
      expect(await this.vaultV2.decimals()).to.eq(6);
    });
    it("fail setValueControlParams() by non Finance operator", async function () {
      await expect(
        this.vaultV2.setValueControlParams("10000000000", "1000000000", "1000000000000", "100"),
      ).to.be.revertedWith("caller is not the financeOperator");
    });

    it("setValueControlParams() by Finance operator", async function () {
      const tx = await this.vaultV2.connect(this.signers.financeOperator).setValueControlParams(
        "10000000000", // 10,000 USDC
        "1000000000", // 1000 USDC
        "1000000000000", // 1,000,000 USDC
        "100", // 1%
      );
      const { events }: ContractReceipt = await tx.wait();
      const eventsArr = events as Event[];
      expect(eventsArr[0]).to.include({
        address: this.vaultV2.address,
        event: "LogUserDepositCapUT",
        eventSignature: "LogUserDepositCapUT(uint256,address)",
      });
      expect(eventsArr[0].args?.userDepositCapUT).to.eq("10000000000");
      expect(eventsArr[0].args?.caller).to.eq(this.signers.financeOperator.address);
      expect(eventsArr[1]).to.include({
        address: this.vaultV2.address,
        event: "LogMinimumDepositValueUT",
        eventSignature: "LogMinimumDepositValueUT(uint256,address)",
      });
      expect(eventsArr[1].args?.minimumDepositValueUT).to.eq("1000000000");
      expect(eventsArr[1].args?.caller).to.eq(this.signers.financeOperator.address);
      expect(eventsArr[2]).to.include({
        address: this.vaultV2.address,
        event: "LogTotalValueLockedLimitUT",
        eventSignature: "LogTotalValueLockedLimitUT(uint256,address)",
      });
      expect(eventsArr[2].args?.totalValueLockedLimitUT).to.eq("1000000000000");
      expect(eventsArr[2].args?.caller).to.eq(this.signers.financeOperator.address);
      expect(await this.vaultV2.userDepositCapUT()).to.eq("10000000000");
      expect(await this.vaultV2.minimumDepositValueUT()).to.eq("1000000000");
      expect(await this.vaultV2.totalValueLockedLimitUT()).to.eq("1000000000000");
      expect(await this.vaultV2.maxVaultValueJump()).to.eq("100");
    });

    it("fail setFeeParams() by non Finance operator", async function () {
      await expect(
        this.vaultV2.setFeeParams(
          "1000000", // 1 USDC
          "5", // 0.05
          "1000000", // 1 USDC
          "5", // 0.05%
          this.signers.admin.address, // address for vault collector
        ),
      ).to.be.revertedWith("caller is not the financeOperator");
    });

    it("setFeeParams() by Finance operator", async function () {
      await this.vaultV2.connect(this.signers.financeOperator).setFeeParams(
        "1000000", // 1 USDC
        "5", // 0.05%
        "1000000", // 1 USDC
        "5", // 0.05%
        this.signers.admin.address, // address for vault collector
      );
      const vaultConfigurationV2 = await this.vaultV2.vaultConfiguration();
      expect(vaultConfigurationV2.depositFeeFlatUT).to.eq("1000000");
      expect(vaultConfigurationV2.depositFeePct).to.eq("5");
      expect(vaultConfigurationV2.withdrawalFeeFlatUT).to.eq("1000000");
      expect(vaultConfigurationV2.withdrawalFeePct).to.eq("5");
      expect(vaultConfigurationV2.vaultFeeCollector).to.eq(this.signers.admin.address);
    });
    it("fails setMaxVaultValueJump() call by non finance operator", async function () {
      await expect(this.vaultV2.setMaxVaultValueJump("100")).to.be.revertedWith("caller is not the financeOperator");
    });
    it("setMaxVaultValueJump() call by finance operator", async function () {
      await this.vaultV2.connect(this.signers.financeOperator).setMaxVaultValueJump("100");
      expect(await this.vaultV2.maxVaultValueJump()).to.eq("100");
    });
    it("fails setAllowWhitelistedState() call by non operator", async function () {
      await expect(this.vaultV2.setAllowWhitelistedState(false)).to.be.revertedWith("caller is not the operator");
    });
    it("setAllowWhitelistedState() call by operator", async function () {
      await expect(this.vaultV2.connect(this.signers.operator).setAllowWhitelistedState(false))
        .to.emit(this.vaultV2, "LogAllowWhitelistedState")
        .withArgs(false, this.signers.operator.address);
      expect((await this.vaultV2.vaultConfiguration())[2]).to.be.false;
    });

    it("fails setUserDepositCapUT() call by non finance operator", async function () {
      await expect(this.vaultV2.setUserDepositCapUT("2000")).to.be.revertedWith("caller is not the financeOperator");
    });
    it("setUserDepositCapUT() call by finance operator", async function () {
      await expect(this.vaultV2.connect(this.signers.operator).setUserDepositCapUT("2000000000"))
        .to.emit(this.vaultV2, "LogUserDepositCapUT")
        .withArgs("2000000000", this.signers.operator.address);
      expect(await this.vaultV2.userDepositCapUT()).to.eq("2000000000");
    });

    it("fails setMinimumDepositValueUT() call by non finance operator", async function () {
      await expect(this.vaultV2.setMinimumDepositValueUT("1000")).to.be.revertedWith(
        "caller is not the financeOperator",
      );
    });
    it("setMinimumDepositValueUT() call by finance operator", async function () {
      await expect(
        this.vaultV2
          .connect(this.signers.operator)
          .setMinimumDepositValueUT(BigNumber.from("1000").mul(to_10powNumber_BN("6"))),
      )
        .to.emit(this.vaultV2, "LogMinimumDepositValueUT")
        .withArgs("1000000000", this.signers.operator.address);
      expect(await this.vaultV2.minimumDepositValueUT()).to.eq(BigNumber.from("1000").mul(to_10powNumber_BN("6")));
    });

    it("fails setTotalValueLockedLimitUT() call by non finance operator", async function () {
      await expect(this.vaultV2.setTotalValueLockedLimitUT("100000000")).to.be.revertedWith(
        "caller is not the financeOperator",
      );
    });
    it("setTotalValueLockedLimitUT() call by finance operator", async function () {
      await expect(
        this.vaultV2
          .connect(this.signers.operator)
          .setTotalValueLockedLimitUT(BigNumber.from("10000").mul(to_10powNumber_BN("6"))),
      )
        .to.emit(this.vaultV2, "LogTotalValueLockedLimitUT")
        .withArgs("10000000000", this.signers.operator.address);
      expect(await this.vaultV2.totalValueLockedLimitUT()).to.eq(BigNumber.from("10000").mul(to_10powNumber_BN("6")));
    });

    it("fails setWhitelistedAccounts() call by non governance", async function () {
      await expect(this.vaultV2.setWhitelistedAccounts([this.signers.alice.address], [true])).to.be.revertedWith(
        "caller is not having governance",
      );
    });
    it("setWhitelistedAccounts() call by governance", async function () {
      await this.vaultV2.connect(this.signers.governance).setWhitelistedAccounts([this.signers.alice.address], [true]);
      expect(await this.vaultV2.whitelistedAccounts(this.signers.alice.address)).to.be.true;
    });
    it("fails setWhitelistedCodes() call by non governance", async function () {
      await expect(this.vaultV2.setWhitelistedCodes([this.testVaultV2.address], [true])).to.be.revertedWith(
        "caller is not having governance",
      );
    });
    it("setWhitelistedCodes() call by governance", async function () {
      const code = await ethers.provider.getCode(this.opUSDCgrow.address);
      const codeHash = ethers.utils.keccak256(code);
      await this.vaultV2.connect(this.signers.governance).setWhitelistedCodes([this.opUSDCgrow.address], [true]);
      expect(await this.vaultV2.whitelistedCodes(codeHash)).to.be.true;
    });
    it("fail setEmergencyShutdown() call by non governance", async function () {
      await expect(this.vaultV2.setEmergencyShutdown(true)).to.be.revertedWith("caller is not having governance");
    });
    it("setEmergencyShutdown() call by governance", async function () {
      await expect(this.vaultV2.connect(this.signers.governance).setEmergencyShutdown(true))
        .to.emit(this.vaultV2, "LogEmergencyShutdown")
        .withArgs(true, this.signers.governance.address);
      expect((await this.vaultV2.vaultConfiguration()).emergencyShutdown).to.be.true;
      expect(await this.vaultV2.investStrategyHash()).to.eq(ethers.constants.HashZero);
      expect(await (await this.vaultV2.getInvestStrategySteps()).length).to.eq(0);
    });
    it("fail setUnpaused() call by non governance", async function () {
      await expect(this.vaultV2.setUnpaused(false)).to.be.revertedWith("caller is not having governance");
    });
    it("setUnpaused() call by governance (null strategy)", async function () {
      await expect(this.vaultV2.connect(this.signers.governance).setUnpaused(true))
        .to.emit(this.vaultV2, "LogUnpause")
        .withArgs(true, this.signers.governance.address);
      expect((await this.vaultV2.vaultConfiguration()).unpaused).to.be.true;
      expect(await this.vaultV2.investStrategyHash()).to.eq(ethers.constants.HashZero);
      expect(await (await this.vaultV2.getInvestStrategySteps()).length).to.eq(0);
    });
    it("fail rebalance() call, vault is paused", async function () {
      await this.vaultV2.connect(this.signers.governance).setUnpaused(false);
      await expect(this.vaultV2.rebalance()).to.be.revertedWith("14");
    });
    it("fail userDepositVault() call, vault is paused", async function () {
      const usdcDepositAmount = BigNumber.from("1000").mul(to_10powNumber_BN("6"));
      await this.usdc.connect(this.signers.admin).transfer(this.signers.alice.address, usdcDepositAmount);
      await this.usdc.connect(this.signers.alice).approve(this.vaultV2.address, usdcDepositAmount);
      await expect(this.vaultV2.connect(this.signers.alice).userDepositVault(usdcDepositAmount)).to.be.revertedWith(
        "14",
      );
    });
    it("fail userWithdrawVault() call, vault is paused", async function () {
      await expect(this.vaultV2.connect(this.signers.alice).userDepositVault("12")).to.be.revertedWith("14");
    });
    it("fail vaultDepositAllToStrategy() call, vault is paused", async function () {
      await expect(this.vaultV2.vaultDepositAllToStrategy()).to.be.revertedWith("14");
    });
    it("fail adminCall() call by non operator", async function () {
      const _codes = [];
      const iface = new ethers.utils.Interface(["function approve(address,uint256)"]);
      _codes.push(
        ethers.utils.defaultAbiCoder.encode(
          ["address", "bytes"],
          [this.usdc.address, iface.encodeFunctionData("approve", [this.signers.alice.address, "200"])],
        ),
      );
      await expect(this.vaultV2.adminCall(_codes)).to.be.revertedWith("caller is not the operator");
    });
    it("fail setRiskProfileCode() call by non operator", async function () {
      await expect(this.vaultV2.setRiskProfileCode(1)).to.be.revertedWith("caller is not the operator");
    });
    it("setRiskProfileCode() call by operator", async function () {
      await this.vaultV2.connect(this.signers.operator).setRiskProfileCode(1);
      expect(await this.vaultV2.riskProfileCode()).to.be.eq("1");
    });
    it("fail setRiskProfileCode(), non-existant code", async function () {
      await expect(this.vaultV2.connect(this.signers.operator).setRiskProfileCode(3)).to.be.revertedWith("5");
    });

    it("fail setUnderlyingTokenAndTokensHash() call by non operator", async function () {
      await expect(
        this.vaultV2.setUnderlyingTokenAndTokensHash(
          MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address,
          ethers.constants.HashZero,
        ),
      ).to.be.revertedWith("caller is not the operator");
    });
    it("fail setUnderlyingTokenAndTokensHash(), registry not approved", async function () {
      await expect(
        this.vaultV2
          .connect(this.signers.operator)
          .setUnderlyingTokenAndTokensHash(
            MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address,
            getSoliditySHA3Hash(["address", "uint256"], [MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address, "a"]),
          ),
      ).to.be.revertedWith("17");
    });
    it("setUnderlyingTokenAndTokensHash() call by operator", async function () {
      await this.vaultV2
        .connect(this.signers.operator)
        .setUnderlyingTokenAndTokensHash(
          MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address,
          MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash,
        );
      expect(await this.vaultV2.underlyingToken()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address);
      expect(await this.vaultV2.underlyingTokensHash()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash);
    });
    it("balanceUT() return 0", async function () {
      expect(await this.vaultV2.balanceUT()).to.eq("0");
    });
    it("isMaxVaultValueJumpAllowed() return true", async function () {
      expect(await this.vaultV2.isMaxVaultValueJumpAllowed("1", "10000")).to.be.true;
    });
    it("isMaxVaultValueJumpAllowed() return false", async function () {
      expect(await this.vaultV2.isMaxVaultValueJumpAllowed("10000", "1")).to.be.false;
    });
    it("getPricePerFullShare() return 0", async function () {
      expect(await this.vaultV2.getPricePerFullShare()).to.eq("0");
    });

    it("userDepositPermitted() return false,EOA_NOT_WHITELISTED", async function () {
      await this.vaultV2.connect(this.signers.financeOperator).setAllowWhitelistedState(true);
      expect(await this.vaultV2.userDepositPermitted(this.signers.bob.address, true, "1", "0")).to.have.members([
        false,
        "8",
      ]);
    });
    it("userDepositPermitted() return false,CA_NOT_WHITELISTED", async function () {
      expect(await this.testVaultV2.testUserDepositPermitted(this.vaultV2.address, "1000000000")).to.have.members([
        false,
        "8",
      ]);
    });
    it("userDepositPermitted() return false,MINIMUM_USER_DEPOSIT_VALUE_UT", async function () {
      expect(await this.vaultV2.userDepositPermitted(this.signers.alice.address, true, "100", "0")).to.have.members([
        false,
        "10",
      ]);
    });
    it("userDepositPermitted() return false,TOTAL_VALUE_LOCKED_LIMIT_UT", async function () {
      expect(
        await this.vaultV2.userDepositPermitted(this.signers.alice.address, true, "100000000000", "0"),
      ).to.have.members([false, "11"]);
    });
    it("userDepositPermitted() return false,USER_DEPOSIT_CAP_UT", async function () {
      expect(
        await this.vaultV2.userDepositPermitted(this.signers.alice.address, true, "3000000000", "0"),
      ).to.have.members([false, "12"]);
    });
    it('call userDepositPermitted() from EOA return true,""', async function () {
      expect(
        await this.vaultV2.userDepositPermitted(this.signers.alice.address, true, "1500000000", "0"),
      ).to.have.members([true, ""]);
    });
    it('call userDepositPermitted() from CA return true,""', async function () {
      await this.vaultV2.connect(this.signers.governance).setWhitelistedAccounts([this.testVaultV2.address], [true]);
      await this.vaultV2.connect(this.signers.governance).setWhitelistedCodes([this.testVaultV2.address], [true]);
      expect(await this.testVaultV2.testUserDepositPermitted(this.vaultV2.address, "1500000000")).to.have.members([
        true,
        "",
      ]);
    });
    it("vaultDepositPermitted() return false,VAULT_PAUSED", async function () {
      expect(await this.vaultV2.vaultDepositPermitted()).to.have.members([false, "14"]);
    });
    it("vaultDepositPermitted() return false,VAULT_EMERGENCY_SHUTDOWN", async function () {
      await this.vaultV2.connect(this.signers.governance).setUnpaused(true);
      expect(await this.vaultV2.vaultDepositPermitted()).to.have.members([false, "13"]);
    });
    it('vaultDepositPermitted() return true,""', async function () {
      await this.vaultV2.connect(this.signers.governance).setAllowWhitelistedState(false);
      await this.vaultV2.connect(this.signers.governance).setEmergencyShutdown(false);
      expect(await this.vaultV2.vaultDepositPermitted()).to.have.members([true, ""]);
    });
    it("userWithdrawPermitted() return false,VAULT_PAUSED", async function () {
      await this.vaultV2.connect(this.signers.governance).setUnpaused(false);
      expect(await this.vaultV2.userWithdrawPermitted(this.signers.alice.address, 1)).to.have.members([false, "14"]);
    });
    it("userWithdrawPermitted() return false,USER_WITHDRAW_INSUFFICIENT_VT", async function () {
      await this.vaultV2.connect(this.signers.governance).setUnpaused(true);
      expect(await this.vaultV2.userWithdrawPermitted(this.signers.alice.address, 1)).to.have.members([false, "1"]);
    });
    it("vaultWithdrawPermitted() return false,VAULT_PAUSED", async function () {
      await this.vaultV2.connect(this.signers.governance).setUnpaused(false);
      expect(await this.vaultV2.vaultWithdrawPermitted()).to.have.members([false, "14"]);
    });
    it('vaultWithdrawPermitted() return true,""', async function () {
      await this.vaultV2.connect(this.signers.governance).setUnpaused(true);
      expect(await this.vaultV2.vaultWithdrawPermitted()).to.have.members([true, ""]);
    });
    it("calcDepositFeeUT()", async function () {
      const vaultConfiguration = await this.vaultV2.vaultConfiguration();
      const { depositFeePct, depositFeeFlatUT } = vaultConfiguration;
      const amount = BigNumber.from("10000000");
      const expectedFee = amount.mul(depositFeePct).div(10000).add(depositFeeFlatUT);
      expect(await this.vaultV2.calcDepositFeeUT(amount)).to.eq(expectedFee);
    });
    it("calcWithdrawalFeeUT()", async function () {
      const vaultConfiguration = await this.vaultV2.vaultConfiguration();
      const { withdrawalFeePct, withdrawalFeeFlatUT } = vaultConfiguration;
      const amount = BigNumber.from("10000000");
      const expectedFee = amount.mul(withdrawalFeePct).div(10000).add(withdrawalFeeFlatUT);
      expect(await this.vaultV2.calcWithdrawalFeeUT(amount)).to.eq(expectedFee);
    });
    it("computeInvestStrategyHash()", async function () {
      expect(await this.vaultV2.computeInvestStrategyHash(testStrategy[fork][strategyKeys[0]].steps)).to.eq(
        testStrategy[fork][strategyKeys[0]].hash,
      );
    });
    it("getNextBestInvestStrategy()", async function () {
      expect((await this.vaultV2.getInvestStrategySteps()).length).to.eq(0);
      await this.strategyProviderV2
        .connect(this.signers.strategyOperator)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, testStrategy[fork][strategyKeys[0]].steps);
      expect(await this.vaultV2.getNextBestInvestStrategy()).to.deep.eq([
        Object.values(testStrategy[fork][strategyKeys[0]].steps[0]),
      ]);
    });
    it("getLastStrategyStepBalanceLP() return 0", async function () {
      expect(await this.vaultV2.getLastStrategyStepBalanceLP(testStrategy[fork][strategyKeys[0]].steps)).to.eq("0");
    });
    it("first userDepositVault(), mint same shares as deposit", async function () {
      await this.vaultV2
        .connect(this.signers.financeOperator)
        .setFeeParams("0", "0", "0", "0", ethers.constants.AddressZero);
      const _depositAmountUSDC = BigNumber.from("1000").mul(to_10powNumber_BN("6"));
      const _depositFee = await this.vaultV2.calcDepositFeeUT(_depositAmountUSDC);
      const _depositAmountUSDCWithFee = _depositAmountUSDC.sub(_depositFee);
      await this.vaultV2.connect(this.signers.financeOperator).setMinimumDepositValueUT(_depositAmountUSDC);
      await expect(this.vaultV2.connect(this.signers.alice).userDepositVault(_depositAmountUSDC))
        .to.emit(this.vaultV2, "Transfer")
        .withArgs(ethers.constants.AddressZero, this.signers.alice.address, _depositAmountUSDCWithFee);
      expect(await this.usdc.balanceOf(this.vaultV2.address)).to.eq(_depositAmountUSDCWithFee);
      expect(await this.vaultV2.totalSupply()).to.eq(_depositAmountUSDCWithFee);
      expect(await this.vaultV2.totalDeposits(this.signers.alice.address)).to.eq(_depositAmountUSDCWithFee);
      // the vault shares VT will be same as total supply is zero
      expect(await this.vaultV2.balanceOf(this.signers.alice.address)).to.eq(_depositAmountUSDCWithFee);
    });
    it("rebalance(), deposit asset into strategy", async function () {
      const _totalSupply = BigNumber.from("1000").mul(to_10powNumber_BN("6"));
      const _pool = testStrategy[fork][strategyKeys[0]].steps[0].pool;
      const _adapterAddress = await this.registryV2.liquidityPoolToAdapter(_pool);
      const _adapterInstance = await ethers.getContractAt("IAdapterFull", _adapterAddress);
      await this.vaultV2.rebalance();
      const _expectedVaultUsdcBalance = BigNumber.from("0");
      expect(await this.usdc.balanceOf(this.vaultV2.address)).to.eq(_expectedVaultUsdcBalance);
      const canStake: boolean = await _adapterInstance.canStake(_pool);
      let expectedlpTokenBalance = BigNumber.from("0");
      if (canStake) {
        expectedlpTokenBalance = await _adapterInstance.getLiquidityPoolTokenBalanceStake(this.vaultV2.address, _pool);
      }
      expectedlpTokenBalance = await _adapterInstance.getLiquidityPoolTokenBalance(
        this.vaultV2.address,
        MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address,
        _pool,
      );
      const _lpTokenAddress = testStrategy[fork][strategyKeys[0]].steps[0].outputToken;
      const _lpTokenInstance: ERC20 = <ERC20>await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, _lpTokenAddress);
      const _actuallpTokenBalance = await _lpTokenInstance.balanceOf(this.vaultV2.address);
      expect(_actuallpTokenBalance).to.eq(expectedlpTokenBalance);
      let _allAmountInToken = BigNumber.from("0");
      if (canStake) {
        _allAmountInToken = await _adapterInstance.getAllAmountInTokenStake(
          this.vaultV2.address,
          MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address,
          _pool,
        );
      } else {
        _allAmountInToken = await _adapterInstance.getAllAmountInToken(
          this.vaultV2.address,
          MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address,
          _pool,
        );
      }
      const _expectedPricePerFullShare = _allAmountInToken.mul(to_10powNumber_BN("18")).div(_totalSupply);
      expect(await this.vaultV2.getPricePerFullShare()).to.eq(_expectedPricePerFullShare);
      expect(await this.vaultV2.getInvestStrategySteps()).to.deep.eq([
        Object.values(testStrategy[fork][strategyKeys[0]].steps[0]),
      ]);
      expect(await this.vaultV2.investStrategyHash()).to.eq(testStrategy[fork][strategyKeys[0]].hash);
    });
    it('userWithdrawPermitted() return true,""', async function () {
      const _balanceVT = await this.vaultV2.balanceOf(this.signers.alice.address);
      expect(await this.vaultV2.userWithdrawPermitted(this.signers.alice.address, _balanceVT)).members([true, ""]);
    });
    it("userWithdrawVault()", async function () {
      const _redeemVT = await (await this.vaultV2.balanceOf(this.signers.alice.address)).div("2");
      const _userbalanceBefore = await this.usdc.balanceOf(this.signers.alice.address);
      const _pool = testStrategy[fork][strategyKeys[0]].steps[0].pool;
      const _adapterAddress = await this.registryV2.liquidityPoolToAdapter(_pool);
      const _adapterInstance = await ethers.getContractAt("IAdapterFull", _adapterAddress);
      const canStake: boolean = await _adapterInstance.canStake(_pool);
      let _allAmountInToken = BigNumber.from("0");
      if (canStake) {
        _allAmountInToken = await _adapterInstance.getAllAmountInTokenStake(
          this.vaultV2.address,
          MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address,
          _pool,
        );
      } else {
        _allAmountInToken = await _adapterInstance.getAllAmountInToken(
          this.vaultV2.address,
          MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address,
          _pool,
        );
      }
      const _vaultBalanceUT = await this.usdc.balanceOf(this.vaultV2.address);
      const _totalSupply = await this.vaultV2.totalSupply();
      const _calculatedReceivableUT = _redeemVT.mul(_totalSupply).div(_allAmountInToken.add(_vaultBalanceUT));
      const _calculatedWithdrawalFee = await this.vaultV2.calcWithdrawalFeeUT(_calculatedReceivableUT);
      const _calculatedReceivableUTWithFee = _calculatedReceivableUT.sub(_calculatedWithdrawalFee);
      await expect(this.vaultV2.connect(this.signers.alice).userWithdrawVault(_redeemVT))
        .to.emit(this.vaultV2, "Transfer")
        .withArgs(this.signers.alice.address, ethers.constants.AddressZero, _redeemVT);
      const _userBalanceAfter = await this.usdc.balanceOf(this.signers.alice.address);
      const _actualReceivedUT = _userBalanceAfter.sub(_userbalanceBefore);
      expect(_actualReceivedUT).to.eq(_calculatedReceivableUTWithFee);
      expect(await this.vaultV2.totalSupply()).to.eq(_totalSupply.sub(_redeemVT));
    });
  });
  describe.only("VaultV2 strategies", () => {
    // before(async function () {
    //   console.log("rmv2 ", this.riskManagerV2.address);
    // });
    // for (let i = 0; i < 1; i++) {
    //   it(`strategy${i}`, async function () {
    //     console.log("fn1");
    //   });
    // }
    for (const token of Object.keys(StrategiesByTokenByChain[fork])) {
      for (const strategy of Object.keys(StrategiesByTokenByChain[fork][token])) {
        describe(`${strategy}`, () => {
          it("should deposit withdraw", async function () {
            console.log("-");
          });
        });
      }
    }
  });
});
