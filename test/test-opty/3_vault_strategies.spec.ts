import chai, { expect } from "chai";
import { deployments, ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import BN from "bignumber.js";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { BigNumber, Contract } from "ethers";
import { formatEther, formatUnits, getAddress, parseEther, parseUnits } from "ethers/lib/utils";
import Compound from "@optyfi/defi-legos/ethereum/compound/index";
import { assertPostDepositState, assertPostUserDepositState, Signers, to_10powNumber_BN } from "../../helpers/utils";
import { MultiChainVaults, StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { eEVMNetwork, NETWORKS_CHAIN_ID_HEX } from "../../helper-hardhat-config";
import {
  Registry,
  RiskManager,
  Vault,
  ERC20,
  RiskManager__factory,
  Registry__factory,
  Vault__factory,
  ERC20__factory,
  CurveSwapPoolAdapter,
  CurveSwapPoolAdapter__factory,
  CurveSwapETHGateway,
  CurveSwapETHGateway__factory,
  IComptroller__factory,
  CompoundAdapter__factory,
  CompoundAdapter,
  StrategyRegistry__factory,
} from "../../typechain";
import { generateTokenHashV2, generateStrategyHashV2 } from "../../helpers/helpers";
import { StrategyStepType } from "../../helpers/type";
import { getPreDepositState, getPreUserDepositState, setTokenBalanceInStorage } from "./utils";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";
import { TypedTokens } from "../../helpers/data";
import { StrategyManager } from "../../helpers/strategy-manager";
import { VaultHelper__factory } from "../../typechain/factories/VaultHelper__factory";
import { VaultHelper } from "../../typechain/VaultHelper";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;
const DEBUG = process.env.DEBUG === "true" ? true : false;
const IGNORE_VAULTS = process.env.IGNORE_VAULTS;

const strategyHashLPoutputIndex: { [key: string]: number } = {
  "0x9d5b0ec470b7cc0292aa6f12b02080fab6963a074f01f19bf163819cb6e38cb6": 0,
  "0x209d8398fa428a480aa63498a065daaa46d3d7ef77e2d367194e8a6a4d3ebf9a": 2,
};

describe(`${fork}-Vault-rev7`, () => {
  before(async function () {
    this.strategyRegistry = await ethers.getContractAt(
      StrategyRegistry__factory.abi,
      (
        await deployments.get("StrategyRegistry")
      ).address,
    );
    this.compoundAdapter = <CompoundAdapter>(
      await ethers.getContractAt(CompoundAdapter__factory.abi, (await deployments.get("CompoundAdapter")).address)
    );
    this.vaultHelper = <VaultHelper>(
      await ethers.getContractAt(VaultHelper__factory.abi, (await deployments.get("VaultHelper")).address)
    );
    this.strategyManager = new StrategyManager(<Contract>this.vaultHelper, this.compoundAdapter);
    this.registry = <Registry>(
      await ethers.getContractAt(Registry__factory.abi, (await deployments.get("RegistryProxy")).address)
    );
    this.riskManager = <RiskManager>(
      await ethers.getContractAt(RiskManager__factory.abi, (await deployments.get("RiskManager")).address)
    );
    this.vaults = {};
    this.tokens = {};
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.deployer = signers[0];
    this.signers.admin = signers[1];
    this.signers.alice = signers[3];
    this.signers.bob = signers[4];
    this.signers.eve = signers[10];
    this.signers.operator = await ethers.getSigner(await this.registry.getOperator());
    this.signers.financeOperator = await ethers.getSigner(await this.registry.getFinanceOperator());
    this.signers.strategyOperator = await ethers.getSigner(await this.registry.getStrategyOperator());
    this.signers.governance = await ethers.getSigner(await this.registry.getGovernance());
    for (const riskProfile of Object.keys(MultiChainVaults[fork])) {
      this.vaults[riskProfile] = {};
      for (const token of Object.keys(MultiChainVaults[fork][riskProfile])) {
        if (IGNORE_VAULTS?.split(",").includes(MultiChainVaults[fork][riskProfile][token].symbol)) {
          continue;
        }
        this.vaults[riskProfile][token] = <Vault>(
          await ethers.getContractAt(
            Vault__factory.abi,
            (
              await deployments.get(MultiChainVaults[fork][riskProfile][token].symbol)
            ).address,
          )
        );
        expect(await this.vaults[riskProfile][token].symbol()).to.eq(MultiChainVaults[fork][riskProfile][token].symbol);
        expect(await this.vaults[riskProfile][token].name()).to.eq(MultiChainVaults[fork][riskProfile][token].name);
        expect(getAddress(await this.vaults[riskProfile][token].underlyingToken())).to.eq(
          getAddress(MultiChainVaults[fork][riskProfile][token].underlyingToken),
        );
        expect(await this.vaults[riskProfile][token].underlyingTokensHash()).to.eq(
          MultiChainVaults[fork][riskProfile][token].underlyingTokensHash,
        );
        let tx = await this.vaults[riskProfile][token]
          .connect(this.signers.governance)
          .setVaultConfiguration(MultiChainVaults[fork][riskProfile][token].vaultConfig);
        await tx.wait(1);
        tx = await this.vaults[riskProfile][token]
          .connect(this.signers.financeOperator)
          .setValueControlParams(
            MultiChainVaults[fork][riskProfile][token].userDepositCapUT,
            MultiChainVaults[fork][riskProfile][token].minimumDepositValueUT,
            MultiChainVaults[fork][riskProfile][token].totalValueLockedLimitUT,
          );
        await tx.wait(1);
        this.tokens[token] = <ERC20>(
          await ethers.getContractAt(ERC20__factory.abi, MULTI_CHAIN_VAULT_TOKENS[fork][token].address)
        );
        let _userDepositInDecimals = await this.vaults[riskProfile][token].minimumDepositValueUT();
        const decimals = await this.tokens[token].decimals();
        if (_userDepositInDecimals.eq(BigNumber.from("0"))) {
          _userDepositInDecimals = BigNumber.from("3").mul(parseUnits("1", decimals));
        }
        const _userDeposit = new BN(_userDepositInDecimals.toString()).div(
          new BN(to_10powNumber_BN(await this.vaults[riskProfile][token].decimals()).toString()),
        );
        await setTokenBalanceInStorage(this.tokens[token], this.signers.alice.address, _userDeposit.toString());
        await setTokenBalanceInStorage(this.tokens[token], this.signers.bob.address, _userDeposit.toString());
        expect(await this.tokens[token].balanceOf(this.signers.alice.address)).to.eq(_userDepositInDecimals);
        expect(await this.tokens[token].balanceOf(this.signers.bob.address)).to.eq(_userDepositInDecimals);
      }
    }
    if (fork == eEVMNetwork.mainnet) {
      this.tokens["WETH"] = <ERC20>await ethers.getContractAt(ERC20__factory.abi, TypedTokens["WETH"]);
    }
  });
  describe(`${fork}-Vault-rev7 strategies`, () => {
    for (const riskProfile of Object.keys(StrategiesByTokenByChain[fork])) {
      for (const token of Object.keys(StrategiesByTokenByChain[fork][riskProfile])) {
        if (IGNORE_VAULTS?.split(",").includes(MultiChainVaults[fork][riskProfile][token].symbol)) {
          continue;
        }
        for (const strategy of Object.keys(StrategiesByTokenByChain[fork][riskProfile][token])) {
          const strategyDetail = StrategiesByTokenByChain[fork][riskProfile][token][strategy];
          const tokenHash = generateTokenHashV2([strategyDetail.token], NETWORKS_CHAIN_ID_HEX[fork]);
          const strategyHash = generateStrategyHashV2(strategyDetail.strategy, tokenHash);
          console.log("strategyHash ", strategyHash);
          const lastPool = strategyDetail.strategy[strategyDetail.strategy.length - 1].contract;
          const steps = strategyDetail.strategy.map(item => ({
            pool: item.contract,
            outputToken: item.outputToken,
            isSwap: item.isSwap,
          }));

          describe(`${fork}-${riskProfile}-${token}-${strategy}`, () => {
            before(async function () {
              const addStrategyPlantx = await this.strategyRegistry
                .connect(this.signers.operator)
                .addStrategyPlan(this.vaults[riskProfile][token].address, strategyHash, {
                  oraValueUTPlan: this.strategyManager.getOraValueUTPlan(
                    StrategiesByTokenByChain[fork][riskProfile][token][strategy].token,
                    steps,
                    this.vaults[riskProfile][token],
                  ),
                  oraValueLPPlan: {
                    ...this.strategyManager.getOraSomeValueLPPlan(
                      StrategiesByTokenByChain[fork][riskProfile][token][strategy].token,
                      steps,
                      this.vaults[riskProfile][token],
                    ),
                    outputIndex: strategyHashLPoutputIndex[strategyHash],
                  },
                  lastStepBalanceLPPlan: this.strategyManager.getLastStrategyStepBalancePlan(
                    StrategiesByTokenByChain[fork][riskProfile][token][strategy].token,
                    steps,
                    this.vaults[riskProfile][token],
                  ),
                  depositSomeToStrategyPlan: this.strategyManager.getDepositPlan(
                    StrategiesByTokenByChain[fork][riskProfile][token][strategy].token,
                    steps,
                    this.vaults[riskProfile][token],
                  ),
                  withdrawSomeFromStrategyPlan: this.strategyManager.getWithdrawPlan(
                    StrategiesByTokenByChain[fork][riskProfile][token][strategy].token,
                    steps,
                    this.vaults[riskProfile][token],
                  ),
                  claimRewardsPlan: this.strategyManager.getClaimRewardsPlan(
                    StrategiesByTokenByChain[fork][riskProfile][token][strategy].token,
                    steps,
                    this.vaults[riskProfile][token],
                  ),
                  harvestRewardsPlan: this.strategyManager.getHarvestRewardsPlan(
                    StrategiesByTokenByChain[fork][riskProfile][token][strategy].token,
                    steps,
                    this.vaults[riskProfile][token],
                  ),
                });
              await addStrategyPlantx.wait(1);

              if (fork == eEVMNetwork.mainnet) {
                if (
                  Object.keys(Compound.pools)
                    .map(x => getAddress(Compound.pools[x as string as keyof typeof Compound.pools].pool))
                    .includes(getAddress(lastPool))
                ) {
                  const comptrollerInstance = await ethers.getContractAt(
                    IComptroller__factory.abi,
                    "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B",
                  );
                  const mintGuardianPaused = await comptrollerInstance.mintGuardianPaused(lastPool);
                  if (mintGuardianPaused == true) {
                    console.log("Skipping because Comptroller's mintGuardianPaused is true");
                    this.skip();
                  }
                }
                // this.curveSwapPoolAdapter = <CurveSwapPoolAdapter>(
                //   await ethers.getContractAt(
                //     CurveSwapPoolAdapter__factory.abi,
                //     await (
                //       await deployments.get("CurveSwapPoolAdapter")
                //     ).address,
                //   )
                // );
                // this.curveSwapEthGateway = <CurveSwapETHGateway>(
                //   await ethers.getContractAt(
                //     CurveSwapETHGateway__factory.abi,
                //     await this.curveSwapPoolAdapter.curveSwapETHGatewayContract(),
                //   )
                // );
                // if (
                //   strategy === "weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV" ||
                //   strategy === "weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV"
                // ) {
                //   DEBUG && console.log("\nLIDO strategy");
                //   const isConvertToStEth = await this.curveSwapEthGateway.convertToStEth();
                //   if (!isConvertToStEth) {
                //     DEBUG && console.log("\nStrategyOperator setting convertToStEth");
                //     const tx = await this.curveSwapEthGateway
                //       .connect(this.signers.strategyOperator)
                //       .setConvertToStEth(true);
                //     await tx.wait(1);
                //   } else {
                //     DEBUG && console.log("\nStrategyOperator already set convertToStEth");
                //   }
                // } else if (
                //   strategy === "weth-DEPOSIT-CurveSwapPool-steCRV" ||
                //   strategy === "weth-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV"
                // ) {
                //   DEBUG && console.log("\n non-LIDO strategy");
                //   const isConvertToStEth = await this.curveSwapEthGateway.convertToStEth();
                //   if (isConvertToStEth) {
                //     DEBUG && console.log("\nStrategyOperator un-setting convertToStEth");
                //     const tx = await this.curveSwapEthGateway
                //       .connect(this.signers.strategyOperator)
                //       .setConvertToStEth(false);
                //     await tx.wait(1);
                //   } else {
                //     DEBUG && console.log("\nStrategyOperator already un-set convertToStEth");
                //   }
                // }
              }
            });
            it(`${riskProfile}-${token}-${strategy}-(first) alice and bob should deposit into Vault successfully`, async function () {
              const signers = [this.signers.alice, this.signers.bob];
              if (fork == eEVMNetwork.mainnet) {
                await deposit(
                  signers,
                  this.vaults[riskProfile][token],
                  this.tokens[token],
                  this.tokens["WETH"],
                  steps as StrategyStepType[],
                  this.strategyManager,
                );
              } else {
                await deposit(
                  signers,
                  this.vaults[riskProfile][token],
                  this.tokens[token],
                  undefined,
                  steps as StrategyStepType[],
                  this.strategyManager,
                );
              }
            });
            it(`${riskProfile}-${token}-${strategy}-should receive new strategy after rebalancing`, async function () {
              const underlyingTokenSymbol = await this.tokens[token].symbol();
              const vaultTokenSymbol = await this.vaults[riskProfile][token].symbol();
              // ToDo
              // 1. assert alice UT balance before rebalance
              // 2. assert bob UT balance before rebalance
              // 3. assert alice VT balance before rebalance
              // 4. assert bob VT balance before rebalance
              // 5. assert vault LP token balance before rebalance
              // 6. assert vault PPS before rebalance
              // 7. assert vault total supply before rebalance
              if (DEBUG == true) {
                console.log("\n");
                console.log("Before rebalance ");
                console.log(
                  `${underlyingTokenSymbol} balance `,
                  formatUnits(
                    await this.tokens[token].balanceOf(this.vaults[riskProfile][token].address),
                    await this.tokens[token].decimals(),
                  ),
                );
                if (fork == eEVMNetwork.mainnet) {
                  console.log(
                    "WETH balance ",
                    formatUnits(
                      await this.tokens["WETH"].balanceOf(this.vaults[riskProfile][token].address),
                      await this.tokens["WETH"].decimals(),
                    ),
                  );
                }
                console.log(
                  `Alice ${underlyingTokenSymbol} balance `,
                  formatUnits(
                    await this.tokens[token].balanceOf(this.signers.alice.address),
                    await this.tokens[token].decimals(),
                  ),
                );
                console.log(
                  `Bob ${underlyingTokenSymbol} balance `,
                  formatUnits(
                    await this.tokens[token].balanceOf(this.signers.bob.address),
                    await this.tokens[token].decimals(),
                  ),
                );
                console.log(
                  `Alice ${vaultTokenSymbol} balance `,
                  formatUnits(
                    await this.vaults[riskProfile][token].balanceOf(this.signers.alice.address),
                    await this.vaults[riskProfile][token].decimals(),
                  ),
                );
                console.log(
                  `Bob ${vaultTokenSymbol} balance `,
                  formatUnits(
                    await this.vaults[riskProfile][token].balanceOf(this.signers.bob.address),
                    await this.vaults[riskProfile][token].decimals(),
                  ),
                );
                console.log("PPS ", formatUnits(await this.vaults[riskProfile][token].getPricePerFullShare(), 18));
                console.log(
                  "Total supply ",
                  formatUnits(
                    await this.vaults[riskProfile][token].totalSupply(),
                    await this.vaults[riskProfile][token].decimals(),
                  ),
                );
                console.log("strategies ", await this.vaults[riskProfile][token].getStrategies());
              }

              const vaultAddStrategyTx = await this.vaults[riskProfile][token]
                .connect(this.signers.strategyOperator)
                .addStrategy(strategyHash);
              await vaultAddStrategyTx.wait(1);

              expect(await this.vaults[riskProfile][token].getStrategies()).to.deep.eq([strategyHash]);

              const vaultDepositTx = await this.vaults[riskProfile][token]
                .connect(this.signers.strategyOperator)
                .vaultDepositSomeToStrategy(
                  strategyHash,
                  await this.tokens[token].balanceOf(this.vaults[riskProfile][token].address),
                );
              await vaultDepositTx.wait(1);
              // ToDo
              // 1. assert alice UT balance after rebalance
              // 2. assert bob UT balance after rebalance
              // 3. assert alice VT balance after rebalance
              // 4. assert bob VT balance after rebalance
              // 5. assert vault LP token balance after rebalance
              // 6. assert vault PPS after rebalance
              // 7. assert vault total supply after rebalance
              if (DEBUG == true) {
                console.log("\n");
                console.log("After rebalance ");
                console.log(
                  `${underlyingTokenSymbol} balance `,
                  formatUnits(
                    await this.tokens[token].balanceOf(this.vaults[riskProfile][token].address),
                    await this.tokens[token].decimals(),
                  ),
                );
                if (fork == eEVMNetwork.mainnet) {
                  console.log(
                    "WETH balance ",
                    formatUnits(
                      await this.tokens["WETH"].balanceOf(this.vaults[riskProfile][token].address),
                      await this.tokens["WETH"].decimals(),
                    ),
                  );
                }
                console.log(
                  `Alice ${underlyingTokenSymbol} balance `,
                  formatUnits(
                    await this.tokens[token].balanceOf(this.signers.alice.address),
                    await this.tokens[token].decimals(),
                  ),
                );
                console.log(
                  `Bob ${underlyingTokenSymbol} balance `,
                  formatUnits(
                    await this.tokens[token].balanceOf(this.signers.bob.address),
                    await this.tokens[token].decimals(),
                  ),
                );
                console.log(
                  `Alice ${vaultTokenSymbol} balance `,
                  formatUnits(
                    await this.vaults[riskProfile][token].balanceOf(this.signers.alice.address),
                    await this.vaults[riskProfile][token].decimals(),
                  ),
                );
                console.log(
                  `Bob ${vaultTokenSymbol} balance `,
                  formatUnits(
                    await this.vaults[riskProfile][token].balanceOf(this.signers.bob.address),
                    await this.vaults[riskProfile][token].decimals(),
                  ),
                );
                console.log("PPS ", formatUnits(await this.vaults[riskProfile][token].getPricePerFullShare(), 18));
                console.log(
                  "Total supply ",
                  formatUnits(
                    await this.vaults[riskProfile][token].totalSupply(),
                    await this.vaults[riskProfile][token].decimals(),
                  ),
                );
                console.log("strategies ", await this.vaults[riskProfile][token].getStrategies());
              }
            });
            it(`${riskProfile}-${token}-${strategy}-(first) alice and bob should be able to withdraw successfully, vault should withdraw from the current strategy successfully`, async function () {
              const signers = [this.signers.alice, this.signers.bob];
              if (fork == eEVMNetwork.mainnet) {
                await withdraw(
                  signers,
                  this.vaults[riskProfile][token],
                  this.tokens[token],
                  steps as StrategyStepType[],
                  this.registry,
                  this.tokens["WETH"],
                  this.strategyManager,
                );
              } else {
                await withdraw(
                  signers,
                  this.vaults[riskProfile][token],
                  this.tokens[token],
                  steps as StrategyStepType[],
                  this.registry,
                  undefined,
                  this.strategyManager,
                );
              }
            });
            it(`${riskProfile}-${token}-${strategy}-(second) alice and bob should deposit into Vault successfully`, async function () {
              const signers = [this.signers.alice, this.signers.bob];
              if (fork == eEVMNetwork.mainnet) {
                await deposit(
                  signers,
                  this.vaults[riskProfile][token],
                  this.tokens[token],
                  this.tokens["WETH"],
                  steps as StrategyStepType[],
                  this.strategyManager,
                );
              } else {
                await deposit(
                  signers,
                  this.vaults[riskProfile][token],
                  this.tokens[token],
                  undefined,
                  steps as StrategyStepType[],
                  this.strategyManager,
                );
              }
            });
            it(`${riskProfile}-${token}-${strategy}-vault should deposit successfully to strategy after vaultDepositAllToStrategy()`, async function () {
              const underlyingTokenSymbol = await this.tokens[token].symbol();
              const vaultTokenSymbol = await this.vaults[riskProfile][token].symbol();
              const vaultBalanceBefore = await this.vaults[riskProfile][token].balanceUT();
              const poolBalanceBefore = await this.strategyManager.liquidityPoolToAdapter[
                steps[steps.length - 1].pool
              ].getOutputTokenBalance(
                this.vaults[riskProfile][token],
                steps.length === 1 ? this.tokens[token].address : steps[steps.length - 2].outputToken,
                steps[steps.length - 1].pool,
                steps[steps.length - 1].outputToken,
                steps[steps.length - 1].isSwap,
                ethers.provider,
              );
              // ToDo
              // 1. assert alice UT balance before vaultDeposit
              // 2. assert bob UT balance before vaultDeposit
              // 3. assert alice VT balance before vaultDeposit
              // 4. assert bob VT balance before vaultDeposit
              // 5. assert vault LP token balance before vaultDeposit
              // 6. assert vault PPS before vaultDeposit
              // 7. assert vault total supply before vaultDeposit
              if (DEBUG == true) {
                console.log("\n");
                console.log("Before vault deposit ");
                console.log("poolBalanceBefore ", formatEther(poolBalanceBefore));
                console.log(
                  `${underlyingTokenSymbol} balance `,
                  formatUnits(
                    await this.vaults[riskProfile][token].balanceOf(this.vaults[riskProfile][token].address),
                    await this.vaults[riskProfile][token].decimals(),
                  ),
                );
                if (fork == eEVMNetwork.mainnet) {
                  console.log(
                    "WETH balance ",
                    formatUnits(
                      await this.tokens["WETH"].balanceOf(this.vaults[riskProfile][token].address),
                      await this.tokens["WETH"].decimals(),
                    ),
                  );
                }
                console.log(
                  `Alice ${underlyingTokenSymbol} balance `,
                  formatUnits(
                    await this.vaults[riskProfile][token].balanceOf(this.signers.alice.address),
                    await this.tokens[token].decimals(),
                  ),
                );
                console.log(
                  `Bob ${underlyingTokenSymbol} balance `,
                  formatUnits(
                    await this.vaults[riskProfile][token].balanceOf(this.signers.bob.address),
                    await this.vaults[riskProfile][token].decimals(),
                  ),
                );
                console.log(
                  `Alice ${vaultTokenSymbol} balance `,
                  formatUnits(
                    await this.vaults[riskProfile][token].balanceOf(this.signers.alice.address),
                    await this.vaults[riskProfile][token].decimals(),
                  ),
                );
                console.log(
                  `Bob ${vaultTokenSymbol} balance `,
                  formatUnits(
                    await this.vaults[riskProfile][token].balanceOf(this.signers.bob.address),
                    await this.vaults[riskProfile][token].decimals(),
                  ),
                );
                console.log("PPS ", formatUnits(await this.vaults[riskProfile][token].getPricePerFullShare(), 18));
                console.log(
                  "Total supply ",
                  formatUnits(
                    await this.vaults[riskProfile][token].totalSupply(),
                    await this.vaults[riskProfile][token].decimals(),
                  ),
                );
                console.log("strategies ", await this.vaults[riskProfile][token].getStrategies());
              }
              const vaultDepositSomeTx = await this.vaults[riskProfile][token]
                .connect(this.signers.operator)
                .vaultDepositSomeToStrategy(
                  strategyHash,
                  await this.tokens[token].balanceOf(this.vaults[riskProfile][token].address),
                );
              await vaultDepositSomeTx.wait(1);
              const vaultBalanceAfter = await this.vaults[riskProfile][token].balanceUT();
              const poolBalanceAfter = await this.strategyManager.liquidityPoolToAdapter[
                steps[steps.length - 1].pool
              ].getOutputTokenBalance(
                this.vaults[riskProfile][token],
                steps.length === 1 ? this.tokens[token].address : steps[steps.length - 2].outputToken,
                steps[steps.length - 1].pool,
                steps[steps.length - 1].outputToken,
                steps[steps.length - 1].isSwap,
                ethers.provider,
              );
              expect(vaultBalanceBefore).gt(vaultBalanceAfter);
              expect(poolBalanceBefore).lt(poolBalanceAfter);
              // ToDo
              // 1. assert alice UT balance after vaultDeposit
              // 2. assert bob UT balance after vaultDeposit
              // 3. assert alice VT balance after vaultDeposit
              // 4. assert bob VT balance after vaultDeposit
              // 5. assert vault LP token balance after vaultDeposit
              // 6. assert vault PPS after vaultDeposit
              // 7. assert vault total supply after vaultDeposit
              if (DEBUG == true) {
                console.log("\n");
                console.log("After vault deposit ");
                console.log("poolBalanceAfter ", formatEther(poolBalanceAfter));
                console.log(
                  `${underlyingTokenSymbol} balance `,
                  formatUnits(
                    await this.vaults[riskProfile][token].balanceOf(this.vaults[riskProfile][token].address),
                    await this.vaults[riskProfile][token].decimals(),
                  ),
                );
                fork == eEVMNetwork.mainnet &&
                  console.log(
                    "WETH balance ",
                    formatUnits(
                      await this.tokens["WETH"].balanceOf(this.vaults[riskProfile][token].address),
                      await this.tokens["WETH"].decimals(),
                    ),
                  );

                console.log(
                  `Alice ${underlyingTokenSymbol} balance `,
                  formatUnits(
                    await this.vaults[riskProfile][token].balanceOf(this.signers.alice.address),
                    await this.tokens[token].decimals(),
                  ),
                );
                console.log(
                  `Bob ${underlyingTokenSymbol} balance `,
                  formatUnits(
                    await this.vaults[riskProfile][token].balanceOf(this.signers.bob.address),
                    await this.vaults[riskProfile][token].decimals(),
                  ),
                );
                console.log(
                  `Alice ${vaultTokenSymbol} balance `,
                  formatUnits(
                    await this.vaults[riskProfile][token].balanceOf(this.signers.alice.address),
                    await this.vaults[riskProfile][token].decimals(),
                  ),
                );
                console.log(
                  `Bob ${vaultTokenSymbol} balance `,
                  formatUnits(
                    await this.vaults[riskProfile][token].balanceOf(this.signers.bob.address),
                    await this.vaults[riskProfile][token].decimals(),
                  ),
                );
                console.log("PPS ", formatUnits(await this.vaults[riskProfile][token].getPricePerFullShare(), 18));
                console.log(
                  "Total supply ",
                  formatUnits(
                    await this.vaults[riskProfile][token].totalSupply(),
                    await this.vaults[riskProfile][token].decimals(),
                  ),
                );
                console.log("strategies ", await this.vaults[riskProfile][token].getStrategies());
              }
            });
            it(`${riskProfile}-${token}-${strategy}-(second) alice and bob should be able to withdraw successfully, vault should withdraw from the current strategy successfully`, async function () {
              const signers = [this.signers.alice, this.signers.bob];
              console.log("\nStrategy ", strategy);
              if (fork == eEVMNetwork.mainnet) {
                await withdraw(
                  signers,
                  this.vaults[riskProfile][token],
                  this.tokens[token],
                  steps as StrategyStepType[],
                  this.registry,
                  this.tokens["WETH"],
                  this.strategyManager,
                );
              } else {
                await withdraw(
                  signers,
                  this.vaults[riskProfile][token],
                  this.tokens[token],
                  steps as StrategyStepType[],
                  this.registry,
                  undefined,
                  this.strategyManager,
                );
              }
              const lpTokenBalance = await this.strategyManager.liquidityPoolToAdapter[
                steps[steps.length - 1].pool
              ].getOutputTokenBalance(
                this.vaults[riskProfile][token],
                steps.length === 1 ? this.tokens[token].address : steps[steps.length - 2].outputToken,
                steps[steps.length - 1].pool,
                steps[steps.length - 1].outputToken,
                steps[steps.length - 1].isSwap,
                ethers.provider,
              );
              const vaultWithdrawSomeFromStrategyTx = await this.vaults[riskProfile][token]
                .connect(this.signers.strategyOperator)
                .vaultWithdrawSomeFromStrategy(strategyHash, lpTokenBalance);
              await vaultWithdrawSomeFromStrategyTx.wait(1);
              const removeStrategyTx = await this.vaults[riskProfile][token]
                .connect(this.signers.operator)
                .removeStrategy(strategyHash);
              await removeStrategyTx.wait(1);
            });
          });
        }
      }
    }
  });
});

async function deposit(
  signers: SignerWithAddress[],
  vaultInstance: Vault,
  underlyingTokenInstance: ERC20,
  wethTokenInstance: ERC20 | undefined,
  steps: StrategyStepType[],
  strategyManager: StrategyManager,
) {
  let _userDepositInDecimals = await vaultInstance.minimumDepositValueUT();
  const underlyingTokenSymbol = await underlyingTokenInstance.symbol();
  const decimals = await underlyingTokenInstance.decimals();
  if (_userDepositInDecimals.eq(BigNumber.from("0"))) {
    _userDepositInDecimals = BigNumber.from("10").pow(decimals);
  }
  const vaultTokenSymbol = await vaultInstance.symbol();

  if (DEBUG == true) {
    console.log("\n");
    console.log("Before user deposit ");
    console.log(
      `${underlyingTokenSymbol} balance `,
      formatUnits(
        await underlyingTokenInstance.balanceOf(vaultInstance.address),
        await underlyingTokenInstance.decimals(),
      ),
    );
    fork == eEVMNetwork.mainnet &&
      console.log(
        "WETH balance ",
        formatUnits(
          await (wethTokenInstance as ERC20).balanceOf(vaultInstance.address),
          await (wethTokenInstance as ERC20).decimals(),
        ),
      );
    console.log(
      `Alice ${underlyingTokenSymbol} balance `,
      formatUnits(
        await underlyingTokenInstance.balanceOf(signers[0].address),
        await underlyingTokenInstance.decimals(),
      ),
    );
    console.log(
      `Bob ${underlyingTokenSymbol} balance `,
      formatUnits(
        await underlyingTokenInstance.balanceOf(signers[1].address),
        await underlyingTokenInstance.decimals(),
      ),
    );
    console.log(
      `Alice ${vaultTokenSymbol} balance `,
      formatUnits(await vaultInstance.balanceOf(signers[0].address), await vaultInstance.decimals()),
    );
    console.log(
      `Bob ${vaultTokenSymbol} balance `,
      formatUnits(await vaultInstance.balanceOf(signers[1].address), await vaultInstance.decimals()),
    );
    console.log("PPS ", formatUnits(await vaultInstance.getPricePerFullShare(), 18));
    console.log("Total Supply ", formatUnits(await vaultInstance.totalSupply(), await vaultInstance.decimals()));
    console.log("strategies ", await vaultInstance.getStrategies());
  }
  for (let i = 0; i < signers.length; i++) {
    const tx1 = await underlyingTokenInstance
      .connect(signers[i])
      .approve(vaultInstance.address, _userDepositInDecimals);
    await tx1.wait(1);

    // const userBalanceBeforeUT = await underlyingTokenInstance.balanceOf(signers[i].address);
    // const userBalanceBeforeVT = await vaultInstance.balanceOf(signers[i].address);
    // const vaultBalanceBeforeUT = await underlyingTokenInstance.balanceOf(vaultInstance.address);
    // const vaultBalanceBeforeLP = await strategyManager.liquidityPoolToAdapter[
    //   steps[steps.length - 1].pool
    // ].getOutputTokenBalance(
    //   vaultInstance,
    //   steps.length === 1 ? underlyingTokenInstance.address : steps[steps.length - 2].outputToken,
    //   steps[steps.length - 1].pool,
    //   steps[steps.length - 1].outputToken,
    //   steps[steps.length - 1].isSwap,
    //   ethers.provider,
    // );
    // const vaultTotalSupplyBeforeVT = await vaultInstance.totalSupply();
    // const vaultValueBeforeUT = (
    //   await strategyManager.getValueInInputToken(
    //     underlyingTokenInstance.address,
    //     steps,
    //     vaultInstance,
    //     vaultBalanceBeforeLP,
    //     ethers.provider,
    //   )
    // ).add(vaultBalanceBeforeUT);

    const { userBalanceBeforeUT, userBalanceBeforeVT, vaultTotalSupplyBeforeVT, vaultValueBeforeUT } =
      await getPreUserDepositState(signers[i], underlyingTokenInstance, vaultInstance, strategyManager, steps);

    const tx2 = await vaultInstance
      .connect(signers[i])
      .userDepositVault(signers[i].address, _userDepositInDecimals, "0x", []);
    await tx2.wait(1);

    await assertPostUserDepositState(
      signers[i],
      underlyingTokenInstance,
      vaultInstance,
      strategyManager,
      steps,
      ethers.provider,
      userBalanceBeforeUT,
      _userDepositInDecimals,
      vaultTotalSupplyBeforeVT,
      vaultValueBeforeUT,
      userBalanceBeforeVT,
    );

    // const userBalanceAfterUT = await underlyingTokenInstance.balanceOf(signers[i].address);
    // const userBalanceAfterVT = await vaultInstance.balanceOf(signers[i].address);
    // const vaultBalanceAfterUT = await underlyingTokenInstance.balanceOf(vaultInstance.address);
    // const vaultBalanceAfterLP = await strategyManager.liquidityPoolToAdapter[
    //   steps[steps.length - 1].pool
    // ].getOutputTokenBalance(
    //   vaultInstance,
    //   steps.length === 1 ? underlyingTokenInstance.address : steps[steps.length - 2].outputToken,
    //   steps[steps.length - 1].pool,
    //   steps[steps.length - 1].outputToken,
    //   steps[steps.length - 1].isSwap,
    //   ethers.provider,
    // );
    // const ppsAfter = await vaultInstance.getPricePerFullShare();
    // const vaultTotalSupplyAfterVT = await vaultInstance.totalSupply();
    // const expectedUserBalanceUT = userBalanceBeforeUT.sub(_userDepositInDecimals);
    // let expectedUserVT: BigNumber = BigNumber.from(0);
    // if (vaultTotalSupplyBeforeVT.eq(0) || vaultValueBeforeUT.eq(0)) {
    //   expectedUserVT = _userDepositInDecimals;
    // } else {
    //   expectedUserVT = _userDepositInDecimals.mul(vaultTotalSupplyBeforeVT).div(vaultValueBeforeUT);
    // }
    // const actualUserMintedVT = userBalanceAfterVT.sub(userBalanceBeforeVT);
    // const expectedTotalSupplyVT = vaultTotalSupplyBeforeVT.add(expectedUserVT);
    // const expectedPPS = expectedTotalSupplyVT.eq("0")
    //   ? BigNumber.from("0")
    //   : (
    //       await strategyManager.getValueInInputToken(
    //         underlyingTokenInstance.address,
    //         steps,
    //         vaultInstance,
    //         vaultBalanceAfterLP,
    //         ethers.provider,
    //       )
    //     )
    //       .add(vaultBalanceAfterUT)
    //       .mul(parseEther("1"))
    //       .div(expectedTotalSupplyVT);

    // expect(userBalanceBeforeUT).gt(userBalanceAfterUT);
    // expect(userBalanceAfterUT).to.eq(expectedUserBalanceUT);
    // expect(actualUserMintedVT).to.gte(expectedUserVT);
    // expect(vaultTotalSupplyAfterVT).to.eq(expectedTotalSupplyVT);
    // expect(ppsAfter).to.eq(expectedPPS);
    if (DEBUG == true) {
      console.log("\n");
      console.log("After user deposit ");
      console.log(
        `${underlyingTokenSymbol} balance `,
        formatUnits(
          await underlyingTokenInstance.balanceOf(vaultInstance.address),
          await underlyingTokenInstance.decimals(),
        ),
      );
      fork == eEVMNetwork.mainnet &&
        console.log(
          "WETH balance ",
          formatUnits(
            await (wethTokenInstance as ERC20).balanceOf(vaultInstance.address),
            await (wethTokenInstance as ERC20).decimals(),
          ),
        );
      console.log(
        `Alice ${underlyingTokenSymbol} balance `,
        formatUnits(
          await underlyingTokenInstance.balanceOf(signers[0].address),
          await underlyingTokenInstance.decimals(),
        ),
      );
      console.log(
        `Bob ${underlyingTokenSymbol} balance `,
        formatUnits(
          await underlyingTokenInstance.balanceOf(signers[1].address),
          await underlyingTokenInstance.decimals(),
        ),
      );
      console.log(
        `Alice ${vaultTokenSymbol} balance `,
        formatUnits(await vaultInstance.balanceOf(signers[0].address), await vaultInstance.decimals()),
      );
      console.log(
        `Bob ${vaultTokenSymbol} balance `,
        formatUnits(await vaultInstance.balanceOf(signers[1].address), await vaultInstance.decimals()),
      );
      console.log("PPS ", formatUnits(await vaultInstance.getPricePerFullShare(), 18));
      console.log("Total Supply ", formatUnits(await vaultInstance.totalSupply(), await vaultInstance.decimals()));
      console.log("strategies ", await vaultInstance.getStrategies());
    }
  }
}

async function withdraw(
  signers: SignerWithAddress[],
  vaultInstance: Vault,
  underlyingTokenInstance: ERC20,
  steps: StrategyStepType[],
  registryInstance: Registry,
  wethTokenInstance: ERC20 | undefined,
  strategyManager: StrategyManager,
) {
  const underlyingTokenSymbol = await underlyingTokenInstance.symbol();
  const vaultTokenSymbol = await vaultInstance.symbol();
  for (let i = 0; i < signers.length; i++) {
    const userWithdrawBalance = await vaultInstance.balanceOf(signers[i].address);
    const userBalanceBefore = await underlyingTokenInstance.balanceOf(signers[i].address);
    const poolBalanceBefore = await strategyManager.liquidityPoolToAdapter[
      steps[steps.length - 1].pool
    ].getOutputTokenBalance(
      vaultInstance,
      steps.length === 1 ? underlyingTokenInstance.address : steps[steps.length - 2].outputToken,
      steps[steps.length - 1].pool,
      steps[steps.length - 1].outputToken,
      steps[steps.length - 1].isSwap,
      ethers.provider,
    );
    // ToDo
    // 1. assert alice UT balance before withdraw
    // 2. assert bob UT balance before withdraw
    // 3. assert alice VT balance before withdraw
    // 4. assert bob VT balance before withdraw
    // 5. assert vault LP token balance before withdraw
    // 6. assert vault PPS before withdraw
    // 7. assert vault total supply before withdraw
    if (DEBUG == true) {
      console.log("\n");
      console.log("Before user withdraw ");
      console.log("poolBalanceBefore ", formatEther(poolBalanceBefore));
      console.log(
        `${underlyingTokenSymbol} balance `,
        formatUnits(
          await underlyingTokenInstance.balanceOf(vaultInstance.address),
          await underlyingTokenInstance.decimals(),
        ),
      );
      fork == eEVMNetwork.mainnet &&
        console.log(
          "WETH balance ",
          formatUnits(
            await (wethTokenInstance as ERC20).balanceOf(vaultInstance.address),
            await (wethTokenInstance as ERC20).decimals(),
          ),
        );
      console.log(
        `Alice ${underlyingTokenSymbol} balance `,
        formatUnits(
          await underlyingTokenInstance.balanceOf(signers[0].address),
          await underlyingTokenInstance.decimals(),
        ),
      );
      console.log(
        `Bob ${underlyingTokenSymbol} balance `,
        formatUnits(
          await underlyingTokenInstance.balanceOf(signers[1].address),
          await underlyingTokenInstance.decimals(),
        ),
      );
      console.log(
        `Alice ${vaultTokenSymbol} balance `,
        formatUnits(await vaultInstance.balanceOf(signers[0].address), await vaultInstance.decimals()),
      );
      console.log(
        `Bob ${vaultTokenSymbol} balance `,
        formatUnits(await vaultInstance.balanceOf(signers[1].address), await vaultInstance.decimals()),
      );
      console.log("PPS ", formatUnits(await vaultInstance.getPricePerFullShare(), 18));
      console.log("Total Supply ", formatUnits(await vaultInstance.totalSupply(), await vaultInstance.decimals()));
      console.log("strategies ", await vaultInstance.getStrategies());
    }
    const tx = await vaultInstance
      .connect(signers[i])
      .userWithdrawVault(signers[i].address, userWithdrawBalance.mul(3).div(4), []);
    await tx.wait();
    const userBalanceAfter = await underlyingTokenInstance.balanceOf(signers[i].address);
    const poolBalanceAfter = await strategyManager.liquidityPoolToAdapter[
      steps[steps.length - 1].pool
    ].getOutputTokenBalance(
      vaultInstance,
      steps.length === 1 ? underlyingTokenInstance.address : steps[steps.length - 2].outputToken,
      steps[steps.length - 1].pool,
      steps[steps.length - 1].outputToken,
      steps[steps.length - 1].isSwap,
      ethers.provider,
    );
    expect(userBalanceBefore).lt(userBalanceAfter);
    // if (
    //   ![
    //     "0xdf3f8ef63f05db6e4b04c3b5a8198d128b61faee8075aed893d76832a0deed6f", //wbtc-DEPOSIT-dAMM-cWBTC has 0% supply APY at fork block
    //     "0x44216c2a6ff5f35d0b24f54cfddb2f39f8ab9a7a998bfa4683aa6083dceb9a9a",
    //   ] //wbtc-DEPOSIT-AaveV2-aWBTC-DEPOSIT-dAMM-dAWBTC has 0% supply APY at fork block
    //     .includes(await vaultInstance.investStrategyHash())
    // ) {
    expect(poolBalanceBefore).gt(poolBalanceAfter);
    // }
    // ToDo
    // 1. assert alice UT balance after withdraw
    // 2. assert bob UT balance after withdraw
    // 3. assert alice VT balance after withdraw
    // 4. assert bob VT balance after withdraw
    // 5. assert vault LP token balance after withdraw
    // 6. assert vault PPS after withdraw
    // 7. assert vault total supply after withdraw
    if (DEBUG == true) {
      console.log("\n");
      console.log("After user withdraw ");
      console.log("poolBalanceAfter ", formatEther(poolBalanceAfter));
      console.log(
        `${underlyingTokenSymbol} balance `,
        formatUnits(
          await underlyingTokenInstance.balanceOf(vaultInstance.address),
          await underlyingTokenInstance.decimals(),
        ),
      );
      fork == eEVMNetwork.mainnet &&
        console.log(
          "WETH balance ",
          formatUnits(
            await (wethTokenInstance as ERC20).balanceOf(vaultInstance.address),
            await (wethTokenInstance as ERC20).decimals(),
          ),
        );
      console.log(
        `Alice ${underlyingTokenSymbol} balance `,
        formatUnits(
          await underlyingTokenInstance.balanceOf(signers[0].address),
          await underlyingTokenInstance.decimals(),
        ),
      );
      console.log(
        `Bob ${underlyingTokenSymbol} balance `,
        formatUnits(
          await underlyingTokenInstance.balanceOf(signers[1].address),
          await underlyingTokenInstance.decimals(),
        ),
      );
      console.log(
        `Alice ${vaultTokenSymbol} balance `,
        formatUnits(await vaultInstance.balanceOf(signers[0].address), await vaultInstance.decimals()),
      );
      console.log(
        `Bob ${vaultTokenSymbol} balance `,
        formatUnits(await vaultInstance.balanceOf(signers[1].address), await vaultInstance.decimals()),
      );
      console.log("PPS ", formatUnits(await vaultInstance.getPricePerFullShare(), 18));
      console.log("Total Supply ", formatUnits(await vaultInstance.totalSupply(), await vaultInstance.decimals()));
      console.log("strategies ", await vaultInstance.getStrategies());
    }
  }
}
