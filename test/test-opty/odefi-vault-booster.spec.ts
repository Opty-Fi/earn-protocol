import chai, { expect, assert } from "chai";
import hre from "hardhat";
import { solidity } from "ethereum-waffle";
import { Signer, BigNumber } from "ethers";
import { CONTRACTS } from "../../helpers/type";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants/utils";
import { VAULT_TOKENS } from "../../helpers/constants/tokens";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { TESTING_CONTRACTS } from "../../helpers/constants/test-contracts-name";
import { deployContract, executeFunc, moveToNextBlock } from "../../helpers/helpers";
import { deployVault, deployEssentialContracts } from "../../helpers/contracts-deployments";
import {
  fundWalletToken,
  getBlockTimestamp,
  getTokenName,
  getTokenSymbol,
  unpauseVault,
  approveAndSetTokenHashToToken,
} from "../../helpers/contracts-actions";
import { to_10powNumber_BN } from "../../helpers/utils";
import scenario from "./scenarios/odefi-vault-booster.json";

chai.use(solidity);

type ARGUMENTS = {
  contractName?: string;
  addressName?: string;
  amount?: string;
  index?: number;
  rate?: string;
  isEnabled?: boolean;
};
describe(scenario.title, () => {
  const token = "DAI";
  const tokenAddr = VAULT_TOKENS["DAI"].address;
  const MAX_AMOUNT = "100000000000000000000000";
  let essentialContracts: CONTRACTS;
  const contracts: CONTRACTS = {};
  let users: { [key: string]: Signer };
  let currentOdefi = 0;
  before(async () => {
    try {
      const [owner, admin, user1, rewarder] = await hre.ethers.getSigners();
      users = { owner, admin, user1, rewarder };

      essentialContracts = await deployEssentialContracts(hre, owner, TESTING_DEPLOYMENT_ONCE);

      await approveAndSetTokenHashToToken(owner, essentialContracts["registry"], tokenAddr);

      const timestamp = (await getBlockTimestamp(hre)) * 2;
      await fundWalletToken(hre, tokenAddr, users["owner"], BigNumber.from(MAX_AMOUNT), timestamp);

      const underlyingTokenName = await getTokenName(hre, token);
      const underlyingTokenSymbol = await getTokenSymbol(hre, token);

      const odefi = await deployContract(hre, TESTING_CONTRACTS.TEST_DUMMY_TOKEN, false, users["owner"], [
        "ODEFI",
        "ODEFI",
        18,
        2000000000000000,
      ]);

      const odefiVaultBooster = await deployContract(
        hre,
        ESSENTIAL_CONTRACTS.ODEFI_VAULT_BOOSTER,
        false,
        users["owner"],
        [essentialContracts["registry"].address, odefi.address],
      );

      await executeFunc(odefi, users["owner"], "transfer(address,uint256)", [
        odefiVaultBooster.address,
        2000000000000000,
      ]);
      const riskProfileCode = 1;
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

      const maxAmount = BigNumber.from("300");

      const decimals = await ERC20Instance.decimals();

      await essentialContracts.registry.setQueueCap(Vault.address, maxAmount.mul(to_10powNumber_BN(decimals)));

      contracts["registry"] = essentialContracts.registry;

      contracts["vault"] = Vault;

      contracts["vault2"] = Vault2;

      contracts["erc20"] = ERC20Instance;

      contracts["odefi"] = odefi;

      contracts["odefiVaultBooster"] = odefiVaultBooster;
    } catch (error: any) {
      console.log(error);
    }
  });
  beforeEach(() => {
    currentOdefi = 0;
  });
  for (let i = 0; i < scenario.stories.length; i++) {
    const story = scenario.stories[i];
    it(story.description, async () => {
      for (let i = 0; i < story.setActions.length; i++) {
        const action = story.setActions[i];
        switch (action.action) {
          case "addOdefiVault(address)": {
            const { contractName }: ARGUMENTS = action.args;
            try {
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
            } catch (error: any) {
              expect(error.message).to.include("odefiVault already added");
            }

            assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setODEFIVaultBooster(address)": {
            const { contractName }: ARGUMENTS = action.args;
            try {
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
            } catch (error: any) {
              console.log(error);
            }

            assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setOdefiVault(address,bool)": {
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
          case "setODEFIRewarder(address,address)": {
            const { contractName, addressName }: ARGUMENTS = action.args;
            if (contractName && addressName) {
              if (action.expect === "success") {
                await executeFunc(contracts[action.contract], users[action.executer], action.action, [
                  contracts[contractName].address,
                  users[addressName].getAddress(),
                ]);
              } else {
                await expect(
                  executeFunc(contracts[action.contract], users[action.executer], action.action, [
                    contracts[contractName].address,
                    users[addressName].getAddress(),
                  ]),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
            assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);

            break;
          }
          case "setOdefiVaultRate(address,uint256)": {
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
                currentOdefi = await contracts["odefiVaultBooster"]["claimableODEFI(address)"](fromAddr);
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
          case "claimODEFI(address)": {
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
          case "allOdefiVaults(uint256)": {
            const { index }: ARGUMENTS = action.args;
            if (index) {
              const value = await contracts[action.contract][action.action](index);
              expect(value).to.be.equal(contracts[action.expectedValue.toString()].address);
            }
            assert.isDefined(index, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "odefiVaultEnabled(address)": {
            const { contractName }: ARGUMENTS = action.args;
            if (contractName) {
              const value = await contracts[action.contract][action.action](contracts[contractName].address);
              expect(value).to.be.equal(action.expectedValue);
            }
            assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "odefiVaultRatePerSecond(address)": {
            const { contractName }: ARGUMENTS = action.args;
            if (contractName) {
              expect(await contracts[action.contract][action.action](contracts[contractName].address)).to.be.equal(
                action.expectedValue,
              );
            }
            assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "claimableODEFI(address)": {
            const { addressName }: ARGUMENTS = action.args;
            if (addressName) {
              await moveToNextBlock(hre);
              const addr = await users[addressName].getAddress();
              if (action.expectedValue === "") {
                expect(+(await contracts[action.contract][action.action](addr))).to.be.equal(+currentOdefi);
              } else {
                expect(+(await contracts[action.contract][action.action](addr))).to.be.gte(+action.expectedValue);
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
