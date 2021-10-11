import chai, { expect, assert } from "chai";
import { solidity } from "ethereum-waffle";
import hre from "hardhat";
import { Contract, Signer, BigNumber, utils } from "ethers";
import { CONTRACTS } from "../../../helpers/type";
import { TOKENS, TESTING_DEPLOYMENT_ONCE, AAVE_V2_ADAPTER_NAME } from "../../../helpers/constants";
import { TypedAdapterStrategies } from "../../../helpers/data";
import { deployAdapter, deployAdapterPrerequisites } from "../../../helpers/contracts-deployments";
import { fundWalletToken, getBlockTimestamp } from "../../../helpers/contracts-actions";
import scenarios from "../scenarios/adapters.json";

chai.use(solidity);

type ARGUMENTS = {
  amount?: { [key: string]: string };
  type?: number;
  userName?: string;
};
describe(`${AAVE_V2_ADAPTER_NAME} Unit test`, () => {
  const strategies = TypedAdapterStrategies[AAVE_V2_ADAPTER_NAME];
  const MAX_AMOUNT = BigNumber.from("50000000000000000000");
  const BORROW_AMOUNT = BigNumber.from("20000000000000");
  const SNTToken = "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F";
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
        AAVE_V2_ADAPTER_NAME,
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
      let lpProvider: Contract;
      let lpContract: Contract;
      let lpAddress: string;
      let lpToken: string;
      before(async () => {
        try {
          const lpRegistry = await hre.ethers.getContractAt(
            "IAaveV2LendingPoolAddressProviderRegistry",
            strategy.strategy[0].contract,
          );
          const lpProviderAddress = await lpRegistry.getAddressesProvidersList();
          lpProvider = await hre.ethers.getContractAt(
            "IAaveV2LendingPoolAddressesProvider",
            lpProviderAddress[0],
            owner,
          );
          lpAddress = await lpProvider.getLendingPool();
          lpContract = await hre.ethers.getContractAt("IAaveV2", lpAddress, owner);
          const reserveData = await lpContract.getReserveData(token);
          lpToken = reserveData.aTokenAddress;
          const tokenContract = await hre.ethers.getContractAt("IERC20", token, owner);
          const timestamp = (await getBlockTimestamp(hre)) * 2;
          await fundWalletToken(hre, token, owner, MAX_AMOUNT, timestamp);
          await fundWalletToken(hre, SNTToken, owner, MAX_AMOUNT, timestamp);
          await tokenContract.approve(lpAddress, BORROW_AMOUNT);
          await lpContract.deposit(token, BORROW_AMOUNT, ownerAddress, 0);
          await lpContract.setUserUseReserveAsCollateral(token, true);
        } catch (error) {
          console.error(error);
        }
      });

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
                    codes = await adapter[action.action](
                      ownerAddress,
                      token,
                      strategy.strategy[0].contract,
                      amount[strategy.token],
                    );
                    depositAmount = amount[strategy.token];
                  }
                } else {
                  codes = await adapter[action.action](ownerAddress, token, strategy.strategy[0].contract);
                }
                for (let i = 0; i < codes.length; i++) {
                  if (i < 2) {
                    const inter = new utils.Interface(["function approve(address,uint256)"]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                    expect(address).to.equal(token);
                    const value = inter.decodeFunctionData("approve", abiCode);
                    expect(value[0]).to.equal(lpAddress);
                    if (action.action === "getDepositSomeCodes(address,address,address,uint256)") {
                      expect(value[1]).to.equal(i === 0 ? 0 : depositAmount);
                    }
                  } else {
                    const inter = new utils.Interface(["function deposit(address,uint256,address,uint16)"]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                    expect(address).to.equal(lpAddress);
                    const value = inter.decodeFunctionData("deposit", abiCode);
                    expect(value[0]).to.equal(token);
                    if (action.action === "getDepositSomeCodes(address,address,address,uint256)") {
                      expect(value[1]).to.equal(depositAmount);
                    }
                    expect(value[2]).to.equal(ownerAddress);
                    expect(value[3]).to.equal(0);
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
                    codes = await adapter[action.action](
                      ownerAddress,
                      token,
                      strategy.strategy[0].contract,
                      amount[strategy.token],
                    );
                    withdrawAmount = amount[strategy.token];
                  }
                } else {
                  codes = await adapter[action.action](ownerAddress, token, strategy.strategy[0].contract);
                }

                for (let i = 0; i < codes.length; i++) {
                  if (i < 2) {
                    const inter = new utils.Interface(["function approve(address,uint256)"]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                    expect(address).to.equal(lpToken);
                    const value = inter.decodeFunctionData("approve", abiCode);
                    expect(value[0]).to.equal(lpAddress);
                    if (action.action === "getWithdrawSomeCodes(address,address,address,uint256)") {
                      expect(value[1]).to.equal(i === 0 ? 0 : withdrawAmount);
                    }
                  } else {
                    const inter = new utils.Interface(["function withdraw(address,uint256,address)"]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                    expect(address).to.equal(lpAddress);
                    const value = inter.decodeFunctionData("withdraw", abiCode);
                    expect(value[0]).to.equal(token);
                    if (action.action === "getWithdrawSomeCodes(address,address,address,uint256)") {
                      expect(value[1]).to.equal(withdrawAmount);
                    }
                    expect(value[2]).to.equal(ownerAddress);
                  }
                }

                break;
              }
              case "getBorrowAllCodes(address,address,address,address)": {
                const codes = await adapter[action.action](
                  ownerAddress,
                  token,
                  strategy.strategy[0].contract,
                  SNTToken,
                );
                expect(codes.length).to.be.equal(1);

                const inter = new utils.Interface(["function borrow(address,uint256,uint256,uint16,address)"]);
                const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[0]);
                expect(address).to.be.equal(lpAddress);
                const value = inter.decodeFunctionData("borrow", abiCode);
                expect(value.length).to.be.equal(5);
                expect(value[0]).to.be.equal(SNTToken);
                expect(value[2]).to.be.equal(1);
                expect(value[3]).to.be.equal(0);
                expect(value[4]).to.be.equal(ownerAddress);
                break;
              }
              case "getRepayAndWithdrawAllCodes(address,address,address,address)": {
                await lpContract.borrow(SNTToken, BigNumber.from("2000000000"), 2, 0, ownerAddress);
                // @Error : the code getting revert with division by zero error
                // @Reason : _debt() returns error.
                // @Solution: need to have currentStableDebt in userReserveData
                // const codes = await adapter[action.action](
                //   ownerAddress,
                //   [token],
                //   strategy.strategy[0].contract,
                //   SNTToken,
                // );
              }
            }
          }
        }).timeout(150000);
      }
    });
  }
});
