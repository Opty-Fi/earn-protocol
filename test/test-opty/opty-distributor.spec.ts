import { expect, assert } from "chai";
import hre from "hardhat";
import { solidity } from "ethereum-waffle";
import { Signer, BigNumber } from "ethers";
import { smock } from "@defi-wonderland/smock";
import { setUp } from "./setup";
import { CONTRACTS, MOCK_CONTRACTS } from "../../helpers/type";
import { TESTING_CONTRACTS } from "../../helpers/constants/test-contracts-name";
import {
  deploySmockContract,
  deployContract,
  executeFunc,
  moveToNextBlock,
  moveToSpecificBlock,
} from "../../helpers/helpers";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants/utils";
import { VAULT_TOKENS } from "../../helpers/constants/tokens";
import { TypedAdapterStrategies } from "../../helpers/data";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { deployVault } from "../../helpers/contracts-deployments";
import {
  setBestStrategy,
  approveLiquidityPoolAndMapAdapter,
  fundWalletToken,
  getBlockTimestamp,
  getTokenName,
  getTokenSymbol,
  unpauseVault,
} from "../../helpers/contracts-actions";
import scenario from "./scenarios/opty-distributor.json";
import testOptyDistributorScenario from "./scenarios/test-opty-distributor.json";

chai.use(solidity);

type ARGUMENTS = {
  contractName?: string;
  addressName?: string;
  amount?: string;
  index?: number;
  rate?: string;
  isEnabled?: boolean;
};

type TEST_OPTY_DISTRIBUTOR_ARGUMENTS = {
  executer?: string;
  value?: number | boolean;
};

