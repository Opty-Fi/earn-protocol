import chai, { expect, assert } from "chai";
import { solidity } from "ethereum-waffle";
import hre from "hardhat";
import { Contract, Signer, BigNumber, utils } from "ethers";
import { CONTRACTS } from "../../../helpers/type";
import { TOKENS, TESTING_DEPLOYMENT_ONCE, AAVE_V1_ADAPTER_NAME } from "../../../helpers/constants";
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
describe(`${AAVE_V1_ADAPTER_NAME} Unit test`, () => {
  const strategies = TypedAdapterStrategies[AAVE_V1_ADAPTER_NAME];
  const MAX_AMOUNT = BigNumber.from("20000000000000000000");
  const BORROW_AMOUNT = BigNumber.from("200000000000000000");
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
        AAVE_V1_ADAPTER_NAME,
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
      let lpCoreAddress: string;
      let lpAddress: string;
      let lpToken: string;
      before(async () => {
        try {
          lpProvider = await hre.ethers.getContractAt(
            "IAaveV1LendingPoolAddressesProvider",
            strategy.strategy[0].contract,
          );
          lpCoreAddress = await lpProvider.getLendingPoolCore();
          lpAddress = await lpProvider.getLendingPool();
          lpContract = await hre.ethers.getContractAt("IAaveV1", lpAddress);
          lpToken = await adapter.getLiquidityPoolToken(token, lpProvider.address);
          const timestamp = (await getBlockTimestamp(hre)) * 2;
          await fundWalletToken(hre, lpToken, owner, MAX_AMOUNT, timestamp);
          await fundWalletToken(hre, token, owner, MAX_AMOUNT, timestamp);
          await fundWalletToken(hre, SNTToken, owner, MAX_AMOUNT, timestamp);
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
                    expect(value[0]).to.equal(lpCoreAddress);
                    if (action.action === "getDepositSomeCodes(address,address,address,uint256)") {
                      expect(value[1]).to.equal(i === 0 ? 0 : depositAmount);
                    }
                  } else {
                    const inter = new utils.Interface(["function deposit(address,uint256,uint16)"]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                    expect(address).to.equal(lpAddress);
                    const value = inter.decodeFunctionData("deposit", abiCode);
                    expect(value[0]).to.equal(token);
                    if (action.action === "getDepositSomeCodes(address,address,address,uint256)") {
                      expect(value[1]).to.equal(depositAmount);
                    }
                    expect(value[2]).to.equal(0);
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
                  const inter = new utils.Interface(["function redeem(uint256)"]);
                  const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                  expect(address).to.be.equal(lpToken);
                  const value = inter.decodeFunctionData("redeem", abiCode);
                  if (action.action === "getWithdrawSomeCodes(address,address,address,uint256)") {
                    expect(value[0]).to.be.equal(withdrawAmount);
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

                const inter = new utils.Interface(["function borrow(address,uint256,uint256,uint16)"]);
                const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[0]);
                expect(address).to.be.equal(lpAddress);
                const value = inter.decodeFunctionData("borrow", abiCode);
                expect(value.length).to.be.equal(4);
                expect(value[0]).to.be.equal(SNTToken);

                break;
              }
              case "getRepayAndWithdrawAllCodes(address,address,address,address)": {
                await lpContract.borrow(SNTToken, BORROW_AMOUNT, 2, 0);
                const SNTContract = await hre.ethers.getContractAt("IERC20", SNTToken);
                const SNTBalance = await SNTContract.balanceOf(ownerAddress);
                const codes = await adapter[action.action](
                  ownerAddress,
                  token,
                  strategy.strategy[0].contract,
                  SNTToken,
                );
                expect(codes.length).to.equal(4);
                for (let i = 0; i < codes.length; i++) {
                  if (i === 3) {
                    const inter = new utils.Interface(["function redeem(uint256)"]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                    expect(address).to.equal(lpToken);
                    const value = inter.decodeFunctionData("redeem", abiCode);
                    expect(value[0]).to.gt(0);
                  } else if (i === 2) {
                    const inter = new utils.Interface(["function repay(address,uint256,address)"]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                    expect(address).to.equal(lpAddress);
                    const value = inter.decodeFunctionData("repay", abiCode);
                    expect(value[0]).to.equal(SNTToken);
                    expect(value[1]).to.equal(SNTBalance);
                    expect(value[2]).to.equal(ownerAddress);
                  } else {
                    const inter = new utils.Interface(["function approve(address,uint256)"]);
                    const [address, abiCode] = utils.defaultAbiCoder.decode(["address", "bytes"], codes[i]);
                    expect(address).to.equal(SNTToken);
                    const value = inter.decodeFunctionData("approve", abiCode);
                    expect(value[0]).to.equal(lpCoreAddress);
                    expect(value[1]).to.equal(i === 0 ? 0 : SNTBalance);
                  }
                }
              }
            }
          }
        }).timeout(150000);
      }
    });
  }
});
