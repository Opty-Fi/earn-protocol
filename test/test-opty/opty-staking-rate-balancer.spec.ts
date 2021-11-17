import { expect, assert } from "chai";
import hre from "hardhat";
import { CONTRACTS, TESTING_DEFAULT_DATA } from "../../helpers/type";
import { deployContract, deploySmockContract, executeFunc } from "../../helpers/helpers";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants/utils";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { TESTING_CONTRACTS } from "../../helpers/constants/test-contracts-name";
import { deployOptyStakingRateBalancer } from "../../helpers/contracts-deployments";
import scenario from "./scenarios/opty-staking-rate-balancer.json";
import { Signer, BigNumber } from "ethers";
import { smock, MockContract } from "@defi-wonderland/smock";

type ARGUMENTS = {
  addressName?: string;
  multiplier?: number;
  stakingVaultOPTYAllocation?: number;
  amount?: number;
};

describe(scenario.title, () => {
  let contracts: CONTRACTS = {};
  let smockRegistry: MockContract;
  let signers: { [key: string]: Signer };
  let stakingVaultToStakedOPTYBefore: BigNumber = BigNumber.from("0");
  let stakingVaultToUserStakedOPTYBefore: BigNumber = BigNumber.from("0");
  before(async () => {
    try {
      const [owner, user1] = await hre.ethers.getSigners();
      const financeOperator = owner;
      signers = { owner, financeOperator, user1 };
      const ownerAddress = await owner.getAddress();
      smockRegistry = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.REGISTRY, []);
      smockRegistry.getGovernance.returns(ownerAddress);
      smockRegistry.getOperator.returns(ownerAddress);
      smockRegistry.getFinanceOperator.returns(await financeOperator.getAddress());
      const optyStakingRateBalancer = await deployOptyStakingRateBalancer(
        hre,
        owner,
        TESTING_DEPLOYMENT_ONCE,
        smockRegistry.address,
      );
      const dummyOptyStakingVaultEmptyContract = await deployContract(
        hre,
        TESTING_CONTRACTS.TEST_OPTY_STAKING_RATE_BALANCER_NEW_IMPLEMENTATION,
        TESTING_DEPLOYMENT_ONCE,
        owner,
        [smockRegistry.address],
      );
      const dummyContract = await deployContract(
        hre,
        TESTING_CONTRACTS.TEST_OPTY_STAKING_RATE_BALANCER_NEW_IMPLEMENTATION,
        TESTING_DEPLOYMENT_ONCE,
        owner,
        [smockRegistry.address],
      );
      contracts = { optyStakingRateBalancer, dummyOptyStakingVaultEmptyContract, dummyContract };
    } catch (error) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenario.stories.length; i++) {
    const story = scenario.stories[i];
    it(`${story.description}`, async () => {
      for (let i = 0; i < story.setActions.length; i++) {
        const action = story.setActions[i];
        if (
          action.action === "updateStakedOPTY(address,uint256)" ||
          action.action === "updateUnstakedOPTY(address,uint256)"
        ) {
          stakingVaultToStakedOPTYBefore = await contracts["optyStakingRateBalancer"].stakingVaultToStakedOPTY(
            contracts[action.contract].address,
          );
          stakingVaultToUserStakedOPTYBefore = await contracts["optyStakingRateBalancer"].stakingVaultToUserStakedOPTY(
            contracts[action.contract].address,
            await signers["owner"].getAddress(),
          );
        }

        await setAndCleanActions(smockRegistry, contracts, action, signers);
      }
      for (let i = 0; i < story.getActions.length; i++) {
        const action = story.getActions[i];
        switch (action.action) {
          case "stakingVaultMultipliers(address)": {
            const { addressName }: ARGUMENTS = action.args;
            if (addressName) {
              expect(await contracts[action.contract][action.action](contracts[addressName].address)).to.be.equal(
                action.expectedValue,
              );
            }
            assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "stakingVaultOPTYAllocation()": {
            expect(await contracts[action.contract][action.action]()).to.be.equal(action.expectedValue);
            break;
          }
          case "stakingVaultToStakedOPTY(address)": {
            const { addressName }: ARGUMENTS = action.args;
            if (addressName) {
              if (action.expectedValue === ">") {
                expect(await contracts[action.contract][action.action](contracts[addressName].address)).to.be.gt(
                  stakingVaultToStakedOPTYBefore,
                );
              } else {
                expect(await contracts[action.contract][action.action](contracts[addressName].address)).to.be.lt(
                  stakingVaultToStakedOPTYBefore,
                );
              }
            }
            assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "stakingVaultToUserStakedOPTY(address,address)": {
            const { addressName }: ARGUMENTS = action.args;
            if (addressName) {
              if (action.expectedValue === ">") {
                expect(
                  await contracts[action.contract][action.action](
                    contracts[addressName].address,
                    await signers["owner"].getAddress(),
                  ),
                ).to.be.gt(stakingVaultToUserStakedOPTYBefore);
              } else {
                expect(
                  await contracts[action.contract][action.action](
                    contracts[addressName].address,
                    await signers["owner"].getAddress(),
                  ),
                ).to.be.lt(stakingVaultToUserStakedOPTYBefore);
              }
            }
            assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "checkInitialize": {
            expect(await contracts[action.contract].stakingVault1DLockingTerm()).to.be.equal(
              contracts["dummyOptyStakingVaultEmptyContract"].address,
            );
            expect(await contracts[action.contract].stakingVault30DLockingTerm()).to.be.equal(
              contracts["dummyOptyStakingVaultEmptyContract"].address,
            );
            expect(await contracts[action.contract].stakingVault60DLockingTerm()).to.be.equal(
              contracts["dummyOptyStakingVaultEmptyContract"].address,
            );
            expect(await contracts[action.contract].stakingVault180DLockingTerm()).to.be.equal(
              contracts["dummyOptyStakingVaultEmptyContract"].address,
            );
            expect(
              await contracts[action.contract].stakingVaults(contracts["dummyOptyStakingVaultEmptyContract"].address),
            ).to.be.equal(true);
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
        await setAndCleanActions(smockRegistry, contracts, action, signers);
      }
    });
  }
});

async function setAndCleanActions(
  smockRegistry: MockContract,
  contracts: CONTRACTS,
  action: any,
  signers: { [key: string]: Signer },
) {
  switch (action.action) {
    case "initialize(address,address,address,address)": {
      await contracts["optyStakingRateBalancer"]
        .connect(signers[action.executor])
        [action.action](
          contracts["dummyOptyStakingVaultEmptyContract"].address,
          contracts["dummyOptyStakingVaultEmptyContract"].address,
          contracts["dummyOptyStakingVaultEmptyContract"].address,
          contracts["dummyOptyStakingVaultEmptyContract"].address,
        );
      break;
    }
    case "updateOptyRates(address)": {
      if (action.expect === "success") {
        await contracts[action.contract][action.action](contracts["optyStakingRateBalancer"].address);
        const stakingVaultLockingTerm: BigNumber = await contracts["optyStakingRateBalancer"].stakingVaultToStakedOPTY(
          contracts["dummyOptyStakingVaultEmptyContract"].address,
        );
        const weightedLockingTermStakedOPTY: BigNumber = (
          await contracts["optyStakingRateBalancer"].stakingVaultMultipliers(
            contracts["dummyOptyStakingVaultEmptyContract"].address,
          )
        ).mul(stakingVaultLockingTerm);
        const totalWeight = weightedLockingTermStakedOPTY.mul(4);
        const stakingVaultOPTYAllocation: BigNumber = await contracts[
          "optyStakingRateBalancer"
        ].stakingVaultOPTYAllocation();
        const expectedRateLock = stakingVaultOPTYAllocation.mul(weightedLockingTermStakedOPTY).div(totalWeight);

        expect(await contracts[action.contract].rateLock()).to.be.equal(expectedRateLock);
      } else {
        await expect(
          contracts[action.contract][action.action](contracts["optyStakingRateBalancer"].address),
        ).to.be.revertedWith(action.message);
      }

      break;
    }
    case "updateStakedOPTY(address,uint256)":
    case "updateUnstakedOPTY(address,uint256)": {
      const { amount }: ARGUMENTS = action.args;
      if (amount) {
        if (action.expect === "success") {
          await contracts[action.contract][action.action](contracts["optyStakingRateBalancer"].address, amount);
        } else {
          await expect(
            contracts[action.contract][action.action](contracts["optyStakingRateBalancer"].address, amount),
          ).to.be.revertedWith(action.message);
        }
      }
      assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
      break;
    }
    case "initData()": {
      contracts["optyStakingRateBalancer"] = await deployOptyStakingRateBalancer(
        hre,
        signers["owner"],
        TESTING_DEPLOYMENT_ONCE,
        smockRegistry.address,
      );
      await initDefaultData(contracts, OPTY_STAKING_RATE_BALANCER_DEFAULT_DATA, signers["owner"]);
      break;
    }
    case "setFinanceOperator(address)": {
      const { addressName }: ARGUMENTS = action.args;
      if (addressName) {
        const newFinanceOperatorAddress = await signers[addressName].getAddress();
        smockRegistry.getFinanceOperator.returns(newFinanceOperatorAddress);
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
        [smockRegistry.address],
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
