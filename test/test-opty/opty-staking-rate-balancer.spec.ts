import { expect, assert } from "chai";
import hre from "hardhat";
import { CONTRACTS, TESTING_DEFAULT_DATA } from "../../helpers/type";
import { deployContract } from "../../helpers/helpers";
import { TESTING_DEPLOYMENT_ONCE, TESTING_CONTRACTS, ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { executeFunc } from "../../helpers/helpers";
import { deployOptyStakingRateBalancer, deployRegistry } from "../../helpers/contracts-deployments";
import scenario from "./scenarios/opty-staking-rate-balancer.json";
import { Signer } from "ethers";

type ARGUMENTS = {
  addressName?: string;
  multiplier?: number;
  stakingVaultOPTYAllocation?: number;
};

describe(scenario.title, () => {
  let contracts: CONTRACTS = {};
  let signers: { [key: string]: Signer };

  before(async () => {
    try {
      const [owner, user1] = await hre.ethers.getSigners();
      const financeOperator = owner;
      signers = { owner, financeOperator, user1 };
      const registry = await deployRegistry(hre, owner, TESTING_DEPLOYMENT_ONCE);
      const optyStakingRateBalancer = await deployOptyStakingRateBalancer(
        hre,
        owner,
        TESTING_DEPLOYMENT_ONCE,
        registry.address,
      );
      const dummyOptyStakingVaultEmptyContract = await deployContract(
        hre,
        TESTING_CONTRACTS.TEST_OPTY_STAKING_RATE_BALANCER_NEW_IMPLEMENTATION,
        TESTING_DEPLOYMENT_ONCE,
        owner,
        [registry.address],
      );
      contracts = { registry, optyStakingRateBalancer, dummyOptyStakingVaultEmptyContract };
    } catch (error) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenario.stories.length; i++) {
    const story = scenario.stories[i];
    it(`${story.description}`, async () => {
      for (let i = 0; i < story.setActions.length; i++) {
        const action: any = story.setActions[i];
        await setAndCleanActions(contracts, action, signers);
      }
      for (let i = 0; i < story.getActions.length; i++) {
        const action: any = story.getActions[i];
        switch (action.action) {
          case "stakingVaultMultipliers(address)": {
            const { addressName }: ARGUMENTS = action.args;
            if (addressName) {
              expect(+(await contracts[action.contract][action.action](contracts[addressName].address))).to.be.equal(
                +action.expectedValue,
              );
            }
            assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "stakingVaultOPTYAllocation()": {
            expect(+(await contracts[action.contract][action.action]())).to.be.equal(+action.expectedValue);
            break;
          }
          case "isNewContract()": {
            expect(await contracts["optyStakingRateBalancer"][action.action]()).to.be.equal(action.expectedValue);
            break;
          }
          case "verifyOldValue()": {
            await verifyDefaultData(contracts, OPTY_STAKING_RATE_BALANCER_DEFAULT_DATA, signers);
            break;
          }
        }
      }
      for (let i = 0; i < story.cleanActions.length; i++) {
        const action: any = story.cleanActions[i];
        await setAndCleanActions(contracts, action, signers);
      }
    });
  }
});

async function setAndCleanActions(contracts: CONTRACTS, action: any, signers: { [key: string]: Signer }) {
  switch (action.action) {
    case "initData()": {
      await initDefaultData(contracts, OPTY_STAKING_RATE_BALANCER_DEFAULT_DATA, signers["owner"]);
      break;
    }
    case "setFinanceOperator(address)": {
      const { addressName }: ARGUMENTS = action.args;
      if (addressName) {
        const newFinanceOperatorAddress = await signers[addressName].getAddress();
        if (action.expect === "success") {
          await contracts[action.contract].connect(signers[action.executor])[action.action](newFinanceOperatorAddress);
        } else {
          await expect(
            contracts[action.contract].connect(signers[action.executor])[action.action](newFinanceOperatorAddress),
          ).to.be.revertedWith(action.message);
        }
      }
      assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
      break;
    }
    case "setStakingVaultMultipliers(address,uint256)": {
      const { addressName, multiplier }: ARGUMENTS = action.args;
      if (addressName && multiplier) {
        if (action.expect === "success") {
          await contracts[action.contract]
            .connect(signers[action.executor])
            [action.action](contracts[addressName].address, multiplier);
        } else {
          await expect(
            contracts[action.contract]
              .connect(signers[action.executor])
              [action.action](contracts[addressName].address, multiplier),
          ).to.be.revertedWith(action.message);
        }
      }
      assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
      assert.isDefined(multiplier, `args is wrong in ${action.action} testcase`);
      break;
    }
    case "setStakingVaultOPTYAllocation(uint256)": {
      const { stakingVaultOPTYAllocation }: ARGUMENTS = action.args;
      if (stakingVaultOPTYAllocation) {
        if (action.expect === "success") {
          await contracts[action.contract].connect(signers[action.executor])[action.action](stakingVaultOPTYAllocation);
        } else {
          await expect(
            contracts[action.contract].connect(signers[action.executor])[action.action](stakingVaultOPTYAllocation),
          ).to.be.revertedWith(action.message);
        }
      }
      assert.isDefined(stakingVaultOPTYAllocation, `args is wrong in ${action.action} testcase`);
      break;
    }
    case "become(address)": {
      const contractProxy = await hre.ethers.getContractAt(
        ESSENTIAL_CONTRACTS.OPTY_STAKING_RATE_BALANCER_PROXY,
        contracts["optyStakingRateBalancer"].address,
      );
      const newContract = await deployContract(
        hre,
        TESTING_CONTRACTS.TEST_OPTY_STAKING_RATE_BALANCER_NEW_IMPLEMENTATION,
        TESTING_DEPLOYMENT_ONCE,
        signers[action.executor],
        [contracts["registry"].address],
      );
      await executeFunc(contractProxy, signers[action.executor], "setPendingImplementation(address)", [
        newContract.address,
      ]);
      await executeFunc(newContract, signers[action.executor], "become(address)", [contractProxy.address]);

      contracts["optyStakingRateBalancer"] = await hre.ethers.getContractAt(
        TESTING_CONTRACTS.TEST_OPTY_STAKING_RATE_BALANCER_NEW_IMPLEMENTATION,
        contractProxy.address,
      );
    }
  }
}

const OPTY_STAKING_RATE_BALANCER_DEFAULT_DATA: TESTING_DEFAULT_DATA[] = [
  {
    setFunction: "initialize(address,address,address,address)",
    input: [
      "dummyOptyStakingVaultEmptyContract",
      "dummyOptyStakingVaultEmptyContract",
      "dummyOptyStakingVaultEmptyContract",
      "dummyOptyStakingVaultEmptyContract",
    ],
    getFunction: [
      {
        name: "stakingVault1DLockingTerm()",
        input: [],
        output: "dummyOptyStakingVaultEmptyContract",
      },
      {
        name: "stakingVault30DLockingTerm()",
        input: [],
        output: "dummyOptyStakingVaultEmptyContract",
      },
      {
        name: "stakingVault60DLockingTerm()",
        input: [],
        output: "dummyOptyStakingVaultEmptyContract",
      },
      {
        name: "stakingVault180DLockingTerm()",
        input: [],
        output: "dummyOptyStakingVaultEmptyContract",
      },
      {
        name: "stakingVaults(address)",
        input: ["dummyOptyStakingVaultEmptyContract"],
        output: true,
      },
    ],
  },
  {
    setFunction: "updateStakedOPTY(address,uint256)",
    input: ["optyStakingRateBalancer", "10"],
    getFunction: [
      {
        name: "stakingVaultToUserStakedOPTY(address,address)",
        input: ["dummyOptyStakingVaultEmptyContract", "owner"],
        output: "10",
      },
      {
        name: "stakingVaultToStakedOPTY(address)",
        input: ["dummyOptyStakingVaultEmptyContract"],
        output: "10",
      },
    ],
  },
  {
    setFunction: "setStakingVaultMultipliers(address,uint256)",
    input: ["dummyOptyStakingVaultEmptyContract", "2"],
    getFunction: [
      {
        name: "stakingVaultMultipliers(address)",
        input: ["dummyOptyStakingVaultEmptyContract"],
        output: "2",
      },
    ],
  },
  {
    setFunction: "setStakingVaultOPTYAllocation(uint256)",
    input: ["2"],
    getFunction: [
      {
        name: "stakingVaultOPTYAllocation()",
        input: [],
        output: "2",
      },
    ],
  },
];

async function initDefaultData(contracts: CONTRACTS, data: TESTING_DEFAULT_DATA[], owner: Signer): Promise<void> {
  for (let i = 0; i < data.length; i++) {
    try {
      const action = data[i];
      switch (action.setFunction) {
        case "initialize(address,address,address,address)": {
          contracts["optyStakingRateBalancer"]
            .connect(owner)
            [action.setFunction](
              contracts[action.input[0]].address,
              contracts[action.input[1]].address,
              contracts[action.input[2]].address,
              contracts[action.input[3]].address,
            );
          break;
        }
        case "updateStakedOPTY(address,uint256)": {
          contracts["dummyOptyStakingVaultEmptyContract"]
            .connect(owner)
            [action.setFunction](contracts[action.input[0]].address, action.input[1]);
          break;
        }
        case "setStakingVaultMultipliers(address,uint256)": {
          contracts["optyStakingRateBalancer"]
            .connect(owner)
            [action.setFunction](contracts[action.input[0]].address, action.input[1]);
          break;
        }
        case "setStakingVaultOPTYAllocation(uint256)": {
          contracts["optyStakingRateBalancer"].connect(owner)[action.setFunction](action.input[0]);
          break;
        }
      }
    } catch (error) {
      // ignore the error
    }
  }
}

async function verifyDefaultData(
  contracts: CONTRACTS,
  data: TESTING_DEFAULT_DATA[],
  signers: { [key: string]: Signer },
): Promise<void> {
  for (let i = 0; i < data.length; i++) {
    const action = data[i];
    for (let i = 0; i < action.getFunction.length; i++) {
      const getFunction = action.getFunction[i];
      switch (getFunction.name) {
        case "stakingVault1DLockingTerm()":
        case "stakingVault30DLockingTerm()":
        case "stakingVault60DLockingTerm()":
        case "stakingVault180DLockingTerm()": {
          const value = await contracts["optyStakingRateBalancer"][getFunction.name]();
          expect(value).to.be.equal(contracts[getFunction.output].address);
          break;
        }
        case "stakingVaults(address)": {
          const value = await contracts["optyStakingRateBalancer"][getFunction.name](
            contracts[getFunction.input[0]].address,
          );
          expect(value).to.be.equal(getFunction.output);
          break;
        }
        case "stakingVaultToUserStakedOPTY(address,address)": {
          const value = await contracts["optyStakingRateBalancer"][getFunction.name](
            contracts[getFunction.input[0]].address,
            await signers[getFunction.input[1]].getAddress(),
          );
          expect(+value).to.be.equal(+getFunction.output);
          break;
        }
        case "stakingVaultToStakedOPTY(address)":
        case "stakingVaultMultipliers(address)": {
          const value = await contracts["optyStakingRateBalancer"][getFunction.name](
            contracts[getFunction.input[0]].address,
          );
          expect(+value).to.be.equal(+getFunction.output);
          break;
        }
        case "stakingVaultOPTYAllocation()": {
          const value = await contracts["optyStakingRateBalancer"][getFunction.name]();
          expect(+value).to.be.equal(+getFunction.output);
          break;
        }
      }
    }
  }
}
