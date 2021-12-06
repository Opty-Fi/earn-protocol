import { expect, assert } from "chai";
import hre, { ethers } from "hardhat";
import { Signer, BigNumber } from "ethers";
import { CONTRACTS } from "../../helpers/type";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants/utils";
import { VAULT_TOKENS } from "../../helpers/constants/tokens";
import { executeFunc } from "../../helpers/helpers";
import { deployVault, deployEssentialContracts } from "../../helpers/contracts-deployments";
import {
  approveAndSetTokenHashToToken,
  fundWalletToken,
  getBlockTimestamp,
  getTokenName,
  getTokenSymbol,
  unpauseVault,
} from "../../helpers/contracts-actions";
import scenario from "./scenarios/claim-opty-timestamp-limitation.json";

type ARGUMENTS = {
  contractName?: string;
  addressName?: string;
  amount?: string;
  index?: number;
  rate?: string;
  isEnabled?: boolean;
  operatorUnlockClaimOPTYTimestamp?: number;
};
describe(scenario.title, () => {
  const token = "DAI";
  const tokenAddr = VAULT_TOKENS["DAI"].address;
  const MAX_AMOUNT = "100000000000000000000000";
  let contracts: CONTRACTS = {};
  let users: { [key: string]: Signer };
  let blocktimestamp: number;
  before(async () => {
    try {
      const [owner, admin, user1] = await hre.ethers.getSigners();
      users = { owner, admin, user1 };
      contracts = await deployEssentialContracts(hre, owner, TESTING_DEPLOYMENT_ONCE);

      await approveAndSetTokenHashToToken(owner, contracts["registry"], tokenAddr);
      const timestamp = (await getBlockTimestamp(hre)) * 2;
      await fundWalletToken(hre, tokenAddr, users["owner"], BigNumber.from(MAX_AMOUNT), timestamp);
      const underlyingTokenName = await getTokenName(hre, token);
      const underlyingTokenSymbol = await getTokenSymbol(hre, token);

      const Vault = await deployVault(
        hre,
        contracts["registry"].address,
        tokenAddr,
        users["owner"],
        users["admin"],
        underlyingTokenName,
        underlyingTokenSymbol,
        1,
        TESTING_DEPLOYMENT_ONCE,
      );
      await contracts["registry"].setQueueCap(Vault.address, ethers.constants.MaxUint256);
      await contracts["registry"].setTotalValueLockedLimitInUnderlying(Vault.address, ethers.constants.MaxUint256);
      await unpauseVault(users["owner"], contracts["registry"], Vault.address, true);

      await contracts.registry.setTotalValueLockedLimitInUnderlying(Vault.address, ethers.constants.MaxUint256);

      const ERC20Instance = await hre.ethers.getContractAt("ERC20", tokenAddr);

      contracts["vault"] = Vault;

      contracts["erc20"] = ERC20Instance;
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
          case "addOptyVault(address)": {
            const { contractName }: ARGUMENTS = action.args;
            if (contractName) {
              if (action.expect === "success") {
                await executeFunc(contracts[action.contract], users[action.executer], action.action, [
                  contracts[contractName].address,
                ]);
              } else {
                await expect(
                  executeFunc(contracts[action.contract], users[action.executer], action.action, [
                    contracts[contractName].address,
                  ]),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setOptyVault(address,bool)": {
            const { contractName, isEnabled }: ARGUMENTS = action.args;
            if (contractName) {
              if (action.expect === "success") {
                await executeFunc(contracts[action.contract], users[action.executer], action.action, [
                  contracts[contractName].address,
                  isEnabled,
                ]);
              } else {
                await expect(
                  executeFunc(contracts[action.contract], users[action.executer], action.action, [
                    contracts[contractName].address,
                    isEnabled,
                  ]),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
            assert.isDefined(isEnabled, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setOptyVaultRate(address,uint256)": {
            const { contractName, rate }: ARGUMENTS = action.args;
            if (contractName && rate) {
              if (action.expect === "success") {
                await executeFunc(contracts[action.contract], users[action.executer], action.action, [
                  contracts[contractName].address,
                  rate,
                ]);
              } else {
                await expect(
                  executeFunc(contracts[action.contract], users[action.executer], action.action, [
                    contracts[contractName].address,
                    rate,
                  ]),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
            assert.isDefined(rate, `args is wrong in ${action.action} testcase`);

            break;
          }
          case "approve(address,uint256)": {
            const { amount, contractName }: ARGUMENTS = action.args;
            if (amount && contractName) {
              if (action.expect === "success") {
                await executeFunc(contracts[action.contract], users[action.executer], action.action, [
                  contracts[contractName].address,
                  amount,
                ]);
              } else {
                await expect(
                  executeFunc(contracts[action.contract], users[action.executer], action.action, [
                    contracts[contractName].address,
                    amount,
                  ]),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
            assert.isDefined(contractName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "userDepositRebalance(uint256)": {
            const { amount }: ARGUMENTS = action.args;
            if (amount) {
              if (action.expect === "success") {
                await executeFunc(contracts[action.contract], users[action.executer], action.action, [amount]);
              } else {
                await expect(
                  executeFunc(contracts[action.contract], users[action.executer], action.action, [amount]),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "claimOpty(address)": {
            const { addressName }: ARGUMENTS = action.args;
            if (addressName) {
              const userAddr = await users[addressName].getAddress();
              if (action.expect === "success") {
                await executeFunc(contracts[action.contract], users[action.executer], action.action, [userAddr]);
              } else {
                await expect(
                  executeFunc(contracts[action.contract], users[action.executer], action.action, [userAddr]),
                ).to.be.revertedWith(action.message);
              }
            }
            assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
            break;
          }
          case "setOperatorUnlockClaimOPTYTimestamp(uint256)": {
            const { operatorUnlockClaimOPTYTimestamp }: ARGUMENTS = action.args;
            if (action.expect === "success") {
              blocktimestamp =
                typeof operatorUnlockClaimOPTYTimestamp == "number"
                  ? (await getBlockTimestamp(hre)) + operatorUnlockClaimOPTYTimestamp
                  : 0;
              await executeFunc(contracts[action.contract], users[action.executer], action.action, [blocktimestamp]);
            } else {
              await expect(
                executeFunc(contracts[action.contract], users[action.executer], action.action, [
                  operatorUnlockClaimOPTYTimestamp,
                ]),
              ).to.be.revertedWith(action.message);
            }
            assert.isDefined(operatorUnlockClaimOPTYTimestamp, `args is wrong in ${action.action} testcase`);
            break;
          }
        }
      }
      for (let i = 0; i < story.getActions.length; i++) {
        const action = story.getActions[i];
        switch (action.action) {
          case "operatorUnlockClaimOPTYTimestamp()": {
            expect(BigNumber.from(await contracts[action.contract][action.action]())).to.be.equal(
              BigNumber.from(blocktimestamp),
            );
            break;
          }
        }
      }
    }).timeout(10000000);
  }
});
