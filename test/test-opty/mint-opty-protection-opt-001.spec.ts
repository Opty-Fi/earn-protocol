import { expect, assert } from "chai";
import hre from "hardhat";
import { Signer } from "ethers";
import { setUp } from "./setup";
import { CONTRACTS } from "../../helpers/type";
import { executeFunc } from "../../helpers/helpers";
import scenario from "./scenarios/mint-opty-protection-opt-001.json";
import { VAULT_TOKENS } from "../../helpers/constants/tokens";
type ARGUMENTS = {
  contractName?: string;
  amount?: string;
  addressName?: string;
};
describe(scenario.title, () => {
  let essentialContracts: CONTRACTS;
  let adapters: CONTRACTS;
  const contracts: CONTRACTS = {};
  let users: { [key: string]: Signer };
  before(async () => {
    try {
      const [owner] = await hre.ethers.getSigners();
      users = { owner };
      [essentialContracts, adapters] = await setUp(
        users["owner"],
        Object.values(VAULT_TOKENS).map(token => token.address),
      );
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
      assert.isDefined(adapters, "Adapters not deployed");
      contracts["priceOracle"] = essentialContracts.priceOracle;

      contracts["optyDistributor"] = essentialContracts.optyDistributor;
    } catch (error: any) {
      console.log(error);
    }
  });
  for (let i = 0; i < scenario.stories.length; i++) {
    const story = scenario.stories[i];
    it(story.description, async () => {
      for (let i = 0; i < story.setActions.length; i++) {
        const action = story.setActions[i];
        switch (action.action) {
          case "mintOpty(address,uint256)": {
            const { contractName, amount }: ARGUMENTS = action.args;
            if (contractName && amount) {
              const contractAddr = await contracts[contractName].address;
              if (action.expect === "success") {
                await executeFunc(contracts[action.contract], users[action.executor], action.action, [
                  contractAddr,
                  amount,
                ]);
              } else {
                await expect(
                  executeFunc(contracts[action.contract], users[action.executor], action.action, [
                    contractAddr,
                    amount,
                  ]),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
            assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
            break;
          }
        }
      }
    }).timeout(10000000);
  }
});
