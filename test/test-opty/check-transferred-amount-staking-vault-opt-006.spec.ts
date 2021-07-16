import { expect, assert } from "chai";
import hre from "hardhat";
import { Signer } from "ethers";
import { setUp } from "./setup";
import { CONTRACTS } from "../../helpers/type";
import scenario from "./scenarios/check-transferred-amount-staking-vault-opt-006.json";
import { getBlockTimestamp, unpauseVault } from "../../helpers/contracts-actions";
import { ESSENTIAL_CONTRACTS, TESTING_CONTRACTS } from "../../helpers/constants";
import { deployContract, executeFunc } from "../../helpers/helpers";

type ARGUMENTS = {
  spender?: string;
  stakedOPTY?: string;
};

describe(scenario.title, () => {
  let essentialContracts: CONTRACTS;
  const contracts: CONTRACTS = {};
  let users: { [key: string]: Signer };
  before(async () => {
    try {
      const [owner] = await hre.ethers.getSigners();
      users = { owner };
      [essentialContracts] = await setUp(owner);
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
    } catch (error) {
      console.log(error);
    }
  });
  beforeEach(async () => {
    const opty = await deployContract(hre, TESTING_CONTRACTS.TEST_DUMMY_TOKEN_TRANSFER_FEE, false, users["owner"], [
      1500000000000000,
    ]);

    await executeFunc(essentialContracts.registry, users["owner"], "approveToken(address)", [opty.address]);

    const optyDistributor = await deployContract(hre, ESSENTIAL_CONTRACTS.OPTY_DISTRIBUTOR, false, users["owner"], [
      essentialContracts.registry.address,
      opty.address,
      await getBlockTimestamp(hre),
    ]);

    const optyStakingVault1D = await deployContract(
      hre,
      ESSENTIAL_CONTRACTS.OPTY_STAKING_VAULT,
      false,
      users["owner"],
      [essentialContracts.registry.address, opty.address, 86400, "1D"],
    );

    const optyStakingVault30D = await deployContract(
      hre,
      ESSENTIAL_CONTRACTS.OPTY_STAKING_VAULT,
      false,
      users["owner"],
      [essentialContracts.registry.address, opty.address, 2592000, "30D"],
    );

    const optyStakingVault60D = await deployContract(
      hre,
      ESSENTIAL_CONTRACTS.OPTY_STAKING_VAULT,
      false,
      users["owner"],
      [essentialContracts.registry.address, opty.address, 5184000, "60D"],
    );

    const optyStakingVault180D = await deployContract(
      hre,
      ESSENTIAL_CONTRACTS.OPTY_STAKING_VAULT,
      false,
      users["owner"],
      [essentialContracts.registry.address, opty.address, 15552000, "180D"],
    );

    await executeFunc(essentialContracts.registry, users["owner"], "setOPTYDistributor(address)", [
      optyDistributor.address,
    ]);
    await executeFunc(optyDistributor, users["owner"], "setStakingVault(address,bool)", [
      optyStakingVault1D.address,
      true,
    ]);
    await executeFunc(optyDistributor, users["owner"], "setStakingVault(address,bool)", [
      optyStakingVault30D.address,
      true,
    ]);
    await executeFunc(optyDistributor, users["owner"], "setStakingVault(address,bool)", [
      optyStakingVault60D.address,
      true,
    ]);
    await executeFunc(optyDistributor, users["owner"], "setStakingVault(address,bool)", [
      optyStakingVault180D.address,
      true,
    ]);
    await executeFunc(
      essentialContracts.optyStakingRateBalancer,
      users["owner"],
      "initialize(address,address,address,address)",
      [
        optyStakingVault1D.address,
        optyStakingVault30D.address,
        optyStakingVault60D.address,
        optyStakingVault180D.address,
      ],
    );
    await executeFunc(
      essentialContracts.optyStakingRateBalancer,
      users["owner"],
      "setStakingVaultMultipliers(address,uint256)",
      [optyStakingVault1D.address, 10000],
    );
    await executeFunc(
      essentialContracts.optyStakingRateBalancer,
      users["owner"],
      "setStakingVaultMultipliers(address,uint256)",
      [optyStakingVault30D.address, 12000],
    );
    await executeFunc(
      essentialContracts.optyStakingRateBalancer,
      users["owner"],
      "setStakingVaultMultipliers(address,uint256)",
      [optyStakingVault60D.address, 15000],
    );
    await executeFunc(
      essentialContracts.optyStakingRateBalancer,
      users["owner"],
      "setStakingVaultMultipliers(address,uint256)",
      [optyStakingVault180D.address, 20000],
    );
    await executeFunc(
      essentialContracts.optyStakingRateBalancer,
      users["owner"],
      "setStakingVaultOPTYAllocation(uint256)",
      [10000000000],
    );

    contracts["stakingVault1D"] = optyStakingVault1D;
    contracts["stakingVault30D"] = optyStakingVault30D;
    contracts["stakingVault60D"] = optyStakingVault60D;
    contracts["stakingVault180D"] = optyStakingVault180D;

    const stakingVaultNames = Object.keys(contracts);
    for (let i = 0; i < stakingVaultNames.length; i++) {
      await unpauseVault(users["owner"], essentialContracts.registry, contracts[stakingVaultNames[i]].address, true);
    }

    contracts["optyDistributor"] = optyDistributor;

    contracts["opty"] = opty;
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
