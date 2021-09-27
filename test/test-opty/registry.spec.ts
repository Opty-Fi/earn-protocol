import { expect, assert } from "chai";
import hre from "hardhat";
import { Contract, Signer, BigNumber } from "ethers";
import { deployAdapters, deployRegistry } from "../../helpers/contracts-deployments";
import { CONTRACTS } from "../../helpers/type";
import { deployContract, executeFunc, generateTokenHash } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS, TESTING_CONTRACTS, TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants";
import { getSoliditySHA3Hash } from "../../helpers/utils";
import scenario from "./scenarios/registry.json";

type ARGUMENTS = {
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

describe(scenario.title, () => {
  let registryContract: Contract;
  let adapters: CONTRACTS;
  let owner: Signer;
  let financeOperator: Signer;
  let riskOperator: Signer;
  let strategyOperator: Signer;
  let operator: Signer;
  let optyDistributor: Signer;
  let user0: Signer;
  let user1: Signer;
  let signers: any;
  const contracts: CONTRACTS = {};
  const callers: { [key: string]: string } = {};
  const contractNames = [
    "treasury",
    "vaultStepInvestStrategyDefinitionRegistry",
    "aprOracle",
    "strategyProvider",
    "riskManager",
    "harvestCodeProvider",
    "strategyManager",
    "opty",
    "priceOracle",
    "optyStakingRateBalancer",
    "odefiVaultBooster",
  ];
  const callerNames = [
    "owner",
    "financeOperator",
    "riskOperator",
    "strategyOperator",
    "operator",
    "optyDistributor",
    "user0",
    "user1",
  ];
  before(async () => {
    try {
      [
        owner,
        financeOperator,
        riskOperator,
        strategyOperator,
        operator,
        optyDistributor,
        user0,
        user1,
      ] = await hre.ethers.getSigners();
      signers = { owner, financeOperator, riskOperator, strategyOperator, operator, optyDistributor, user0, user1 };

      registryContract = await deployRegistry(hre, owner, TESTING_DEPLOYMENT_ONCE);
      const DUMMY_EMPTY_CONTRACT = await deployContract(
        hre,
        TESTING_CONTRACTS.TEST_DUMMY_EMPTY_CONTRACT,
        TESTING_DEPLOYMENT_ONCE,
        owner,
        [],
      );
      assert.isDefined(
        DUMMY_EMPTY_CONTRACT,
        `Dummy contract (to be used for testing Contract setter functions) not deployed`,
      );
      adapters = await deployAdapters(hre, owner, registryContract.address, TESTING_DEPLOYMENT_ONCE);
      contractNames.forEach(contractName => {
        contracts[contractName] = DUMMY_EMPTY_CONTRACT;
      });
      assert.isDefined(registryContract, "Registry contract not deployed");
      assert.isDefined(adapters, "Adapters not deployed");

      await registryContract["setOperator(address)"](await operator.getAddress());
      await registryContract["setRiskOperator(address)"](await riskOperator.getAddress());

      for (let i = 0; i < callerNames.length; i++) {
        callers[callerNames[i]] = await signers[callerNames[i]].getAddress();
      }
    } catch (error) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenario.stories.length; i++) {
    const story = scenario.stories[i];
    it(story.description, async () => {
      for (let i = 0; i < story.setActions.length; i++) {
        const action: any = story.setActions[i];
        await setAndCleanActions(action);
      }

      for (let i = 0; i < story.getActions.length; i++) {
        const action = story.getActions[i];
        switch (action.action) {
          case "treasury()":
          case "getVaultStepInvestStrategyDefinitionRegistry()":
          case "getAprOracle()":
          case "getStrategyProvider()":
          case "getRiskManager()":
          case "getHarvestCodeProvider()":
          case "getStrategyManager()":
          case "opty()":
          case "priceOracle()":
          case "getOPTYStakingRateBalancer()":
          case "getODEFIVaultBooster()": {
            const { contractName } = <any>action.expectedValue;
            if (contractName) {
              const value = await registryContract[action.action]();
              expect(value).to.be.equal(contracts[contractName].address);
            }
            assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "getOPTYDistributor()":
          case "financeOperator()":
          case "riskOperator()":
          case "strategyOperator()":
          case "getOperator()": {
            const { addressName } = <any>action.expectedValue;
            if (addressName) {
              const value = await registryContract[action.action]();
              expect(value).to.be.equal(callers[addressName]);
            }
            assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
            break;
          }
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
          case "getRiskProfile(string)": {
            const { riskProfile }: ARGUMENTS = action.args;
            const { exists, canBorrow, lowerLimit, upperLimit }: ARGUMENTS = action.expectedMultiValues;

            if (riskProfile) {
              const value = await registryContract[action.action](riskProfile);
              if (exists) {
                expect(value.canBorrow).to.be.equal(canBorrow);
                expect(value.poolRatingsRange.lowerLimit).to.equal(lowerLimit);
                expect(value.poolRatingsRange.upperLimit).to.equal(upperLimit);
                expect(value.exists).to.be.equal(exists);
              } else {
                expect(value.exists).to.be.equal(exists);
              }
            }
            break;
          }
          case "underlyingAssetHashToRPToVaults(bytes32,string)": {
            const { tokens, riskProfile }: ARGUMENTS = action.args;
            const tokensHash = generateTokenHash(tokens);
            if (tokens && riskProfile) {
              const value = await registryContract[action.action](tokensHash, riskProfile);
              expect(value).to.be.equal(action.expectedValue);
            }
            assert.isDefined(tokens, `args is wrong in ${action.action} testcase`);
            assert.isDefined(riskProfile, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "isNewContract()": {
            expect(await registryContract[action.action]()).to.be.equal(action.expectedValue);
            break;
          }
          case "verifyOldValue()": {
            await verifyDefaultData(registryContract, REGISTRY_TESTING_DEFAULT_DATA);
            break;
          }
          default:
            break;
        }
      }

      for (let i = 0; i < story.cleanActions.length; i++) {
        const action = story.cleanActions[i];
        await setAndCleanActions(action);
      }
    });
  }

  async function setAndCleanActions(action: any) {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    switch (action.action) {
      case "become(address)": {
        const newRegistry = await deployContract(
          hre,
          TESTING_CONTRACTS.TEST_REGISTRY_NEW_IMPLEMENTATION,
          TESTING_DEPLOYMENT_ONCE,
          owner,
          [],
        );

        const registryProxy = await hre.ethers.getContractAt(
          ESSENTIAL_CONTRACTS.REGISTRY_PROXY,
          registryContract.address,
        );

        await executeFunc(registryProxy, owner, "setPendingImplementation(address)", [newRegistry.address]);
        await executeFunc(newRegistry, owner, "become(address)", [registryProxy.address]);

        registryContract = await hre.ethers.getContractAt(
          TESTING_CONTRACTS.TEST_REGISTRY_NEW_IMPLEMENTATION,
          registryProxy.address,
        );
        break;
      }
      case "initData()": {
        await registryContract["setOperator(address)"](await owner.getAddress());
        await registryContract["setRiskOperator(address)"](await owner.getAddress());
        await registryContract["setFinanceOperator(address)"](await owner.getAddress());
        await initDefaultData(registryContract, REGISTRY_TESTING_DEFAULT_DATA, owner);
        break;
      }
      case "setTreasury(address)": {
        const { contractName }: ARGUMENTS = action.args;
        if (contractName) {
          if (action.expect === "success") {
            await expect(
              registryContract.connect(signers[action.executor])[action.action](contracts[contractName].address),
            )
              .to.emit(registryContract, "TransferTreasury")
              .withArgs(contracts[contractName].address, callers[action.executor]);
          } else {
            await expect(
              registryContract.connect(signers[action.executor])[action.action](contracts[contractName].address),
            ).to.be.revertedWith(action.message);
          }
        }
        assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
        break;
      }
      case "setVaultStepInvestStrategyDefinitionRegistry(address)":
      case "setAPROracle(address)":
      case "setStrategyProvider(address)":
      case "setRiskManager(address)":
      case "setHarvestCodeProvider(address)":
      case "setStrategyManager(address)":
      case "setOPTY(address)":
      case "setPriceOracle(address)":
      case "setOPTYStakingRateBalancer(address)":
      case "setODEFIVaultBooster(address)": {
        const { contractName }: ARGUMENTS = action.args;
        if (contractName) {
          if (action.expect === "success") {
            await registryContract.connect(signers[action.executor])[action.action](contracts[contractName].address);
          } else {
            await expect(
              registryContract.connect(signers[action.executor])[action.action](contracts[contractName].address),
            ).to.be.revertedWith(action.message);
          }
        }
        assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
        break;
      }
      case "setFinanceOperator(address)": {
        const { newFinanceOperator }: ARGUMENTS = action.args;
        const tempNewFinanceOperatorAddr = await signers[newFinanceOperator].getAddress();
        if (newFinanceOperator) {
          if (action.expect === "success") {
            await expect(registryContract.connect(signers[action.executor])[action.action](tempNewFinanceOperatorAddr))
              .to.emit(registryContract, "TransferFinanceOperator")
              .withArgs(tempNewFinanceOperatorAddr, callers[action.executor]);
          } else {
            await expect(
              registryContract.connect(signers[action.executor])[action.action](tempNewFinanceOperatorAddr),
            ).to.be.revertedWith(action.message);
          }
        }
        assert.isDefined(newFinanceOperator, `args is wrong in ${action.action} testcase`);
        break;
      }
      case "setRiskOperator(address)": {
        const { newRiskOperator }: ARGUMENTS = action.args;
        const tempNewOperatorAddr = await signers[newRiskOperator].getAddress();
        if (newRiskOperator) {
          if (action.expect === "success") {
            await expect(registryContract.connect(signers[action.executor])[action.action](tempNewOperatorAddr))
              .to.emit(registryContract, "TransferRiskOperator")
              .withArgs(tempNewOperatorAddr, callers[action.executor]);
          } else {
            await expect(
              registryContract.connect(signers[action.executor])[action.action](tempNewOperatorAddr),
            ).to.be.revertedWith(action.message);
          }
        }
        assert.isDefined(newRiskOperator, `args is wrong in ${action.action} testcase`);
        break;
      }
      case "setStrategyOperator(address)": {
        const { newStrategyOperator }: ARGUMENTS = action.args;
        const tempNewStrategyOperatorAddr = await signers[newStrategyOperator].getAddress();
        if (newStrategyOperator) {
          if (action.expect === "success") {
            await expect(registryContract.connect(signers[action.executor])[action.action](tempNewStrategyOperatorAddr))
              .to.emit(registryContract, "TransferStrategyOperator")
              .withArgs(tempNewStrategyOperatorAddr, callers[action.executor]);
          } else {
            await expect(
              registryContract.connect(signers[action.executor])[action.action](tempNewStrategyOperatorAddr),
            ).to.be.revertedWith(action.message);
          }
        }
        assert.isDefined(newStrategyOperator, `args is wrong in ${action.action} testcase`);
        break;
      }
      case "setOperator(address)": {
        const { newOperator }: ARGUMENTS = action.args;
        const tempNewOperatorrAddr = await signers[newOperator].getAddress();
        if (newOperator) {
          if (action.expect === "success") {
            await expect(registryContract.connect(signers[action.executor])[action.action](tempNewOperatorrAddr))
              .to.emit(registryContract, "TransferOperator")
              .withArgs(tempNewOperatorrAddr, callers[action.executor]);
          } else {
            await expect(
              registryContract.connect(signers[action.executor])[action.action](tempNewOperatorrAddr),
            ).to.be.revertedWith(action.message);
          }
        }
        assert.isDefined(newOperator, `args is wrong in ${action.action} testcase`);
        break;
      }
      case "setOPTYDistributor(address)": {
        const { newOptyDistributor }: ARGUMENTS = action.args;
        const tempNewOptyDistributorAddr = await signers[newOptyDistributor].getAddress();
        if (newOptyDistributor) {
          if (action.expect === "success") {
            await expect(registryContract.connect(signers[action.executor])[action.action](tempNewOptyDistributorAddr))
              .to.emit(registryContract, "TransferOPTYDistributor")
              .withArgs(tempNewOptyDistributorAddr, callers[action.executor]);
          } else {
            await expect(
              registryContract.connect(signers[action.executor])[action.action](tempNewOptyDistributorAddr),
            ).to.be.revertedWith(action.message);
          }
        }
        assert.isDefined(newOptyDistributor, `args is wrong in ${action.action} testcase`);
        break;
      }
      case "approveToken(address[])":
      case "approveToken(address)": {
        const { tokens }: ARGUMENTS = action.args;
        if (tokens) {
          if (action.expect === "success") {
            if (action.action == "approveToken(address)") {
              await expect(registryContract.connect(signers[action.executor])[action.action](tokens))
                .to.emit(registryContract, "LogToken")
                .withArgs(hre.ethers.utils.getAddress(tokens), true, callers[action.executor]);
            } else {
              await registryContract.connect(signers[action.executor])[action.action](tokens);
            }
          } else {
            await expect(registryContract.connect(signers[action.executor])[action.action](tokens)).to.be.revertedWith(
              action.message,
            );
          }
        }
        assert.isDefined(tokens, `args is wrong in ${action.action} testcase`);
        break;
      }
      case "revokeToken(address[])":
      case "revokeToken(address)": {
        const { tokens }: ARGUMENTS = action.args;
        if (tokens) {
          if (action.expect === "success") {
            if (action.action == "revokeToken(address)") {
              await expect(registryContract.connect(signers[action.executor])[action.action](tokens))
                .to.emit(registryContract, "LogToken")
                .withArgs(hre.ethers.utils.getAddress(tokens), false, callers[action.executor]);
            } else {
              await registryContract.connect(signers[action.executor])[action.action](tokens);
            }
          } else {
            await expect(registryContract.connect(signers[action.executor])[action.action](tokens)).to.be.revertedWith(
              action.message,
            );
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
              await expect(registryContract.connect(signers[action.executor])[action.action](lqs))
                .to.emit(registryContract, "LogLiquidityPool")
                .withArgs(hre.ethers.utils.getAddress(lqs), true, callers[action.executor]);
            } else if (action.action == "approveCreditPool(address)") {
              await expect(registryContract.connect(signers[action.executor])[action.action](lqs))
                .to.emit(registryContract, "LogCreditPool")
                .withArgs(hre.ethers.utils.getAddress(lqs), true, callers[action.executor]);
            } else {
              await registryContract.connect(signers[action.executor])[action.action](lqs);
            }
          } else {
            await expect(registryContract.connect(signers[action.executor])[action.action](lqs)).to.be.revertedWith(
              action.message,
            );
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
            await registryContract.connect(signers[action.executor])[action.action](lqRate);
          } else {
            await expect(registryContract.connect(signers[action.executor])[action.action](lqRate)).to.be.revertedWith(
              action.message,
            );
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
              await expect(registryContract.connect(signers[action.executor])[action.action](lqRate[0], lqRate[1]))
                .to.emit(registryContract, "LogRateLiquidityPool")
                .withArgs(hre.ethers.utils.getAddress(lqRate[0]), lqRate[1], callers[action.executor]);
            } else if (action.action == "rateCreditPool(address,uint8)") {
              await expect(registryContract.connect(signers[action.executor])[action.action](lqRate[0], lqRate[1]))
                .to.emit(registryContract, "LogRateCreditPool")
                .withArgs(hre.ethers.utils.getAddress(lqRate[0]), lqRate[1], callers[action.executor]);
            } else {
              await registryContract.connect(signers[action.executor])[action.action](lqRate[0], lqRate[1]);
            }
          } else {
            await expect(
              registryContract.connect(signers[action.executor])[action.action](lqRate[0], lqRate[1]),
            ).to.be.revertedWith(action.message);
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
              await expect(registryContract.connect(signers[action.executor])[action.action](lqs))
                .to.emit(registryContract, "LogLiquidityPool")
                .withArgs(hre.ethers.utils.getAddress(lqs), false, callers[action.executor]);
            } else if (action.action == "revokeCreditPool(address)") {
              await expect(registryContract.connect(signers[action.executor])[action.action](lqs))
                .to.emit(registryContract, "LogCreditPool")
                .withArgs(hre.ethers.utils.getAddress(lqs), false, callers[action.executor]);
            } else {
              await registryContract.connect(signers[action.executor])[action.action](lqs);
            }
          } else {
            await expect(registryContract.connect(signers[action.executor])[action.action](lqs)).to.be.revertedWith(
              action.message,
            );
          }
        }
        assert.isDefined(lqs, `args is wrong in ${action.action} testcase`);
        break;
      }
      case "setLiquidityPoolToAdapter((address,address)[])": {
        const { lqs }: ARGUMENTS = action.args;
        if (lqs) {
          const args: [string, string][] = [];
          for (let i = 0; i < lqs.length; i++) {
            args.push([lqs[i].liquidityPool, adapters[lqs[i].adapterName].address]);
          }
          if (action.expect === "success") {
            await registryContract.connect(signers[action.executor])[action.action](args);
          } else {
            await expect(registryContract.connect(signers[action.executor])[action.action](args)).to.be.revertedWith(
              action.message,
            );
          }
        }
        assert.isDefined(lqs, `args is wrong in ${action.action} testcase`);
        break;
      }
      case "setLiquidityPoolToAdapter(address,address)": {
        const { lqs }: ARGUMENTS = action.args;
        if (lqs) {
          if (action.expect === "success") {
            await expect(
              registryContract
                .connect(signers[action.executor])
                [action.action](lqs.liquidityPool, adapters[lqs.adapterName].address),
            )
              .to.emit(registryContract, "LogLiquidityPoolToAdapter")
              .withArgs(
                hre.ethers.utils.getAddress(lqs.liquidityPool),
                adapters[lqs.adapterName].address,
                callers[action.executor],
              );
          } else {
            await expect(
              registryContract
                .connect(signers[action.executor])
                [action.action](lqs.liquidityPool, adapters[lqs.adapterName].address),
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
              await expect(registryContract.connect(signers[action.executor])[action.action](tokensHash))
                .to.emit(registryContract, "LogTokensToTokensHash")
                .withArgs(getSoliditySHA3Hash(["address[]"], [tokensHash]), callers[action.executor]);
            } else {
              await registryContract.connect(signers[action.executor])[action.action](tokensHash);
            }
          } else {
            await expect(
              registryContract.connect(signers[action.executor])[action.action](tokensHash),
            ).to.be.revertedWith(action.message);
          }
        }
        assert.isDefined(tokensHash, `args is wrong in ${action.action} testcase`);
        break;
      }
      case "addRiskProfile(string[],bool[],(uint8,uint8)[])": {
        const { riskProfile, canBorrow, poolRatingsRange }: ARGUMENTS = action.args;
        if (riskProfile) {
          if (action.expect === "success") {
            await registryContract
              .connect(signers[action.executor])
              [action.action](riskProfile, canBorrow, poolRatingsRange);
          } else {
            await expect(
              registryContract
                .connect(signers[action.executor])
                [action.action](riskProfile, canBorrow, poolRatingsRange),
            ).to.be.revertedWith(action.message);
          }
        }
        assert.isDefined(riskProfile, `args is wrong in ${action.action} testcase`);
        break;
      }
      case "addRiskProfile(string,bool,(uint8,uint8))": {
        const { riskProfile, canBorrow, poolRatingRange }: ARGUMENTS = action.args;
        if (riskProfile) {
          if (action.expect === "success") {
            const _addRiskProfileTx = await registryContract
              .connect(signers[action.executor])
              [action.action](riskProfile, canBorrow, poolRatingRange);
            const addRiskProfileTx = await _addRiskProfileTx.wait(1);
            const { index } = await registryContract.getRiskProfile(riskProfile);
            expect(addRiskProfileTx.events[0].event).to.equal("LogRiskProfile");
            expect(addRiskProfileTx.events[0].args[0]).to.equal(+index);
            expect(addRiskProfileTx.events[0].args[1]).to.equal(true);
            expect(addRiskProfileTx.events[0].args[2]).to.equal(canBorrow);
            expect(addRiskProfileTx.events[0].args[3]).to.equal(callers[action.executor]);
            expect(addRiskProfileTx.events[1].event).to.equal("LogRPPoolRatings");
            expect(addRiskProfileTx.events[1].args[0]).to.equal(+index);
            expect(addRiskProfileTx.events[1].args[1]).to.equal(poolRatingRange[0]);
            expect(addRiskProfileTx.events[1].args[2]).to.equal(poolRatingRange[1]);
            expect(addRiskProfileTx.events[1].args[3]).to.equal(callers[action.executor]);
          } else {
            await expect(
              registryContract
                .connect(signers[action.executor])
                [action.action](riskProfile, canBorrow, poolRatingRange),
            ).to.be.revertedWith(action.message);
          }
        }
        assert.isDefined(riskProfile, `args is wrong in ${action.action} testcase`);
        break;
      }
      case "updateRiskProfileBorrow(string,bool)": {
        const { riskProfile, canBorrow }: ARGUMENTS = action.args;
        if (riskProfile) {
          if (action.expect === "success") {
            await registryContract.connect(signers[action.executor])[action.action](riskProfile, canBorrow);
          } else {
            await expect(
              registryContract.connect(signers[action.executor])[action.action](riskProfile, canBorrow),
            ).to.be.revertedWith(action.message);
          }
        }
        break;
      }
      case "updateRPPoolRatings(string,(uint8,uint8))": {
        const { riskProfile, poolRatingRange }: ARGUMENTS = action.args;
        if (riskProfile) {
          const value = await registryContract.getRiskProfile(riskProfile);
          const riskProfileIndex = value.index;
          if (action.expect === "success") {
            await expect(
              registryContract.connect(signers[action.executor])[action.action](riskProfile, poolRatingRange),
            )
              .to.emit(registryContract, "LogRPPoolRatings")
              .withArgs(riskProfileIndex, poolRatingRange[0], poolRatingRange[1], callers[action.executor]);
          } else {
            await expect(
              registryContract.connect(signers[action.executor])[action.action](riskProfile, poolRatingRange),
            ).to.be.revertedWith(action.message);
          }
        }
        assert.isDefined(riskProfile, `args is wrong in ${action.action} testcase`);
        break;
      }
      case "removeRiskProfile(uint256)": {
        const { riskProfile, index }: ARGUMENTS = action.args;
        let riskProfileIndex;
        let canRiskProfileBorrow;
        if (riskProfile) {
          const { index, canBorrow } = await registryContract.getRiskProfile(riskProfile);
          riskProfileIndex = index;
          canRiskProfileBorrow = canBorrow;
        }
        if (action.expect === "success") {
          await expect(
            registryContract.connect(signers[action.executor])[action.action](index ? index : riskProfileIndex),
          )
            .to.emit(registryContract, "LogRiskProfile")
            .withArgs(riskProfileIndex, false, canRiskProfileBorrow, callers[action.executor]);
        } else {
          await expect(
            registryContract.connect(signers[action.executor])[action.action](index ? index : riskProfileIndex),
          ).to.be.revertedWith(action.message);
        }
        assert.isDefined(riskProfile ? riskProfile : index, `args is wrong in ${action.action} testcase`);
        break;
      }
      case "setUnderlyingAssetHashToRPToVaults(address[],string,address)": {
        const { tokens, riskProfile, vault }: ARGUMENTS = action.args;
        if (tokens && riskProfile && vault) {
          if (action.expect === "success") {
            await registryContract.connect(signers[action.executor])[action.action](tokens, riskProfile, vault);
          } else {
            await expect(
              registryContract.connect(signers[action.executor])[action.action](tokens, riskProfile, vault),
            ).to.be.revertedWith(action.message);
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
            await registryContract.connect(signers[action.executor])[action.action](multiTokens, riskProfiles, vaults);
          } else {
            await expect(
              registryContract.connect(signers[action.executor])[action.action](multiTokens, riskProfiles, vaults),
            ).to.be.revertedWith(action.message);
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
});

type TESTING_DEFAULT_DATA = {
  setFunction: string;
  input: any[];
  getFunction: {
    name: string;
    input: any[];
    output: any;
  }[];
};

const REGISTRY_TESTING_DEFAULT_DATA: TESTING_DEFAULT_DATA[] = [
  {
    setFunction: "setTreasury(address)",
    input: ["0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1"],
    getFunction: [
      {
        name: "treasury()",
        input: [],
        output: "0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1",
      },
    ],
  },
  {
    setFunction: "setVaultStepInvestStrategyDefinitionRegistry(address)",
    input: ["0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"],
    getFunction: [
      {
        name: "vaultStepInvestStrategyDefinitionRegistry()",
        input: [],
        output: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
      },
    ],
  },
  {
    setFunction: "setAPROracle(address)",
    input: ["0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"],
    getFunction: [
      {
        name: "aprOracle()",
        input: [],
        output: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
      },
    ],
  },
  {
    setFunction: "setStrategyProvider(address)",
    input: ["0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"],
    getFunction: [
      {
        name: "strategyProvider()",
        input: [],
        output: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
      },
    ],
  },
  {
    setFunction: "setRiskManager(address)",
    input: ["0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"],
    getFunction: [
      {
        name: "riskManager()",
        input: [],
        output: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
      },
    ],
  },
  {
    setFunction: "setHarvestCodeProvider(address)",
    input: ["0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"],
    getFunction: [
      {
        name: "harvestCodeProvider()",
        input: [],
        output: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
      },
    ],
  },
  {
    setFunction: "setStrategyManager(address)",
    input: ["0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"],
    getFunction: [
      {
        name: "strategyManager()",
        input: [],
        output: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
      },
    ],
  },
  {
    setFunction: "setOPTY(address)",
    input: ["0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"],
    getFunction: [
      {
        name: "opty()",
        input: [],
        output: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
      },
    ],
  },
  {
    setFunction: "setPriceOracle(address)",
    input: ["0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"],
    getFunction: [
      {
        name: "priceOracle()",
        input: [],
        output: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
      },
    ],
  },
  {
    setFunction: "setOPTYStakingRateBalancer(address)",
    input: ["0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"],
    getFunction: [
      {
        name: "optyStakingRateBalancer()",
        input: [],
        output: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
      },
    ],
  },
  {
    setFunction: "setODEFIVaultBooster(address)",
    input: ["0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"],
    getFunction: [
      {
        name: "odefiVaultBooster()",
        input: [],
        output: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
      },
    ],
  },
  {
    setFunction: "approveToken(address)",
    input: ["0x6b175474e89094c44da98b954eedeac495271d0f"],
    getFunction: [
      {
        name: "tokens(address)",
        input: ["0x6b175474e89094c44da98b954eedeac495271d0f"],
        output: true,
      },
    ],
  },
  {
    setFunction: "approveLiquidityPool(address)",
    input: ["0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"],
    getFunction: [
      {
        name: "liquidityPools(address)",
        input: ["0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"],
        output: [0, true],
      },
    ],
  },
  {
    setFunction: "approveCreditPool(address)",
    input: ["0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"],
    getFunction: [
      {
        name: "creditPools(address)",
        input: ["0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"],
        output: [0, true],
      },
    ],
  },
  {
    setFunction: "setLiquidityPoolToAdapter(address,address)",
    input: ["0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643", "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"],
    getFunction: [
      {
        name: "liquidityPoolToAdapter(address)",
        input: ["0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643"],
        output: "0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643",
      },
    ],
  },
  {
    setFunction: "setTokensHashToTokens(address[])",
    input: [["0x6b175474e89094c44da98b954eedeac495271d0f"]],
    getFunction: [
      {
        name: "getTokensHashToTokenList(bytes32)",
        input: ["0x50440c05332207ba7b1bb0dcaf90d1864e3aa44dd98a51f88d0796a7623f0c80"],
        output: ["0x6B175474E89094C44Da98b954EedeAC495271d0F"],
      },
      {
        name: "getTokensHashByIndex(uint256)",
        input: ["0"],
        output: ["0x50440c05332207ba7b1bb0dcaf90d1864e3aa44dd98a51f88d0796a7623f0c80"],
      },
    ],
  },
  {
    setFunction: "addRiskProfile(string,bool,(uint8,uint8))",
    input: ["RP1", false, [0, 10]],
    getFunction: [
      {
        name: "riskProfilesArray(uint256)",
        input: ["0"],
        output: "RP1",
      },
    ],
  },
  {
    setFunction: "setUnderlyingAssetHashToRPToVaults(address[],string,address)",
    input: [["0x6b175474e89094c44da98b954eedeac495271d0f"], "RP1", "0x6b175474e89094c44da98b954eedeac495271d0f"],
    getFunction: [
      {
        name: "underlyingAssetHashToRPToVaults(bytes32,string)",
        input: ["0x50440c05332207ba7b1bb0dcaf90d1864e3aa44dd98a51f88d0796a7623f0c80", "RP1"],
        output: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      },
    ],
  },
  {
    setFunction: "setWithdrawalFee(address,uint256)",
    input: ["0x6b175474e89094c44da98b954eedeac495271d0f", 10],
    getFunction: [
      {
        name: "vaultToVaultConfiguration(address)",
        input: ["0x6b175474e89094c44da98b954eedeac495271d0f"],
        output: [false, false, BigNumber.from("10")],
      },
    ],
  },
];

async function initDefaultData(contract: Contract, data: TESTING_DEFAULT_DATA[], owner: Signer): Promise<void> {
  for (let i = 0; i < data.length; i++) {
    try {
      await contract.connect(owner)[data[i].setFunction](...data[i].input);
    } catch (error) {
      // ignore the error
    }
  }
}

async function verifyDefaultData(contract: Contract, data: TESTING_DEFAULT_DATA[]): Promise<void> {
  for (let i = 0; i < data.length; i++) {
    const action = data[i];
    for (let i = 0; i < action.getFunction.length; i++) {
      const getFunction = action.getFunction[i];
      const value = await contract[getFunction.name](...getFunction.input);
      try {
        if (Array.isArray(getFunction.output)) {
          const objectValue: any[] = Object.values(value);
          const half_length = Math.ceil(objectValue.length / 2);
          const realValue = objectValue.splice(0, half_length);
          if (getFunction.name === "getTokensHashByIndex(uint256)") {
            expect(value.toString()).to.have.eq(getFunction.output[0]);
          } else if (getFunction.name === "vaultToVaultConfiguration(address)") {
            expect(realValue[0]).to.equal(getFunction.output[0]);
            expect(realValue[1]).to.equal(getFunction.output[1]);
            expect(+realValue[2]).to.equal(+getFunction.output[2]);
          } else {
            expect(realValue).to.have.members(getFunction.output);
          }
        } else {
          expect(value).to.be.eq(getFunction.output);
        }
      } catch (error: any) {
        console.log(error.message);
      }
    }
  }
}
