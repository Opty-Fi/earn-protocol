import chai, { expect, assert } from "chai";
import { solidity } from "ethereum-waffle";
import hre from "hardhat";
import { Contract, Signer, utils } from "ethers";
import { CONTRACTS } from "../../../helpers/type";
import { TOKENS, TESTING_DEPLOYMENT_ONCE, SUSHISWAP_ADAPTER_NAME } from "../../../helpers/constants";
import { TypedAdapterStrategies } from "../../../helpers/data";
import { deployAdapter, deployAdapterPrerequisites } from "../../../helpers/contracts-deployments";
import scenarios from "../scenarios/adapters.json";

chai.use(solidity);

type ARGUMENTS = {
  amount?: { [key: string]: string };
};

describe(`${SUSHISWAP_ADAPTER_NAME} Unit test`, () => {
  const strategies = TypedAdapterStrategies[SUSHISWAP_ADAPTER_NAME];
  let adapterPrerequisites: CONTRACTS;
  let adapter: Contract;
  let ownerAddress: string;
  let owner: Signer;
  before(async () => {
    try {
      [owner] = await hre.ethers.getSigners();
      ownerAddress = await owner.getAddress();
      adapterPrerequisites = await deployAdapterPrerequisites(hre, owner, TESTING_DEPLOYMENT_ONCE);
      assert.isDefined(adapterPrerequisites, "Adapter pre-requisites contracts not deployed");
      adapter = await deployAdapter(
        hre,
        owner,
        SUSHISWAP_ADAPTER_NAME,
        adapterPrerequisites["registry"].address,
        TESTING_DEPLOYMENT_ONCE,
      );
      assert.isDefined(adapter, "Adapter not deployed");
    } catch (error) {
      console.log(error);
    }
  });

  for (let i = 0; i < strategies.length; i++) {
    describe(`test getCodes() for ${strategies[i].strategyName}`, async () => {
      const strategy = strategies[i];
      const token = TOKENS[strategy.token];
      const masterChef = "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd";

      for (let i = 0; i < scenarios.stories.length; i++) {
        it(scenarios.stories[i].description, async () => {
          const story = scenarios.stories[i];
          for (let i = 0; i < story.actions.length; i++) {
            const action = story.actions[i];
            switch (action.action) {
              case "getDepositSomeCodes(address,address,address,uint256)":
              case "getDepositAllCodes(address,address,address)": {
                let codes;
                let depositAmount;
                if (action.action === "getDepositSomeCodes(address,address,address,uint256)") {
                  const { amount }: ARGUMENTS = action.args;
                  if (amount) {
                    codes = await adapter[action.action](ownerAddress, token, masterChef, amount[strategy.token]);
                    depositAmount = amount[strategy.token];
                  }
                } else {
                  codes = await adapter[action.action](ownerAddress, token, masterChef);
                }
                for (let i = 0; i < codes.length; i++) {
                  if (i < 2) {
                    const inter = new utils.Interface(["function approve(address,uint256)"]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                    expect(address).to.equal(token);
                    const value = inter.decodeFunctionData("approve", abiCode);
                    expect(value[0]).to.equal(strategy.strategy[0].contract);
                    if (action.action === "getDepositSomeCodes(address,address,address,uint256)") {
                      expect(value[1]).to.equal(i === 0 ? 0 : depositAmount);
                    }
                  } else {
                    const inter = new utils.Interface(["function deposit(uint256,uint256)"]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                    expect(address).to.equal(masterChef);
                    const value = inter.decodeFunctionData("deposit", abiCode);
                    if (action.action === "getDepositSomeCodes(address,address,address,uint256)") {
                      expect(value[0]).to.equal(1);
                      expect(value[1]).to.equal(depositAmount);
                    }
                  }
                }
                break;
              }
              case "getWithdrawAllCodes(address,address,address)":
              case "getWithdrawSomeCodes(address,address,address,uint256)": {
                let codes;
                let withdrawAmount;
                if (action.action === "getWithdrawSomeCodes(address,address,address,uint256)") {
                  const { amount }: ARGUMENTS = action.args;
                  if (amount) {
                    codes = await adapter[action.action](ownerAddress, token, masterChef, amount[strategy.token]);
                    withdrawAmount = amount[strategy.token];
                  }
                } else {
                  codes = await adapter[action.action](ownerAddress, token, masterChef);
                }

                for (let i = 0; i < codes.length; i++) {
                  const inter = new utils.Interface(["function withdraw(uint256,uint256)"]);
                  const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                  expect(address).to.be.equal(masterChef);
                  const value = inter.decodeFunctionData("withdraw", abiCode);
                  if (action.action === "getWithdrawSomeCodes(address,address,address,uint256)") {
                    expect(value[0]).to.equal(1);
                    expect(value[1]).to.equal(withdrawAmount);
                  }
                }
                break;
              }
            }
          }
        }).timeout(150000);
      }
    });
  }
});
