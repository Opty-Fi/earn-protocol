import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { Signer, BigNumber } from "ethers";
import {
    setUp,
    deployVault,
    setBestBasicStrategy,
    approveLiquidityPoolAndMapAdapter,
} from "./setup";
import { ESSENTIAL_CONTRACTS, CONTRACTS } from "./utils/type";
import { TOKENS } from "./utils/constants";
import { TypedAdapterStrategies } from "./data";
import {
    getSoliditySHA3Hash,
    fundWalletToken,
    getBlockTimestamp,
    getTokenName,
    getTokenSymbol,
} from "./utils/helpers";
import scenarios from "./scenarios/invest-limitation.json";
type ARGUMENTS = {
    amount?: { [key: string]: string };
    type?: number;
};
describe(scenarios.title, () => {
    // TODO: ADD TEST SCENARIOES, ADVANCED PROFILE, STRATEGIES.
    const MAX_AMOUNT: { [key: string]: BigNumber } = {
        DAI: BigNumber.from("20000000000000000000"),
        USDC: BigNumber.from("20000000"),
        USDT: BigNumber.from("20000000"),
    };
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
            const vault = scenarios.vaults[i];
            const stories = vault.stories;
            const profile = vault.profile;
            const adaptersName = Object.keys(
                TypedAdapterStrategies[profile + vault.name]
            );
            for (let i = 0; i < adaptersName.length; i++) {
                const adapterName = adaptersName[i];
                const strategies =
                    TypedAdapterStrategies[profile + vault.name][adaptersName[i]];

                for (let i = 0; i < strategies.length; i++) {
                    describe(`${strategies[i].strategyName}`, async () => {
                        const strategy = strategies[i];
                        const tokensHash = getSoliditySHA3Hash(
                            ["address[]"],
                            [[TOKENS[strategy.token]]]
                        );
                        const contracts: CONTRACTS = {};
                        let underlyingTokenName: string;
                        let underlyingTokenSymbol: string;
                        before(async () => {
                            try {
                                underlyingTokenName = await getTokenName(
                                    strategy.token
                                );
                                underlyingTokenSymbol = await getTokenSymbol(
                                    strategy.token
                                );
                                const adapter = adapters[adapterName];
                                const Vault = await deployVault(
                                    essentialContracts.registry.address,
                                    essentialContracts.riskManager.address,
                                    essentialContracts.strategyManager.address,
                                    essentialContracts.optyMinter.address,
                                    TOKENS[strategy.token],
                                    users["owner"],
                                    users["admin"],
                                    scenarios.vaults[i].name,
                                    underlyingTokenName,
                                    underlyingTokenSymbol,
                                    profile
                                );
                                await approveLiquidityPoolAndMapAdapter(
                                    essentialContracts.registry,
                                    adapter.address,
                                    strategy.strategy[0].contract
                                );
                                const riskProfile = await Vault.profile();
                                await setBestBasicStrategy(
                                    strategy.strategy,
                                    tokensHash,
                                    essentialContracts.registry,
                                    essentialContracts.strategyProvider,
                                    riskProfile
                                );
                                const timestamp = (await getBlockTimestamp()) * 2;
                                await fundWalletToken(
                                    TOKENS[strategy.token],
                                    users["owner"],
                                    MAX_AMOUNT[strategy.token],
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
                                                const {
                                                    type,
                                                }: ARGUMENTS = setAction.args;
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
                                                const {
                                                    amount,
                                                }: ARGUMENTS = setAction.args;
                                                if (setAction.expect === "success") {
                                                    await contracts[setAction.contract]
                                                        .connect(
                                                            users[setAction.executer]
                                                        )
                                                        [setAction.action](
                                                            contracts["adapter"]
                                                                .address,
                                                            amount
                                                                ? amount[strategy.token]
                                                                : "0"
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
                                                                    ? amount[
                                                                          strategy.token
                                                                      ]
                                                                    : "0"
                                                            )
                                                    ).to.be.revertedWith(
                                                        setAction.message
                                                    );
                                                }
                                                break;
                                            }
                                            case "approve(address,uint256)": {
                                                const {
                                                    amount,
                                                }: ARGUMENTS = setAction.args;
                                                if (setAction.expect === "success") {
                                                    await contracts[setAction.contract]
                                                        .connect(
                                                            users[setAction.executer]
                                                        )
                                                        [setAction.action](
                                                            contracts["vault"].address,
                                                            amount
                                                                ? amount[strategy.token]
                                                                : "0"
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
                                                                    ? amount[
                                                                          strategy.token
                                                                      ]
                                                                    : "0"
                                                            )
                                                    ).to.be.revertedWith(
                                                        setAction.message
                                                    );
                                                }
                                                break;
                                            }
                                            case "userDepositRebalance(uint256)": {
                                                const {
                                                    amount,
                                                }: ARGUMENTS = setAction.args;
                                                if (setAction.expect === "success") {
                                                    await contracts[setAction.contract]
                                                        .connect(
                                                            users[setAction.executer]
                                                        )
                                                        [setAction.action](
                                                            amount
                                                                ? amount[strategy.token]
                                                                : "0"
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
                                                                amount
                                                                    ? amount[
                                                                          strategy.token
                                                                      ]
                                                                    : "0"
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
                                                const {
                                                    type,
                                                }: ARGUMENTS = setAction.args;
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
                                                const {
                                                    amount,
                                                }: ARGUMENTS = setAction.args;

                                                const poolValue = await contracts[
                                                    "adapter"
                                                ].getPoolValue(
                                                    strategy.strategy[0].contract,
                                                    TOKENS[strategy.token]
                                                );
                                                maxValue = BigNumber.from(poolValue)
                                                    .mul(
                                                        BigNumber.from(
                                                            amount
                                                                ? amount[strategy.token]
                                                                : "0"
                                                        )
                                                    )
                                                    .div(BigNumber.from("10000"));
                                                investedValue = maxValue.mul(
                                                    BigNumber.from("2")
                                                );
                                                if (setAction.expect === "success") {
                                                    await contracts[setAction.contract]
                                                        .connect(
                                                            users[setAction.executer]
                                                        )
                                                        [setAction.action](
                                                            contracts["adapter"]
                                                                .address,
                                                            BigNumber.from(
                                                                amount
                                                                    ? amount[
                                                                          strategy.token
                                                                      ]
                                                                    : "0"
                                                            )
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
                                                                BigNumber.from(
                                                                    amount
                                                                        ? amount[
                                                                              strategy
                                                                                  .token
                                                                          ]
                                                                        : "0"
                                                                )
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
                            }).timeout(150000);
                        }
                    });
                }
            }
        });
    }
});
