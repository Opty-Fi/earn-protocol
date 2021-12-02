import { expect, assert } from "chai";
import hre from "hardhat";
import { BigNumber, Signer } from "ethers";
import { CONTRACTS } from "../../helpers/type";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants/utils";
import { TESTING_CONTRACTS } from "../../helpers/constants/test-contracts-name";
import { deployVault, deployEssentialContracts } from "../../helpers/contracts-deployments";
import { unpauseVault, approveAndSetTokenHashToToken } from "../../helpers/contracts-actions";
import scenario from "./scenarios/check-transferred-amount-vault-opt-003.json";
import { deployContract } from "../../helpers/helpers";

type ARGUMENTS = {
  contractName?: string;
  amount?: string;
  defaultStrategyState?: number;
};

describe(scenario.title, () => {
  let essentialContracts: CONTRACTS;
  const contracts: CONTRACTS = {};
  let admin: Signer;
  let operator: Signer;
  before(async () => {
    try {
      [operator, admin] = await hre.ethers.getSigners();
      essentialContracts = await deployEssentialContracts(hre, operator, TESTING_DEPLOYMENT_ONCE);
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
      const dummyToken = await deployContract(hre, TESTING_CONTRACTS.TEST_DUMMY_TOKEN_TRANSFER_FEE, false, operator, [
        "30000000000000000",
      ]);
      await approveAndSetTokenHashToToken(operator, essentialContracts["registry"], dummyToken.address);
      const Vault = await deployVault(
        hre,
        essentialContracts.registry.address,
        dummyToken.address,
        operator,
        admin,
        "TestDummyTokenTransferFee",
        "TDTTF",
        1,
        TESTING_DEPLOYMENT_ONCE,
      );

      await essentialContracts.registry.setQueueCap(Vault.address, BigNumber.from("30000000000000000").mul(3));

      await unpauseVault(operator, essentialContracts.registry, Vault.address, true);

      contracts["strategyProvider"] = essentialContracts.strategyProvider;
      contracts["erc20"] = dummyToken;
      contracts["vault"] = Vault;
    } catch (error: any) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenario.stories.length; i++) {
    const story = scenario.stories[i];
    let currentBalance = 0;
    it(`${story.description}`, async () => {
      for (let i = 0; i < story.setActions.length; i++) {
        const action = story.setActions[i];
        switch (action.action) {
          case "approve(address,uint256)": {
            const { amount, contractName }: ARGUMENTS = action.args;
            try {
              if (contractName && amount) {
                await contracts[action.contract]
                  .connect(operator)
                  [action.action](contracts[contractName].address, amount);
              }
            } catch (error: any) {
              if (action.expect === "success") {
                assert.isUndefined(error);
              } else {
                expect(error.message).to.equal(
                  `VM Exception while processing transaction: reverted with reason string '${action.message}'`,
                );
              }
            }
            assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
            assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "userDeposit(uint256)":
          case "userDepositRebalance(uint256)": {
            const { amount }: ARGUMENTS = action.args;
            currentBalance = await contracts["vault"].balance();
            try {
              if (amount) {
                if (action.action === "userDeposit(uint256)") {
                  const queue = await contracts[action.contract].getDepositQueue();
                  const balanceBefore = await contracts["erc20"].balanceOf(contracts[action.contract].address);
                  const _tx = await contracts[action.contract].connect(operator)[action.action](amount);
                  const balanceAfter = await contracts["erc20"].balanceOf(contracts[action.contract].address);

                  const tx = await _tx.wait(1);
                  expect(tx.events[0].event).to.equal("Transfer");
                  expect(tx.events[0].args[0]).to.equal(await operator.getAddress());
                  expect(tx.events[0].args[1]).to.equal(contracts[action.contract].address);
                  expect(tx.events[0].args[2]).to.equal(balanceAfter.sub(balanceBefore));
                  expect(tx.events[1].event).to.equal("DepositQueue");
                  expect(tx.events[1].args[0]).to.equal(await operator.getAddress());
                  expect(tx.events[1].args[1]).to.equal(queue.length + 1);
                  expect(tx.events[1].args[2]).to.equal(balanceAfter.sub(balanceBefore));
                } else {
                  await contracts[action.contract].connect(operator)[action.action](amount);
                }
              }
            } catch (error: any) {
              if (action.expect === "success") {
                assert.isUndefined(error);
              } else {
                expect(error.message).to.equal(
                  `VM Exception while processing transaction: reverted with reason string '${action.message}'`,
                );
              }
            }
            assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setDefaultStrategyState(uint8)": {
            const { defaultStrategyState }: ARGUMENTS = action.args;
            if (action.expect === "success") {
              await contracts[action.contract].connect(operator)[action.action](defaultStrategyState);
            } else {
              await expect(
                contracts[action.contract].connect(operator)[action.action](defaultStrategyState),
              ).to.be.revertedWith(action.message);
            }
            break;
          }
        }
      }
      for (let i = 0; i < story.getActions.length; i++) {
        const action = story.getActions[i];
        switch (action.action) {
          case "balanceOf(address)": {
            expect(await contracts[action.contract][action.action](await operator.getAddress())).to.be.equal(
              action.expectedValue,
            );
            break;
          }
          case "balance()": {
            expect(await contracts[action.contract][action.action]()).to.be.equal(
              BigNumber.from(action.expectedValue).add(BigNumber.from(currentBalance)).toString(),
            );
            break;
          }
        }
      }
    });
  }
});
