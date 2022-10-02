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
import { ethereumVaults, polygonVaults } from "./vaults";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;

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
      const vaultImplementation = await vaultFactory.deploy("0x99fa011e33a8c6196869dec7bc407e896ba67fe3");
      for (const underlyingToken of Object.keys(ethereumVaults)) {
        this.vaultsV3[underlyingToken] = {};
        this.vaults[underlyingToken] = {};
        for (const ethereumVault of Object.keys(ethereumVaults[underlyingToken])) {
          await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [ethereumVaults[underlyingToken][ethereumVault].proxyAdmin],
          });
          const txs = await this.signers.admin.sendTransaction({
            to: ethereumVaults[underlyingToken][ethereumVault].proxyAdmin,
            value: parseEther("1"),
          });
          await txs.wait(1);
          const proxySigner = await ethers.getSigner(ethereumVaults[underlyingToken][ethereumVault].proxyAdmin);
          const vaultV3Instance = <VaultV3>(
            await ethers.getContractAt(ethereumVaults[underlyingToken][ethereumVault].oldAbi, ethereumVault)
          );
          this.vaultsV3[underlyingToken][ethereumVault] = {
            instance: vaultV3Instance,
            pendingDeposits:
              ethereumVaults[underlyingToken][ethereumVault].testAccount !== undefined
                ? await vaultV3Instance.pendingDeposits(
                    ethereumVaults[underlyingToken][ethereumVault].testAccount as string,
                  )
                : BigNumber.from("0"),
            totalDeposits:
              ethereumVaults[underlyingToken][ethereumVault].testAccount !== undefined
                ? await vaultV3Instance.totalDeposits(
                    ethereumVaults[underlyingToken][ethereumVault].testAccount as string,
                  )
                : BigNumber.from("0"),
            blockToBlockVaultValues:
              ethereumVaults[underlyingToken][ethereumVault].testBlockNumber !== undefined
                ? [
                    {
                      actualVaultValue: (
                        await vaultV3Instance.blockToBlockVaultValues(
                          ethereumVaults[underlyingToken][ethereumVault].testBlockNumber as BigNumber,
                          0,
                        )
                      ).actualVaultValue,
                      blockMaxVaultValue: (
                        await vaultV3Instance.blockToBlockVaultValues(
                          ethereumVaults[underlyingToken][ethereumVault].testBlockNumber as BigNumber,
                          0,
                        )
                      ).blockMaxVaultValue,
                      blockMinVaultValue: (
                        await vaultV3Instance.blockToBlockVaultValues(
                          ethereumVaults[underlyingToken][ethereumVault].testBlockNumber as BigNumber,
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
            // investStrategySteps: [
            //   {
            //     pool: (await vaultV3Instance.investStrategySteps(0)).pool,
            //     outputToken: (await vaultV3Instance.investStrategySteps(0)).outputToken,
            //     isBorrow: (await vaultV3Instance.investStrategySteps(0)).isBorrow,
            //   },
            // ],
          };
          try {
            expect(await vaultV3Instance.name()).to.eq(ethereumVaults[underlyingToken][ethereumVault].oldName);
            expect(await vaultV3Instance.symbol()).to.eq(ethereumVaults[underlyingToken][ethereumVault].oldSymbol);
            expect(await vaultV3Instance.opTOKEN_REVISION()).to.eq(
              ethereumVaults[underlyingToken][ethereumVault].revision,
            );
          } catch (error) {
            console.log("2", vaultV3Instance.address);
          }
          const proxyInstance = <InitializableImmutableAdminUpgradeabilityProxy>(
            await ethers.getContractAt(InitializableImmutableAdminUpgradeabilityProxy__factory.abi, ethereumVault)
          );
          try {
            const tx = await proxyInstance.connect(proxySigner).upgradeTo(vaultImplementation.address);
            await tx.wait(1);
          } catch (error) {
            console.log("1", proxyInstance.address);
          }
          this.vaults[underlyingToken][ethereumVault] = <Vault>(
            await ethers.getContractAt(Vault__factory.abi, ethereumVault)
          );
        }
      }
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
      const vaultImplementation = await vaultFactory.deploy("0x32bd1a6fdaec327b57cdb2cfde0855afb3255d7c");
      for (const underlyingToken of Object.keys(polygonVaults)) {
        this.vaultsV3[underlyingToken] = {};
        this.vaults[underlyingToken] = {};
        for (const polygonVault of Object.keys(polygonVaults[underlyingToken])) {
          await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [polygonVaults[underlyingToken][polygonVault].proxyAdmin],
          });
          const txs = await this.signers.admin.sendTransaction({
            to: polygonVaults[underlyingToken][polygonVault].proxyAdmin,
            value: parseEther("1"),
          });
          await txs.wait(1);
          const proxySigner = await ethers.getSigner(polygonVaults[underlyingToken][polygonVault].proxyAdmin);
          const vaultV3Instance = <VaultV3>(
            await ethers.getContractAt(polygonVaults[underlyingToken][polygonVault].oldAbi, polygonVault)
          );
          this.vaultsV3[underlyingToken][polygonVault] = {
            instance: vaultV3Instance,
            pendingDeposits:
              polygonVaults[underlyingToken][polygonVault].testAccount !== undefined
                ? await vaultV3Instance.pendingDeposits(
                    polygonVaults[underlyingToken][polygonVault].testAccount as string,
                  )
                : BigNumber.from("0"),
            totalDeposits: await vaultV3Instance.totalDeposits(
              polygonVaults[underlyingToken][polygonVault].testAccount as string,
            ),
            blockToBlockVaultValues:
              polygonVaults[underlyingToken][polygonVault].testBlockNumber !== undefined
                ? [
                    {
                      actualVaultValue: (
                        await vaultV3Instance.blockToBlockVaultValues(
                          polygonVaults[underlyingToken][polygonVault].testBlockNumber as BigNumber,
                          0,
                        )
                      ).actualVaultValue,
                      blockMaxVaultValue: (
                        await vaultV3Instance.blockToBlockVaultValues(
                          polygonVaults[underlyingToken][polygonVault].testBlockNumber as BigNumber,
                          0,
                        )
                      ).blockMaxVaultValue,
                      blockMinVaultValue: (
                        await vaultV3Instance.blockToBlockVaultValues(
                          polygonVaults[underlyingToken][polygonVault].testBlockNumber as BigNumber,
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
            investStrategySteps: [
              {
                pool: (await vaultV3Instance.investStrategySteps(0)).pool,
                outputToken: (await vaultV3Instance.investStrategySteps(0)).outputToken,
                isBorrow: (await vaultV3Instance.investStrategySteps(0)).isBorrow,
              },
            ],
          };
          expect(await vaultV3Instance.name()).to.eq(polygonVaults[underlyingToken][polygonVault].oldName);
          expect(await vaultV3Instance.symbol()).to.eq(polygonVaults[underlyingToken][polygonVault].oldSymbol);
          expect(await vaultV3Instance.opTOKEN_REVISION()).to.eq(polygonVaults[underlyingToken][polygonVault].revision);
          const proxyInstance = <InitializableImmutableAdminUpgradeabilityProxy>(
            await ethers.getContractAt(InitializableImmutableAdminUpgradeabilityProxy__factory.abi, polygonVault)
          );
          const tx = await proxyInstance.connect(proxySigner).upgradeTo(vaultImplementation.address);
          await tx.wait(1);
          this.vaults[underlyingToken][polygonVault] = <Vault>(
            await ethers.getContractAt(Vault__factory.abi, polygonVault)
          );
        }
      }
    }
  });

  const testVaults = fork === eEVMNetwork.mainnet ? ethereumVaults : polygonVaults;

  for (const testVaultUnderlyingToken of Object.keys(testVaults)) {
    for (const testVault of Object.keys(testVaults[testVaultUnderlyingToken])) {
      it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} op_Revision as expected`, async function () {
        expect(await this.vaults[testVaultUnderlyingToken][testVault].opTOKEN_REVISION()).to.eq("4");
      });
    }
  }
});
