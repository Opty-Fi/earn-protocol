import { expect, assert } from "chai";
import hre from "hardhat";
import { Contract, Signer } from "ethers";
import { deployAdapters, deployRegistry } from "../../helpers/contracts-deployments";
import { CONTRACTS } from "../../helpers/type";
import { deployContract } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS as ESSENTIAL_CONTRACTS_DATA, TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants";
import scenario from "./scenarios/registry.json";
import { getSoliditySHA3Hash } from "../../helpers/utils";

type ARGUMENTS = {
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};
describe(scenario.title, () => {
  let registryContract: Contract;
  let harvestCodeProvider: Contract;
  let priceOracle;
  let adapters: CONTRACTS;
  let owner: Signer;
  let users: Signer[];
  let caller: string;
  beforeEach(async () => {
    try {
      [owner, ...users] = await hre.ethers.getSigners();
      registryContract = await deployRegistry(hre, owner, TESTING_DEPLOYMENT_ONCE);
      harvestCodeProvider = await deployContract(
        hre,
        ESSENTIAL_CONTRACTS_DATA.HARVEST_CODE_PROVIDER,
        TESTING_DEPLOYMENT_ONCE,
        owner,
        [registryContract.address],
      );
      priceOracle = await deployContract(hre, ESSENTIAL_CONTRACTS_DATA.PRICE_ORACLE, TESTING_DEPLOYMENT_ONCE, owner, [
        registryContract.address,
      ]);
      adapters = await deployAdapters(
        hre,
        owner,
        registryContract.address,
        harvestCodeProvider.address,
        priceOracle.address,
        TESTING_DEPLOYMENT_ONCE,
      );
      caller = await owner.getAddress();
      assert.isDefined(registryContract, "Registry contract not deployed");
      assert.isDefined(harvestCodeProvider, "HarvestCodeProvider not deployed");
      assert.isDefined(adapters, "Adapters not deployed");
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
          case "setOperator(address)": {
            const { userIndex }: ARGUMENTS = action.args;
            const userAddr = await users[userIndex].getAddress();
            if (userIndex) {
              if (action.expect === "success") {
                await registryContract[action.action](userAddr);
              } else {
                await expect(registryContract[action.action](userAddr)).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(userIndex, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "approveToken(address[])":
          case "approveToken(address)": {
            const { tokens }: ARGUMENTS = action.args;
            if (tokens) {
              if (action.expect === "success") {
                if (action.action == "approveToken(address)") {
                  await expect(registryContract[action.action](tokens))
                    .to.emit(registryContract, "LogToken")
                    .withArgs(hre.ethers.utils.getAddress(tokens), true, caller);
                } else {
                  await registryContract[action.action](tokens);
                }
              } else {
                await expect(registryContract[action.action](tokens)).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(tokens, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "approveLiquidityPool(address[])":
          case "approveCreditPool(address[])":
          case "approveLiquidityPool(address)":
          case "approveCreditPool(address)": {
            const { lqs }: ARGUMENTS = action.args;
            if (lqs) {
              if (action.expect === "success") {
                if (action.action == "approveLiquidityPool(address)") {
                  await expect(registryContract[action.action](lqs))
                    .to.emit(registryContract, "LogLiquidityPool")
                    .withArgs(hre.ethers.utils.getAddress(lqs), true, caller);
                } else if (action.action == "approveCreditPool(address)") {
                  await expect(registryContract[action.action](lqs))
                    .to.emit(registryContract, "LogCreditPool")
                    .withArgs(hre.ethers.utils.getAddress(lqs), true, caller);
                } else {
                  await registryContract[action.action](lqs);
                }
              } else {
                await expect(registryContract[action.action](lqs)).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(lqs, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "rateLiquidityPool((address,uint8)[])":
          case "rateCreditPool((address,uint8)[])": {
            const { lqRate }: ARGUMENTS = action.args;
            if (lqRate) {
              if (action.expect === "success") {
                await registryContract[action.action](lqRate);
              } else {
                await expect(registryContract[action.action](lqRate)).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(lqRate, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "rateLiquidityPool(address,uint8)":
          case "rateCreditPool(address,uint8)": {
            const { lqRate }: ARGUMENTS = action.args;
            if (lqRate) {
              if (action.expect === "success") {
                if (action.action == "rateLiquidityPool(address,uint8)") {
                  await expect(registryContract[action.action](lqRate[0], lqRate[1]))
                    .to.emit(registryContract, "LogRateLiquidityPool")
                    .withArgs(hre.ethers.utils.getAddress(lqRate[0]), lqRate[1], caller);
                } else if (action.action == "rateCreditPool(address,uint8)") {
                  await expect(registryContract[action.action](lqRate[0], lqRate[1]))
                    .to.emit(registryContract, "LogRateCreditPool")
                    .withArgs(hre.ethers.utils.getAddress(lqRate[0]), lqRate[1], caller);
                } else {
                  await registryContract[action.action](lqRate[0], lqRate[1]);
                }
              } else {
                await expect(registryContract[action.action](lqRate[0], lqRate[1])).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(lqRate, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "revokeLiquidityPool(address[])":
          case "revokeCreditPool(address[])":
          case "revokeLiquidityPool(address)":
          case "revokeCreditPool(address)": {
            const { lqs }: ARGUMENTS = action.args;
            if (lqs) {
              if (action.expect === "success") {
                if (action.action == "revokeLiquidityPool(address)") {
                  await expect(registryContract[action.action](lqs))
                    .to.emit(registryContract, "LogLiquidityPool")
                    .withArgs(hre.ethers.utils.getAddress(lqs), false, caller);
                } else if (action.action == "revokeCreditPool(address)") {
                  await expect(registryContract[action.action](lqs))
                    .to.emit(registryContract, "LogCreditPool")
                    .withArgs(hre.ethers.utils.getAddress(lqs), false, caller);
                } else {
                  await registryContract[action.action](lqs);
                }
              } else {
                await expect(registryContract[action.action](lqs)).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(lqs, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setLiquidityPoolToAdapter((address,address)[])": {
            const { lqs, userIndex }: ARGUMENTS = action.args;
            if (lqs) {
              const args: [string, string][] = [];
              for (let i = 0; i < lqs.length; i++) {
                args.push([lqs[i].liquidityPool, adapters[lqs[i].adapterName].address]);
              }
              if (action.expect === "success") {
                await registryContract[action.action](args);
              } else {
                (await userIndex)
                  ? await expect(registryContract.connect(users[userIndex])[action.action](args)).to.be.revertedWith(
                      action.message,
                    )
                  : await expect(registryContract[action.action](args)).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(lqs, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setLiquidityPoolToAdapter(address,address)": {
            const { lqs, userIndex }: ARGUMENTS = action.args;
            if (lqs) {
              if (action.expect === "success") {
                await expect(registryContract[action.action](lqs.liquidityPool, adapters[lqs.adapterName].address))
                  .to.emit(registryContract, "LogLiquidityPoolToDepositToken")
                  .withArgs(hre.ethers.utils.getAddress(lqs.liquidityPool), adapters[lqs.adapterName].address, caller);
              } else {
                (await userIndex)
                  ? await expect(
                      registryContract
                        .connect(users[userIndex])
                        [action.action](lqs.liquidityPool, adapters[lqs.adapterName].address),
                    ).to.be.revertedWith(action.message)
                  : await expect(
                      registryContract[action.action](lqs.liquidityPool, adapters[lqs.adapterName].address),
                    ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(lqs, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setTokensHashToTokens(address[][])":
          case "setTokensHashToTokens(address[])": {
            const { tokensHash }: ARGUMENTS = action.args;
            if (tokensHash) {
              if (action.expect === "success") {
                if (action.action == "setTokensHashToTokens(address[])") {
                  await expect(registryContract[action.action](tokensHash))
                    .to.emit(registryContract, "LogTokensToTokensHash")
                    .withArgs(getSoliditySHA3Hash(["address[]"], [tokensHash]), caller);
                } else {
                  await registryContract[action.action](tokensHash);
                }
              } else {
                await expect(registryContract[action.action](tokensHash)).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(tokensHash, `args is wrong in ${action.action} testcase`);
            break;
          }
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
          case "setUnderlyingAssetHashToRPToVaults(address[],string,address)": {
            const { tokens, riskProfile, vault }: ARGUMENTS = action.args;
            if (tokens && riskProfile && vault) {
              if (action.expect === "success") {
                await registryContract[action.action](tokens, riskProfile, vault);
              } else {
                await expect(registryContract[action.action](tokens, riskProfile, vault)).to.be.revertedWith(
                  action.message,
                );
              }
            }
            assert.isDefined(tokens, `args is wrong in ${action.action} testcase`);
            assert.isDefined(vault, `args is wrong in ${action.action} testcase`);
            assert.isDefined(riskProfile, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setUnderlyingAssetHashToRPToVaults(address[][],string[],address[][])": {
            const { multiTokens, riskProfiles, vaults }: ARGUMENTS = action.args;
            if (multiTokens && riskProfiles && vaults) {
              if (action.expect === "success") {
                await registryContract[action.action](multiTokens, riskProfiles, vaults);
              } else {
                await expect(registryContract[action.action](multiTokens, riskProfiles, vaults)).to.be.revertedWith(
                  action.message,
                );
              }
            }
            assert.isDefined(multiTokens, `args is wrong in ${action.action} testcase`);
            assert.isDefined(riskProfiles, `args is wrong in ${action.action} testcase`);
            assert.isDefined(vaults, `args is wrong in ${action.action} testcase`);
            break;
          }
          default:
            break;
        }
      }

      for (let i = 0; i < story.getActions.length; i++) {
        const action = story.getActions[i];
        switch (action.action) {
          case "tokens(address)": {
            const { address }: ARGUMENTS = action.args;
            if (address) {
              const value = await registryContract[action.action](address);
              expect(value).to.be.equal(action.expectedValue);
            }
            assert.isDefined(address, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "liquidityPoolToAdapter(address)": {
            const { address }: ARGUMENTS = action.args;
            if (address) {
              const value = await registryContract[action.action](address);
              expect(value).to.be.equal(adapters[action.expectedValue.toString()].address);
            }
            assert.isDefined(address, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "liquidityPools(address)":
          case "creditPools(address)": {
            const { address }: ARGUMENTS = action.args;
            if (address) {
              const value = await registryContract[action.action](address);
              const expectedValue = Array.isArray(action.expectedValue) ? action.expectedValue : [];
              expect([value[0], value[1]]).to.have.members(expectedValue);
            }
            assert.isDefined(address, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "tokensHashIndexes(uint256)": {
            const { index }: ARGUMENTS = action.args;
            if (index) {
              const value = await registryContract[action.action](index);
              expect(value).to.be.equal(action.expectedValue);
            }
            assert.isDefined(index, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "riskProfiles(string)": {
            const { riskProfile }: ARGUMENTS = action.args;
            const { exists, noOfSteps, lowerLimit, upperLimit }: ARGUMENTS = action.expectedMultiValues;

            if (riskProfile) {
              const value = await registryContract[action.action](riskProfile);
              if (exists) {
                expect(value.steps).to.be.equal(noOfSteps);
                expect(value.lowerLimit).to.equal(lowerLimit);
                expect(value.upperLimit).to.equal(upperLimit);
                expect(value.exists).to.be.equal(exists);
              } else {
                expect(value.exists).to.be.equal(exists);
              }
            }
            break;
          }
          case "underlyingAssetHashToRPToVaults(bytes32,string)": {
            const { tokens, riskProfile }: ARGUMENTS = action.args;
            const tokensHash = getSoliditySHA3Hash(["address[]"], [tokens]);
            if (tokens && riskProfile) {
              const value = await registryContract[action.action](tokensHash, riskProfile);
              expect(value).to.be.equal(action.expectedValue);
            }
            assert.isDefined(tokens, `args is wrong in ${action.action} testcase`);
            assert.isDefined(riskProfile, `args is wrong in ${action.action} testcase`);
            break;
          }
          default:
            break;
        }
      }
    });
  }
});
