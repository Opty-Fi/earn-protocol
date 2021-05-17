import { expect, assert } from "chai";
import hre from "hardhat";
import { Signer } from "ethers";
import { setUp } from "./setup";
import { CONTRACTS } from "../../helpers/type";
import scenario from "./scenarios/staking-pool.json";
import { getBlockTimestamp } from "../../helpers/contracts-actions";

type ARGUMENTS = {
  token?: string;
  OPTYMinter?: string;
  rate?: string;
  OPTYStakingRateBalancer?: string;
  spender?: string;
  stakedOPTY?: string;
};

describe(scenario.title, () => {
  let essentialContracts: CONTRACTS;
  const contracts: CONTRACTS = {};
  let users: { [key: string]: Signer };
  before(async () => {
    try {
      const [owner, user1] = await hre.ethers.getSigners();
      users = { owner, user1 };
      [essentialContracts] = await setUp(owner);
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
      contracts["stakingPool1D"] = essentialContracts.optyStakingPool1D;
      contracts["stakingPool30D"] = essentialContracts.optyStakingPool30D;
      contracts["stakingPool60D"] = essentialContracts.optyStakingPool60D;
      contracts["stakingPool180D"] = essentialContracts.optyStakingPool180D;
      contracts["opty"] = essentialContracts.opty;
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
                await contracts[action.contract].connect(users[action.executor])[action.action](token);
              } else {
                await expect(
                  contracts[action.contract].connect(users[action.executor])[action.action](token),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(token, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setOPTYMinter(address)": {
            const { OPTYMinter }: ARGUMENTS = action.args;
            if (OPTYMinter) {
              if (action.expect === "success") {
                await contracts[action.contract].connect(users[action.executor])[action.action](OPTYMinter);
              } else {
                await expect(
                  contracts[action.contract].connect(users[action.executor])[action.action](OPTYMinter),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(OPTYMinter, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setOptyRatePerSecond(uint256)": {
            const { rate }: ARGUMENTS = action.args;
            if (rate) {
              if (action.expect === "success") {
                await contracts[action.contract].connect(users[action.executor])[action.action](rate);
              } else {
                await expect(
                  contracts[action.contract].connect(users[action.executor])[action.action](rate),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(rate, `args is wrong in ${action.action} testcase`);
            break;
          }
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
          case "userUnstake(uint256)": {
            const { stakedOPTY }: ARGUMENTS = action.args;
            if (stakedOPTY) {
              if (action.expect === "success") {
                const time = (await getBlockTimestamp(hre)) + 86400;
                await hre.ethers.provider.send("evm_setNextBlockTimestamp", [time]);
                await hre.ethers.provider.send("evm_mine", []);
                await contracts[action.contract].connect(users[action.executor])[action.action](stakedOPTY);
              } else {
                const time = (await getBlockTimestamp(hre)) + 86300;
                await hre.ethers.provider.send("evm_setNextBlockTimestamp", [time]);
                await hre.ethers.provider.send("evm_mine", []);
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
          case "optyRatePerSecond()": {
            const value = await contracts[action.contract][action.action]();
            expect(value).to.be.equal(action.expectedValue);
            break;
          }
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
