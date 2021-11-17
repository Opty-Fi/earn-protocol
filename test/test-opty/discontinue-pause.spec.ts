import { expect, assert } from "chai";
import hre from "hardhat";
import { Contract, Signer, BigNumber } from "ethers";
import { CONTRACTS } from "../../helpers/type";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants/utils";
import { VAULT_TOKENS } from "../../helpers/constants/tokens";
import { HARVEST_V1_ADAPTER_NAME } from "../../helpers/constants/adapters";

import { TypedAdapterStrategies } from "../../helpers/data";
import { deployVault } from "../../helpers/contracts-deployments";
import {
  setBestStrategy,
  fundWalletToken,
  getBlockTimestamp,
  getTokenName,
  getTokenSymbol,
  approveLiquidityPoolAndMapAdapter,
  addWhiteListForHarvest,
} from "../../helpers/contracts-actions";
import { setUp } from "./setup";
import scenario from "./scenarios/discontinue-pause.json";

type ARGUMENTS = {
  addressName?: string;
  unpause?: boolean;
  amount?: string;
  expectedValue?: string;
  spender?: string;
  stakedOPTY?: string;
};
describe(scenario.title, () => {
  const MAX_AMOUNT = "10000";
  let essentialContracts: CONTRACTS;
  let adapters: CONTRACTS;
  let contracts: CONTRACTS;
  let owner: Signer;
  let admin: Signer;
  let users: { [key: string]: Signer };
  before(async () => {
    try {
      [owner, admin] = await hre.ethers.getSigners();
      users = { owner, admin };
      [essentialContracts, adapters] = await setUp(
        users["owner"],
        Object.values(VAULT_TOKENS).map(token => token.address),
      );
      contracts = { ...essentialContracts };
      assert.isDefined(essentialContracts, "Essential contracts not deployed");
      assert.isDefined(adapters, "Adapters not deployed");
    } catch (error: any) {
      console.log(error);
    }
  });

  for (let i = 0; i < scenario.vaults.length; i++) {
    describe(`${scenario.vaults[i].name}`, async () => {
      let vault: Contract;
      let underlyingTokenName: string;
      let underlyingTokenSymbol: string;
      const vaults = scenario.vaults[i];
      const profile = vaults.riskProfileCode;
      const adapterNames = Object.keys(TypedAdapterStrategies).filter(adapter => adapter !== "SushiswapAdapter");

      for (let i = 0; i < adapterNames.length; i++) {
        const adapterName = adapterNames[i];
        const strategies = TypedAdapterStrategies[adapterName];
        let ERC20Instance: Contract;
        for (let i = 0; i < strategies.length; i++) {
          const strategy = strategies[i];

          describe(`${adapterName}- ${strategy.strategyName}`, async () => {
            let decimals: BigNumber;
            before(async () => {
              try {
                underlyingTokenName = await getTokenName(hre, strategy.token);
                underlyingTokenSymbol = await getTokenSymbol(hre, strategy.token);
                const adapter = adapters[adapterName];

                for (let i = 0; i < strategy.strategy.length; i++) {
                  await approveLiquidityPoolAndMapAdapter(
                    users["owner"],
                    essentialContracts.registry,
                    adapter.address,
                    strategy.strategy[i].contract,
                  );
                }

                vault = await deployVault(
                  hre,
                  essentialContracts.registry.address,
                  VAULT_TOKENS[strategy.token].address,
                  owner,
                  admin,
                  underlyingTokenName,
                  underlyingTokenSymbol,
                  profile,
                  TESTING_DEPLOYMENT_ONCE,
                );

                await setBestStrategy(
                  strategy.strategy,
                  owner,
                  VAULT_TOKENS[strategy.token].address,
                  essentialContracts.investStrategyRegistry,
                  essentialContracts.strategyProvider,
                  profile,
                  false,
                );

                const timestamp = (await getBlockTimestamp(hre)) * 2;

                ERC20Instance = await hre.ethers.getContractAt("ERC20", VAULT_TOKENS[strategy.token].address);
                decimals = await ERC20Instance.decimals();
                await fundWalletToken(
                  hre,
                  VAULT_TOKENS[strategy.token].address,
                  owner,
                  BigNumber.from(MAX_AMOUNT).mul(BigNumber.from(10).pow(decimals)),
                  timestamp,
                );

                if (adapterName === HARVEST_V1_ADAPTER_NAME) {
                  await addWhiteListForHarvest(hre, vault.address, admin);
                }
                contracts["vault"] = vault;
                contracts["erc20"] = ERC20Instance;
              } catch (error: any) {
                console.error(error);
              }
            });
            for (let i = 0; i < vaults.vaultStories.length; i++) {
              const story = vaults.vaultStories[i];
              it(story.description, async () => {
                for (let j = 0; j < story.actions.length; j++) {
                  const action = story.actions[j];
                  switch (action.action) {
                    case "userDepositRebalance(uint256)":
                    case "userWithdrawRebalance(uint256)": {
                      const { amount }: ARGUMENTS = action.args;
                      if (amount) {
                        const actualAmount = BigNumber.from(amount).mul(BigNumber.from(10).pow(decimals));
                        if (action.action === "userDepositRebalance(uint256)") {
                          const allowance = await contracts["erc20"].allowance(
                            await owner.getAddress(),
                            contracts[action.contract.toLowerCase()].address,
                          );
                          if (allowance.toString() === "0") {
                            await contracts["erc20"].approve(
                              contracts[action.contract.toLowerCase()].address,
                              actualAmount,
                            );
                          }
                        }
                        if (action.expect === "success") {
                          await contracts[action.contract.toLowerCase()][action.action](actualAmount);
                        } else {
                          await expect(
                            contracts[action.contract.toLowerCase()][action.action](actualAmount),
                          ).to.be.revertedWith(action.message);
                        }
                      }

                      assert.isDefined(amount, `args is wrong in ${action.action} testcase`);
                      break;
                    }
                    case "userDepositAllRebalance()":
                    case "userWithdrawAllRebalance()": {
                      if (action.expect === "success") {
                        if (action.action === "userDepositAllRebalance()") {
                          const balance = await ERC20Instance.connect(owner).balanceOf(await owner.getAddress());
                          await ERC20Instance.approve(contracts[action.contract.toLowerCase()].address, balance);
                        }
                        await contracts[action.contract.toLowerCase()][action.action]();
                      } else {
                        await expect(contracts[action.contract.toLowerCase()][action.action]()).to.be.revertedWith(
                          action.message,
                        );
                      }
                      break;
                    }
                    case "discontinue(address)": {
                      const { addressName }: ARGUMENTS = action.args;
                      if (addressName) {
                        if (action.expect === "success") {
                          await expect(
                            contracts[action.contract.toLowerCase()][action.action](contracts[addressName].address),
                          )
                            .to.emit(contracts[action.contract.toLowerCase()], "LogDiscontinueVault")
                            .withArgs(contracts[addressName].address, true, await owner.getAddress());
                        }
                      }
                      assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
                      break;
                    }
                    case "unpauseVaultContract(address,bool)": {
                      const { addressName, unpause }: ARGUMENTS = action.args;
                      if (addressName && unpause !== undefined) {
                        if (action.expect === "success") {
                          await expect(
                            contracts[action.contract.toLowerCase()][action.action](
                              contracts[addressName].address,
                              unpause,
                            ),
                          )
                            .to.emit(contracts[action.contract.toLowerCase()], "LogUnpauseVault")
                            .withArgs(contracts[addressName].address, unpause, await owner.getAddress());
                        }
                      }
                      assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
                      assert.isDefined(unpause, `args is wrong in ${action.action} testcase`);
                      break;
                    }
                    case "balance()": {
                      const { expectedValue }: ARGUMENTS = action.args;
                      if (expectedValue) {
                        if (action.expect === "success") {
                          expectedValue === "0"
                            ? expect(+(await contracts[action.contract][action.action]())).to.equal(
                                +BigNumber.from(expectedValue).div(BigNumber.from(10).pow(decimals)),
                              )
                            : expect(+(await contracts[action.contract][action.action]())).to.be.gte(
                                +BigNumber.from(expectedValue.split(">=")[1]).div(BigNumber.from(10).pow(decimals)),
                              );
                        }
                      }

                      assert.isDefined(expectedValue, `args is wrong in ${action.action} testcase`);
                      break;
                    }
                    case "balanceOf(address)": {
                      const { expectedValue }: ARGUMENTS = action.args;
                      if (expectedValue) {
                        if (action.expect === "success") {
                          expect(+(await contracts[action.contract][action.action](await owner.getAddress()))).to.gte(
                            +BigNumber.from(expectedValue).mul(BigNumber.from(10).pow(decimals)),
                          );
                        }
                      }
                      assert.isDefined(expectedValue, `args is wrong in ${action.action} testcase`);
                      break;
                    }
                  }
                }
              }).timeout(100000);
            }
          });
        }
      }

      for (let i = 0; i < vaults.stakingVaultstories.length; i++) {
        const story = vaults.stakingVaultstories[i];
        for (let i = 0; i < story.actions.length; i++) {
          it(story.description, async () => {
            const action = story.actions[i];
            switch (action.action) {
              case "discontinue(address)": {
                const { addressName }: ARGUMENTS = action.args;
                if (addressName) {
                  if (action.expect === "success") {
                    await expect(
                      contracts[action.contract.toLowerCase()][action.action](contracts[addressName].address),
                    )
                      .to.emit(contracts[action.contract.toLowerCase()], "LogDiscontinueVault")
                      .withArgs(contracts[addressName].address, true, await owner.getAddress());
                  }
                }

                assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "unpauseVaultContract(address,bool)": {
                const { addressName, unpause }: ARGUMENTS = action.args;
                if (addressName && unpause !== undefined) {
                  if (action.expect === "success") {
                    await expect(
                      contracts[action.contract.toLowerCase()][action.action](contracts[addressName].address, unpause),
                    )
                      .to.emit(contracts[action.contract.toLowerCase()], "LogUnpauseVault")
                      .withArgs(contracts[addressName].address, unpause, await owner.getAddress());
                  }
                }
                assert.isDefined(addressName, `args is wrong in ${action.action} testcase`);
                assert.isDefined(unpause, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "balance()": {
                const { expectedValue }: ARGUMENTS = action.args;
                if (expectedValue) {
                  if (action.expect === "success") {
                    const balance = await contracts[action.contract][action.action]();
                    expect(+balance).to.be.equal(+expectedValue);
                  }
                }

                assert.isDefined(expectedValue, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "balanceOf(address)": {
                const { expectedValue }: ARGUMENTS = action.args;
                if (expectedValue) {
                  if (action.expect === "success") {
                    const addr = await owner.getAddress();
                    const balance = await contracts[action.contract][action.action](addr);

                    expect(+balance).to.be.equal(+expectedValue);
                  }
                }
                assert.isDefined(expectedValue, `args is wrong in ${action.action} testcase`);
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
                assert.isDefined(spender, `args is wrong in ${action.action} testcase`);
                assert.isDefined(stakedOPTY, `args is wrong in ${action.action} testcase`);
                break;
              }
              case "userStake(uint256)": {
                const { stakedOPTY }: ARGUMENTS = action.args;
                if (action.expect === "success") {
                  await contracts[action.contract].connect(users[action.executor])[action.action](stakedOPTY);
                } else {
                  await expect(
                    contracts[action.contract].connect(users[action.executor])[action.action](stakedOPTY),
                  ).to.be.revertedWith(action.message);
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
            }
          });
        }
      }
    });
  }
});
