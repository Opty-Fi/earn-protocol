import { artifacts, waffle, ethers, network } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import chai, { expect } from "chai";
import { deployContract, solidity } from "ethereum-waffle";
import { Artifact } from "hardhat/types";
import { getAddress } from "ethers/lib/utils";
import { Signers } from "../../helpers/utils";
import {
  ERC20,
  InitializableImmutableAdminUpgradeabilityProxy,
  Registry,
  RegistryProxy,
  RegistryV2,
  RiskManagerProxy,
  RiskManagerV2,
  StrategyProviderV2,
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
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";
import { eEVMNetwork } from "../../helper-hardhat-config";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;
const OPUSDCGROW_VAULT_PROXY_ADDRESS = opUSDCgrow.VaultProxy;
const OPWETHGROW_VAULT_PROXY_ADDRESS = opWETHgrow.VaultProxy;
const OPUSDCGROW_VAULT_ADDRESS = opUSDCgrow.Vault;
const OPWETHGROW_VAULT_ADDRESS = opWETHgrow.Vault;
const REGISTRY_PROXY_ADDRESS = RegistryProxyAddress;
const RISK_MANAGER_PROXY = RiskManagerProxyAddress;
describe("VaultV2 Ethereum on-chain upgrade", () => {
  before(async function () {
    this.vaultV2Artifact = <Artifact>await artifacts.readArtifact(ESSENTIAL_CONTRACTS.VAULT_V2);
    this.registryV2Artifact = <Artifact>await artifacts.readArtifact(ESSENTIAL_CONTRACTS.REGISTRY_V2);
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
    this.opUSDCgrow = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, OPUSDCGROW_VAULT_ADDRESS);
    this.opWETHgrow = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, OPWETHGROW_VAULT_ADDRESS);
    this.usdc = <ERC20>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address)
    );
    await setTokenBalanceInStorage(this.usdc, this.signers.admin.address, "20000");
    // ==============================================================

    const riskManagerV2Artifact: Artifact = await artifacts.readArtifact(ESSENTIAL_CONTRACTS.RISK_MANAGER_V2);
    const strategyProviderV2Artifact: Artifact = await artifacts.readArtifact(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER_V2);
    // testing already deployed contracts
    // this code block may fail if the block number is made greater than
    // the block at which vaults are upgraded to V2 or fork is other than Ethereum
    // ====================================================
    this.opUSDCgrowProxy = <InitializableImmutableAdminUpgradeabilityProxy>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, OPUSDCGROW_VAULT_PROXY_ADDRESS)
    );
    this.opUSDCgrow = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, OPUSDCGROW_VAULT_PROXY_ADDRESS);
    await this.opUSDCgrow.rebalance();
    await this.registry.connect(this.signers.operator).unpauseVaultContract(this.opUSDCgrow.address, false);
    this.opUSDCgrowGasOwedToOperator = await this.opUSDCgrow.gasOwedToOperator();
    this.opUSDCgrowDepositQueue = await this.opUSDCgrow.depositQueue();
    this.opUSDCgrowPricePerShareWrite = await this.opUSDCgrow.pricePerShareWrite();
    const opUSDCgrowAdminAddress = await this.opUSDCgrowProxy.admin();
    const opUSDCgrowAdminSigner = await ethers.getSigner(opUSDCgrowAdminAddress);
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [opUSDCgrowAdminAddress],
    });
    // ====================================================
    this.opWETHgrowProxy = <InitializableImmutableAdminUpgradeabilityProxy>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, OPWETHGROW_VAULT_PROXY_ADDRESS)
    );
    this.opWETHgrow = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, OPWETHGROW_VAULT_PROXY_ADDRESS);
    await this.opWETHgrow.rebalance();
    await this.registry.connect(this.signers.operator).unpauseVaultContract(this.opWETHgrow.address, false);
    this.opWETHgrowGasOwedToOperator = await this.opWETHgrow.gasOwedToOperator();
    this.opWETHgrowDepositQueue = await this.opWETHgrow.depositQueue();
    this.opWETHgrowPricePerShareWrite = await this.opWETHgrow.pricePerShareWrite();
    const opWETHgrowAdminAddress = await this.opWETHgrowProxy.admin();
    const opWETHgrowAdminSigner = await ethers.getSigner(opWETHgrowAdminAddress);
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [opWETHgrowAdminAddress],
    });
    // // ====================================================
    this.opUSDCgrowV2 = <VaultV2>(
      await deployContract(this.signers.deployer, this.vaultV2Artifact, [
        REGISTRY_PROXY_ADDRESS,
        "USD Coin",
        "USDC",
        "Growth",
        "grow",
      ])
    );
    await this.opUSDCgrowProxy.connect(opUSDCgrowAdminSigner).upgradeTo(this.opUSDCgrowV2.address);
    this.opUSDCgrowV2 = <VaultV2>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_V2, this.opUSDCgrowProxy.address);
    // ====================================================
    this.opWETHgrowV2 = <VaultV2>(
      await waffle.deployContract(this.signers.deployer, this.vaultV2Artifact, [
        REGISTRY_PROXY_ADDRESS,
        "Wrapped Ether",
        "WETH",
        "Growth",
        "grow",
      ])
    );
    await this.opWETHgrowProxy.connect(opWETHgrowAdminSigner).upgradeTo(this.opWETHgrowV2.address);
    this.opWETHgrowV2 = <VaultV2>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_V2, this.opWETHgrowProxy.address);
    // =======================================================
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
  });

  it("default values from for v1 opUSDCgrow should be as expected", async function () {
    expect(await this.opUSDCgrowV2.opTOKEN_REVISION()).to.eq("0x3");
    expect(await this.opUSDCgrowV2.registryContract()).to.eq(getAddress(this.registryV2.address));
    expect(await this.opUSDCgrowV2.riskProfileCode()).to.eq("1");
    expect(await this.opUSDCgrowV2.underlyingToken()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address);
    expect(await this.opUSDCgrowV2.underlyingTokensHash()).to.eq(ethers.constants.HashZero);
    expect(await this.opUSDCgrowV2.name()).to.eq("op USD Coin Growth");
    expect(await this.opUSDCgrowV2.symbol()).to.eq("opUSDCgrow");
    expect(await this.opUSDCgrowV2.decimals()).to.eq(6);
    expect(await this.opUSDCgrowV2.maxVaultValueJump()).to.eq("100");
  });

  it("default values for v1 opWETHgrow should be as expected", async function () {
    expect(await this.opWETHgrowV2.opTOKEN_REVISION()).to.eq("0x3");
    expect(await this.opWETHgrowV2.registryContract()).to.eq(getAddress(this.registryV2.address));
    expect(await this.opWETHgrowV2.riskProfileCode()).to.eq("1");
    expect(await this.opWETHgrowV2.underlyingToken()).to.eq(MULTI_CHAIN_VAULT_TOKENS[fork].WETH.address);
    expect(await this.opWETHgrowV2.underlyingTokensHash()).to.eq(ethers.constants.HashZero);
    expect(await this.opWETHgrowV2.name()).to.eq("op Wrapped Ether Growth");
    expect(await this.opWETHgrowV2.symbol()).to.eq("opWETHgrow");
    expect(await this.opWETHgrowV2.decimals()).to.eq(18);
    expect(await this.opWETHgrowV2.maxVaultValueJump()).to.eq("100");
  });

  it("vaultConfigurationV2() for opUSDCgrow V2", async function () {
    const vaultConfigurationV2 = await this.opUSDCgrowV2.vaultConfiguration();
    expect(vaultConfigurationV2.emergencyShutdown).to.be.false;
    expect(vaultConfigurationV2.unpaused).to.be.false;
    expect(vaultConfigurationV2.allowWhitelistedState).to.be.false;
    expect(vaultConfigurationV2.depositFeeFlatUT).to.eq("0");
    expect(vaultConfigurationV2.depositFeePct).to.eq("0");
    expect(vaultConfigurationV2.withdrawalFeeFlatUT).to.eq("0");
    expect(vaultConfigurationV2.withdrawalFeePct).to.eq("0");
    expect(await this.opUSDCgrowV2.userDepositCapUT()).to.eq(this.opUSDCgrowGasOwedToOperator); //gasOwedToOperator
    expect(await this.opUSDCgrowV2.minimumDepositValueUT()).to.eq(this.opUSDCgrowDepositQueue); //depositQueue
    expect(await this.opUSDCgrowV2.totalValueLockedLimitUT()).to.eq(this.opUSDCgrowPricePerShareWrite); //pricePerShareWrite
  });

  it("vaultConfigurationV2() for opWETHgrow V2", async function () {
    const vaultConfigurationV2 = await this.opWETHgrowV2.vaultConfiguration();
    expect(vaultConfigurationV2.emergencyShutdown).to.be.false;
    expect(vaultConfigurationV2.unpaused).to.be.false;
    expect(vaultConfigurationV2.allowWhitelistedState).to.be.false;
    expect(vaultConfigurationV2.depositFeeFlatUT).to.eq("0");
    expect(vaultConfigurationV2.depositFeePct).to.eq("0");
    expect(vaultConfigurationV2.withdrawalFeeFlatUT).to.eq("0");
    expect(vaultConfigurationV2.withdrawalFeePct).to.eq("0");
    expect(await this.opWETHgrowV2.userDepositCapUT()).to.eq(this.opWETHgrowGasOwedToOperator); //gasOwedToOperator
    expect(await this.opWETHgrowV2.minimumDepositValueUT()).to.eq(this.opWETHgrowDepositQueue); //depositQueue
    expect(await this.opWETHgrowV2.totalValueLockedLimitUT()).to.eq(this.opWETHgrowPricePerShareWrite); //pricePerShareWrite
  });

  it("deposit()", async function () {
    console.log("user deposit on v2");
  });
  it("rebalance()", async function () {
    console.log("rebalance on v2");
  });
  it("withdraw()", async function () {
    console.log("user withdraw on v2");
  });
});
