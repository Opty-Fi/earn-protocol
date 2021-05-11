import { expect, assert } from "chai";
import hre from "hardhat";
import { Contract, Signer } from "ethers";
import { setUp } from "./setup";
import { CONTRACTS } from "../../helpers/type";
import { ESSENTIAL_CONTRACTS as ESSENTIAL_CONTRACTS_DATA, TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants";
import scenario from "./scenarios/staking-pool.json";

type ARGUMENTS = {
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};
describe(scenario.title, () => {
  let optyStakingPool: Contract;
  let optyStakingRateBalancer: Contract;
  let essentialContracts: CONTRACTS;
  let owner, user1: Signer;
  before(async () => {
    try {
      [owner, user1] = await hre.ethers.getSigners();
      [essentialContracts,] = await setUp(owner);
      console.log(essentialContracts.registry.address);
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
      const OPTYStakingRateBalancer = await hre.ethers.getContractFactory(ESSENTIAL_CONTRACTS_DATA.OPTY_STAKING_RATE_BALANCER);
      optyStakingRateBalancer = await OPTYStakingRateBalancer.connect(owner).deploy(essentialContracts.registry.address);
      const OPTYStakingPool = await hre.ethers.getContractFactory(ESSENTIAL_CONTRACTS_DATA.OPTY_STAKING_POOL);
      optyStakingPool = await OPTYStakingPool.connect(owner)
        .deploy(
          essentialContracts.registry.address,
          essentialContracts.opty.address,
          essentialContracts.optyMinter.address,
          0,
          optyStakingRateBalancer.address,
          "opty Staking Pool NoLock",
          "opSPNoLock"
        );
      console.log(optyStakingPool.address);
    } catch (error) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenario.stories.length; i++) {
    const story = scenario.stories[i];
    it(story.description, async () => {
      for (let i = 0; i < story.setActions.length; i++) {
        const action = story.setActions[i];
        switch (action.action) {
          case "setToken(address)": {
            const { token }: ARGUMENTS = action.args;
            if (token) {
              if (action.expect === "success") {
                await expect(optyStakingPool[action.action](token));
              } else {
                if(action.message === "!_underlyingToken.isContract") {
                  await expect(optyStakingPool[action.action](token)).to.be.revertedWith(action.message);
                } else {
                  await expect(optyStakingPool.connect(user1)[action.action](token)).to.be.revertedWith(action.message);
                }
              }
            }
            assert.isDefined(token, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setOPTYMinter(address)": {
            const { OPTYMinter }: ARGUMENTS = action.args;
            if (OPTYMinter) {
              if (action.expect === "success") {
                await expect(optyStakingPool[action.action](OPTYMinter));
              } else {
                if(action.message === "!_optyMinter.isContract") {
                  await expect(optyStakingPool[action.action](OPTYMinter)).to.be.revertedWith(action.message);
                } else {
                  await expect(optyStakingPool.connect(user1)[action.action](OPTYMinter)).to.be.revertedWith(action.message);
                }
              }
            }
            assert.isDefined(OPTYMinter, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setOptyRatePerSecond(uint256)": {
            const { rate }: ARGUMENTS = action.args;
            if (rate) {
              if (action.expect === "success") {
                await expect(optyStakingPool[action.action](rate));
              } else {
                await expect(optyStakingPool.connect(user1)[action.action](rate)).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(rate, `args is wrong in ${action.action} testcase`);
            break;
          }
          default:
          break;
        }
      }

      for (let i = 0; i < story.getActions.length; i++) {
        const action = story.getActions[i];
        switch (action.action) {
          case "optyRatePerSecond()": {
            const value = await optyStakingPool[action.action]();
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
