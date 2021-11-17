import { expect, assert } from "chai";
import hre from "hardhat";
import { Signer, Contract, BigNumber } from "ethers";
import { CONTRACTS, MOCK_CONTRACTS } from "../../helpers/type";
import scenario from "./scenarios/opty-staking-vault.json";
import testStakingVaultScenario from "./scenarios/test-opty-staking-vault.json";
import { deployRegistry, deployEssentialContracts } from "../../helpers/contracts-deployments";
import { getBlockTimestamp, unpauseVault } from "../../helpers/contracts-actions";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants/utils";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { TESTING_CONTRACTS } from "../../helpers/constants/test-contracts-name";
import { smock } from "@defi-wonderland/smock";
import { deploySmockContract, deployContract, executeFunc, moveToSpecificBlock } from "../../helpers/helpers";
import { TypedTokens } from "../../helpers/data";

type ARGUMENTS = {
  token?: string;
  OPTYDistributor?: string;
  rate?: string;
  OPTYStakingRateBalancer?: string;
  spender?: string;
  stakedOPTY?: string;
};

type TEST_STAKING_VAULT_ARGUMENTS = {
  executer?: string;
  value?: string;
};

describe(scenario.title, () => {
  let essentialContracts: CONTRACTS;
  const contracts: CONTRACTS = {};
  let users: { [key: string]: Signer };
  before(async () => {
    try {
      const [owner, user1] = await hre.ethers.getSigners();
      users = { owner, user1 };
      essentialContracts = await deployEssentialContracts(hre, owner, TESTING_DEPLOYMENT_ONCE);
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
      contracts["stakingVault1D"] = essentialContracts.optyStakingVault1D;
      contracts["stakingVault30D"] = essentialContracts.optyStakingVault30D;
      contracts["stakingVault60D"] = essentialContracts.optyStakingVault60D;
      contracts["stakingVault180D"] = essentialContracts.optyStakingVault180D;
      const stakingVaultNames = Object.keys(contracts);
      for (let i = 0; i < stakingVaultNames.length; i++) {
        await unpauseVault(owner, essentialContracts.registry, contracts[stakingVaultNames[i]].address, true);
      }
      contracts["opty"] = essentialContracts.opty;
    } catch (error: any) {
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
            expect(await contracts[action.contract][action.action]()).to.be.equal(action.expectedValue);
            break;
          }
          case "balance()": {
            expect(await contracts[action.contract][action.action]()).to.be.equal(action.expectedValue);
            break;
          }
          case "balanceOf(address)": {
            expect(await contracts[action.contract][action.action](users["owner"].getAddress())).to.be.equal(
              action.expectedValue,
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

describe(testStakingVaultScenario.title, () => {
  let mockContracts: MOCK_CONTRACTS = {};
  let registry: Contract;
  let optyStakingVault: Contract;
  let users: { [key: string]: Signer };
  let timestamp: number;
  before(async () => {
    const [owner, user1] = await hre.ethers.getSigners();
    users = { owner, user1 };
    registry = await deployRegistry(hre, owner, TESTING_DEPLOYMENT_ONCE);
    const dummyToken = await deploySmockContract(smock, TESTING_CONTRACTS.TEST_DUMMY_TOKEN, ["TestToken", "TT", 18, 0]);
    const optyDistributor = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.OPTY_DISTRIBUTOR, [
      registry.address,
      dummyToken.address,
      0,
    ]);
    const optyStakingRateBalancer = await deploySmockContract(smock, TESTING_CONTRACTS.TEST_STAKING_RATE_BALANCER, [
      registry.address,
    ]);
    optyStakingVault = await deployContract(hre, ESSENTIAL_CONTRACTS.OPTY_STAKING_VAULT, true, owner, [
      registry.address,
      dummyToken.address,
      86400,
      "1",
    ]);

    mockContracts = { dummyToken, optyDistributor, optyStakingRateBalancer };
    await executeFunc(registry, owner, "setOPTY(address)", [dummyToken.address]);
    await expect(registry["setOPTYDistributor(address)"](optyDistributor.address))
      .to.emit(registry, "TransferOPTYDistributor")
      .withArgs(optyDistributor.address, await owner.getAddress());
    await executeFunc(registry, owner, "setOPTYStakingRateBalancer(address)", [optyStakingRateBalancer.address]);
    await unpauseVault(owner, registry, optyStakingVault.address, true);
    await mockContracts["optyStakingRateBalancer"].updateStakedOPTY.returns(true);
    await mockContracts["optyStakingRateBalancer"].updateUnstakedOPTY.returns(true);
    await mockContracts["optyStakingRateBalancer"].updateOptyRates.returns(true);
    await mockContracts["optyDistributor"].mintOpty.returns();
  });

  describe(testStakingVaultScenario.description, () => {
    for (let i = 0; i < testStakingVaultScenario.stories.length; i++) {
      const story = testStakingVaultScenario.stories[i];
      it(`${story.description}`, async () => {
        for (let i = 0; i < story.setActions.length; i++) {
          const action = story.setActions[i];
          switch (action.action) {
            case "fundWalletOPTY": {
              await mockContracts.dummyToken.mint(await users["owner"].getAddress(), BigNumber.from(10).pow(18));
              break;
            }
            case "setOptyRatePerSecond(uint256)": {
              const { executer, value } = action.args as TEST_STAKING_VAULT_ARGUMENTS;
              if (action.expect === "success") {
                await hre.network.provider.request({
                  method: "hardhat_impersonateAccount",
                  params: [mockContracts.optyStakingRateBalancer.address],
                });
                await users["owner"].sendTransaction({
                  to: mockContracts.optyStakingRateBalancer.address,
                  value: hre.ethers.utils.parseEther("1.0"),
                });
                const optyStakingRateBalancerSigner = await hre.ethers.getSigner(
                  mockContracts.optyStakingRateBalancer.address,
                );
                await optyStakingVault.connect(optyStakingRateBalancerSigner)[action.action](value);
              } else {
                await expect(optyStakingVault.connect(users[executer!])[action.action](value)).to.be.revertedWith(
                  action.message,
                );
              }
              break;
            }
            case "userStakeAll()": {
              const { executer } = action.args as TEST_STAKING_VAULT_ARGUMENTS;
              await mockContracts.dummyToken
                .connect(users["owner"])
                .approve(
                  optyStakingVault.address,
                  await mockContracts.dummyToken.balanceOf(users["owner"].getAddress()),
                );
              await optyStakingVault.connect(users[executer!])[action.action]();
              break;
            }
            case "userStake(uint256)": {
              const { executer, value } = action.args as TEST_STAKING_VAULT_ARGUMENTS;
              await mockContracts.dummyToken.connect(users["owner"]).approve(optyStakingVault.address, value);
              await optyStakingVault.connect(users[executer!])[action.action](value);
              break;
            }
            case "userUnstakeAll()": {
              const { executer } = action.args as TEST_STAKING_VAULT_ARGUMENTS;
              const blockNumber = await hre.ethers.provider.getBlockNumber();
              const block = await hre.ethers.provider.getBlock(blockNumber);
              await moveToSpecificBlock(hre, block.timestamp + 86400);
              await optyStakingVault
                .connect(users["owner"])
                .approve(optyStakingVault.address, await optyStakingVault.balanceOf(users["owner"].getAddress()));
              await optyStakingVault.connect(users[executer!])[action.action]();
              break;
            }
            case "userUnstake(uint256)": {
              const { executer, value } = action.args as TEST_STAKING_VAULT_ARGUMENTS;
              const blockNumber = await hre.ethers.provider.getBlockNumber();
              const block = await hre.ethers.provider.getBlock(blockNumber);
              await moveToSpecificBlock(hre, block.timestamp + 86400);
              await optyStakingVault.connect(users["owner"]).approve(optyStakingVault.address, value);
              await optyStakingVault.connect(users[executer!])[action.action](value);
              break;
            }
            case "setTimelockPeriod(uint256)": {
              const { executer, value } = action.args as TEST_STAKING_VAULT_ARGUMENTS;
              if (action.expect === "success") {
                await optyStakingVault.connect(users[executer!])[action.action](value);
              } else {
                await expect(optyStakingVault.connect(users[executer!])[action.action](value)).to.be.revertedWith(
                  action.message,
                );
              }
              break;
            }
            case "setToken(address)": {
              const { executer, value } = action.args as TEST_STAKING_VAULT_ARGUMENTS;
              if (action.expect === "success") {
                await optyStakingVault.connect(users[executer!])[action.action](mockContracts[value!].address);
              } else {
                await expect(
                  optyStakingVault.connect(users[executer!])[action.action](await users[executer!].getAddress()),
                ).to.be.revertedWith(action.message);
              }
              break;
            }
            case "updatePool()": {
              await optyStakingVault[action.action]();
              const blockNumber = await hre.ethers.provider.getBlockNumber();
              const block = await hre.ethers.provider.getBlock(blockNumber);
              timestamp = block.timestamp;
              break;
            }
          }
        }
        for (let i = 0; i < story.getActions.length; i++) {
          const action = story.getActions[i];
          switch (action.action) {
            case "balanceOf(address)": {
              const { executer } = action.args as TEST_STAKING_VAULT_ARGUMENTS;
              if (action.contract === "optyStakingVault") {
                expect(await optyStakingVault[action.action](await users[executer!].getAddress())).to.be.eq(
                  action.expectedValue,
                );
              } else {
                action.expectedValue === ">0"
                  ? expect(await mockContracts[action.contract][action.action](users[executer!].getAddress())).to.be.gt(
                      0,
                    )
                  : expect(await mockContracts[action.contract][action.action](users[executer!].getAddress())).to.be.eq(
                      0,
                    );
              }
              break;
            }
            case "getPricePerFullShare()": {
              expect(await optyStakingVault[action.action]()).to.be.eq(action.expectedValue);
              break;
            }
            case "balanceInOpty(address)": {
              const { executer } = action.args as TEST_STAKING_VAULT_ARGUMENTS;
              expect(await optyStakingVault[action.action](users[executer!].getAddress())).to.be.eq(
                action.expectedValue,
              );
              break;
            }
            case "timelockPeriod()": {
              expect(await optyStakingVault[action.action]()).to.be.eq(action.expectedValue);
              break;
            }
            case "token()": {
              expect(await optyStakingVault[action.action]()).to.be.eq(mockContracts[action.expectedValue].address);
              break;
            }
            case "lastPoolUpdate()": {
              expect(await optyStakingVault[action.action]()).to.be.eq(timestamp);
              break;
            }
          }
        }
        for (let i = 0; i < story.cleanActions.length; i++) {
          const action = story.cleanActions[i];
          switch (action.action) {
            case "userUnstakeAll()": {
              const { executer } = action.args as TEST_STAKING_VAULT_ARGUMENTS;
              const blockNumber = await hre.ethers.provider.getBlockNumber();
              const block = await hre.ethers.provider.getBlock(blockNumber);
              await moveToSpecificBlock(hre, block.timestamp + 86400);
              await optyStakingVault.connect(users[executer!])[action.action]();
              expect(await optyStakingVault.balanceOf(users[executer!].getAddress())).to.be.eq(0);
              break;
            }
            case "burnOPTY": {
              const { executer } = action.args as TEST_STAKING_VAULT_ARGUMENTS;
              const balanceInOPTY = await mockContracts.dummyToken.balanceOf(users[executer!].getAddress());
              await mockContracts.dummyToken.connect(users[executer!]).transfer(TypedTokens.ETH, balanceInOPTY);
              expect(await optyStakingVault.balanceOf(users[executer!].getAddress())).to.be.eq(0);
              break;
            }
          }
        }
      });
    }
  });
});
