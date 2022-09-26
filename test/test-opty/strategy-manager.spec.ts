import chai, { expect } from "chai";
import { artifacts, deployments, ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { Signers, to_10powNumber_BN } from "../../helpers/utils";
import { MultiChainVaults, StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { eEVMNetwork, NETWORKS_CHAIN_ID_HEX } from "../../helper-hardhat-config";
import {
  Registry,
  StrategyProvider,
  Vault,
  ERC20,
  IAdapterFull,
  Registry__factory,
  StrategyProvider__factory,
  Vault__factory,
  ERC20__factory,
  StrategyManager,
  StrategyManager__factory,
} from "../../typechain";
import { generateTokenHashV2 } from "../../helpers/helpers";
import { StrategyConfigurationParams } from "../../helpers/type";
import {
  setTokenBalanceInStorage,
  getLastStrategyStepBalanceLP,
  getDepositInternalTransactionCount,
  getOraValueUT,
  getOraSomeValueLP,
} from "./utils";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../helpers/constants/tokens";
import { Artifact } from "hardhat/types";
import { BigNumber } from "ethers";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;
const token: string = "USDC";
const riskProfile: string = "Earn";

describe("StrategyManager Library", () => {
  before(async function () {
    await deployments.fixture();
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.deployer = signers[0];
    this.signers.alice = signers[1];
    const registryProxy = await deployments.get("RegistryProxy");
    const strategyProvider = await deployments.get("StrategyProvider");
    const strategyManager = await deployments.get("StrategyManager");
    this.registry = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxy.address);
    this.strategyProvider = <StrategyProvider>(
      await ethers.getContractAt(StrategyProvider__factory.abi, strategyProvider.address)
    );
    this.strategyManager = <StrategyManager>(
      await ethers.getContractAt(StrategyManager__factory.abi, strategyManager.address)
    );
    this.optyFiVaults = {};
    this.tokens = {};
    for (const token of Object.keys(MultiChainVaults[fork][riskProfile])) {
      this.optyFiVaults[token] = <Vault>(
        await ethers.getContractAt(
          Vault__factory.abi,
          (
            await deployments.get(MultiChainVaults[fork][riskProfile][token].symbol)
          ).address,
        )
      );
      this.tokens[token] = <ERC20>(
        await ethers.getContractAt(ERC20__factory.abi, MULTI_CHAIN_VAULT_TOKENS[fork][token].address)
      );
    }

    const strategyOperatorAddress = await this.registry.getStrategyOperator();
    this.signers.strategyOperator = await ethers.getSigner(strategyOperatorAddress);
    const governanceAddress = await this.registry.getGovernance();
    this.signers.governance = await ethers.getSigner(governanceAddress);
  });
  describe("StrategyManager", () => {
    for (const strategy of Object.keys(StrategiesByTokenByChain[fork][riskProfile][token])) {
      const strategyDetail = StrategiesByTokenByChain[fork][riskProfile][token][strategy];
      const tokenHash = generateTokenHashV2([strategyDetail.token], NETWORKS_CHAIN_ID_HEX[fork]);
      const steps = strategyDetail.strategy.map(item => ({
        pool: item.contract,
        outputToken: item.outputToken,
        isBorrow: item.isBorrow,
      }));

      describe(`${strategy}`, () => {
        beforeEach(async function () {
          this.testStrategyManagerArtifact = <Artifact>await artifacts.readArtifact("TestStrategyManager");
          const testStrategyManagerFactory = await ethers.getContractFactory("TestStrategyManager", {
            signer: this.signers.deployer,
            libraries: {
              StrategyManager: this.strategyManager.address,
            },
          });
          this.testStrategyManager = await testStrategyManagerFactory.deploy();
          await this.optyFiVaults[token]
            .connect(this.signers.governance)
            .setVaultConfiguration(MultiChainVaults[fork][riskProfile][token].vaultConfig);
          await this.strategyProvider
            .connect(this.signers.strategyOperator)
            .setBestStrategy(strategyDetail.riskProfileCode, tokenHash, steps);
          this.minimumDepositValueUT = BigNumber.from(
            MultiChainVaults[fork][riskProfile][token].minimumDepositValueUT,
          ).div(to_10powNumber_BN(await this.optyFiVaults[token].decimals()));
        });

        it("[getDepositInternalTransactionCount] should return the correct number of internal transactions", async function () {
          const strategyStepCount = await getDepositInternalTransactionCount(steps, this.registry);
          expect(strategyStepCount).gt(0);
          expect(
            await this.testStrategyManager.testGetDepositInternalTransactionCount(
              steps,
              this.registry.address,
              strategyStepCount,
            ),
          ).to.eq(true);
        });

        it("[getOraValueUT] should return the correct underlying token value deposited into strategy", async function () {
          await setTokenBalanceInStorage(
            this.tokens[token],
            this.optyFiVaults[token].address,
            this.minimumDepositValueUT.toString(),
          );
          const tx = await this.optyFiVaults[token].rebalance();
          await tx.wait(1);
          const oraValueUT = await getOraValueUT(steps, this.registry, this.optyFiVaults[token], this.tokens[token]);
          expect(oraValueUT).gt(0);
          expect(
            await this.testStrategyManager.testOraValueUT(
              steps,
              this.registry.address,
              this.optyFiVaults[token].address,
              this.tokens[token].address,
              oraValueUT,
            ),
          ).to.eq(true);
        });

        it("[getOraSomeValueLP] should return correct amount of LP tokens for a given amount of underlying tokens", async function () {
          const oraSomeValueLP = await getOraSomeValueLP(
            steps,
            this.registry,
            this.tokens[token],
            this.minimumDepositValueUT,
          );
          expect(oraSomeValueLP).gt(0);
          expect(
            await this.testStrategyManager.testOraSomeValueLP(
              steps,
              this.registry.address,
              this.tokens[token].address,
              this.minimumDepositValueUT,
              oraSomeValueLP,
            ),
          ).to.eq(true);
        });

        it("[getPoolDepositCodes] should return the correct deposit codes", async function () {
          await setTokenBalanceInStorage(
            this.tokens[token],
            this.testStrategyManager.address,
            this.minimumDepositValueUT.toString(),
          );
          const depositAmount = await this.tokens[token].balanceOf(this.testStrategyManager.address);
          const strategyStepCount = await getDepositInternalTransactionCount(steps, this.registry);
          const outputToken = <ERC20>(
            await ethers.getContractAt(ERC20__factory.abi, steps[steps.length - 1].outputToken)
          );
          const inititalBalance = await outputToken.balanceOf(this.testStrategyManager.address);
          for (let i = 0; i < strategyStepCount; i++) {
            const strategyConfigParams: StrategyConfigurationParams = {
              registryContract: this.registry.address,
              vault: this.testStrategyManager.address,
              underlyingToken: this.tokens[token].address,
              initialStepInputAmount: depositAmount,
              internalTransactionIndex: BigNumber.from(i),
              internalTransactionCount: strategyStepCount,
            };
            await this.testStrategyManager.testGetPoolDepositCodes(steps, strategyConfigParams);
          }
          let finalBalance;
          if (strategyStepCount > steps.length) {
            const adapterInstance = <IAdapterFull>(
              await ethers.getContractAt(
                "IAdapterFull",
                await this.registry.getLiquidityPoolToAdapter(steps[steps.length - 1].pool),
              )
            );
            finalBalance = await adapterInstance.getAllAmountInTokenStake(
              this.testStrategyManager.address,
              steps[steps.length - 1].outputToken,
              steps[steps.length - 1].pool,
            );
          } else {
            finalBalance = await outputToken.balanceOf(this.testStrategyManager.address);
          }
          expect(finalBalance).gt(inititalBalance);
        });

        it("[getPoolWithdrawCodes] should return the correct withdraw codes", async function () {
          await setTokenBalanceInStorage(
            this.tokens[token],
            this.testStrategyManager.address,
            this.minimumDepositValueUT.toString(),
          );
          const depositAmount = await this.tokens[token].balanceOf(this.testStrategyManager.address);
          const strategyStepCountDeposit = await getDepositInternalTransactionCount(steps, this.registry);
          for (let i = 0; i < strategyStepCountDeposit; i++) {
            const strategyConfigParams: StrategyConfigurationParams = {
              registryContract: this.registry.address,
              vault: this.testStrategyManager.address,
              underlyingToken: this.tokens[token].address,
              initialStepInputAmount: depositAmount,
              internalTransactionIndex: BigNumber.from(i),
              internalTransactionCount: strategyStepCountDeposit,
            };
            await this.testStrategyManager.testGetPoolDepositCodes(steps, strategyConfigParams);
          }
          const inititalBalance = await this.tokens[token].balanceOf(this.testStrategyManager.address);
          const strategyStepCountWithdraw = steps.length;
          const lastStrategyStepBalanceLP = await getLastStrategyStepBalanceLP(
            steps,
            this.registry,
            this.testStrategyManager,
            this.tokens[token],
          );
          for (let i = 0; i < strategyStepCountWithdraw; i++) {
            const strategyConfigParams: StrategyConfigurationParams = {
              registryContract: this.registry.address,
              vault: this.testStrategyManager.address,
              underlyingToken: this.tokens[token].address,
              initialStepInputAmount: lastStrategyStepBalanceLP,
              internalTransactionIndex: BigNumber.from(strategyStepCountWithdraw - 1 - i),
              internalTransactionCount: BigNumber.from(strategyStepCountWithdraw),
            };
            await this.testStrategyManager.testGetPoolWithdrawCodes(steps, strategyConfigParams);
          }
          const finalBalance = await this.tokens[token].balanceOf(this.testStrategyManager.address);
          expect(finalBalance).gt(inititalBalance);
        });

        it("[getLastStrategyStepBalanceLP] should return the correct LP Token balance for the last step of the strategy", async function () {
          await setTokenBalanceInStorage(
            this.tokens[token],
            this.optyFiVaults[token].address,
            this.minimumDepositValueUT.toString(),
          );
          const tx = await this.optyFiVaults[token].rebalance();
          await tx.wait(1);
          const lastStrategyStepBalanceLP = await getLastStrategyStepBalanceLP(
            steps,
            this.registry,
            this.optyFiVaults[token],
            this.tokens[token],
          );
          expect(lastStrategyStepBalanceLP).gt(0);
          expect(
            await this.testStrategyManager.testGetLastStrategyStepBalanceLP(
              steps,
              this.registry.address,
              this.optyFiVaults[token].address,
              this.tokens[token].address,
              lastStrategyStepBalanceLP,
            ),
          ).to.eq(true);
        });
      });
    }
  });
});
