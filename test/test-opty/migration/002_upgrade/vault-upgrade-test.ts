import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import { BigNumber } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { ethers, getChainId, network } from "hardhat";
import { eEVMNetwork } from "../../../../helper-hardhat-config";
import { VaultV3 } from "../../../../helpers/types/vaultv3";
import { Signers } from "../../../../helpers/utils";
import {
  InitializableImmutableAdminUpgradeabilityProxy,
  InitializableImmutableAdminUpgradeabilityProxy__factory,
} from "../../../../typechain";
import { ethereumTestVaults, polygonTestVaults } from "./test-vaults";
import { RegistryProxy as MainnetRegistryProxyAddress } from "../../_deployments/mainnet.json";
import { RegistryProxy as PolygonRegistryProxyAddress } from "../../_deployments/polygon.json";
import { VaultV5__factory } from "../../../../helpers/types/vaultv5";
import { StrategyManagerV1__factory } from "../../../../helpers/types/strategyManagerv1";
import { VaultV5 } from "../../../../helpers/types/vaultv5/VaultV5";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;
const testVaults = fork === eEVMNetwork.mainnet ? ethereumTestVaults : polygonTestVaults;

const EIP712_DOMAIN = ethers.utils.id(
  "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)",
);
const EIP712_REVISION = ethers.utils.id("1");

// reference : https://github.com/ethers-io/ethers.js/issues/195#issuecomment-1212815642
function linkLibrary(bytecode: string, name: string, address: string): string {
  let linkedBytecode = bytecode;
  // eslint-disable-next-line no-useless-escape
  const placeholder = `__\$${ethers.utils.solidityKeccak256(["string"], [name]).slice(2, 36)}\$__`;
  const formattedAddress = ethers.utils.getAddress(address).toLowerCase().replace("0x", "");
  if (linkedBytecode.indexOf(placeholder) === -1) {
    throw new Error(`Unable to find placeholder for library ${name}`);
  }
  while (linkedBytecode.indexOf(placeholder) !== -1) {
    linkedBytecode = linkedBytecode.replace(placeholder, formattedAddress);
  }
  return linkedBytecode;
}

