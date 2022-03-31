import chai, { expect } from "chai";
import { deployments, ethers, network } from "hardhat";
import { solidity } from "ethereum-waffle";
import { Signers, to_10powNumber_BN } from "../../helpers/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { eEVMNetwork, NETWORKS_CHAIN_ID_HEX } from "../../helper-hardhat-config";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { Registry, RiskManager, StrategyProvider, Vault, ERC20, IAdapterFull } from "../../typechain";
import { generateTokenHashV2, generateStrategyHashV2 } from "../../helpers/helpers";
import { StrategyStepType } from "../../helpers/type";
import { setTokenBalanceInStorage, getLastStrategyStepBalanceLP } from "./utils";
import BN from "bignumber.js";
import { BigNumber } from "ethers";

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

    //TODO Remove if config opVaultGrow development script is done.
    const governanceAddress = await this.registry.getGovernance();
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [governanceAddress],
    });
    const governance = await ethers.getSigner(governanceAddress);
    const financeOperatorAddress = await this.registry.getFinanceOperator();
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [financeOperatorAddress],
    });
    const financeOperator = await ethers.getSigner(financeOperatorAddress);
    const expectedConfig = ethers.BigNumber.from(
      "906392544231311161076231617881117198619499239097192527361058388634069106688",
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

    const actualUSDCUserDepositCapUT = await this.vaults["USDC"].userDepositCapUT();
    const actualUSDCMinimumDepositValueUT = await this.vaults["USDC"].minimumDepositValueUT();
    const actualUSDCTotalValueLockedLimitUT = await this.vaults["USDC"].totalValueLockedLimitUT();

    const expectedUserDepositCapUT = BigNumber.from("100000000000"); // 100,000 USDC
    const expectedMinimumDepositValueUT = BigNumber.from("1000000000"); // 1000 USDC
    const expectedTotalValueLockedLimitUT = BigNumber.from("10000000000000"); // 10,000,000

    console.log("opUSDCgrow.setValueControlParams()");
    console.log("\n");
    if (
      expectedUserDepositCapUT.eq(actualUSDCUserDepositCapUT) &&
      expectedMinimumDepositValueUT.eq(actualUSDCMinimumDepositValueUT) &&
      expectedTotalValueLockedLimitUT.eq(actualUSDCTotalValueLockedLimitUT)
    ) {
      console.log("userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT is upto date on opUSDCgrow");
      console.log("\n");
    } else {
      console.log("Updating userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT on opUSDCgrow...");
      console.log("\n");
      const tx4 = await this.vaults["USDC"]
        .connect(financeOperator)
        .setValueControlParams(
          expectedUserDepositCapUT,
          expectedMinimumDepositValueUT,
          expectedTotalValueLockedLimitUT,
        );
      await tx4.wait(1);
    }
    if (this.vaults["WMATIC"]) {
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

      const actualUserDepositCapUT = await this.vaults["WMATIC"].userDepositCapUT();
      const actualMinimumDepositValueUT = await this.vaults["WMATIC"].minimumDepositValueUT();
      const actualTotalValueLockedLimitUT = await this.vaults["WMATIC"].totalValueLockedLimitUT();

      const expectedUserDepositCapUT = BigNumber.from("5000000000000000000"); // 5 WETH user deposit cap
      const expectedMinimumDepositValueUT = BigNumber.from("250000000000000000"); // 0.25 WETH minimum deposit
      const expectedTotalValueLockedLimitUT = BigNumber.from("5000000000000000000000"); // 5000 WETH TVL limit

      console.log("opWETHgrow.setValueControlParams()");
      console.log("\n");
      if (
        expectedUserDepositCapUT.eq(actualUserDepositCapUT) &&
        expectedMinimumDepositValueUT.eq(actualMinimumDepositValueUT) &&
        expectedTotalValueLockedLimitUT.eq(actualTotalValueLockedLimitUT)
      ) {
        console.log("userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT is upto date on opWETHgrow");
        console.log("\n");
      } else {
        console.log("Updating userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT on opWETHgrow...");
        console.log("\n");
        const tx3 = await this.vaults["WMATIC"]
          .connect(financeOperator)
          .setValueControlParams(
            expectedUserDepositCapUT,
            expectedMinimumDepositValueUT,
            expectedTotalValueLockedLimitUT,
          );
        await tx3.wait(1);
      }
    }
  });
  describe("VaultV2 strategies", () => {
    for (const token of Object.keys(StrategiesByTokenByChain[fork])) {
      for (const strategy of Object.keys(StrategiesByTokenByChain[fork][token])) {
        const strategyDetail = StrategiesByTokenByChain[fork][token][strategy];
        const tokenHash = generateTokenHashV2([strategyDetail.token], NETWORKS_CHAIN_ID_HEX[fork]);
        const strategyHash = generateStrategyHashV2(strategyDetail.strategy, tokenHash);
        const lastPool = strategyDetail.strategy[strategyDetail.strategy.length - 1].contract;
        const steps = strategyDetail.strategy.map(item => ({
          pool: item.contract,
          outputToken: item.outputToken,
          isBorrow: item.isBorrow,
        }));

        describe(`${strategy}`, () => {
          before(async function () {
            const approveLqPoolList = [];
            for (let i = 0; i < strategyDetail.strategy.length; i++) {
              const pool = strategyDetail.strategy[i];
              if (pool.adapterName) {
                approveLqPoolList.push([pool.contract, (await deployments.get(pool.adapterName)).address]);
              }
            }
            if (approveLqPoolList.length > 0) {
              await (this.registry as any)["approveLiquidityPoolAndMapToAdapter((address,address)[])"](
                approveLqPoolList,
              );
            }
            await (this.strategyProvider as any).setBestStrategy(
              1,
              tokenHash,
              steps.map(item => Object.values(item)),
            );
            this.token = <ERC20>await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, strategyDetail.token);
            this.adapter = <IAdapterFull>(
              await ethers.getContractAt(
                ESSENTIAL_CONTRACTS.ADAPTER,
                await this.registry.getLiquidityPoolToAdapter(lastPool),
              )
            );
          });
          it("should receive new strategy after rebalancing", async function () {
            await this.vaults[token].rebalance();
            expect(await this.vaults[token].getInvestStrategySteps()).to.deep.eq(
              steps.map(item => Object.values(item)),
            );
            expect(await this.vaults[token].investStrategyHash()).to.eq(strategyHash);
          });
          it(`alice deposit.Afterwards, should deposit to strategy successfully`, async function () {
            const _userDepositInDecimals = await this.vaults[token].minimumDepositValueUT();
            const _userDeposit = new BN(_userDepositInDecimals.toString())
              .div(new BN(to_10powNumber_BN(await this.vaults[token].decimals()).toString()))
              .toString();
            await setTokenBalanceInStorage(this.token, this.signers.alice.address, _userDeposit);
            await this.token.connect(this.signers.alice).approve(this.vaults[token].address, _userDepositInDecimals);
            const userBalanceBefore = await this.token.balanceOf(this.signers.alice.address);
            await this.vaults[token].connect(this.signers.alice).userDepositVault(_userDepositInDecimals, [], []);
            const userBalanceAfter = await this.token.balanceOf(this.signers.alice.address);
            expect(userBalanceBefore).gt(userBalanceAfter);

            const vaultBalanceBefore = await this.vaults[token].balanceUT();
            const poolBalanceBefore = await getLastStrategyStepBalanceLP(
              steps as StrategyStepType[],
              this.registry,
              this.vaults[token],
              this.token,
            );
            await this.vaults[token].connect(this.signers.financeOperator).vaultDepositAllToStrategy();
            const vaultBalanceAfter = await this.vaults[token].balanceUT();
            const poolBalanceAfter = await getLastStrategyStepBalanceLP(
              steps as StrategyStepType[],
              this.registry,
              this.vaults[token],
              this.token,
            );
            expect(vaultBalanceBefore).gt(vaultBalanceAfter);
            expect(poolBalanceBefore).lt(poolBalanceAfter);
          });
          it(`alice withdraw. Should withdraw from strategy successfully`, async function () {
            const _userDepositInDecimals = await this.vaults[token].minimumDepositValueUT();
            const userBalanceBefore = await this.token.balanceOf(this.signers.alice.address);
            const poolBalanceBefore = await getLastStrategyStepBalanceLP(
              steps as StrategyStepType[],
              this.registry,
              this.vaults[token],
              this.token,
            );
            await this.vaults[token].connect(this.signers.alice).userWithdrawVault(_userDepositInDecimals, [], []);
            const userBalanceAfter = await this.token.balanceOf(this.signers.alice.address);
            const poolBalanceAfter = await getLastStrategyStepBalanceLP(
              steps as StrategyStepType[],
              this.registry,
              this.vaults[token],
              this.token,
            );
            expect(userBalanceBefore).lt(userBalanceAfter);
            expect(poolBalanceBefore).gt(poolBalanceAfter);
          });
        });
      }
    }
  });
});
