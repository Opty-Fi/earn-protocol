import chai, { expect } from "chai";
import { deployments, ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import BN from "bignumber.js";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { Signers, to_10powNumber_BN } from "../../helpers/utils";
import { MultiChainVaults, StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { eEVMNetwork, NETWORKS_CHAIN_ID_HEX } from "../../helper-hardhat-config";
import {
  Registry,
  RiskManager,
  StrategyProvider,
  Vault,
  ERC20,
  IAdapterFull,
  RiskManager__factory,
  Registry__factory,
  StrategyProvider__factory,
  Vault__factory,
  IAdapterFull__factory,
  ERC20__factory,
} from "../../typechain";
import { generateTokenHashV2, generateStrategyHashV2 } from "../../helpers/helpers";
import { StrategyStepType } from "../../helpers/type";
import { setTokenBalanceInStorage, getLastStrategyStepBalanceLP } from "./utils";
import { TypedTokens } from "../../helpers/data";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;

describe("VaultV2", () => {
  before(async function () {
    await deployments.fixture();
    const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.deployer = signers[0];
    this.signers.admin = signers[1];
    this.signers.alice = signers[3];
    this.signers.bob = signers[4];
    this.signers.eve = signers[10];
    this.signers.operator = signers[8];
    this.signers.financeOperator = signers[5];
    this.signers.strategyOperator = signers[7];
    this.registry = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
    const registryProxy = await deployments.get("RegistryProxy");
    const riskManagerProxy = await deployments.get("RiskManagerProxy");
    const strategyProvider = await deployments.get("StrategyProvider");
    this.registry = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxy.address);
    this.riskManager = <RiskManager>await ethers.getContractAt(RiskManager__factory.abi, riskManagerProxy.address);
    this.strategyProvider = <StrategyProvider>(
      await ethers.getContractAt(StrategyProvider__factory.abi, strategyProvider.address)
    );
    this.vaults = {};
    const governanceAddress = await this.registry.getGovernance();
    this.signers.governance = await ethers.getSigner(governanceAddress);
    const governance = await ethers.getSigner(governanceAddress);
    const financeOperatorAddress = await this.registry.getFinanceOperator();
    const financeOperator = await ethers.getSigner(financeOperatorAddress);
    for (const token of Object.keys(MultiChainVaults[fork])) {
      this.vaults[token] = <Vault>(
        await ethers.getContractAt(
          Vault__factory.abi,
          await (
            await deployments.get(MultiChainVaults[fork][token][0].name)
          ).address,
        )
      );
      let tx = await this.vaults[token]
        .connect(governance)
        .setVaultConfiguration(MultiChainVaults[fork][token][0].vaultConfig);
      await tx.wait(1);
      tx = await this.vaults[token]
        .connect(financeOperator)
        .setValueControlParams(
          MultiChainVaults[fork][token][0].userDepositCapUT,
          MultiChainVaults[fork][token][0].minimumDepositValueUT,
          MultiChainVaults[fork][token][0].totalValueLockedLimitUT,
        );
      await tx.wait(1);
      this.token = <ERC20>await ethers.getContractAt(ERC20__factory.abi, TypedTokens[token]);
      await setTokenBalanceInStorage(this.token, this.vaults[token].address, "10");
      const _userDepositInDecimals = await this.vaults[token].minimumDepositValueUT();
      const _userDeposit = new BN(_userDepositInDecimals.toString()).div(
        new BN(to_10powNumber_BN(await this.vaults[token].decimals()).toString()),
      );
      await setTokenBalanceInStorage(this.token, this.signers.alice.address, _userDeposit.multipliedBy("3").toString());
      await setTokenBalanceInStorage(this.token, this.signers.bob.address, _userDeposit.multipliedBy("3").toString());
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
            const strategyOperatorAddress = await this.registry.getStrategyOperator();
            const strategyOperator = await ethers.getSigner(strategyOperatorAddress);
            await this.strategyProvider
              .connect(strategyOperator)
              .setBestStrategy(strategyDetail.riskProfileCode, tokenHash, steps);
            this.adapter = <IAdapterFull>(
              await ethers.getContractAt(
                IAdapterFull__factory.abi,
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
          it(`alice and bob should deposit into Vault successfully`, async function () {
            const _userDepositInDecimals = await this.vaults[token].minimumDepositValueUT();
            await this.token.connect(this.signers.alice).approve(this.vaults[token].address, _userDepositInDecimals);
            await this.token.connect(this.signers.bob).approve(this.vaults[token].address, _userDepositInDecimals);

            const aliceBalanceBefore = await this.token.balanceOf(this.signers.alice.address);
            await this.vaults[token].connect(this.signers.alice).userDepositVault(_userDepositInDecimals, [], []);
            const aliceBalanceAfter = await this.token.balanceOf(this.signers.alice.address);
            expect(aliceBalanceBefore).gt(aliceBalanceAfter);

            const bobBalanceBefore = await this.token.balanceOf(this.signers.bob.address);
            await this.vaults[token].connect(this.signers.bob).userDepositVault(_userDepositInDecimals, [], []);

            const bobBalanceAfter = await this.token.balanceOf(this.signers.bob.address);

            expect(bobBalanceBefore).gt(bobBalanceAfter);
          });
          it(`vault should deposit successfully to strategy after vaultDepositAllToStrategy()`, async function () {
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
          it(`alice and bob should be able to withdraw successfully, vault should withdraw from the current strategy successfully`, async function () {
            const signers = [this.signers.alice, this.signers.bob];
            for (let i = 0; i < signers.length; i++) {
              const userWithdrawBalance = await this.vaults[token].balanceOf(signers[i].address);
              const userBalanceBefore = await this.token.balanceOf(signers[i].address);
              const poolBalanceBefore = await getLastStrategyStepBalanceLP(
                steps as StrategyStepType[],
                this.registry,
                this.vaults[token],
                this.token,
              );
              await this.vaults[token].connect(signers[i]).userWithdrawVault(userWithdrawBalance.mul(3).div(3), [], []);
              const userBalanceAfter = await this.token.balanceOf(signers[i].address);
              const poolBalanceAfter = await getLastStrategyStepBalanceLP(
                steps as StrategyStepType[],
                this.registry,
                this.vaults[token],
                this.token,
              );
              expect(userBalanceBefore).lt(userBalanceAfter);
              expect(poolBalanceBefore).gt(poolBalanceAfter);
            }
          });
        });
      }
    }
  });
});
