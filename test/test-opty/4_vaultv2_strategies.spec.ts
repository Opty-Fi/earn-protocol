import chai, { expect } from "chai";
import { deployments, ethers, network } from "hardhat";
import { solidity } from "ethereum-waffle";
import { Signers } from "../../helpers/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { eEVMNetwork, NETWORKS_CHAIN_ID_HEX } from "../../helper-hardhat-config";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { Registry, RiskManager, StrategyProvider, Vault } from "../../typechain";
import { generateTokenHashV2, generateStrategyHashV2 } from "../../helpers/helpers";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;

describe("VaultV2", () => {
  before(async function () {
    await deployments.fixture();
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.deployer = signers[0];
    this.signers.admin = signers[1];
    this.signers.alice = signers[3];
    this.signers.bob = signers[4];
    this.signers.eve = signers[10];
    this.signers.operator = signers[8];
    this.signers.financeOperator = signers[5];
    this.signers.governance = signers[9];
    this.signers.strategyOperator = signers[7];
    const registryProxy = await deployments.get("RegistryProxy");
    const riskManagerProxy = await deployments.get("RiskManagerProxy");
    const strategyProvider = await deployments.get("StrategyProvider");
    const opUSDCGrow = await deployments.get("opUSDCgrow");
    const opWMATICGrow = await deployments.get("opWMATICgrow");
    this.registry = <Registry>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxy.address);
    this.riskManager = <RiskManager>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER, riskManagerProxy.address)
    );
    this.strategyProvider = <StrategyProvider>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, strategyProvider.address)
    );
    this.vaults = {};
    this.vaults["USDC"] = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, opUSDCGrow.address);
    if (fork === eEVMNetwork.polygon) {
      this.vaults["WMATIC"] = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, opWMATICGrow.address);
    }
    const governanceAddress = await this.registry.getGovernance();
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [governanceAddress],
    });
    const governance = await ethers.getSigner(governanceAddress);
    const expectedConfig = ethers.BigNumber.from(
      "2715643938564376714569528258641865758826842749497826340477583138757711757312",
    );
    const _vaultUSDCConfiguration = await this.vaults["USDC"].vaultConfiguration();
    if (expectedConfig.eq(_vaultUSDCConfiguration)) {
      console.log("vaultConfiguration is as expected");
      console.log("\n");
    } else {
      console.log("Governance setting vault configuration for opUSDCgrow..");
      console.log("\n");
      const tx2 = await this.vaults["USDC"].connect(governance).setVaultConfiguration(expectedConfig);
      await tx2.wait(1);
    }
    const _vaultWMATICConfiguration = await this.vaults["WMATIC"].vaultConfiguration();
    if (expectedConfig.eq(_vaultWMATICConfiguration)) {
      console.log("vaultConfiguration is as expected");
      console.log("\n");
    } else {
      console.log("Governance setting vault configuration for opUSDCgrow..");
      console.log("\n");
      const tx2 = await this.vaults["WMATIC"].connect(governance).setVaultConfiguration(expectedConfig);
      await tx2.wait(1);
    }
  });
  describe("VaultV2 strategies", () => {
    for (const token of Object.keys(StrategiesByTokenByChain[fork])) {
      for (const strategy of Object.keys(StrategiesByTokenByChain[fork][token])) {
        const strategyDetail = StrategiesByTokenByChain[fork][token][strategy];
        const tokenHash = generateTokenHashV2([strategyDetail.token], NETWORKS_CHAIN_ID_HEX[fork]);
        const strategyHash = generateStrategyHashV2(strategyDetail.strategy, tokenHash);
        before(async function () {
          const approveLqPoolList = [];
          for (let i = 0; i < strategyDetail.strategy.length; i++) {
            const pool = strategyDetail.strategy[i];
            if (pool.adapterName) {
              approveLqPoolList.push([pool.contract, (await deployments.get(pool.adapterName)).address]);
            }
          }
          if (approveLqPoolList.length > 0) {
            await (this.registry as any)["approveLiquidityPoolAndMapToAdapter((address,address)[])"](approveLqPoolList);
          }
          await (this.strategyProvider as any).setBestStrategy(
            1,
            tokenHash,
            strategyDetail.strategy.map(item => [item.contract, item.outputToken, item.isBorrow]),
          );
        });
        describe(`${strategy}`, () => {
          it("should receive new strategy after rebalancing", async function () {
            await this.vaults[token].rebalance();
            expect(await this.vaults[token].getInvestStrategySteps()).to.deep.eq(
              strategyDetail.strategy.map(item => [item.contract, item.outputToken, item.isBorrow]),
            );
            expect(await this.vaults[token].investStrategyHash()).to.eq(strategyHash);
          });
        });
      }
    }
  });
});