describe(`${fork}-Vault-rev4 upgrade test`, () => {
  before(async function () {
    this.vaultsV3 = {};
    this.vaultsV5 = {};
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.admin = signers[1];
    const strategyManagerFactory = await ethers.getContractFactory(
      StrategyManagerV1__factory.abi,
      StrategyManagerV1__factory.bytecode,
    );
    const strategyManager = await strategyManagerFactory.deploy();

    const vaultFactory = await ethers.getContractFactory(
      VaultV5__factory.abi,
      linkLibrary(
        VaultV5__factory.bytecode,
        "contracts/protocol/lib/StrategyManager.sol:StrategyManager",
        strategyManager.address,
      ),
    );
    let vaultImplementation;
    if (fork == eEVMNetwork.mainnet) {
      await network.provider.request({
        method: "hardhat_reset",
        params: [
          {
            forking: {
              jsonRpcUrl: process.env.MAINNET_NODE_URL,
              blockNumber: 15669668,
            },
          },
        ],
      });
      vaultImplementation = await vaultFactory.deploy(MainnetRegistryProxyAddress);
    }
    if (fork == eEVMNetwork.polygon) {
      await network.provider.request({
        method: "hardhat_reset",
        params: [
          {
            forking: {
              jsonRpcUrl: process.env.POLYGON_NODE_URL,
              blockNumber: 33890234,
            },
          },
        ],
      });
      vaultImplementation = await vaultFactory.deploy(PolygonRegistryProxyAddress);
    }
    for (const underlyingToken of Object.keys(testVaults)) {
      this.vaultsV3[underlyingToken] = {};
      this.vaultsV5[underlyingToken] = {};
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
        this.vaultsV5[underlyingToken][testVault] = <VaultV5>(
          await ethers.getContractAt(VaultV5__factory.abi, testVault)
        );
        const tx = await proxyInstance
          .connect(proxySigner)
          .upgradeToAndCall(
            vaultImplementation?.address as string,
            this.vaultsV5[underlyingToken][testVault].interface.encodeFunctionData("initialize", [
              this.vaultsV3[underlyingToken][testVault].registryContract,
              this.vaultsV3[underlyingToken][testVault].underlyingTokensHash,
              this.vaultsV3[underlyingToken][testVault].whitelistedAccountsRoot,
              testVaults[underlyingToken][testVault].underlyingTokenSymbol,
              testVaults[underlyingToken][testVault].riskProfileCode,
              this.vaultsV3[underlyingToken][testVault].vaultConfiguration,
              this.vaultsV3[underlyingToken][testVault].userDepositCap,
              this.vaultsV3[underlyingToken][testVault].minimumDepositValueUT,
              this.vaultsV3[underlyingToken][testVault].totalValueLockedLimitUT,
            ]),
          );
        await tx.wait(1);
      }
    }
  });

  for (const testVaultUnderlyingToken of Object.keys(testVaults)) {
    for (const testVault of Object.keys(testVaults[testVaultUnderlyingToken])) {
      describe(`${fork}-${testVaults[testVaultUnderlyingToken][testVault].newSymbol} storage test`, () => {
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} registryContract as expected`, async function () {
          console.log("registryContract ", await this.vaultsV5[testVaultUnderlyingToken][testVault].registryContract());
          expect(await this.vaultsV5[testVaultUnderlyingToken][testVault].registryContract()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].registryContract,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} name as expected`, async function () {
          console.log("name ", await this.vaultsV5[testVaultUnderlyingToken][testVault].name());
          expect(await this.vaultsV5[testVaultUnderlyingToken][testVault].name()).to.eq(
            testVaults[testVaultUnderlyingToken][testVault].newName,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} symbol as expected`, async function () {
          console.log("symbol ", await this.vaultsV5[testVaultUnderlyingToken][testVault].symbol());
          expect(await this.vaultsV5[testVaultUnderlyingToken][testVault].symbol()).to.eq(
            testVaults[testVaultUnderlyingToken][testVault].newSymbol,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} op_Revision as expected`, async function () {
          console.log(
            "op_Revision ",
            await (await this.vaultsV5[testVaultUnderlyingToken][testVault].opTOKEN_REVISION()).toString(),
          );
          expect(await this.vaultsV5[testVaultUnderlyingToken][testVault].opTOKEN_REVISION()).to.eq("5");
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} pendingDeposits as expected`, async function () {
          if (testVaults[testVaultUnderlyingToken][testVault].testAccount !== undefined) {
            expect(
              await this.vaultsV5[testVaultUnderlyingToken][testVault].pendingDeposits(
                testVaults[testVaultUnderlyingToken][testVault].testAccount as string,
              ),
            ).to.eq(this.vaultsV3[testVaultUnderlyingToken][testVault].pendingDeposits);
          }
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} totalDeposits as expected`, async function () {
          if (testVaults[testVaultUnderlyingToken][testVault].testAccount !== undefined) {
            expect(
              await this.vaultsV5[testVaultUnderlyingToken][testVault].totalDeposits(
                testVaults[testVaultUnderlyingToken][testVault].testAccount as string,
              ),
            ).to.eq(this.vaultsV3[testVaultUnderlyingToken][testVault].totalDeposits);
          }
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} blockToBlockVaultValues as expected`, async function () {
          if (testVaults[testVaultUnderlyingToken][testVault].testBlockNumber !== undefined) {
            const actualBlockToBlockVaultValues = await this.vaultsV5[testVaultUnderlyingToken][
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
          expect(await this.vaultsV5[testVaultUnderlyingToken][testVault].investStrategyHash()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].investStrategyHash,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} userDepositCapUT as expected`, async function () {
          console.log(
            "userDepositCapUT ",
            await (await this.vaultsV5[testVaultUnderlyingToken][testVault].userDepositCapUT()).toString(),
          );
          expect(await this.vaultsV5[testVaultUnderlyingToken][testVault].userDepositCapUT()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].userDepositCap,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} minimumDepositVaultUT as expected`, async function () {
          console.log(
            "minimumDepositVaultUT ",
            await (await this.vaultsV5[testVaultUnderlyingToken][testVault].minimumDepositValueUT()).toString(),
          );
          expect(await this.vaultsV5[testVaultUnderlyingToken][testVault].minimumDepositValueUT()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].minimumDepositValueUT,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} vaultConfiguration as expected`, async function () {
          console.log(
            "vaultConfiguration ",
            await (await this.vaultsV5[testVaultUnderlyingToken][testVault].vaultConfiguration()).toString(),
          );
          expect(await this.vaultsV5[testVaultUnderlyingToken][testVault].vaultConfiguration()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].vaultConfiguration,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} underlyingToken as expected`, async function () {
          console.log("underlyingToken ", await this.vaultsV5[testVaultUnderlyingToken][testVault].underlyingToken());
          expect(await this.vaultsV5[testVaultUnderlyingToken][testVault].underlyingToken()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].underlyingToken,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} whitelistedAccountsRoot as expected`, async function () {
          console.log(
            "whitelistedAccountsRoot ",
            await this.vaultsV5[testVaultUnderlyingToken][testVault].whitelistedAccountsRoot(),
          );
          expect(await this.vaultsV5[testVaultUnderlyingToken][testVault].whitelistedAccountsRoot()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].whitelistedAccountsRoot,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} totalValueLockedLimitUT as expected`, async function () {
          console.log(
            "totalValueLockedLimitUT ",
            await (await this.vaultsV5[testVaultUnderlyingToken][testVault].totalValueLockedLimitUT()).toString(),
          );
          expect(await this.vaultsV5[testVaultUnderlyingToken][testVault].totalValueLockedLimitUT()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].totalValueLockedLimitUT,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} _domainSeparator as expected`, async function () {
          const expectedDomainSeparator = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              ["bytes32", "bytes32", "bytes32", "uint256", "address"],
              [
                EIP712_DOMAIN,
                ethers.utils.id(testVaults[testVaultUnderlyingToken][testVault].newName),
                EIP712_REVISION,
                await getChainId(),
                this.vaultsV5[testVaultUnderlyingToken][testVault].address,
              ],
            ),
          );
          expect(await this.vaultsV5[testVaultUnderlyingToken][testVault]._domainSeparator()).to.eq(
            expectedDomainSeparator,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} underlyingTokensHash as expected`, async function () {
          expect(await this.vaultsV5[testVaultUnderlyingToken][testVault].underlyingTokensHash()).to.eq(
            this.vaultsV3[testVaultUnderlyingToken][testVault].underlyingTokensHash,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} investStrategySteps as expected`, async function () {
          if (testVaults[testVaultUnderlyingToken][testVault].hasStrategy) {
            const strategyStep = await this.vaultsV5[testVaultUnderlyingToken][testVault].investStrategySteps(0);
            expect({
              pool: strategyStep.pool,
              outputToken: strategyStep.outputToken,
              isBorrow: strategyStep.isBorrow,
            }).to.deep.eq(this.vaultsV3[testVaultUnderlyingToken][testVault].investStrategySteps[0]);
          }
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} nonces as expected`, async function () {
          expect(
            await this.vaultsV5[testVaultUnderlyingToken][testVault].nonces(
              "0x6bd60f089B6E8BA75c409a54CDea34AA511277f6",
            ),
          ).to.eq(0);
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} blockTransaction as expected`, async function () {
          if (fork == eEVMNetwork.polygon) {
            expect(await this.vaultsV5[testVaultUnderlyingToken][testVault].blockTransaction(33802456)).to.be.false;
          }
          if (fork == eEVMNetwork.mainnet) {
            expect(await this.vaultsV5[testVaultUnderlyingToken][testVault].blockTransaction(15654508)).to.be.false;
          }
        });
      });
    }
  }
});
