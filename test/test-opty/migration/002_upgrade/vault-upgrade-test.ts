import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { eEVMNetwork } from "../../../helper-hardhat-config";
import { VaultV3 } from "../../../helpers/types/vaultv3";
import { Signers } from "../../../helpers/utils";
import {
  InitializableImmutableAdminUpgradeabilityProxy,
  InitializableImmutableAdminUpgradeabilityProxy__factory,
  Vault,
  Vault__factory,
} from "../../../typechain";
import { ethereumTestVaults, polygonTestVaults } from "./test-vaults";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;
const testVaults = fork === eEVMNetwork.mainnet ? ethereumTestVaults : polygonTestVaults;

describe("Vault rev4 upgrade test", () => {
  before(async function () {
    this.vaultsV3 = {};
    this.vaults = {};
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.admin = signers[1];
    const strategyManagerFactory = await ethers.getContractFactory("StrategyManager");
    const strategyManager = await strategyManagerFactory.deploy();
    const claimAndHarvestFactory = await ethers.getContractFactory("ClaimAndHarvest");
    const claimAndHarvest = await claimAndHarvestFactory.deploy();

    const vaultFactory = await ethers.getContractFactory("Vault", {
      libraries: {
        "contracts/protocol/lib/StrategyManager.sol:StrategyManager": strategyManager.address,
        "contracts/protocol/lib/ClaimAndHarvest.sol:ClaimAndHarvest": claimAndHarvest.address,
      },
    });
    let vaultImplementation;
    if (fork == eEVMNetwork.mainnet) {
      await network.provider.request({
        method: "hardhat_reset",
        params: [
          {
            forking: {
              jsonRpcUrl: process.env.MAINNET_NODE_URL,
              blockNumber: 15654509,
            },
          },
        ],
      });
      vaultImplementation = await vaultFactory.deploy("0x99fa011e33a8c6196869dec7bc407e896ba67fe3");
    }
    if (fork == eEVMNetwork.polygon) {
      await network.provider.request({
        method: "hardhat_reset",
        params: [
          {
            forking: {
              jsonRpcUrl: process.env.POLYGON_NODE_URL,
              blockNumber: 33802457,
            },
          },
        ],
      });
      vaultImplementation = await vaultFactory.deploy("0x32bd1a6fdaec327b57cdb2cfde0855afb3255d7c");
    }
    for (const underlyingToken of Object.keys(testVaults)) {
      this.vaultsV3[underlyingToken] = {};
      this.vaults[underlyingToken] = {};
      for (const testVault of Object.keys(testVaults[underlyingToken])) {
        await network.provider.request({
          method: "hardhat_impersonateAccount",
          params: [testVaults[underlyingToken][testVault].proxyAdmin],
        });
        const txs = await this.signers.admin.sendTransaction({
          to: testVaults[underlyingToken][testVault].proxyAdmin,
          value: parseEther("1"),
        });
        await txs.wait(1);
        const proxySigner = await ethers.getSigner(testVaults[underlyingToken][testVault].proxyAdmin);
        const vaultV3Instance = <VaultV3>(
          await ethers.getContractAt(testVaults[underlyingToken][testVault].oldAbi, testVault)
        );
        this.vaultsV3[underlyingToken][testVault] = {
          instance: vaultV3Instance,
          registryContract: await vaultV3Instance.registryContract(),
          pendingDeposits:
            testVaults[underlyingToken][testVault].testAccount !== undefined
              ? await vaultV3Instance.pendingDeposits(testVaults[underlyingToken][testVault].testAccount as string)
              : BigNumber.from("0"),
          totalDeposits:
            testVaults[underlyingToken][testVault].testAccount !== undefined
              ? await vaultV3Instance.totalDeposits(testVaults[underlyingToken][testVault].testAccount as string)
              : BigNumber.from("0"),
          blockToBlockVaultValues:
            testVaults[underlyingToken][testVault].testBlockNumber !== undefined
              ? [
                  {
                    actualVaultValue: (
                      await vaultV3Instance.blockToBlockVaultValues(
                        testVaults[underlyingToken][testVault].testBlockNumber as BigNumber,
                        0,
                      )
                    ).actualVaultValue,
                    blockMaxVaultValue: (
                      await vaultV3Instance.blockToBlockVaultValues(
                        testVaults[underlyingToken][testVault].testBlockNumber as BigNumber,
                        0,
                      )
                    ).blockMaxVaultValue,
                    blockMinVaultValue: (
                      await vaultV3Instance.blockToBlockVaultValues(
                        testVaults[underlyingToken][testVault].testBlockNumber as BigNumber,
                        0,
                      )
                    ).blockMinVaultValue,
                  },
                ]
              : [
                  {
                    actualVaultValue: BigNumber.from("0"),
                    blockMaxVaultValue: BigNumber.from("0"),
                    blockMinVaultValue: BigNumber.from("0"),
                  },
                ],
          investStrategyHash: await vaultV3Instance.investStrategyHash(),
          userDepositCap: await vaultV3Instance.userDepositCapUT(),
          minimumDepositValueUT: await vaultV3Instance.minimumDepositValueUT(),
          vaultConfiguration: await vaultV3Instance.vaultConfiguration(),
          underlyingToken: await vaultV3Instance.underlyingToken(),
          whitelistedAccountsRoot: await vaultV3Instance.whitelistedAccountsRoot(),
          totalValueLockedLimitUT: await vaultV3Instance.totalValueLockedLimitUT(),
          whitelistedCodesRoot: await vaultV3Instance.whitelistedCodesRoot(),
          underlyingTokensHash: await vaultV3Instance.underlyingTokensHash(),
          investStrategySteps: testVaults[underlyingToken][testVault].hasStrategy
            ? [
                {
                  pool: (await vaultV3Instance.investStrategySteps(0)).pool,
                  outputToken: (await vaultV3Instance.investStrategySteps(0)).outputToken,
                  isBorrow: (await vaultV3Instance.investStrategySteps(0)).isBorrow,
                },
              ]
            : [
                {
                  pool: ethers.constants.AddressZero,
                  outputToken: ethers.constants.AddressZero,
                  isBorrow: false,
                },
              ],
        };
        expect(await vaultV3Instance.name()).to.eq(testVaults[underlyingToken][testVault].oldName);
        expect(await vaultV3Instance.symbol()).to.eq(testVaults[underlyingToken][testVault].oldSymbol);
        expect(await vaultV3Instance.opTOKEN_REVISION()).to.eq(testVaults[underlyingToken][testVault].revision);

        const proxyInstance = <InitializableImmutableAdminUpgradeabilityProxy>(
          await ethers.getContractAt(InitializableImmutableAdminUpgradeabilityProxy__factory.abi, testVault)
        );
        const tx = await proxyInstance.connect(proxySigner).upgradeTo(vaultImplementation?.address as string);
        await tx.wait(1);

        this.vaults[underlyingToken][testVault] = <Vault>await ethers.getContractAt(Vault__factory.abi, testVault);
      }
    }
  });

  for (const testVaultUnderlyingToken of Object.keys(testVaults)) {
    for (const testVault of Object.keys(testVaults[testVaultUnderlyingToken])) {
      describe(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} storage test`, () => {
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} registryContract as expected`, async function () {
          expect(await this.vaults[testVaultUnderlyingToken][testVault].registryContract()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].registryContract,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} op_Revision as expected`, async function () {
          expect(await this.vaults[testVaultUnderlyingToken][testVault].opTOKEN_REVISION()).to.eq("4");
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} pendingDeposits as expected`, async function () {
          if (testVaults[testVaultUnderlyingToken][testVault].testAccount !== undefined) {
            expect(
              await this.vaults[testVaultUnderlyingToken][testVault].pendingDeposits(
                testVaults[testVaultUnderlyingToken][testVault].testAccount as string,
              ),
            ).to.eq(this.vaultsV3[testVaultUnderlyingToken][testVault].pendingDeposits);
          }
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} totalDeposits as expected`, async function () {
          if (testVaults[testVaultUnderlyingToken][testVault].testAccount !== undefined) {
            expect(
              await this.vaults[testVaultUnderlyingToken][testVault].totalDeposits(
                testVaults[testVaultUnderlyingToken][testVault].testAccount as string,
              ),
            ).to.eq(this.vaultsV3[testVaultUnderlyingToken][testVault].totalDeposits);
          }
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} blockToBlockVaultValues as expected`, async function () {
          if (testVaults[testVaultUnderlyingToken][testVault].testBlockNumber !== undefined) {
            const actualBlockToBlockVaultValues = await this.vaults[testVaultUnderlyingToken][
              testVault
            ].blockToBlockVaultValues(testVaults[testVaultUnderlyingToken][testVault]?.testBlockNumber as BigNumber, 0);
            expect({
              actualVaultValue: actualBlockToBlockVaultValues.actualVaultValue,
              blockMinVaultValue: actualBlockToBlockVaultValues.blockMinVaultValue,
              blockMaxVaultValue: actualBlockToBlockVaultValues.blockMaxVaultValue,
            }).to.deep.eq(this.vaultsV3[testVaultUnderlyingToken][testVault].blockToBlockVaultValues[0]);
          }
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} investStrategyHash as expected`, async function () {
          expect(await this.vaults[testVaultUnderlyingToken][testVault].investStrategyHash()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].investStrategyHash,
          );
        });

        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} userDepositCapUT as expected`, async function () {
          expect(await this.vaults[testVaultUnderlyingToken][testVault].userDepositCapUT()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].userDepositCap,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} minimumDepositVaultUT as expected`, async function () {
          expect(await this.vaults[testVaultUnderlyingToken][testVault].minimumDepositValueUT()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].minimumDepositValueUT,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} vaultConfiguration as expected`, async function () {
          expect(await this.vaults[testVaultUnderlyingToken][testVault].vaultConfiguration()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].vaultConfiguration,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} underlyingToken as expected`, async function () {
          expect(await this.vaults[testVaultUnderlyingToken][testVault].underlyingToken()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].underlyingToken,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} whitelistedAccountsRoot as expected`, async function () {
          expect(await this.vaults[testVaultUnderlyingToken][testVault].whitelistedAccountsRoot()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].whitelistedAccountsRoot,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} totalValueLockedLimitUT as expected`, async function () {
          expect(await this.vaults[testVaultUnderlyingToken][testVault].totalValueLockedLimitUT()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].totalValueLockedLimitUT,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} _domainSeparator as expected`, async function () {
          expect(await this.vaults[testVaultUnderlyingToken][testVault]._domainSeparator()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].whitelistedCodesRoot,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} underlyingTokensHash as expected`, async function () {
          expect(await this.vaults[testVaultUnderlyingToken][testVault].underlyingTokensHash()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].underlyingTokensHash,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} investStrategySteps as expected`, async function () {
          if (testVaults[testVaultUnderlyingToken][testVault].hasStrategy) {
            const strategyStep = await this.vaults[testVaultUnderlyingToken][testVault].investStrategySteps(0);
            expect({
              pool: strategyStep.pool,
              outputToken: strategyStep.outputToken,
              isBorrow: strategyStep.isBorrow,
            }).to.deep.eq(this.vaultsV3[testVaultUnderlyingToken][testVault].investStrategySteps[0]);
          }
        });
      });
    }
  }
});