describe(scenario.title, () => {
  const token = "DAI";
  const tokenAddr = VAULT_TOKENS["DAI"].address;
  const MAX_AMOUNT = "100000000000000000000000";
  let essentialContracts: CONTRACTS;
  let adapters: CONTRACTS;
  const contracts: CONTRACTS = {};
  let users: { [key: string]: Signer };
  const TOKEN_STRATEGY = TypedAdapterStrategies["CompoundAdapter"][0];
  let currentOpty = 0;
  const riskProfileCode = 1;
  before(async () => {
    try {
      const [owner, admin, user1] = await hre.ethers.getSigners();
      users = { owner, admin, user1 };
      [essentialContracts, adapters] = await setUp(
        users["owner"],
        Object.values(VAULT_TOKENS).map(token => token.address),
      );
      await approveLiquidityPoolAndMapAdapter(
        users["owner"],
        essentialContracts.registry,
        adapters["CompoundAdapter"].address,
        TOKEN_STRATEGY.strategy[0].contract,
      );
      await setBestStrategy(
        TOKEN_STRATEGY.strategy,
        users["owner"],
        tokenAddr,
        essentialContracts.investStrategyRegistry,
        essentialContracts.strategyProvider,
        riskProfileCode,
        false,
      );
      const timestamp = (await getBlockTimestamp(hre)) * 2;
      await fundWalletToken(hre, tokenAddr, users["owner"], BigNumber.from(MAX_AMOUNT), timestamp);
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
      assert.isDefined(adapters, "Adapters not deployed");
    } catch (error: any) {
      console.log(error);
    }
  });
  beforeEach(async () => {
    const underlyingTokenName = await getTokenName(hre, token);
    const underlyingTokenSymbol = await getTokenSymbol(hre, token);
    const opty = await deployContract(hre, ESSENTIAL_CONTRACTS.OPTY, false, users["owner"], [
      essentialContracts["registry"].address,
      0,
    ]);

    const optyDistributor = await deployContract(hre, ESSENTIAL_CONTRACTS.OPTY_DISTRIBUTOR, false, users["owner"], [
      essentialContracts["registry"].address,
      opty.address,
      await getBlockTimestamp(hre),
    ]);

    const Vault = await deployVault(
      hre,
      essentialContracts.registry.address,
      tokenAddr,
      users["owner"],
      users["admin"],
      underlyingTokenName,
      underlyingTokenSymbol,
      riskProfileCode,
      TESTING_DEPLOYMENT_ONCE,
    );
    await unpauseVault(users["owner"], essentialContracts.registry, Vault.address, true);

    const Vault2 = await deployVault(
      hre,
      essentialContracts.registry.address,
      tokenAddr,
      users["owner"],
      users["admin"],
      underlyingTokenName,
      underlyingTokenSymbol,
      riskProfileCode,
      TESTING_DEPLOYMENT_ONCE,
    );
    await unpauseVault(users["owner"], essentialContracts.registry, Vault2.address, true);

    const ERC20Instance = await hre.ethers.getContractAt("ERC20", tokenAddr);

    contracts["registry"] = essentialContracts.registry;

    contracts["optyDistributor"] = optyDistributor;

    contracts["vault"] = Vault;

    contracts["vault2"] = Vault2;

    contracts["erc20"] = ERC20Instance;

    contracts["opty"] = opty;
  });
  for (let i = 0; i < scenario.stories.length; i++) {
    const story = scenario.stories[i];
    it(story.description, async () => {
      for (let i = 0; i < story.setActions.length; i++) {
        const action = story.setActions[i];
        switch (action.action) {
          case "addOptyVault(address)":
          case "setOPTYDistributor(address)": {
            const { contractName }: ARGUMENTS = action.args;
            if (contractName) {
              if (action.expect === "success") {
                await executeFunc(contracts[action.contract], users[action.executer], action.action, [
                  contracts[contractName].address,
                ]);
              } else {
                await expect(
                  executeFunc(contracts[action.contract], users[action.executer], action.action, [
                    contracts[contractName].address,
                  ]),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setOptyVault(address,bool)": {
            const { contractName, isEnabled }: ARGUMENTS = action.args;
            if (contractName) {
              if (action.expect === "success") {
                await executeFunc(contracts[action.contract], users[action.executer], action.action, [
                  contracts[contractName].address,
                  isEnabled,
                ]);
              } else {
                await expect(
                  executeFunc(contracts[action.contract], users[action.executer], action.action, [
                    contracts[contractName].address,
                    isEnabled,
                  ]),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
            assert.isDefined(isEnabled, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setOptyVaultRate(address,uint256)": {
            const { contractName, rate }: ARGUMENTS = action.args;
            if (contractName && rate) {
              if (action.expect === "success") {
                await executeFunc(contracts[action.contract], users[action.executer], action.action, [
                  contracts[contractName].address,
                  rate,
                ]);
              } else {
                await expect(
                  executeFunc(contracts[action.contract], users[action.executer], action.action, [
                    contracts[contractName].address,
                    rate,
                  ]),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
            assert.isDefined(rate, `args is wrong in ${action.action} testcase`);

            break;
          }
          case "approve(address,uint256)": {
            const { amount, contractName }: ARGUMENTS = action.args;
            if (amount && contractName) {
              if (action.expect === "success") {
                await executeFunc(contracts[action.contract], users[action.executer], action.action, [
                  contracts[contractName].address,
                  amount,
                ]);
              } else {
                await expect(
                  executeFunc(contracts[action.contract], users[action.executer], action.action, [
                    contracts[contractName].address,
                    amount,
                  ]),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
            assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "transfer(address,uint256)": {
            const { addressName, amount }: ARGUMENTS = action.args;
            if (addressName && amount) {
              const fromAddr = await users[action.executer].getAddress();
              const toAddr = await users[addressName].getAddress();
              if (action.expect === "success") {
                await executeFunc(contracts[action.contract], users[action.executer], action.action, [toAddr, amount]);
              } else {
                await expect(
                  executeFunc(contracts[action.contract], users[action.executer], action.action, [toAddr, amount]),
                ).to.be.revertedWith(action.message);
              }
              if (action.contract === "vault") {
                await moveToNextBlock(hre);
                currentOpty = await contracts["optyDistributor"]["claimableOpty(address)"](fromAddr);
              }
            }
            assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "rebalance()": {
            if (action.expect === "success") {
              await executeFunc(contracts[action.contract], users[action.executer], action.action, []);
            } else {
              await expect(
                executeFunc(contracts[action.contract], users[action.executer], action.action, []),
              ).to.be.revertedWith(action.message);
            }
            break;
          }
          case "userDepositRebalance(uint256)":
          case "userDeposit(uint256)": {
            const { amount }: ARGUMENTS = action.args;
            if (amount) {
              if (action.expect === "success") {
                if (action.action === "userDeposit(uint256)") {
                  const queue = await contracts[action.contract].getDepositQueue();
                  const balanceBefore = await contracts["erc20"].balanceOf(contracts[action.contract].address);
                  const _tx = await contracts[action.contract].connect(users[action.executer])[action.action](amount);
                  const balanceAfter = await contracts["erc20"].balanceOf(contracts[action.contract].address);

                  const tx = await _tx.wait(1);
                  expect(tx.events[0].event).to.equal("Transfer");
                  expect(tx.events[0].args[0]).to.equal(await users[action.executer].getAddress());
                  expect(tx.events[0].args[1]).to.equal(contracts[action.contract].address);
                  expect(tx.events[0].args[2]).to.equal(balanceAfter.sub(balanceBefore));
                  expect(tx.events[1].event).to.equal("DepositQueue");
                  expect(tx.events[1].args[0]).to.equal(await users[action.executer].getAddress());
                  expect(tx.events[1].args[1]).to.equal(queue.length + 1);
                  expect(tx.events[1].args[2]).to.equal(balanceAfter.sub(balanceBefore));
                } else {
                  await executeFunc(contracts[action.contract], users[action.executer], action.action, [amount]);
                }
              } else {
                await expect(
                  executeFunc(contracts[action.contract], users[action.executer], action.action, [amount]),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "mint(address,uint256)":
          case "mintOpty(address,uint256)": {
            const { addressName, amount }: ARGUMENTS = action.args;
            if (addressName && amount) {
              const userAddr = await users[addressName].getAddress();
              if (action.expect === "success") {
                await executeFunc(contracts[action.contract], users[action.executer], action.action, [
                  userAddr,
                  amount,
                ]);
              } else {
                await expect(
                  executeFunc(contracts[action.contract], users[action.executer], action.action, [userAddr, amount]),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
            assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "claimOpty(address)": {
            const { addressName }: ARGUMENTS = action.args;
            if (addressName) {
              await moveToNextBlock(hre);
              const userAddr = await users[addressName].getAddress();
              if (action.expect === "success") {
                await executeFunc(contracts[action.contract], users[action.executer], action.action, [userAddr]);
              } else {
                await expect(
                  executeFunc(contracts[action.contract], users[action.executer], action.action, [userAddr]),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
            break;
          }
        }
      }
      for (let i = 0; i < story.getActions.length; i++) {
        const action = story.getActions[i];
        switch (action.action) {
          case "allOptyVaults(uint256)": {
            const { index }: ARGUMENTS = action.args;
            if (index) {
              expect(await contracts[action.contract][action.action](index)).to.be.equal(
                contracts[action.expectedValue.toString()].address,
              );
            }
            assert.isDefined(index, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "optyVaultEnabled(address)": {
            const { contractName }: ARGUMENTS = action.args;
            if (contractName) {
              expect(await contracts[action.contract][action.action](contracts[contractName].address)).to.be.equal(
                action.expectedValue,
              );
            }
            assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "optyVaultRatePerSecond(address)": {
            const { contractName }: ARGUMENTS = action.args;
            if (contractName) {
              expect(await contracts[action.contract][action.action](contracts[contractName].address)).to.be.equal(
                action.expectedValue,
              );
            }
            assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "claimableOpty(address)": {
            const { addressName }: ARGUMENTS = action.args;
            if (addressName) {
              await moveToNextBlock(hre);
              const addr = await users[addressName].getAddress();
              const value = await contracts[action.contract][action.action](addr);
              if (action.expectedValue === "") {
                expect(value.toString()).to.be.equal(currentOpty.toString());
              } else {
                expect(+value).to.be.gte(+action.expectedValue);
              }
            }
            assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "balanceOf(address)": {
            const { addressName }: ARGUMENTS = action.args;
            if (addressName) {
              const addr = await users[addressName].getAddress();
              expect(+(await contracts[action.contract][action.action](addr))).to.be.gte(+action.expectedValue);
            }
            assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
            break;
          }
        }
      }
    }).timeout(10000000);
  }
});

describe(testOptyDistributorScenario.title, () => {
  let mockContracts: MOCK_CONTRACTS = {};
  let users: { [key: string]: Signer };
  let timestamp: number;
  let previousTimestamp: number;
  before(async () => {
    timestamp = await getBlockTimestamp(hre);
    const [owner, user1] = await hre.ethers.getSigners();
    users = { owner, user1 };
    const registry = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.REGISTRY, []);
    registry.getOperator.returns(await users["owner"].getAddress());
    const optyToken = await deploySmockContract(smock, TESTING_CONTRACTS.TEST_DUMMY_TOKEN, ["optyToken", "OT", 18, 0]);
    const vaultToken = await deploySmockContract(smock, TESTING_CONTRACTS.TEST_DUMMY_TOKEN, [
      "vaultToken",
      "VT",
      18,
      0,
    ]);
    const optyStakingVault = await deploySmockContract(smock, TESTING_CONTRACTS.TEST_OPTY_STAKING_VAULT, [
      registry.address,
      optyToken.address,
      86400,
      "1",
    ]);
    const optyDistributor = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.OPTY_DISTRIBUTOR, [
      registry.address,
      optyToken.address,
      timestamp + 864000,
    ]);

    mockContracts = { registry, optyToken, vaultToken, optyStakingVault, optyDistributor };
    mockContracts.registry.getOPTYDistributor.returns(mockContracts.optyDistributor.address);
    mockContracts.registry.getVaultConfiguration.whenCalledWith(optyStakingVault.address).returns({
      discontinued: false,
      unpaused: true,
      withdrawalFee: 0,
      treasuryShares: [],
    });
    await mockContracts.optyToken
      .connect(users["owner"])
      .approve(mockContracts.optyStakingVault.address, hre.ethers.constants.MaxUint256);
  });

  describe(testOptyDistributorScenario.description, () => {
    for (let i = 0; i < testOptyDistributorScenario.stories.length; i++) {
      const story = testOptyDistributorScenario.stories[i];
      it(`${story.description}`, async () => {
        for (let i = 0; i < story.setActions.length; i++) {
          const action = story.setActions[i];
          switch (action.action) {
            case "setOperatorUnlockClaimOPTYTimestamp(uint256)": {
              const { executer, value } = action.args as TEST_OPTY_DISTRIBUTOR_ARGUMENTS;
              if (action.expect === "fail") {
                await expect(
                  mockContracts.optyDistributor.connect(users[executer!])[action.action](BigNumber.from(value)),
                ).to.be.revertedWith(action.message);
              } else {
                await mockContracts.optyDistributor
                  .connect(users[executer!])
                  [action.action](BigNumber.from(timestamp).add(BigNumber.from(value)));
              }
              break;
            }
            case "setStakingVault(address,bool)": {
              const { executer, value } = action.args as TEST_OPTY_DISTRIBUTOR_ARGUMENTS;
              if (action.expect === "fail") {
                if (executer === "user1") {
                  await expect(
                    mockContracts.optyDistributor
                      .connect(users[executer!])
                      [action.action](mockContracts.optyStakingVault.address, value),
                  ).to.be.revertedWith(action.message);
                } else {
                  await expect(
                    mockContracts.optyDistributor
                      .connect(users[executer!])
                      [action.action](await users["owner"].getAddress(), value),
                  ).to.be.revertedWith(action.message);
                }
              } else {
                await mockContracts.optyDistributor
                  .connect(users[executer!])
                  [action.action](mockContracts.optyStakingVault.address, value);
              }
              break;
            }
            case "addOptyVault(address)": {
              const { executer } = action.args as TEST_OPTY_DISTRIBUTOR_ARGUMENTS;
              if (action.expect === "fail") {
                await expect(
                  mockContracts.optyDistributor
                    .connect(users[executer!])
                    [action.action](mockContracts.vaultToken.address),
                ).to.be.revertedWith(action.message);
              } else {
                await mockContracts.optyDistributor
                  .connect(users[executer!])
                  [action.action](mockContracts.vaultToken.address);
              }
              break;
            }
            case "setOptyVaultRate(address,uint256)":
            case "setOptyVault(address,bool)": {
              const { executer, value } = action.args as TEST_OPTY_DISTRIBUTOR_ARGUMENTS;
              if (action.expect === "fail") {
                if (executer === "user1") {
                  await expect(
                    mockContracts.optyDistributor
                      .connect(users[executer!])
                      [action.action](mockContracts.optyStakingVault.address, value),
                  ).to.be.revertedWith(action.message);
                } else {
                  await expect(
                    mockContracts.optyDistributor
                      .connect(users[executer!])
                      [action.action](await users["owner"].getAddress(), value),
                  ).to.be.revertedWith(action.message);
                }
              } else {
                await mockContracts.optyDistributor
                  .connect(users[executer!])
                  [action.action](mockContracts.vaultToken.address, value);
              }
              break;
            }
            case "updateUserStateInVault(address,address)":
            case "updateUserRewards(address,address)": {
              const { executer } = action.args as TEST_OPTY_DISTRIBUTOR_ARGUMENTS;
              await mockContracts.optyDistributor
                .connect(users[executer!])
                [action.action](mockContracts.vaultToken.address, await users[executer!].getAddress());
              previousTimestamp = await mockContracts.optyDistributor.lastUserUpdate(
                mockContracts.vaultToken.address,
                await users[executer!].getAddress(),
              );
              break;
            }
            case "updateOptyVaultIndex(address)": {
              mockContracts.optyDistributor.setVariable("optyVaultStartTimestamp", {
                [mockContracts.vaultToken.address]: await mockContracts.optyDistributor.lastUserUpdate(
                  mockContracts.vaultToken.address,
                  await users["owner"].getAddress(),
                ),
              });
              mockContracts.optyDistributor.setVariable("optyVaultState", {
                [mockContracts.vaultToken.address]: {
                  timestamp: await mockContracts.optyDistributor.optyVaultStartTimestamp(
                    mockContracts.vaultToken.address,
                  ),
                  index: await mockContracts.optyDistributor.optyVaultRatePerSecondAndVaultToken(
                    mockContracts.vaultToken.address,
                  ),
                },
              });
              break;
            }
            case "updateOptyVaultRatePerSecondAndVaultToken(address)": {
              await mockContracts.optyDistributor[action.action](mockContracts.vaultToken.address);
              break;
            }
            case "fundVaultTokens": {
              const { executer } = action.args as TEST_OPTY_DISTRIBUTOR_ARGUMENTS;
              await mockContracts.vaultToken.mint(await users[executer!].getAddress(), BigNumber.from(10).pow(18));
              break;
            }
            case "claimAndStake(address)": {
              const { executer } = action.args as TEST_OPTY_DISTRIBUTOR_ARGUMENTS;
              await mockContracts.optyDistributor
                .connect(users[executer!])
                [action.action](mockContracts.optyStakingVault.address);
              break;
            }
            case "wait10000Seconds": {
              const blockNumber = await hre.ethers.provider.getBlockNumber();
              const block = await hre.ethers.provider.getBlock(blockNumber);
              await moveToSpecificBlock(hre, block.timestamp + 10000);
              break;
            }
            case "claimOpty(address)": {
              const { executer } = action.args as TEST_OPTY_DISTRIBUTOR_ARGUMENTS;
              await mockContracts.optyDistributor
                .connect(users[executer!])
                [action.action](await users[executer!].getAddress());
              break;
            }
            case "claimOpty(address,address[])": {
              const { executer } = action.args as TEST_OPTY_DISTRIBUTOR_ARGUMENTS;
              await mockContracts.optyDistributor
                .connect(users[executer!])
                [action.action](await users[executer!].getAddress(), [mockContracts.vaultToken.address]);
              break;
            }
            case "claimOpty(address[],address[])": {
              const { executer } = action.args as TEST_OPTY_DISTRIBUTOR_ARGUMENTS;
              await mockContracts.optyDistributor
                .connect(users[executer!])
                [action.action]([await users[executer!].getAddress()], [mockContracts.vaultToken.address]);
              break;
            }
          }
        }
        for (let i = 0; i < story.getActions.length; i++) {
          const action = story.getActions[i];
          switch (action.action) {
            case "balanceOf(address)": {
              const { executer } = action.args as TEST_OPTY_DISTRIBUTOR_ARGUMENTS;
              action.expectedValue === ">0"
                ? expect(
                    await mockContracts[action.contract][action.action](await users[executer!].getAddress()),
                  ).to.be.gt(0)
                : expect(
                    await mockContracts[action.contract][action.action](await users[executer!].getAddress()),
                  ).to.be.eq(0);
              break;
            }
            case "operatorUnlockClaimOPTYTimestamp()": {
              expect(await mockContracts.optyDistributor[action.action]()).to.be.eq(
                timestamp + Number(action.expectedValue),
              );
              break;
            }
            case "stakingVaults(address)": {
              expect(
                await mockContracts.optyDistributor[action.action](mockContracts.optyStakingVault.address),
              ).to.be.eq(action.expectedValue);
              break;
            }
            case "claimableOpty(address)": {
              const { executer } = action.args as TEST_OPTY_DISTRIBUTOR_ARGUMENTS;
              if (action.expectedValue === ">0") {
                const currentTimestamp = await getBlockTimestamp(hre);
                const deltaSeconds = currentTimestamp - previousTimestamp;
                const expectedAmount = (
                  await mockContracts.optyDistributor.optyVaultRatePerSecond(mockContracts.vaultToken.address)
                ).mul(BigNumber.from(deltaSeconds));
                expect(
                  await mockContracts.optyDistributor[action.action](await users[executer!].getAddress()),
                ).to.be.within(
                  expectedAmount.sub(BigNumber.from(10).pow(5)),
                  expectedAmount.add(BigNumber.from(10).pow(5)),
                );
              }
              break;
            }
            case "claimableOpty(address, address[])": {
              const { executer } = action.args as TEST_OPTY_DISTRIBUTOR_ARGUMENTS;
              if (action.expectedValue === ">0") {
                const currentTimestamp = await getBlockTimestamp(hre);
                const deltaSeconds = currentTimestamp - previousTimestamp;
                const expectedAmount = (
                  await mockContracts.optyDistributor.optyVaultRatePerSecond(mockContracts.vaultToken.address)
                ).mul(BigNumber.from(deltaSeconds));
                expect(
                  await mockContracts.optyDistributor[action.action](await users[executer!].getAddress(), [
                    mockContracts.vaultToken.address,
                  ]),
                ).to.be.within(
                  expectedAmount.sub(BigNumber.from(10).pow(5)),
                  expectedAmount.add(BigNumber.from(10).pow(5)),
                );
              }
              break;
            }
            case "currentOptyVaultIndex(address)": {
              if (action.expectedValue === ">0") {
                const expectedAmount = (
                  await mockContracts.optyDistributor.optyVaultState(mockContracts.vaultToken.address)
                )[0];
                expect(await mockContracts.optyDistributor[action.action](mockContracts.vaultToken.address)).to.be.eq(
                  expectedAmount,
                );
              }
              break;
            }
            case "stakingVaults(address)": {
              expect(
                await mockContracts.optyDistributor[action.action](mockContracts.optyStakingVault.address),
              ).to.be.eq(action.expectedValue);
              break;
            }
          }
        }
        for (let i = 0; i < story.cleanActions.length; i++) {
          const action = story.cleanActions[i];
          switch (action.action) {
            case "cleanEnvironment": {
              const optyBalance = await mockContracts.optyToken.balanceOf(await users["owner"].getAddress());
              const isStakingVault = await mockContracts.optyDistributor.stakingVaults(
                mockContracts.optyStakingVault.address,
              );
              const isOptyVault = await mockContracts.optyDistributor.optyVaultEnabled(
                mockContracts.vaultToken.address,
              );
              const optyVaultRatePerSecond = await mockContracts.optyDistributor.optyVaultRatePerSecond(
                mockContracts.vaultToken.address,
              );
              const optyVaultRatePerSecondAndVaultToken =
                await mockContracts.optyDistributor.optyVaultRatePerSecondAndVaultToken(
                  mockContracts.vaultToken.address,
                );
              const optyVaultStartTimestamp = await mockContracts.optyDistributor.optyVaultStartTimestamp(
                mockContracts.vaultToken.address,
              );
              const optyVaultState = await mockContracts.optyDistributor.optyVaultState(
                mockContracts.vaultToken.address,
              );
              const optyUserStateInVault = await mockContracts.optyDistributor.optyUserStateInVault(
                mockContracts.vaultToken.address,
                await users["owner"].getAddress(),
              );
              const optyAccrued = await mockContracts.optyDistributor.optyAccrued(await users["owner"].getAddress());
              const lastUserUpdate = await mockContracts.optyDistributor.lastUserUpdate(
                mockContracts.vaultToken.address,
                await users["owner"].getAddress(),
              );
              if (optyBalance.gt(0)) {
                await mockContracts.optyToken
                  .connect(users["owner"])
                  .burn(await users["owner"].getAddress(), optyBalance);
              }
              if (isStakingVault == true) {
                mockContracts.optyDistributor.setVariable("stakingVaults", {
                  [mockContracts.optyStakingVault.address]: false,
                });
              }
              if (isOptyVault == true) {
                mockContracts.optyDistributor.setVariable("optyVaultEnabled", {
                  [mockContracts.vaultToken.address]: false,
                });
              }
              if (optyVaultRatePerSecond.gt(0)) {
                mockContracts.optyDistributor.setVariable("optyVaultRatePerSecond", {
                  [mockContracts.vaultToken.address]: 0,
                });
              }
              if (optyVaultRatePerSecondAndVaultToken.gt(0)) {
                mockContracts.optyDistributor.setVariable("optyVaultRatePerSecondAndVaultToken", {
                  [mockContracts.vaultToken.address]: 0,
                });
              }
              if (lastUserUpdate.gt(0)) {
                mockContracts.optyDistributor.setVariable("lastUserUpdate", {
                  [mockContracts.vaultToken.address]: {
                    [await users["owner"].getAddress()]: 0,
                  },
                });
              }
              if (optyAccrued.gt(0)) {
                mockContracts.optyDistributor.setVariable("optyAccrued", {
                  [await users["owner"].getAddress()]: 0,
                });
              }
              if (optyVaultState[0].gt(0)) {
                mockContracts.optyDistributor.setVariable("optyVaultState", {
                  [mockContracts.vaultToken.address]: {
                    index: 0,
                    timestamp: 0,
                  },
                });
              }
              if (optyVaultStartTimestamp.gt(0)) {
                mockContracts.optyDistributor.setVariable("optyVaultStartTimestamp", {
                  [mockContracts.vaultToken.address]: 0,
                });
              }
              if (optyUserStateInVault[0].gt(0)) {
                mockContracts.optyDistributor.setVariable("optyUserStateInVault", {
                  [mockContracts.vaultToken.address]: {
                    [await users["owner"].getAddress()]: {
                      index: 0,
                      timestamp: 0,
                    },
                  },
                });
              }
            }
          }
        }
      });
    }
  });
});
