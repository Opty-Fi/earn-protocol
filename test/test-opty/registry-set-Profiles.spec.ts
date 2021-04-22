import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { deployRegistry } from "./setup";
import scenario from "./scenarios/registry-set-Profiles.json";
type ARGUMENTS = {
    [key: string]: any;
};
describe(scenario.title, () => {
    let registryContract: Contract;
    let owner: Signer;
    before(async () => {
        try {
            [owner] = await ethers.getSigners();
            registryContract = await deployRegistry(owner);
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
                    case "addRiskProfiles(string[],uint8[],(uint8,uint8)[])": {
                        const {
                            riskProfile,
                            noOfSteps,
                            poolRatingsRange,
                        }: ARGUMENTS = action.args;
                        if (riskProfile) {
                            if (action.expect === "success") {
                                await registryContract[action.action](
                                    riskProfile,
                                    noOfSteps,
                                    poolRatingsRange
                                );
                            } else {
                                await expect(
                                    registryContract[action.action](
                                        riskProfile,
                                        noOfSteps,
                                        poolRatingsRange
                                    )
                                ).to.be.revertedWith(action.message);
                            }
                        }
                        assert.isDefined(
                            riskProfile,
                            `args is wrong in ${action.action} testcase`
                        );
                        break;
                    }
                    case "addRiskProfile(string,uint8,(uint8,uint8))": {
                        const {
                            riskProfile,
                            noOfSteps,
                            poolRatingsRange,
                        }: ARGUMENTS = action.args;
                        if (riskProfile) {
                            if (action.expect === "success") {
                                await registryContract[action.action](
                                    riskProfile,
                                    noOfSteps,
                                    poolRatingsRange
                                );
                            } else {
                                await expect(
                                    registryContract[action.action](
                                        riskProfile,
                                        noOfSteps,
                                        poolRatingsRange
                                    )
                                ).to.be.revertedWith(action.message);
                            }
                        }
                        assert.isDefined(
                            riskProfile,
                            `args is wrong in ${action.action} testcase`
                        );
                        break;
                    }
                    case "updateRiskProfileSteps(string,uint8)": {
                        const { riskProfile, noOfSteps }: ARGUMENTS = action.args;
                        if (riskProfile) {
                            if (action.expect === "success") {
                                await registryContract[action.action](
                                    riskProfile,
                                    noOfSteps
                                );
                            } else {
                                await expect(
                                    registryContract[action.action](
                                        riskProfile,
                                        noOfSteps
                                    )
                                ).to.be.revertedWith(action.message);
                            }
                        }
                        assert.isDefined(
                            riskProfile,
                            `args is wrong in ${action.action} testcase`
                        );
                        break;
                    }
                    case "updateRPPoolRatings(string,(uint8,uint8))": {
                        const { riskProfile, poolRatingRange }: ARGUMENTS = action.args;
                        if (riskProfile) {
                            if (action.expect === "success") {
                                await registryContract[action.action](
                                    riskProfile,
                                    poolRatingRange
                                );
                            } else {
                                await expect(
                                    registryContract[action.action](
                                        riskProfile,
                                        poolRatingRange
                                    )
                                ).to.be.revertedWith(action.message);
                            }
                        }
                        assert.isDefined(
                            riskProfile,
                            `args is wrong in ${action.action} testcase`
                        );
                        break;
                    }
                    case "removeRiskProfile(uint256)": {
                        const { riskProfile, index }: ARGUMENTS = action.args;
                        let riskProfileIndex;
                        if (riskProfile) {
                            const value = await registryContract.getRiskProfile(
                                riskProfile
                            );
                            riskProfileIndex = value._index;
                        }
                        if (action.expect === "success") {
                            await registryContract[action.action](
                                index ? index : riskProfileIndex
                            );
                        } else {
                            await expect(
                                registryContract[action.action](
                                    index ? index : riskProfileIndex
                                )
                            ).to.be.revertedWith(action.message);
                        }
                        assert.isDefined(
                            riskProfile ? riskProfile : index,
                            `args is wrong in ${action.action} testcase`
                        );
                        break;
                    }
                    default:
                        break;
                }
            }

            for (let i = 0; i < story.getActions.length; i++) {
                const action = story.getActions[i];
                switch (action.action) {
                    case "getRiskProfile(string)": {
                        const { riskProfile }: ARGUMENTS = action.args;
                        if (riskProfile) {
                            const value = await registryContract[action.action](
                                riskProfile
                            );
                            if (action.expectedValue["exists"]) {
                                expect(value._noOfSteps).to.be.equal(
                                    action.expectedValue["noOfSteps"]
                                );
                                expect([
                                    value._poolRatingsRange[0],
                                    value._poolRatingsRange[1],
                                ]).to.have.members(
                                    action.expectedValue["poolRatingRange"]
                                );
                                expect(value._exists).to.be.equal(
                                    action.expectedValue["exists"]
                                );
                            } else {
                                expect(value._exists).to.be.equal(
                                    action.expectedValue["exists"]
                                );
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
