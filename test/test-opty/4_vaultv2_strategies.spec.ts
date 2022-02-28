import { artifacts, ethers, network, waffle } from "hardhat";
import { Artifact } from "hardhat/types";
import { deployContract, solidity } from "ethereum-waffle";
import { Signers } from "../../helpers/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { eEVMNetwork } from "../../helper-hardhat-config";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import {
  opUSDCgrow,
  opWETHgrow,
  RegistryProxy as RegistryProxyAddress,
  RiskManagerProxy as RiskManagerProxyAddress,
} from "../../_deployments/mainnet.json";

import {
  ERC20,
  Registry,
  RegistryProxy,
  RegistryV2,
  RiskManagerProxy,
  RiskManagerV2,
  StrategyProviderV2,
  Vault,
} from "../../typechain";
import { setTokenBalanceInStorage } from "./utils";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;
const OPUSDCGROW_VAULT_ADDRESS = opUSDCgrow.Vault;
const OPWETHGROW_VAULT_ADDRESS = opWETHgrow.Vault;
const REGISTRY_PROXY_ADDRESS = RegistryProxyAddress;
const RISK_MANAGER_PROXY = RiskManagerProxyAddress;

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
