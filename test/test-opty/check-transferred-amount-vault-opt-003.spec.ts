import { expect, assert } from "chai";
import hre from "hardhat";
import { BigNumber, Signer } from "ethers";
import { CONTRACTS } from "../../helpers/type";
import { TESTING_DEPLOYMENT_ONCE, TESTING_CONTRACTS } from "../../helpers/constants";
import { deployVault, deployEssentialContracts } from "../../helpers/contracts-deployments";
import { unpauseVault } from "../../helpers/contracts-actions";
import scenario from "./scenarios/check-transferred-amount-vault-opt-003.json";
import { deployContract, executeFunc } from "../../helpers/helpers";

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

      await executeFunc(essentialContracts["registry"], operator, "approveToken(address)", [dummyToken.address]);

      const Vault = await deployVault(
        hre,
        essentialContracts.registry.address,
        dummyToken.address,
        operator,
        admin,
        "TestDummyTokenTransferFee",
        "TDTTF",
        "RP1",
        TESTING_DEPLOYMENT_ONCE,
      );
      await unpauseVault(operator, essentialContracts.registry, Vault.address, true);

      contracts["strategyProvider"] = essentialContracts.strategyProvider;
      contracts["erc20"] = dummyToken;
      contracts["vault"] = Vault;
    } catch (error) {
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
            } catch (error) {
              if (action.expect === "success") {
                assert.isUndefined(error);
              } else {
                expect(error.message).to.equal(`VM Exception while processing transaction: revert ${action.message}`);
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
                await contracts[action.contract].connect(operator)[action.action](amount);
              }
            } catch (error) {
              if (action.expect === "success") {
                assert.isUndefined(error);
              } else {
                expect(error.message).to.equal(`VM Exception while processing transaction: revert ${action.message}`);
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
            const value = await contracts[action.contract][action.action](await operator.getAddress());
            console.log(value.toString());
            expect(value).to.be.equal(action.expectedValue);
            break;
          }
          case "balance()": {
            const value = await contracts[action.contract][action.action]();
            expect(value).to.be.equal(BigNumber.from(action.expectedValue).add(BigNumber.from(currentBalance)));
            break;
          }
        }
      }
    });
  }
});
