import chai, { expect } from "chai";
import { deployments, ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import BN from "bignumber.js";
import { Signers, to_10powNumber_BN } from "../../helpers/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { MultiChainVaults, StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { eEVMNetwork, NETWORKS_CHAIN_ID_HEX } from "../../helper-hardhat-config";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { Registry, RiskManager, StrategyProvider, Vault, ERC20, IAdapterFull } from "../../typechain";
import { generateTokenHashV2, generateStrategyHashV2 } from "../../helpers/helpers";
import { StrategyStepType } from "../../helpers/type";
import { setTokenBalanceInStorage, getLastStrategyStepBalanceLP } from "./utils";
import { BigNumber } from "ethers";

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
    this.signers.governance = signers[9];
    this.signers.strategyOperator = signers[7];
    this.registry = <Registry>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
    const registryProxy = await deployments.get("RegistryProxy");
    const riskManagerProxy = await deployments.get("RiskManagerProxy");
    const strategyProvider = await deployments.get("StrategyProvider");
    this.registry = <Registry>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxy.address);
    this.riskManager = <RiskManager>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER, riskManagerProxy.address)
    );
    this.strategyProvider = <StrategyProvider>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, strategyProvider.address)
    );
    this.vaults = {};
    const governanceAddress = await this.registry.getGovernance();
    const governance = await ethers.getSigner(governanceAddress);
    const financeOperatorAddress = await this.registry.getFinanceOperator();
    const financeOperator = await ethers.getSigner(financeOperatorAddress);
    for (const token of Object.keys(MultiChainVaults[fork])) {
      this.vaults[token] = <Vault>(
        await ethers.getContractAt(
          ESSENTIAL_CONTRACTS.VAULT,
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
            await this.strategyProvider.connect(strategyOperator).setBestStrategy(1, tokenHash, steps);
            this.token = <ERC20>await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, strategyDetail.token);
            this.adapter = <IAdapterFull>(
              await ethers.getContractAt(
                ESSENTIAL_CONTRACTS.ADAPTER,
                await this.registry.getLiquidityPoolToAdapter(lastPool),
              )
            );
          });
          it("should receive new strategy after rebalancing", async function () {
            await setTokenBalanceInStorage(this.token, this.vaults[token].address, "10");
            const LPinstance = await ethers.getContractAt(
              ESSENTIAL_CONTRACTS.ERC20,
              strategyDetail.strategy[0].outputToken,
            );
            console.log("LP balance: ", (await LPinstance.balanceOf(this.vaults[token].address)).toString());
            await this.vaults[token].rebalance();
            expect(await this.vaults[token].getInvestStrategySteps()).to.deep.eq(
              steps.map(item => Object.values(item)),
            );
            expect(await this.vaults[token].investStrategyHash()).to.eq(strategyHash);
          });
          it(`alice and bob should deposit into Vault successfully`, async function () {
            const _userDepositInDecimals = await this.vaults[token].minimumDepositValueUT();
            const _userDeposit = new BN(_userDepositInDecimals.toString())
              .div(new BN(to_10powNumber_BN(await this.vaults[token].decimals()).toString()))
              .toString();
            await setTokenBalanceInStorage(this.token, this.signers.alice.address, _userDeposit);
            await setTokenBalanceInStorage(this.token, this.signers.bob.address, _userDeposit);

            await this.token.connect(this.signers.alice).approve(this.vaults[token].address, _userDepositInDecimals);
            await this.token.connect(this.signers.bob).approve(this.vaults[token].address, _userDepositInDecimals);

            const aliceBalanceBefore = await this.token.balanceOf(this.signers.alice.address);
            console.log("Alice balance UT before: ", aliceBalanceBefore.toString());
            console.log(
              "Alice balance vault tokens before: ",
              (await this.vaults[token].balanceOf(this.signers.alice.address)).toString(),
            );
            await this.vaults[token].connect(this.signers.alice).userDepositVault(_userDepositInDecimals, [], []);
            const aliceBalanceAfter = await this.token.balanceOf(this.signers.alice.address);
            console.log("Alice balance UT after: ", aliceBalanceAfter.toString());
            console.log(
              "Alice balance vault tokens after: ",
              (await this.vaults[token].balanceOf(this.signers.alice.address)).toString(),
            );
            expect(aliceBalanceBefore).gt(aliceBalanceAfter);

            const bobBalanceBefore = await this.token.balanceOf(this.signers.bob.address);
            console.log(
              "Bob balance vault tokens before: ",
              (await this.vaults[token].balanceOf(this.signers.bob.address)).toString(),
            );
            await this.vaults[token].connect(this.signers.bob).userDepositVault(_userDepositInDecimals, [], []);
            console.log(
              "Bob balance vault tokens after: ",
              (await this.vaults[token].balanceOf(this.signers.bob.address)).toString(),
            );
            const bobBalanceAfter = await this.token.balanceOf(this.signers.bob.address);
            console.log("Bob balance UT before: ", bobBalanceBefore.toString());
            console.log("Bob balance UT after: ", bobBalanceAfter.toString());
            expect(bobBalanceBefore).gt(bobBalanceAfter);
          });
          it(`vault should deposit successfully to strategy after vaultDepositAllToStrategy()`, async function () {
            const vaultBalanceBefore = await this.vaults[token].balanceUT();
            console.log("vaultBalanceBefore: ", vaultBalanceBefore.toString());
            const poolBalanceBefore = await getLastStrategyStepBalanceLP(
              steps as StrategyStepType[],
              this.registry,
              this.vaults[token],
              this.token,
            );
            const totalSupplyBefore = await this.vaults[token].totalSupply();
            const balanceInUnderlyingTokenBefore = (await this.vaults[token].getPricePerFullShare())
              .mul(totalSupplyBefore)
              .div(BigNumber.from(10).pow(18));
            console.log("balanceInUnderlyingTokenBefore: ", balanceInUnderlyingTokenBefore.toString());
            await this.vaults[token].connect(this.signers.financeOperator).vaultDepositAllToStrategy();
            const totalSupplyAfter = await this.vaults[token].totalSupply();
            const balanceInUnderlyingTokenAfter = (await this.vaults[token].getPricePerFullShare())
              .mul(totalSupplyAfter)
              .div(BigNumber.from(10).pow(18));
            console.log("balanceInUnderlyingTokenAfter: ", balanceInUnderlyingTokenAfter.toString());
            const vaultBalanceAfter = await this.vaults[token].balanceUT();
            console.log("vaultBalanceAfter: ", vaultBalanceAfter.toString());
            const poolBalanceAfter = await getLastStrategyStepBalanceLP(
              steps as StrategyStepType[],
              this.registry,
              this.vaults[token],
              this.token,
            );
            console.log("poolBalanceAfter: ", poolBalanceAfter.toString());
            expect(vaultBalanceBefore).gt(vaultBalanceAfter);
            expect(poolBalanceBefore).lt(poolBalanceAfter);
          });
          it(`alice and bob should be able to withdraw successfully, vault should withdraw from the current strategy successfully`, async function () {
            console.log("totalSupply before: ", (await this.vaults[token].totalSupply()).toString());
            const signers = [this.signers.alice, this.signers.bob];
            for (let i = 0; i < signers.length; i++) {
              const userWithdrawBalance = await this.vaults[token].balanceOf(signers[i].address);
              const userBalanceBefore = await this.token.balanceOf(signers[i].address);
              console.log("UT balance before: ", userBalanceBefore.toString());
              console.log("vault tokens balance before: ", userWithdrawBalance.toString());
              console.log("underlying tokens balance before: ", userBalanceBefore.toString());
              const poolBalanceBefore = await getLastStrategyStepBalanceLP(
                steps as StrategyStepType[],
                this.registry,
                this.vaults[token],
                this.token,
              );
              await this.vaults[token].connect(signers[i]).userWithdrawVault(userWithdrawBalance, [], []);
              console.log(
                "vault tokens balance after: ",
                (await this.vaults[token].balanceOf(signers[i].address)).toString(),
              );
              const userBalanceAfter = await this.token.balanceOf(signers[i].address);
              console.log("UT balance after: ", userBalanceAfter.toString());
              const poolBalanceAfter = await getLastStrategyStepBalanceLP(
                steps as StrategyStepType[],
                this.registry,
                this.vaults[token],
                this.token,
              );
              console.log("totalSupply: ", (await this.vaults[token].totalSupply()).toString());
              console.log("last step balance: ", poolBalanceAfter.toString());
              expect(userBalanceBefore).lt(userBalanceAfter);
              expect(poolBalanceBefore).gt(poolBalanceAfter);
            }
            console.log("vault balance UT: ", (await this.vaults[token].balanceUT()).toString());
          });
        });
      }
    }
  });
});
