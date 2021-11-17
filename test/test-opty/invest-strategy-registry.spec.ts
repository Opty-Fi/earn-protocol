import chai, { expect, assert } from "chai";
import { solidity } from "ethereum-waffle";
import hre from "hardhat";
import { Contract, Signer } from "ethers";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants/utils";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import scenario from "./scenarios/invest-strategy-registry.json";
import { deployContract, deploySmockContract, generateTokenHash, generateStrategyHash } from "../../helpers/helpers";
import { smock } from "@defi-wonderland/smock";
import { TypedStrategies, TypedTokens } from "../../helpers/data";

chai.use(solidity);

type ARGUMENTS = {
  mismatchLength?: boolean;
};

describe(scenario.title, () => {
  let investStrategyRegistryContract: Contract;
  let ownerAddress: string;
  let users: { [key: string]: Signer } = {};
  const usedStrategy = TypedStrategies.filter(strategy => strategy.strategyName === "DAI-deposit-COMPOUND-cDAI")[0]
    .strategy;
  const usedStrategy_2 = TypedStrategies.filter(strategy => strategy.strategyName === "DAI-deposit-AAVE-aDAI")[0]
    .strategy;
  const convertedStrategies = usedStrategy.map(strategy => [
    strategy.contract,
    strategy.outputToken,
    strategy.isBorrow,
  ]);
  const convertedStrategies_2 = usedStrategy_2.map(strategy => [
    strategy.contract,
    strategy.outputToken,
    strategy.isBorrow,
  ]);
  const usedToken = TypedTokens["DAI"];
  const usedTokenHash = generateTokenHash([usedToken]);
  const usedStrategyHash = generateStrategyHash(usedStrategy, usedToken);
  before(async () => {
    try {
      const [owner, user1] = await hre.ethers.getSigners();
      users = { owner, user1 };
      ownerAddress = await owner.getAddress();
      const registryContract = await deploySmockContract(smock, ESSENTIAL_CONTRACTS.REGISTRY, []);
      registryContract.getOperator.returns(ownerAddress);
      investStrategyRegistryContract = await deployContract(
        hre,
        ESSENTIAL_CONTRACTS.INVEST_STRATEGY_REGISTRY,
        TESTING_DEPLOYMENT_ONCE,
        owner,
        [registryContract.address],
      );

      assert.isDefined(registryContract, "Registry contract not deployed");
      assert.isDefined(investStrategyRegistryContract, "investStrategyRegistry contract not deployed");
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
          case "setStrategy(bytes32,(address,address,bool)[])": {
            if (action.expect === "success") {
              await expect(
                investStrategyRegistryContract
                  .connect(users[action.executer])
                  [action.action](usedTokenHash, convertedStrategies),
              )
                .to.emit(investStrategyRegistryContract, "LogSetVaultInvestStrategy")
                .withArgs(usedTokenHash, usedStrategyHash, ownerAddress);
            } else {
              await expect(
                investStrategyRegistryContract
                  .connect(users[action.executer])
                  [action.action](usedTokenHash, convertedStrategies),
              ).to.be.revertedWith(action.message);
            }
            break;
          }
          case "setStrategy(bytes32[],(address,address,bool)[][])": {
            const { mismatchLength }: ARGUMENTS = action.args;
            if (action.expect === "success") {
              await expect(
                investStrategyRegistryContract
                  .connect(users[action.executer])
                  [action.action]([usedTokenHash], [convertedStrategies]),
              )
                .to.emit(investStrategyRegistryContract, "LogSetVaultInvestStrategy")
                .withArgs(usedTokenHash, usedStrategyHash, ownerAddress);
            } else {
              await expect(
                investStrategyRegistryContract
                  .connect(users[action.executer])
                  [action.action](
                    [usedTokenHash],
                    mismatchLength ? [convertedStrategies, convertedStrategies_2] : [convertedStrategies],
                  ),
              ).to.be.revertedWith(action.message);
            }
            break;
          }
          default:
            break;
        }
      }

      for (let i = 0; i < story.getActions.length; i++) {
        const action = story.getActions[i];
        switch (action.action) {
          case "getStrategy(bytes32)": {
            const { _index, _strategySteps } = await investStrategyRegistryContract[action.action](usedStrategyHash);
            expect(_index).to.be.equal(0);
            expect(_strategySteps[0][0]).to.be.equal(usedStrategy[0].contract);
            expect(_strategySteps[0][1]).to.be.equal(usedStrategy[0].outputToken);
            expect(_strategySteps[0][2]).to.be.equal(usedStrategy[0].isBorrow);
            break;
          }
          default:
            break;
        }
      }
    });
  }
});
