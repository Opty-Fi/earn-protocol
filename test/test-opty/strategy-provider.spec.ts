import chai, { expect, assert } from "chai";
import hre from "hardhat";
import { Contract } from "ethers";
import { solidity } from "ethereum-waffle";
import { CONTRACTS } from "../../helpers/type";
import { generateStrategyHash, deployContract, generateTokenHash } from "../../helpers/helpers";
import {
  TESTING_DEPLOYMENT_ONCE,
  ESSENTIAL_CONTRACTS,
  TESTING_CONTRACTS,
  RISK_PROFILES,
} from "../../helpers/constants";
import { deployRegistry } from "../../helpers/contracts-deployments";
import scenario from "./scenarios/strategy-provider.json";
import { approveAndSetTokenHashToTokens, addRiskProfile } from "../../helpers/contracts-actions";
import { TypedStrategies, TypedTokens } from "../../helpers/data";

chai.use(solidity);

type ARGUMENTS = {
  riskProfileCode?: string;
  strategyName?: string;
  tokenName?: string;
  defaultStrategyState?: number;
  vaultRewardStrategy?: number[];
  newStrategyOperator?: string;
  isNonApprovedToken?: boolean;
};

describe(scenario.title, () => {
  let contracts: CONTRACTS = {};
  let signers: any;
  let DUMMY_VAULT_EMPTY_CONTRACT: Contract;
  let vaultRewardTokenHash: string;
  const usedToken = TypedTokens["DAI"];
  const nonApprovedToken = TypedTokens["USDC"];
  const usedTokenHash = generateTokenHash([usedToken]);
  const nonApprovedTokenHash = generateTokenHash([nonApprovedToken]);
  const usedStrategy = TypedStrategies.filter(strategy => strategy.strategyName == "DAI-deposit-COMPOUND-cDAI")[0]
    .strategy;
  const strategyHash = generateStrategyHash(usedStrategy, usedToken);
  before(async () => {
    try {
      const [owner, user1] = await hre.ethers.getSigners();
      const strategyOperator = owner;
      signers = { owner, strategyOperator, user1 };
      const registry = await deployRegistry(hre, owner, TESTING_DEPLOYMENT_ONCE);
      DUMMY_VAULT_EMPTY_CONTRACT = await deployContract(
        hre,
        TESTING_CONTRACTS.TEST_DUMMY_EMPTY_CONTRACT,
        TESTING_DEPLOYMENT_ONCE,
        owner,
        [],
      );
      const DAI_TOKEN = TypedTokens["DAI"];

      await addRiskProfile(
        registry,
        owner,
        RISK_PROFILES[1].code,
        RISK_PROFILES[1].name,
        RISK_PROFILES[1].symbol,
        RISK_PROFILES[1].canBorrow,
        RISK_PROFILES[1].poolRating,
      );

      await registry["approveToken(address)"](DAI_TOKEN);
      await registry["setTokensHashToTokens(address[])"]([DAI_TOKEN]);

      const strategyProvider = await deployContract(
        hre,
        ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER,
        TESTING_DEPLOYMENT_ONCE,
        owner,
        [registry.address],
      );

      const COMP_TOKEN = TypedTokens["COMP"];
      vaultRewardTokenHash = generateTokenHash([DUMMY_VAULT_EMPTY_CONTRACT.address, COMP_TOKEN]);
      await approveAndSetTokenHashToTokens(
        signers["owner"],
        registry,
        [DUMMY_VAULT_EMPTY_CONTRACT.address, COMP_TOKEN],
        false,
      );
      contracts = { registry, strategyProvider };
    } catch (error: any) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenario.stories.length; i++) {
    const story = scenario.stories[i];
    it(`${story.description}`, async () => {
      for (let i = 0; i < story.setActions.length; i++) {
        const action: any = story.setActions[i];
        await setAndCleanActions(action);
      }
      for (let i = 0; i < story.getActions.length; i++) {
        const action: any = story.getActions[i];
        switch (action.action) {
          case "rpToTokenToDefaultStrategy(uint256,bytes32)":
          case "rpToTokenToBestStrategy(uint256,bytes32)": {
            const { riskProfileCode, tokenName }: ARGUMENTS = action.args;
            if (riskProfileCode && tokenName) {
              const expectedStrategyHash = generateStrategyHash(
                TypedStrategies.filter(strategy => strategy.strategyName == action.expectedValue.strategyName)[0]
                  .strategy,
                TypedTokens[action.expectedValue.tokenName],
              );
              expect(
                await contracts[action.contract][action.action](
                  riskProfileCode,
                  generateTokenHash([TypedTokens[tokenName]]),
                ),
              ).to.be.equal(expectedStrategyHash);
            }
            assert.isDefined(riskProfileCode, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "vaultRewardTokenHashToVaultRewardTokenStrategy(bytes32)": {
            const value = await contracts[action.contract][action.action](vaultRewardTokenHash);
            expect([+value[0]._hex, +value[1]._hex]).to.have.members(action.expectedValue.vaultRewardStrategy);
            break;
          }
          case "defaultStrategyState()": {
            expect(await contracts[action.contract][action.action]()).to.be.equal(
              action.expectedValue.defaultStrategyState,
            );
            break;
          }
        }
      }
      for (let i = 0; i < story.cleanActions.length; i++) {
        const action: any = story.cleanActions[i];
        await setAndCleanActions(action);
      }
    });
  }

  async function setAndCleanActions(action: any) {
    switch (action.action) {
      case "setStrategyOperator(address)": {
        const { newStrategyOperator }: ARGUMENTS = action.args;
        const tempNewStrategyOperatorrAddr = await signers[<any>newStrategyOperator].getAddress();
        if (newStrategyOperator) {
          if (action.expect === "success") {
            await contracts[action.contract]
              .connect(signers[action.executor])
              [action.action](tempNewStrategyOperatorrAddr);
          } else {
            await expect(
              contracts[action.contract].connect(signers[action.executor])[action.action](tempNewStrategyOperatorrAddr),
            ).to.be.revertedWith(action.message);
          }
        }
        assert.isDefined(newStrategyOperator, `args is wrong in ${action.action} testcase`);
        break;
      }
      case "setVaultRewardStrategy(bytes32,(uint256,uint256))": {
        const { vaultRewardStrategy, isNonApprovedToken }: ARGUMENTS = action.args;
        if (Array.isArray(vaultRewardStrategy) && vaultRewardStrategy.length > 0) {
          if (action.expect === "success") {
            await contracts[action.contract]
              .connect(signers[action.executor])
              [action.action](vaultRewardTokenHash, vaultRewardStrategy);
          } else {
            await expect(
              contracts[action.contract]
                .connect(signers[action.executor])
                [action.action](isNonApprovedToken ? nonApprovedTokenHash : vaultRewardTokenHash, vaultRewardStrategy),
            ).to.be.revertedWith(action.message);
          }
        }
        assert.isDefined(vaultRewardStrategy, `args is wrong in ${action.action} testcase`);
        break;
      }
      case "setBestStrategy(uint256,bytes32,bytes32)":
      case "setBestDefaultStrategy(uint256,bytes32,bytes32)": {
        const { riskProfileCode, isNonApprovedToken }: ARGUMENTS = action.args;
        if (riskProfileCode) {
          if (action.expect === "success") {
            await contracts[action.contract]
              .connect(signers[action.executor])
              [action.action](riskProfileCode, usedTokenHash, strategyHash);
          } else {
            await expect(
              contracts[action.contract]
                .connect(signers[action.executor])
                [action.action](
                  riskProfileCode,
                  isNonApprovedToken ? nonApprovedTokenHash : usedTokenHash,
                  strategyHash,
                ),
            ).to.be.revertedWith(action.message);
          }
        }
        assert.isDefined(riskProfileCode, `args is wrong in ${action.action} testcase`);
        break;
      }
      case "setDefaultStrategyState(uint8)": {
        const { defaultStrategyState }: ARGUMENTS = action.args;
        if (action.expect === "success") {
          await contracts[action.contract].connect(signers[action.executor])[action.action](defaultStrategyState);
        } else {
          await expect(
            contracts[action.contract].connect(signers[action.executor])[action.action](defaultStrategyState),
          ).to.be.revertedWith(action.message);
        }
        assert.isDefined(defaultStrategyState, `args is wrong in ${action.action} testcase`);
        break;
      }
    }
  }
});
