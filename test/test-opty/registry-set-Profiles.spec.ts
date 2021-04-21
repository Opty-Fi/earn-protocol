import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer, BigNumber } from "ethers";
import { deployAdapters, deployRegistry } from "./setup";
import { CONTRACTS } from "./utils/type";
import { ESSENTIAL_CONTRACTS as ESSENTIAL_CONTRACTS_DATA } from "./utils/constants";
import scenario from "./scenarios/registry-set-Profiles.json";
type ARGUMENTS = {
    [key: string]: any;
};
describe(scenario.title, () => {
    let registryContract: Contract;
    let harvestCodeProvider: Contract;
    let adapters: CONTRACTS;
    let owner: Signer;
    before(async () => {
        try {
            [owner] = await ethers.getSigners();
            registryContract = await deployRegistry(owner);
            // const HarvestCodeProvider = await ethers.getContractFactory(
            //     ESSENTIAL_CONTRACTS_DATA.HARVEST_CODE_PROVIDER
            // );
            // harvestCodeProvider = await HarvestCodeProvider.connect(owner).deploy(
            //     registryContract.address
            // );
            // adapters = await deployAdapters(
            //     owner,
            //     registryContract.address,
            //     harvestCodeProvider.address
            // );
            assert.isDefined(registryContract, "Registry contract not deployed");
            // assert.isDefined(harvestCodeProvider, "HarvestCodeProvider not deployed");
            // assert.isDefined(adapters, "Adapters not deployed");
        } catch (error) {
            console.log(error);
        }
    });

    for (let i = 0; i < scenario.stories.length; i++) {
        // for (let i = 0; i < 9; i++) {
        const story = scenario.stories[i];
        it(story.description, async () => {
            for (let i = 0; i < story.setActions.length; i++) {
                const action = story.setActions[i];
                // let riskProfileIndex
                switch (action.action) {
                    case "addRiskProfiles(string[],uint8[],(uint8,uint8)[])": {
                        console.log("COming in multiple set profiles case");
                        const {
                            riskProfile,
                            noOfSteps,
                            poolRatingsRange,
                        }: ARGUMENTS = action.args;
                        if (riskProfile) {
                            if (action.expect === "success") {
                                console.log("setting profile");
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
                                console.log("setting profile");
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
                                console.log("setting profile");
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
                                console.log("setting profile");
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
                            console.log("Remove risk profile case");
                            console.log("risk Profile: ", riskProfile);
                            const value = await registryContract.getRiskProfile(
                                riskProfile
                            );
                            console.log("Value received: ", value);
                            riskProfileIndex = value._index;
                            console.log("Risk Profile index: ", riskProfileIndex);
                        }
                        if (action.expect === "success") {
                            console.log("setting profile");
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
                        // }
                        // assert.isDefined(
                        //     riskProfile,
                        //     `args is wrong in ${action.action} testcase`
                        // );
                        break;
                    }

                    default:
                        break;
                }
            }

            for (let i = 0; i < story.getActions.length; i++) {
                // for (let i = 0; i < 1; i++) {
                const action = story.getActions[i];
                switch (action.action) {
                    case "getRiskProfile(string)": {
                        const { riskProfile }: ARGUMENTS = action.args;
                        console.log("Get action get profile");
                        console.log("RiskProfile: ", riskProfile);
                        // console.log("Risk Profiles: ", riskProfiles)
                        if (riskProfile) {
                            console.log("Get action - if condition - get profile");
                            const value = await registryContract[action.action](
                                riskProfile
                            );
                            console.log("Value received: ", value);
                            console.log("Value received: ", value._noOfSteps);
                            console.log("Value received: ", value._poolRatingsRange[0]);
                            console.log("Value received: ", value._poolRatingsRange[1]);
                            console.log("Value received: ", value._exists);
                            // const { noOfSteps, poolRatingRange, exists}: ARGUMENTS = action.expectedValue
                            if (action.expectedValue["exists"]) {
                                expect(value._noOfSteps).to.be.equal(
                                    action.expectedValue["noOfSteps"]
                                );
                                console.log("Matching pool rating");
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
                        // if (riskProfiles) {
                        //     console.log("Coming in riskProfiles")
                        //     for (let index = 0; index < riskProfiles.length; index++) {
                        //         const profile = riskProfiles[index];
                        //         const expectedNoOfSteps = <keyof typeof action.expectedValue["noOfSteps"]>action.expectedValue["noOfSteps"][index]
                        //         const expectedPoolRatings = action.expectedValue["poolRatingRange"][index]
                        //         const expectedExists = action.expectedValue["exists"][index]
                        //         console.log("Profile: ", profile)
                        //         const value = await registryContract[action.action](
                        //             profile
                        //         );
                        //         console.log("Value received: ", value)
                        //         console.log("Value received: ", value._noOfSteps)
                        //         console.log("Value received: ", value._poolRatingsRange[0])
                        //         console.log("Value received: ", value._poolRatingsRange[1])
                        //         console.log("Value received: ", value._exists)
                        //         expect(value._noOfSteps).to.be.equal(action.expectedValue["noOfSteps"]);
                        //         console.log("Matching pool rating")
                        //         expect([value._poolRatingsRange[0], value._poolRatingsRange[1]]).to.have.members(action.expectedValue["poolRatingRange"]);
                        //         expect(value._exists).to.be.equal(action.expectedValue["exists"]);
                        //     }
                        // }
                        // } else {
                        //     console.log("Get action - else condition - get profile")
                        //     const value = await registryContract[action.action](
                        //         riskProfile
                        //     );
                        //     expect(value._exists).to.be.equal(action.expectedValue[<keyof typeof action.expectedValue>"exists"]);
                        // }
                        // assert.isDefined(
                        //     address,
                        //     `args is wrong in ${action.action} testcase`
                        // );
                        break;
                    }
                    case "liquidityPools(address)":
                    case "creditPools(address)": {
                        const { address }: ARGUMENTS = action.args;
                        if (address) {
                            const value = await registryContract[action.action](
                                address
                            );
                            const expectedValue = Array.isArray(action.expectedValue)
                                ? action.expectedValue
                                : [];
                            expect([value[0], value[1]]).to.have.members(expectedValue);
                        }
                        assert.isDefined(
                            address,
                            `args is wrong in ${action.action} testcase`
                        );
                        break;
                    }
                    case "tokensHashIndexes(uint256)": {
                        const { index }: ARGUMENTS = action.args;
                        if (index) {
                            const value = await registryContract[action.action](index);
                            expect(value).to.be.equal(action.expectedValue);
                        }
                        assert.isDefined(
                            index,
                            `args is wrong in ${action.action} testcase`
                        );
                        break;
                    }
                    default:
                        break;
                }
            }
        });
    }
});
