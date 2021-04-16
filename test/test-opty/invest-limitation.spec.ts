import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer, BigNumber } from "ethers";
import {
    setUp,
    deployVault,
    setBestBasicStrategy,
    approveLiquidityPoolAndMapAdapter,
} from "./setup";
import { ESSENTIAL_CONTRACTS, CONTRACTS } from "./utils/type";
import { TOKENS, TESTING_CONTRACTS, ADDRESS_ZERO } from "./utils/constants";
import { TypedStrategies, TypedAdapterStrategies } from "./data";
import {
    getSoliditySHA3Hash,
    fundWalletToken,
    getBlockTimestamp,
} from "./utils/helpers";
import scenarios from "./scenarios/invest-limitation.json";
describe(scenarios.title, () => {
    // TODO: ADD TEST SCENARIOES, ADVANCED PROFILE, STRATEGIES.
    const MAX_AMOUNT = BigNumber.from("20000000000000000000");
    let essentialContracts: ESSENTIAL_CONTRACTS;
    let adapters: CONTRACTS;
    let users: { [key: string]: Signer };

    before(async () => {
        try {
            const [owner, admin] = await ethers.getSigners();
            users = { owner, admin };
            [essentialContracts, adapters] = await setUp(users["owner"]);
            assert.isDefined(essentialContracts, "Essential contracts not deployed");
            assert.isDefined(adapters, "Adapters not deployed");
        } catch (error) {
            console.log(error);
        }
    });

    for (let i = 0; i < scenarios.vaults.length; i++) {
        describe(`${scenarios.vaults[i].name}`, async () => {
            const stories = scenarios.vaults[i].stories;
            const adaptersName = Object.keys(
                TypedAdapterStrategies[scenarios.vaults[i].name]
            );
            for (let i = 0; i < adaptersName.length; i++) {
                if (adaptersName[i] !== "CompoundAdapter") {
                    break;
                }
                const strategies =
                    TypedAdapterStrategies[scenarios.vaults[i].name][adaptersName[i]];

                for (let i = 0; i < strategies.length; i++) {
                    describe(`${strategies[i].strategyName}`, async () => {
                        const strategy = strategies[i];
                        const tokensHash = getSoliditySHA3Hash(
                            ["address[]"],
                            [[TOKENS[strategy.token]]]
                        );
                        const contracts: CONTRACTS = {};
                        before(async () => {
                            try {
                                const adapter = adapters[adaptersName[i]];
                                const Vault = await deployVault(
                                    essentialContracts.registry.address,
                                    essentialContracts.riskManager.address,
                                    essentialContracts.strategyManager.address,
                                    essentialContracts.optyMinter.address,
                                    TOKENS[strategy.token],
                                    users["owner"],
                                    users["admin"],
                                    scenarios.vaults[i].name
                                );
                                await approveLiquidityPoolAndMapAdapter(
                                    essentialContracts.registry,
                                    adapter.address,
                                    strategy.strategy[0].contract
                                );
                                await setBestBasicStrategy(
                                    strategy.strategy,
                                    tokensHash,
                                    essentialContracts.registry,
                                    essentialContracts.strategyProvider
                                );
                                const timestamp = (await getBlockTimestamp()) * 2;
                                await fundWalletToken(
                                    TOKENS[strategy.token],
                                    users["owner"],
                                    MAX_AMOUNT,
                                    timestamp
                                );

                                const ERC20Instance = await ethers.getContractAt(
                                    "ERC20",
                                    TOKENS[strategy.token]
                                );

                                contracts["adapter"] = adapter;

                                contracts["vault"] = Vault;

                                contracts["erc20"] = ERC20Instance;
                            } catch (error) {
                                console.error(error);
                            }
                        });

                        for (let i = 0; i < stories.length; i++) {
                            it(stories[i].description, async () => {
                                const story = stories[i];
                                if (story.maxDepositType === "amount") {
                                    for (let i = 0; i < story.setActions.length; i++) {
                                        const setAction = story.setActions[i];
                                        switch (setAction.action) {
                                            case "setMaxDepositPoolType(uint8)": {
                                                const { type } = setAction.args;
                                                if (setAction.expect === "success") {
                                                    await contracts[setAction.contract]
                                                        .connect(
                                                            users[setAction.executer]
                                                        )
                                                        [setAction.action](type);
                                                } else {
                                                    await expect(
                                                        contracts[setAction.contract]
                                                            .connect(
                                                                users[
                                                                    setAction.executer
                                                                ]
                                                            )
                                                            [setAction.action](type)
                                                    ).to.be.revertedWith(
                                                        setAction.message
                                                    );
                                                }
                                                break;
                                            }
                                            case "setMaxDepositAmount(address,uint256)": {
                                                const { amount } = setAction.args;
                                                if (setAction.expect === "success") {
                                                    await contracts[setAction.contract]
                                                        .connect(
                                                            users[setAction.executer]
                                                        )
                                                        [setAction.action](
                                                            contracts["adapter"]
                                                                .address,
                                                            amount
                                                        );
                                                } else {
                                                    await expect(
                                                        contracts[setAction.contract]
                                                            .connect(
                                                                users[
                                                                    setAction.executer
                                                                ]
                                                            )
                                                            [setAction.action](
                                                                contracts["adapter"]
                                                                    .address,
                                                                amount
                                                            )
                                                    ).to.be.revertedWith(
                                                        setAction.message
                                                    );
                                                }

                                                break;
                                            }
                                            case "approve(address,uint256)": {
                                                const { amount } = setAction.args;
                                                if (setAction.expect === "success") {
                                                    await contracts[setAction.contract]
                                                        .connect(
                                                            users[setAction.executer]
                                                        )
                                                        [setAction.action](
                                                            contracts["vault"].address,
                                                            amount
                                                        );
                                                } else {
                                                    await expect(
                                                        contracts[setAction.contract]
                                                            .connect(
                                                                users[
                                                                    setAction.executer
                                                                ]
                                                            )
                                                            [setAction.action](
                                                                contracts["vault"]
                                                                    .address,
                                                                amount
                                                            )
                                                    ).to.be.revertedWith(
                                                        setAction.message
                                                    );
                                                }

                                                break;
                                            }
                                            case "userDepositRebalance(uint256)": {
                                                const { amount } = setAction.args;
                                                if (setAction.expect === "success") {
                                                    await contracts[setAction.contract]
                                                        .connect(
                                                            users[setAction.executer]
                                                        )
                                                        [setAction.action](amount);
                                                } else {
                                                    await expect(
                                                        contracts[setAction.contract]
                                                            .connect(
                                                                users[
                                                                    setAction.executer
                                                                ]
                                                            )
                                                            [setAction.action](amount)
                                                    ).to.be.revertedWith(
                                                        setAction.message
                                                    );
                                                }

                                                break;
                                            }
                                            default:
                                                break;
                                        }
                                    }
                                    for (let i = 0; i < story.getActions.length; i++) {
                                        const getAction = story.getActions[i];
                                        switch (getAction.action) {
                                            case "balance": {
                                                const balance = await contracts[
                                                    getAction.contract
                                                ][getAction.action]();
                                                expect(balance).to.equal(
                                                    getAction.expectedValue
                                                );
                                            }
                                        }
                                    }
                                } else if (story.maxDepositType === "pct") {
                                    let investedValue = BigNumber.from("0");
                                    let maxValue = BigNumber.from("0");
                                    for (let i = 0; i < story.setActions.length; i++) {
                                        const setAction = story.setActions[i];
                                        switch (setAction.action) {
                                            case "setMaxDepositPoolType(uint8)": {
                                                const { type } = setAction.args;
                                                if (setAction.expect === "success") {
                                                    await contracts[setAction.contract]
                                                        .connect(
                                                            users[setAction.executer]
                                                        )
                                                        [setAction.action](type);
                                                } else {
                                                    await expect(
                                                        contracts[setAction.contract]
                                                            .connect(
                                                                users[
                                                                    setAction.executer
                                                                ]
                                                            )
                                                            [setAction.action](type)
                                                    ).to.be.revertedWith(
                                                        setAction.message
                                                    );
                                                }
                                                break;
                                            }
                                            case "setMaxDepositPoolPct(address,uint256)": {
                                                const { amount } = setAction.args;
                                                const percentage = BigNumber.from(
                                                    amount
                                                ).div(BigNumber.from("10000"));
                                                const poolValue = await contracts[
                                                    "adapter"
                                                ].getPoolValue(
                                                    strategy.strategy[0].contract,
                                                    ADDRESS_ZERO
                                                );
                                                console.log(percentage.toString());
                                                console.log(poolValue.toString());
                                                maxValue = BigNumber.from(poolValue)
                                                    .mul(BigNumber.from(amount))
                                                    .div(BigNumber.from("10000"));
                                                console.log(maxValue.toString());
                                                investedValue = maxValue.mul(
                                                    BigNumber.from("2")
                                                );
                                                console.log(investedValue.toString());
                                                if (setAction.expect === "success") {
                                                    await contracts[setAction.contract]
                                                        .connect(
                                                            users[setAction.executer]
                                                        )
                                                        [setAction.action](
                                                            contracts["adapter"]
                                                                .address,
                                                            amount
                                                        );
                                                } else {
                                                    await expect(
                                                        contracts[setAction.contract]
                                                            .connect(
                                                                users[
                                                                    setAction.executer
                                                                ]
                                                            )
                                                            [setAction.action](
                                                                contracts["adapter"]
                                                                    .address,
                                                                amount
                                                            )
                                                    ).to.be.revertedWith(
                                                        setAction.message
                                                    );
                                                }

                                                break;
                                            }
                                            case "approve(address,uint256)": {
                                                if (setAction.expect === "success") {
                                                    await contracts[setAction.contract]
                                                        .connect(
                                                            users[setAction.executer]
                                                        )
                                                        [setAction.action](
                                                            contracts["vault"].address,
                                                            investedValue
                                                        );
                                                } else {
                                                    await expect(
                                                        contracts[setAction.contract]
                                                            .connect(
                                                                users[
                                                                    setAction.executer
                                                                ]
                                                            )
                                                            [setAction.action](
                                                                contracts["vault"]
                                                                    .address,
                                                                investedValue
                                                            )
                                                    ).to.be.revertedWith(
                                                        setAction.message
                                                    );
                                                }

                                                break;
                                            }
                                            case "userDepositRebalance(uint256)": {
                                                console.log(investedValue.toString());
                                                if (setAction.expect === "success") {
                                                    await contracts[setAction.contract]
                                                        .connect(
                                                            users[setAction.executer]
                                                        )
                                                        [setAction.action](
                                                            investedValue
                                                        );
                                                } else {
                                                    await expect(
                                                        contracts[setAction.contract]
                                                            .connect(
                                                                users[
                                                                    setAction.executer
                                                                ]
                                                            )
                                                            [setAction.action](
                                                                investedValue
                                                            )
                                                    ).to.be.revertedWith(
                                                        setAction.message
                                                    );
                                                }

                                                break;
                                            }
                                            default:
                                                break;
                                        }
                                    }
                                    for (let i = 0; i < story.getActions.length; i++) {
                                        const getAction = story.getActions[i];
                                        switch (getAction.action) {
                                            case "balance": {
                                                const balance = await contracts[
                                                    getAction.contract
                                                ][getAction.action]();
                                                expect(balance).to.equal(
                                                    investedValue.sub(maxValue)
                                                );
                                            }
                                        }
                                    }
                                }
                            }).timeout(100000);
                        }
                    });
                }
            }
        });
    }
});
