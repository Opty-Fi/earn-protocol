import { expect, assert } from "chai";
import hre from "hardhat";
import { Contract, Signer } from "ethers";
import { deployAdapters, deployRegistry } from "../../helpers/contracts-deployments";
import { CONTRACTS } from "../../helpers/type";
import { ESSENTIAL_CONTRACTS as ESSENTIAL_CONTRACTS_DATA, TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants";
import scenario from "./scenarios/registry.json";

type ARGUMENTS = {
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};
describe(scenario.title, () => {
  let registryContract: Contract;
  let harvestCodeProvider: Contract;
  let adapters: CONTRACTS;
  let owner: Signer;
  beforeEach(async () => {
    try {
      [owner] = await hre.ethers.getSigners();
      registryContract = await deployRegistry(hre, owner, TESTING_DEPLOYMENT_ONCE);
      const HarvestCodeProvider = await hre.ethers.getContractFactory(ESSENTIAL_CONTRACTS_DATA.HARVEST_CODE_PROVIDER);
      harvestCodeProvider = await HarvestCodeProvider.connect(owner).deploy(registryContract.address);
      adapters = await deployAdapters(
        hre,
        owner,
        registryContract.address,
        harvestCodeProvider.address,
        TESTING_DEPLOYMENT_ONCE,
      );
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
          case "approveTokens(address[])":
          case "approveToken(address)": {
            const { tokens }: ARGUMENTS = action.args;
            if (tokens) {
              if (action.expect === "success") {
                await registryContract[action.action](tokens);
              } else {
                await expect(registryContract[action.action](tokens)).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(tokens, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "approveLiquidityPools(address[])":
          case "approveCreditPools(address[])":
          case "approveLiquidityPool(address)":
          case "approveCreditPool(address)": {
            const { lqs }: ARGUMENTS = action.args;
            if (lqs) {
              if (action.expect === "success") {
                await registryContract[action.action](lqs);
              } else {
                await expect(registryContract[action.action](lqs)).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(lqs, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "rateLiquidityPools((address,uint8)[])":
          case "rateCreditPools((address,uint8)[])": {
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
                await registryContract[action.action](lqRate[0], lqRate[1]);
              } else {
                await expect(registryContract[action.action](lqRate[0], lqRate[1])).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(lqRate, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "revokeLiquidityPools(address[])":
          case "revokeCreditPools(address[])":
          case "revokeLiquidityPool(address)":
          case "revokeCreditPool(address)": {
            const { lqs }: ARGUMENTS = action.args;
            if (lqs) {
              if (action.expect === "success") {
                await registryContract[action.action](lqs);
              } else {
                await expect(registryContract[action.action](lqs)).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(lqs, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setLiquidityPoolsToAdapters((address,address)[])": {
            const { lqs }: ARGUMENTS = action.args;
            if (lqs) {
              const args: [string, string][] = [];
              for (let i = 0; i < lqs.length; i++) {
                args.push([lqs[i].liquidityPool, adapters[lqs[i].adapterName].address]);
              }
              if (action.expect === "success") {
                await registryContract[action.action](args);
              } else {
                await expect(registryContract[action.action](args)).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(lqs, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setLiquidityPoolToAdapter(address,address)": {
            const { lqs }: ARGUMENTS = action.args;
            if (lqs) {
              if (action.expect === "success") {
                await registryContract[action.action](lqs.liquidityPool, adapters[lqs.adapterName].address);
              } else {
                await expect(
                  registryContract[action.action](lqs.liquidityPool, adapters[lqs.adapterName].address),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(lqs, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setMultipleTokensHashToTokens(address[][])":
          case "setTokensHashToTokens(address[])": {
            const { tokensHash }: ARGUMENTS = action.args;
            if (tokensHash) {
              if (action.expect === "success") {
                await registryContract[action.action](tokensHash);
              } else {
                await expect(registryContract[action.action](tokensHash)).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(tokensHash, `args is wrong in ${action.action} testcase`);
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
          default:
            break;
        }
      }
    });
  }
});
