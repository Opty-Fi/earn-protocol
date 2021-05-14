import { expect, assert } from "chai";
import hre from "hardhat";
import { Contract, Signer } from "ethers";
import { deployRegistry } from "../../helpers/contracts-deployments";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants";
import scenario from "./scenarios/registry-set-Profiles.json";
type ARGUMENTS = {
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};
describe(scenario.title, () => {
  let registryContract: Contract;
  let owner: Signer;
  let caller: string;
  before(async () => {
    try {
      [owner] = await hre.ethers.getSigners();
      registryContract = await deployRegistry(hre, owner, TESTING_DEPLOYMENT_ONCE);
      caller = await owner.getAddress();
      assert.isDefined(registryContract, "Registry contract not deployed");
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
          case "addRiskProfile(string[],uint8[],(uint8,uint8)[])": {
            const { riskProfile, noOfSteps, poolRatingsRange }: ARGUMENTS = action.args;
            if (riskProfile) {
              if (action.expect === "success") {
                await registryContract[action.action](riskProfile, noOfSteps, poolRatingsRange);
              } else {
                await expect(
                  registryContract[action.action](riskProfile, noOfSteps, poolRatingsRange),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(riskProfile, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "addRiskProfile(string,uint8,(uint8,uint8))": {
            const { riskProfile, noOfSteps, poolRatingRange }: ARGUMENTS = action.args;
            if (riskProfile) {
              if (action.expect === "success") {
                const _addRiskProfileTx = await registryContract[action.action](
                  riskProfile,
                  noOfSteps,
                  poolRatingRange,
                );
                const addRiskProfileTx = await _addRiskProfileTx.wait(1);
                expect(addRiskProfileTx.events[0].event).to.equal("LogRiskProfile");
                expect(addRiskProfileTx.events[0].args[0]).to.equal(0);
                expect(addRiskProfileTx.events[0].args[1]).to.equal(true);
                expect(addRiskProfileTx.events[0].args[2]).to.equal(noOfSteps);
                expect(addRiskProfileTx.events[0].args[3]).to.equal(caller);
                expect(addRiskProfileTx.events[1].event).to.equal("LogRPPoolRatings");
                expect(addRiskProfileTx.events[1].args[0]).to.equal(0);
                expect(addRiskProfileTx.events[1].args[1]).to.equal(poolRatingRange[0]);
                expect(addRiskProfileTx.events[1].args[2]).to.equal(poolRatingRange[1]);
                expect(addRiskProfileTx.events[1].args[3]).to.equal(caller);
              } else {
                await expect(
                  registryContract[action.action](riskProfile, noOfSteps, poolRatingRange),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(riskProfile, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "updateRiskProfileSteps(string,uint8)": {
            const { riskProfile, noOfSteps }: ARGUMENTS = action.args;
            if (riskProfile) {
              if (action.expect === "success") {
                await registryContract[action.action](riskProfile, noOfSteps);
              } else {
                await expect(registryContract[action.action](riskProfile, noOfSteps)).to.be.revertedWith(
                  action.message,
                );
              }
            }
            assert.isDefined(riskProfile, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "updateRPPoolRatings(string,(uint8,uint8))": {
            const { riskProfile, poolRatingRange }: ARGUMENTS = action.args;
            if (riskProfile) {
              const value = await registryContract.riskProfiles(riskProfile);
              const riskProfileIndex = value.index;
              if (action.expect === "success") {
                await expect(registryContract[action.action](riskProfile, poolRatingRange))
                  .to.emit(registryContract, "LogRPPoolRatings")
                  .withArgs(riskProfileIndex, poolRatingRange[0], poolRatingRange[1], caller);
              } else {
                await expect(registryContract[action.action](riskProfile, poolRatingRange)).to.be.revertedWith(
                  action.message,
                );
              }
            }
            assert.isDefined(riskProfile, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "removeRiskProfile(uint256)": {
            const { riskProfile, index }: ARGUMENTS = action.args;
            let riskProfileIndex;
            let riskProfileSteps;
            if (riskProfile) {
              const { index, steps } = await registryContract.riskProfiles(riskProfile);
              riskProfileIndex = index;
              riskProfileSteps = steps;
            }
            if (action.expect === "success") {
              await expect(registryContract[action.action](index ? index : riskProfileIndex))
                .to.emit(registryContract, "LogRiskProfile")
                .withArgs(riskProfileIndex, false, riskProfileSteps, caller);
            } else {
              await expect(registryContract[action.action](index ? index : riskProfileIndex)).to.be.revertedWith(
                action.message,
              );
            }
            assert.isDefined(riskProfile ? riskProfile : index, `args is wrong in ${action.action} testcase`);
            break;
          }
          default:
            break;
        }
      }

      for (let i = 0; i < story.getActions.length; i++) {
        const action = story.getActions[i];
        switch (action.action) {
          case "riskProfiles(string)": {
            const { riskProfile }: ARGUMENTS = action.args;
            if (riskProfile) {
              const value = await registryContract[action.action](riskProfile);
              if (action.expectedValue["exists"]) {
                expect(value.steps).to.be.equal(action.expectedValue["noOfSteps"]);
                expect(value.lowerLimit).to.equal(action.expectedValue["lowerLimit"]);
                expect(value.upperLimit).to.equal(action.expectedValue["upperLimit"]);
                expect(value.exists).to.be.equal(action.expectedValue["exists"]);
              } else {
                expect(value.exists).to.be.equal(action.expectedValue["exists"]);
              }
            }
            break;
          }
          default:
            break;
        }
      }
    });
  }
});
