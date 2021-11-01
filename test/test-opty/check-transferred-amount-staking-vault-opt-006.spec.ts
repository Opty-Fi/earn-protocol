import { expect, assert } from "chai";
import hre from "hardhat";
import { Signer } from "ethers";
import { CONTRACTS } from "../../helpers/type";
import scenario from "./scenarios/check-transferred-amount-staking-vault-opt-006.json";
import { getBlockTimestamp, unpauseVault } from "../../helpers/contracts-actions";
import {
  deployRegistry,
  deployAndSetupOptyStakingVaults,
  deployOptyStakingRateBalancer,
} from "../../helpers/contracts-deployments";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants/utils";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { TESTING_CONTRACTS } from "../../helpers/constants/test-contracts-name";
import { deployContract, executeFunc } from "../../helpers/helpers";

type ARGUMENTS = {
  spender?: string;
  stakedOPTY?: string;
};

describe(scenario.title, () => {
  let contracts: CONTRACTS = {};
  let users: { [key: string]: Signer };
  before(async () => {
    try {
      const [owner] = await hre.ethers.getSigners();
      users = { owner };
      const registry = await deployRegistry(hre, owner, TESTING_DEPLOYMENT_ONCE);

      const opty = await deployContract(
        hre,
        TESTING_CONTRACTS.TEST_DUMMY_TOKEN_TRANSFER_FEE,
        TESTING_DEPLOYMENT_ONCE,
        users["owner"],
        [1500000000000000],
      );

      await executeFunc(registry, users["owner"], "approveToken(address)", [opty.address]);

      const optyDistributor = await deployContract(
        hre,
        ESSENTIAL_CONTRACTS.OPTY_DISTRIBUTOR,
        TESTING_DEPLOYMENT_ONCE,
        users["owner"],
        [registry.address, opty.address, await getBlockTimestamp(hre)],
      );

      await executeFunc(registry, users["owner"], "setOPTYDistributor(address)", [optyDistributor.address]);

      const optyStakingRateBalancer = await deployOptyStakingRateBalancer(
        hre,
        users["owner"],
        TESTING_DEPLOYMENT_ONCE,
        registry.address,
      );

      await executeFunc(registry, users["owner"], "setOPTYStakingRateBalancer(address)", [
        optyStakingRateBalancer.address,
      ]);

      const optyStakingVaults = await deployAndSetupOptyStakingVaults(
        hre,
        users["owner"],
        TESTING_DEPLOYMENT_ONCE,
        registry.address,
        opty.address,
        optyStakingRateBalancer,
        optyDistributor,
      );

      await executeFunc(optyStakingRateBalancer, users["owner"], "setStakingVaultOPTYAllocation(uint256)", [
        10000000000,
      ]);

      const stakingVaultNames = Object.keys(optyStakingVaults);
      for (let i = 0; i < stakingVaultNames.length; i++) {
        await unpauseVault(users["owner"], registry, optyStakingVaults[stakingVaultNames[i]].address, true);
      }

      contracts = { ...optyStakingVaults };
      contracts["optyDistributor"] = optyDistributor;
      contracts["opty"] = opty;
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
          case "approve(address,uint256)": {
            const { spender, stakedOPTY }: ARGUMENTS = action.args;
            if (spender && stakedOPTY) {
              if (action.expect === "success") {
                await contracts[action.contract]
                  .connect(users[action.executor])
                  [action.action](contracts[spender].address, stakedOPTY);
              } else {
                await expect(
                  contracts[action.contract]
                    .connect(users[action.executor])
                    [action.action](contracts[spender].address, stakedOPTY),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(stakedOPTY, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "userStake(uint256)": {
            const { stakedOPTY }: ARGUMENTS = action.args;
            if (stakedOPTY) {
              if (action.expect === "success") {
                await contracts[action.contract].connect(users[action.executor])[action.action](stakedOPTY);
              } else {
                await expect(
                  contracts[action.contract].connect(users[action.executor])[action.action](stakedOPTY),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(stakedOPTY, `args is wrong in ${action.action} testcase`);
            break;
          }
          default:
            break;
        }
      }

      for (let i = 0; i < story.getActions.length; i++) {
        const action = story.getActions[i];
        switch (action.action) {
          case "balance()": {
            const value = await contracts[action.contract][action.action]();
            expect(value).to.be.equal(action.expectedValue);
            break;
          }
          case "balanceOf(address)": {
            const value = await contracts[action.contract][action.action](users["owner"].getAddress());
            expect(value).to.be.equal(action.expectedValue);
            break;
          }
          default:
            break;
        }
      }
    });
  }
});
