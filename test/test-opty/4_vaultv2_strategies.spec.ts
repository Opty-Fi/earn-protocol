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
import RegistryProxyDeployment from "../../deployments/mainnet/RegistryProxy.json";
import RiskManagerProxyDeployment from "../../deployments/mainnet/RiskManagerProxy.json";
import StrategyProviderDeployment from "../../deployments/mainnet/StrategyProvider.json";
import opUSDCProxyDeployment from "../../deployments/mainnet/opUSDCgrowProxy.json";
import RegistryProxy from "../../deployments/mainnet/RegistryProxy.json";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;
const isNewo = process.env.IS_NEWO as eEVMNetwork;

describe("VaultV2", () => {
  before(async function () {
    const registryProxyAddress = RegistryProxy.address;
    const registryInstance = await ethers.getContractAt(
      "contracts/protocol/earn-protocol-configuration/contracts/Registry.sol:Registry",
      registryProxyAddress,
    );
    const operatorAddress = await registryInstance.getOperator();
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [operatorAddress],
    });
    if (!isNewo) {
      await deployments.fixture();
    } else {
      await deployments.fixture([
        "opNEWOgrow",
        "NewoStakingAdapter",
        "SushiswapPoolAdapter",
        "NewoApproveAndMapLiquidityPoolToAdapter",
      ]);
    }
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
    const opNEWOgrow = await deployments.get("opNEWOgrow");
    this.registry = <Registry>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, RegistryProxyDeployment.address);
    this.riskManager = <RiskManager>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER, RiskManagerProxyDeployment.address)
    );
    this.strategyProvider = <StrategyProvider>(
      await ethers.getContractAt(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, StrategyProviderDeployment.address)
    );
    this.vaults = {};
    this.vaults["USDC"] = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, opUSDCProxyDeployment.address);
    this.vaults["NEWO"] = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, opNEWOgrow.address);
    if (fork === eEVMNetwork.polygon) {
      const opWMATICGrow = await deployments.get("opWMATICgrow");
      this.vaults["WMATIC"] = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, opWMATICGrow.address);
    }

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

    // (0-15) Deposit fee UT = 0 UT = 0000
    // (16-31) Deposit fee % = 0% = 0000
    // (32-47) Withdrawal fee UT = 0 UT = 0000
    // (48-63) Withdrawal fee % = 0% = 0000
    // (64-79) Max vault value jump % = 1% = 0064
    // (80-239) vault fee address = 0000000000000000000000000000000000000000
    // (240-247) risk profile code = 1 = 01
    // (248) emergency shutdown = false = 0
    // (249) unpause = true = 1
    // (250) allow whitelisted state = false = 0
    // (251) - 0
    // (252) - 0
    // (253) - 0
    // (254) - 0
    // (255) - 0
    // 0x0201000000000000000000000000000000000000000000640000000000000000
    // 906392544231311161076231617881117198619499239097192527361058388634069106688
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
        console.log("Governance setting vault configuration for opWMATICgrow..");
        console.log("\n");
        const tx2 = await this.vaults["WMATIC"].connect(governance).setVaultConfiguration(expectedConfig);
        await tx2.wait(1);
      }

      const actualUserDepositCapUT = await this.vaults["WMATIC"].userDepositCapUT();
      const actualMinimumDepositValueUT = await this.vaults["WMATIC"].minimumDepositValueUT();
      const actualTotalValueLockedLimitUT = await this.vaults["WMATIC"].totalValueLockedLimitUT();

      const expectedUserDepositCapUT = BigNumber.from("5000000000000000000"); // 5 WMATIC user deposit cap
      const expectedMinimumDepositValueUT = BigNumber.from("250000000000000000"); // 0.25 WMATIC minimum deposit
      const expectedTotalValueLockedLimitUT = BigNumber.from("5000000000000000000000"); // 5000 WMATIC TVL limit

      console.log("opWMATICgrow.setValueControlParams()");
      console.log("\n");
      if (
        expectedUserDepositCapUT.eq(actualUserDepositCapUT) &&
        expectedMinimumDepositValueUT.eq(actualMinimumDepositValueUT) &&
        expectedTotalValueLockedLimitUT.eq(actualTotalValueLockedLimitUT)
      ) {
        console.log(
          "userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT is upto date on opWMATICgrow",
        );
        console.log("\n");
      } else {
        console.log("Updating userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT on opWMATICgrow...");
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
    } else if (this.vaults["NEWO"]) {
      const _vaultNEWOConfiguration = await this.vaults["NEWO"].vaultConfiguration();
      if (expectedConfig.eq(_vaultNEWOConfiguration)) {
        console.log("vaultConfiguration is as expected");
        console.log("\n");
      } else {
        console.log("Governance setting vault configuration for opNEWOgrow..");
        console.log("\n");
        const tx2 = await this.vaults["NEWO"].connect(governance).setVaultConfiguration(expectedConfig);
        await tx2.wait(1);
      }

      const actualUserDepositCapUT = await this.vaults["NEWO"].userDepositCapUT();
      const actualMinimumDepositValueUT = await this.vaults["NEWO"].minimumDepositValueUT();
      const actualTotalValueLockedLimitUT = await this.vaults["NEWO"].totalValueLockedLimitUT();

      const expectedUserDepositCapUT = BigNumber.from("5000000000000000000"); // 5 NEWO user deposit cap
      const expectedMinimumDepositValueUT = BigNumber.from("250000000000000000"); // 0.25 NEWO minimum deposit
      const expectedTotalValueLockedLimitUT = BigNumber.from("5000000000000000000000"); // 5000 NEWO TVL limit

      console.log("opNEWOgrow.setValueControlParams()");
      console.log("\n");
      if (
        expectedUserDepositCapUT.eq(actualUserDepositCapUT) &&
        expectedMinimumDepositValueUT.eq(actualMinimumDepositValueUT) &&
        expectedTotalValueLockedLimitUT.eq(actualTotalValueLockedLimitUT)
      ) {
        console.log("userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT is upto date on opNEWOgrow");
        console.log("\n");
      } else {
        console.log("Updating userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT on opNEWOgrow...");
        console.log("\n");
        const tx3 = await this.vaults["NEWO"]
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
            const strategyOperatorAddress = await this.registry.getStrategyOperator();
            await network.provider.request({
              method: "hardhat_impersonateAccount",
              params: [strategyOperatorAddress],
            });
            const strategyOperator = await ethers.getSigner(strategyOperatorAddress);
            await (this.strategyProvider as any).connect(strategyOperator).setBestStrategy(
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
            await setTokenBalanceInStorage(this.token, this.vaults[token].address, "10");
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
            console.log("User deposit in decimals: ", _userDepositInDecimals.toString());

            await this.token.connect(this.signers.alice).approve(this.vaults[token].address, _userDepositInDecimals);
            await this.token.connect(this.signers.bob).approve(this.vaults[token].address, _userDepositInDecimals);

            console.log("investStrategyHash: ", await this.vaults[token].investStrategyHash());
            const aliceBalanceBefore = await this.token.balanceOf(this.signers.alice.address);
            console.log("Before: ", aliceBalanceBefore.toString());
            await this.vaults[token].connect(this.signers.alice).userDepositVault(_userDepositInDecimals, [], []);
            const aliceBalanceAfter = await this.token.balanceOf(this.signers.alice.address);
            console.log("After: ", aliceBalanceAfter.toString());
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
              await this.vaults[token].connect(signers[i]).userWithdrawVault(userWithdrawBalance, [], []);
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
