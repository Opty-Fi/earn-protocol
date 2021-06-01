import { expect, assert } from "chai";
import hre from "hardhat";
import { Contract, Signer } from "ethers";
import { setUp } from "./setup";
import { CONTRACTS } from "../../helpers/type";
import { TOKENS, TESTING_DEPLOYMENT_ONCE, TESTING_CONTRACTS, ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { TypedAdapterStrategies } from "../../helpers/data";
import { delay } from "../../helpers/utils";
import { deployVault } from "../../helpers/contracts-deployments";
import { getBlockTimestamp, unpauseVault } from "../../helpers/contracts-actions";
import scenario from "./scenarios/check-transferred-amount-vault-opt-003.json";
import { getContractInstance, deployContract, executeFunc } from "../../helpers/helpers";

type ARGUMENTS = {
  contractName?: string;
  amount?: string;
  defaultStrategyState?: number;
};

describe(scenario.title, () => {
  // TODO: ADD TEST SCENARIOES, ADVANCED PROFILE, STRATEGIES.
  let essentialContracts: CONTRACTS;
  let adapters: CONTRACTS;
  const contracts: CONTRACTS = {};
  let admin: Signer;
  let operator: Signer;
  before(async () => {
    try {
      [operator, admin] = await hre.ethers.getSigners();
      [essentialContracts, adapters] = await setUp(operator);
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
      assert.isDefined(adapters, "Adapters not deployed");
    } catch (error) {
      console.log(error);
    }
  });

  let Vault: Contract;
  const adaptersName = Object.keys(TypedAdapterStrategies);
  const adapterName = adaptersName[0];
  const strategies = TypedAdapterStrategies[adapterName];
  for (let i = 0; i < strategies.length; i++) {
    const TOKEN_STRATEGY = strategies[i];
    before(async () => {
      const CHIInstance = await getContractInstance(hre, "IChi", TOKENS["CHI"]);

      contracts["chi"] = CHIInstance;

      contracts["registry"] = essentialContracts.registry;

      contracts["strategyProvider"] = essentialContracts.strategyProvider;

      contracts["vaultStepInvestStrategyDefinitionRegistry"] =
        essentialContracts.vaultStepInvestStrategyDefinitionRegistry;

      contracts["strategyProvider"] = essentialContracts.strategyProvider;
    });
    beforeEach(async () => {
      const dummyToken = await deployContract(hre, TESTING_CONTRACTS.TEST_DUMMY_TOKEN_TRANSFER_FEE, false, operator, [
        1500000000000000,
      ]);

      await executeFunc(contracts["registry"], operator, "approveToken(address)", [dummyToken.address]);

      contracts["erc20"] = dummyToken;
      const opty = await deployContract(hre, ESSENTIAL_CONTRACTS.OPTY, false, operator, [
        essentialContracts["registry"].address,
        0,
      ]);

      const optyMinter = await deployContract(hre, ESSENTIAL_CONTRACTS.OPTY_MINTER, false, operator, [
        essentialContracts["registry"].address,
        opty.address,
        await getBlockTimestamp(hre),
      ]);

      Vault = await deployVault(
        hre,
        essentialContracts.registry.address,
        essentialContracts.riskManager.address,
        essentialContracts.strategyManager.address,
        optyMinter.address,
        dummyToken.address,
        operator,
        admin,
        "DummyTokenTransferFee",
        "DTTF",
        "RP1",
        TESTING_DEPLOYMENT_ONCE,
      );
      await unpauseVault(operator, essentialContracts.registry, Vault.address, true);
      contracts["vault"] = Vault;
    });
    for (let i = 0; i < scenario.stories.length; i++) {
      const story = scenario.stories[i];
      it(`${story.description}`, async () => {
        for (let i = 0; i < story.setActions.length; i++) {
          const action = story.setActions[i];
          switch (action.action) {
            case "approve(address,uint256)": {
              const { contractName }: ARGUMENTS = action.args;
              let { amount }: ARGUMENTS = action.args;
              try {
                if (contractName && amount) {
                  if (amount === "all") {
                    const userAddr = await operator.getAddress();
                    const value = await contracts[action.contract].balanceOf(userAddr);
                    amount = value.toString();
                  }
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
            case "userDepositRebalance(uint256)": {
              let { amount }: ARGUMENTS = action.args;
              if (action.action.includes("userWithdrawRebalance")) {
                await delay(200);
              }
              try {
                if (amount) {
                  if (amount === "all") {
                    if (action.action.includes("userWithdrawRebalance")) {
                      const userAddr = await operator.getAddress();
                      const value = await contracts[action.contract].balanceOf(userAddr);
                      amount = value.toString();
                    } else {
                      const userAddr = await operator.getAddress();
                      const value = await contracts["erc20"].allowance(userAddr, contracts[action.contract].address);
                      amount = value.toString();
                    }
                  }
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
              const value = await contracts[action.contract][action.action](operator.getAddress());
              expect(value).to.be.equal(action.expectedValue);
            }
          }
        }
      });
    }
  }
});
