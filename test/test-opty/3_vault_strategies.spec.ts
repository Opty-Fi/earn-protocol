import chai, { expect } from "chai";
import { deployments, ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import BN from "bignumber.js";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { BigNumber, Contract } from "ethers";
import { formatEther, formatUnits, getAddress, parseUnits } from "ethers/lib/utils";
import Compound from "@optyfi/defi-legos/ethereum/compound/index";
import {
  assertPostUserDepositState,
  assertPostUserWithdrawState,
  assertPostVaultDepositState,
  assertPostVaultWithdrawState,
  Signers,
  to_10powNumber_BN,
} from "../../helpers/utils";
import { MultiChainVaults, StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { eEVMNetwork, NETWORKS_CHAIN_ID_HEX } from "../../helper-hardhat-config";
import {
  Registry,
  Vault,
  ERC20,
  Registry__factory,
  Vault__factory,
  ERC20__factory,
  IComptroller__factory,
  StrategyRegistry__factory,
  VaultHelperMainnet,
  VaultHelperMainnet__factory,
} from "../../typechain";
import { generateTokenHashV2, generateStrategyHashV2 } from "../../helpers/helpers";
import { StrategyStepType } from "../../helpers/type";
import { getPreActionState, setTokenBalanceInStorage } from "./utils";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";
import { TypedTokens } from "../../helpers/data";
import { StrategyManager } from "../../helpers/strategy-manager";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;
const DEBUG = process.env.DEBUG === "true" ? true : false;
const IGNORE_VAULTS = process.env.IGNORE_VAULTS;
const strategyHashReadIndexes: { [key: string]: { valueLPIndex: number } } = {
  "0x9d5b0ec470b7cc0292aa6f12b02080fab6963a074f01f19bf163819cb6e38cb6": {
    // dai-DEPOSIT-AaveV2-aDAI
    valueLPIndex: 0,
  },
  "0x209d8398fa428a480aa63498a065daaa46d3d7ef77e2d367194e8a6a4d3ebf9a": {
    // dai-DEPOSIT-Compound-cDAI
    valueLPIndex: 1,
  },
  "0x74ceffc4d239683893dd31f6c4bed33f65aafb1bdad2c47d61bae7db81a42e4d": {
    // usdt-DEPOSIT-AaveV2-aUSDT
    valueLPIndex: 0,
  },
  "0x4103355b18f7a7ea81aebc211548510bb077426632fbe4899f4cf162c70ba396": {
    // usdt-DEPOSIT-Compound-cUSDT
    valueLPIndex: 1,
  },
  "0x46b9c41c6ff6c82958774b97fc426f046011e4177b8f64ded0d1a704d083b3c6": {
    // wbtc-DEPOSIT-AaveV2-aWBTC
    valueLPIndex: 0,
  },
  "0x35f4123193f545465801d2cd7418a60c7cfe6ade80b8be4f941124705fb7a39c": {
    // wbtc-DEPOSIT-Compound-cWBTC
    valueLPIndex: 1,
  },
  "0xdc405bd6462f69e015108f9c274278cf552f891ed2015820827a672abafd48fc": {
    // usdc-DEPOSIT-AaveV2-aUSDC
    valueLPIndex: 0,
  },
  "0x58404c3f191270f62e374653c7aa923e5487ed261523b0aef0a432a01a8ea088": {
    // usdc-DEPOSIT-Compound-cUSDC
    valueLPIndex: 1,
  },
  "0x514e845e4f1401cfe30f214a1386dfd06a98e15316dde7f669889a82ddffdeb8": {
    // weth-DEPOSIT-AaveV2-aWETH
    valueLPIndex: 0,
  },
  "0x87ed056054f13b934a9864226aa8c1f52ad63a7ad25bb2c74c1f920c9635c04c": {
    // weth-DEPOSIT-Compound-cETH
    valueLPIndex: 1,
  },
};

describe(`${fork}-Vault-rev7`, () => {
  before(async function () {
    this.strategyRegistry = await ethers.getContractAt(
      StrategyRegistry__factory.abi,
      (
        await deployments.get("StrategyRegistry")
      ).address,
    );
    this.vaultHelperMainnet = <VaultHelperMainnet>(
      await ethers.getContractAt(VaultHelperMainnet__factory.abi, (await deployments.get("VaultHelperMainnet")).address)
    );
    this.strategyManager = new StrategyManager(
      <Contract>this.vaultHelperMainnet,
      (await deployments.get("OptyFiOracle")).address,
    );
    this.registry = <Registry>(
      await ethers.getContractAt(Registry__factory.abi, (await deployments.get("RegistryProxy")).address)
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
                    outputIndex: strategyHashReadIndexes[strategyHash].valueLPIndex,
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
                await userDeposit(
                  signers,
                  this.vaults[riskProfile][token],
                  this.tokens[token],
                  this.tokens["WETH"],
                  steps as StrategyStepType[],
                  this.strategyManager,
                );
              } else {
                await userDeposit(
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

              const {
                userBalanceBeforeUT,
                userBalanceBeforeVT,
                vaultTotalSupplyBeforeVT,
                vaultBalanceBeforeLP,
                vaultBalanceBeforeUT,
              } = await getPreActionState(
                this.signers.alice,
                this.tokens[token],
                this.vaults[riskProfile][token],
                this.strategyManager,
                steps,
              );
              const vaultDepositUT = await this.tokens[token].balanceOf(this.vaults[riskProfile][token].address);
              const vaultDepositTx = await this.vaults[riskProfile][token]
                .connect(this.signers.strategyOperator)
                .vaultDepositSomeToStrategy(strategyHash, vaultDepositUT);
              await vaultDepositTx.wait(1);

              await assertPostVaultDepositState(
                this.signers.alice,
                this.tokens[token],
                this.vaults[riskProfile][token],
                this.strategyManager,
                steps,
                ethers.provider,
                userBalanceBeforeUT,
                vaultDepositUT,
                vaultTotalSupplyBeforeVT,
                userBalanceBeforeVT,
                vaultBalanceBeforeLP,
                vaultBalanceBeforeUT,
              );
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
                await userWithdraw(
                  signers,
                  this.vaults[riskProfile][token],
                  this.tokens[token],
                  steps as StrategyStepType[],
                  this.registry,
                  this.tokens["WETH"],
                  this.strategyManager,
                );
              } else {
                await userWithdraw(
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
                await userDeposit(
                  signers,
                  this.vaults[riskProfile][token],
                  this.tokens[token],
                  this.tokens["WETH"],
                  steps as StrategyStepType[],
                  this.strategyManager,
                );
              } else {
                await userDeposit(
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
              if (DEBUG == true) {
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
              const {
                userBalanceBeforeUT,
                userBalanceBeforeVT,
                vaultTotalSupplyBeforeVT,
                vaultBalanceBeforeLP,
                vaultBalanceBeforeUT,
              } = await getPreActionState(
                this.signers.bob,
                this.tokens[token],
                this.vaults[riskProfile][token],
                this.strategyManager,
                steps,
              );
              const vaultDepositUT = await this.tokens[token].balanceOf(this.vaults[riskProfile][token].address);
              const vaultDepositSomeTx = await this.vaults[riskProfile][token]
                .connect(this.signers.operator)
                .vaultDepositSomeToStrategy(strategyHash, vaultDepositUT);
              await vaultDepositSomeTx.wait(1);
              await assertPostVaultDepositState(
                this.signers.bob,
                this.tokens[token],
                this.vaults[riskProfile][token],
                this.strategyManager,
                steps,
                ethers.provider,
                userBalanceBeforeUT,
                vaultDepositUT,
                vaultTotalSupplyBeforeVT,
                userBalanceBeforeVT,
                vaultBalanceBeforeLP,
                vaultBalanceBeforeUT,
              );
              if (DEBUG == true) {
                console.log("\n");
                console.log("After vault deposit ");
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
                await userWithdraw(
                  signers,
                  this.vaults[riskProfile][token],
                  this.tokens[token],
                  steps as StrategyStepType[],
                  this.registry,
                  this.tokens["WETH"],
                  this.strategyManager,
                );
              } else {
                await userWithdraw(
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
            after(async function () {
              if ((await this.vaults[riskProfile][token].getStrategies()).length !== 0) {
                const vaultWithdrawLP = await this.strategyManager.liquidityPoolToAdapter[
                  steps[steps.length - 1].pool
                ].getOutputTokenBalance(
                  this.vaults[riskProfile][token],
                  steps.length === 1 ? this.tokens[token].address : steps[steps.length - 2].outputToken,
                  steps[steps.length - 1].pool,
                  steps[steps.length - 1].outputToken,
                  steps[steps.length - 1].isSwap,
                  ethers.provider,
                );

                const {
                  userBalanceBeforeUT,
                  userBalanceBeforeVT,
                  vaultTotalSupplyBeforeVT,
                  vaultValueBeforeUT,
                  vaultBalanceBeforeLP,
                  vaultBalanceBeforeUT,
                } = await getPreActionState(
                  this.signers.alice,
                  this.tokens[token],
                  this.vaults[riskProfile][token],
                  this.strategyManager,
                  steps,
                );

                const vaultWithdrawSomeFromStrategyTx = await this.vaults[riskProfile][token]
                  .connect(this.signers.strategyOperator)
                  .vaultWithdrawSomeFromStrategy(strategyHash, vaultWithdrawLP);
                await vaultWithdrawSomeFromStrategyTx.wait(1);

                await assertPostVaultWithdrawState(
                  this.signers.alice,
                  this.tokens[token],
                  this.vaults[riskProfile][token],
                  this.strategyManager,
                  steps,
                  ethers.provider,
                  userBalanceBeforeUT,
                  vaultWithdrawLP,
                  vaultTotalSupplyBeforeVT,
                  vaultValueBeforeUT,
                  userBalanceBeforeVT,
                  vaultBalanceBeforeLP,
                  vaultBalanceBeforeUT,
                );

                const removeStrategyTx = await this.vaults[riskProfile][token]
                  .connect(this.signers.operator)
                  .removeStrategy(strategyHash);
                await removeStrategyTx.wait(1);
              }
            });
          });
        }
      }
    }
  });
});

async function userDeposit(
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
    _userDepositInDecimals = BigNumber.from("2").mul(parseUnits("1", decimals));
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

    const { userBalanceBeforeUT, userBalanceBeforeVT, vaultTotalSupplyBeforeVT, vaultValueBeforeUT } =
      await getPreActionState(signers[i], underlyingTokenInstance, vaultInstance, strategyManager, steps);

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

async function userWithdraw(
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
    const {
      userBalanceBeforeUT,
      userBalanceBeforeVT,
      vaultTotalSupplyBeforeVT,
      vaultValueBeforeUT,
      vaultBalanceBeforeLP,
      vaultBalanceBeforeUT,
    } = await getPreActionState(signers[i], underlyingTokenInstance, vaultInstance, strategyManager, steps);
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

    await assertPostUserWithdrawState(
      signers[i],
      underlyingTokenInstance,
      vaultInstance,
      strategyManager,
      steps,
      ethers.provider,
      userBalanceBeforeUT,
      userWithdrawBalance.mul(3).div(4),
      vaultTotalSupplyBeforeVT,
      vaultValueBeforeUT,
      userBalanceBeforeVT,
      vaultBalanceBeforeLP,
      vaultBalanceBeforeUT,
    );
    if (DEBUG == true) {
      console.log("\n");
      console.log("After user withdraw ");
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
