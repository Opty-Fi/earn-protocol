import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { Signer, BigNumber } from "ethers";
import {
    setUp,
    deployVault,
    setBestBasicStrategy,
    approveLiquidityPoolAndMapAdapter,
} from "./setup";
import { ESSENTIAL_CONTRACTS, CONTRACTS, DATA_OBJECT } from "./utils/type";
import { TOKENS } from "./utils/constants";
import { TypedAdapterStrategies } from "./data";
import {
    getSoliditySHA3Hash,
    fundWalletToken,
    getBlockTimestamp,
} from "./utils/helpers";
import scenarios from "./scenarios/hold-tokens-sh-0x0.json";
type ARGUMENTS = {
    amount?: { [key: string]: string };
    riskProfile?: string;
    strategyHash?: string;
};

describe(scenarios.title, () => {
    // TODO: ADD TEST SCENARIOES, ADVANCED PROFILE, STRATEGIES.
    const MAX_AMOUNT: { [key: string]: BigNumber } = {
        DAI: BigNumber.from("1000000000000000000000"),
        USDT: BigNumber.from("1000000000"),
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
            const adaptersName = Object.keys(TypedAdapterStrategies[vault.name]);
            for (let i = 0; i < adaptersName.length; i++) {
                // for (let i = 0; i < 1; i++) {
                const adapterName = adaptersName[i];
                const strategies = TypedAdapterStrategies[vault.name][adaptersName[i]];

                for (let i = 0; i < strategies.length; i++) {
                    describe(`${strategies[i].strategyName}`, async () => {
                        const strategy = strategies[i];
                        const tokensHash = getSoliditySHA3Hash(
                            ["address[]"],
                            [[TOKENS[strategy.token]]]
                        );
                        let bestStrategyHash: void;
                        let vaultRiskProfile: string;
                        const contracts: CONTRACTS = {};
                        before(async () => {
                            try {
                                const adapter = adapters[adapterName];
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
                                vaultRiskProfile = await Vault.profile();
                                bestStrategyHash = await setBestBasicStrategy(
                                    strategy.strategy,
                                    tokensHash,
                                    essentialContracts.registry,
                                    essentialContracts.strategyProvider,
                                    vaultRiskProfile
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

                                contracts["strategyProvider"] =
                                    essentialContracts.strategyProvider;
                                contracts["adapter"] = adapter;

                                contracts["vault"] = Vault;

                                contracts["erc20"] = ERC20Instance;
                            } catch (error) {
                                console.error(error);
                            }
                        });

                        for (let i = 0; i < stories.length; i++) {
                            // if (i!=3) {
                            //     continue
                            // }
                            // for (let i = 0; i < 2; i++) {
                            it(stories[i].description, async () => {
                                const story = stories[i];
                                // if (story.maxDepositType === "amount") {
                                for (let i = 0; i < story.actions.length; i++) {
                                    const action = story.actions[i];
                                    switch (action.action) {
                                        case "setBestStrategy(string,bytes32,bytes32)": {
                                            const {
                                                riskProfile,
                                                strategyHash,
                                            }: ARGUMENTS = action.args;
                                            if (action.expect === "success") {
                                                // console.log("StrategyHash: ", strategyHash)
                                                // let _strategyHash = strategyHash? strategyHash: bestStrategyHash
                                                await contracts[action.contract]
                                                    .connect(users[action.executer])
                                                    [action.action](
                                                        riskProfile,
                                                        tokensHash,
                                                        strategyHash
                                                            ? strategyHash
                                                            : bestStrategyHash
                                                    );
                                            } else {
                                                await expect(
                                                    contracts[action.contract]
                                                        .connect(users[action.executer])
                                                        [action.action](
                                                            riskProfile,
                                                            tokensHash,
                                                            strategyHash
                                                                ? strategyHash
                                                                : bestStrategyHash
                                                        )
                                                ).to.be.revertedWith(action.message);
                                            }
                                            break;
                                        }
                                        // case "setMaxDepositAmount(address,uint256)": {
                                        //     const {
                                        //         amount,
                                        //     }: ARGUMENTS = action.args;
                                        //     if (action.expect === "success") {
                                        //         await contracts[action.contract]
                                        //             .connect(
                                        //                 users[action.executer]
                                        //             )
                                        //             [action.action](
                                        //                 contracts["adapter"]
                                        //                     .address,
                                        //                 amount
                                        //                     ? amount[strategy.token]
                                        //                     : "0"
                                        //             );
                                        //     } else {
                                        //         await expect(
                                        //             contracts[action.contract]
                                        //                 .connect(
                                        //                     users[
                                        //                         action.executer
                                        //                     ]
                                        //                 )
                                        //                 [action.action](
                                        //                     contracts["adapter"]
                                        //                         .address,
                                        //                     amount
                                        //                         ? amount[
                                        //                               strategy.token
                                        //                           ]
                                        //                         : "0"
                                        //                 )
                                        //         ).to.be.revertedWith(
                                        //             action.message
                                        //         );
                                        //     }
                                        //     break;
                                        // }
                                        case "approve(address,uint256)": {
                                            const {
                                                amount,
                                                strategyHash,
                                            }: ARGUMENTS = action.args;
                                            if (action.expect === "success") {
                                                // console.log("tokensHash: ", tokensHash)
                                                // console.log("Strategy: ", strategyHash ? strategyHash : bestStrategyHash)
                                                // console.log("Approve Amount: ", ethers.utils.formatUnits(amount?amount[strategy.token]:0, 6))
                                                await contracts[action.contract]
                                                    .connect(users[action.executer])
                                                    [action.action](
                                                        contracts["vault"].address,
                                                        amount
                                                            ? amount[strategy.token]
                                                            : "0"
                                                    );
                                            } else {
                                                await expect(
                                                    contracts[action.contract]
                                                        .connect(users[action.executer])
                                                        [action.action](
                                                            contracts["vault"].address,
                                                            amount
                                                                ? amount[strategy.token]
                                                                : "0"
                                                        )
                                                ).to.be.revertedWith(action.message);
                                            }
                                            break;
                                        }
                                        case "userDepositRebalance(uint256)": {
                                            const { amount }: ARGUMENTS = action.args;

                                            if (action.expect === "success") {
                                                await contracts[action.contract]
                                                    .connect(users[action.executer])
                                                    [action.action](
                                                        amount
                                                            ? amount[strategy.token]
                                                            : "0"
                                                    );
                                            } else {
                                                await expect(
                                                    contracts[action.contract]
                                                        .connect(users[action.executer])
                                                        [action.action](
                                                            amount
                                                                ? amount[strategy.token]
                                                                : "0"
                                                        )
                                                ).to.be.revertedWith(action.message);
                                            }
                                            break;
                                        }
                                        case "balance()": {
                                            // const {
                                            //     expectedValue }: ARGUMENTS = action;
                                            // let _temp  = action.expectedValue
                                            // console.log("Checking balance")
                                            const balance = await contracts[
                                                action.contract
                                            ][action.action]();
                                            // console.log("Balance: ", balance)
                                            // console.log("balance: ", ethers.utils.formatEther(balance))
                                            expect(balance).to.equal(
                                                action.expectedValue[
                                                    <keyof typeof action.expectedValue>(
                                                        strategy.token
                                                    )
                                                ]
                                            );
                                            break;
                                        }
                                        case "userWithdrawRebalance(uint256)": {
                                            // console.log("Testing withdraw")
                                            const { amount }: ARGUMENTS = action.args;
                                            // console.log("Amount: ", amount)
                                            // console.log("Amount internal: ", amount? amount[strategy.token]: 0)
                                            if (action.expect === "success") {
                                                // const ownerAddress = await users[action.executer].getAddress()
                                                // const ownerOptyBalance = await contracts["vault"].balanceOf(ownerAddress)
                                                // console.log("Owner opty balance: ", ethers.utils.formatEther(ownerOptyBalance))
                                                await contracts[action.contract]
                                                    .connect(users[action.executer])
                                                    [action.action](
                                                        amount
                                                            ? amount[strategy.token]
                                                            : "0"
                                                    );
                                            } else {
                                                await expect(
                                                    contracts[action.contract]
                                                        .connect(users[action.executer])
                                                        [action.action](
                                                            amount
                                                                ? amount[strategy.token]
                                                                : "0"
                                                        )
                                                ).to.be.revertedWith(action.message);
                                            }
                                            break;
                                        }
                                        default:
                                            break;
                                    }
                                }
                                // for (let i = 0; i < story.getActions.length; i++) {
                                //     const getAction = story.getActions[i];
                                //     switch (getAction.action) {
                                //         case "balance": {
                                //             const balance = await contracts[
                                //                 getAction.contract
                                //             ][getAction.action]();
                                //             expect(balance).to.equal(
                                //                 getAction.expectedValue
                                //             );
                                //         }
                                //     }
                                // }
                                // }
                                // } else if (story.maxDepositType === "pct") {
                                //     let investedValue = BigNumber.from("0");
                                //     let maxValue = BigNumber.from("0");
                                //     for (let i = 0; i < story.actions.length; i++) {
                                //         const action = story.actions[i];
                                //         switch (action.action) {
                                //             case "setMaxDepositPoolType(uint8)": {
                                //                 const {
                                //                     type,
                                //                 }: ARGUMENTS = action.args;
                                //                 if (action.expect === "success") {
                                //                     await contracts[action.contract]
                                //                         .connect(
                                //                             users[action.executer]
                                //                         )
                                //                         [action.action](type);
                                //                 } else {
                                //                     await expect(
                                //                         contracts[action.contract]
                                //                             .connect(
                                //                                 users[
                                //                                     action.executer
                                //                                 ]
                                //                             )
                                //                             [action.action](type)
                                //                     ).to.be.revertedWith(
                                //                         action.message
                                //                     );
                                //                 }
                                //                 break;
                                //             }
                                //             case "setMaxDepositPoolPct(address,uint256)": {
                                //                 const {
                                //                     amount,
                                //                 }: ARGUMENTS = action.args;

                                //                 const poolValue = await contracts[
                                //                     "adapter"
                                //                 ].getPoolValue(
                                //                     strategy.strategy[0].contract,
                                //                     TOKENS[strategy.token]
                                //                 );
                                //                 maxValue = BigNumber.from(poolValue)
                                //                     .mul(
                                //                         BigNumber.from(
                                //                             amount
                                //                                 ? amount[strategy.token]
                                //                                 : "0"
                                //                         )
                                //                     )
                                //                     .div(BigNumber.from("10000"));
                                //                 investedValue = maxValue.mul(
                                //                     BigNumber.from("2")
                                //                 );
                                //                 if (action.expect === "success") {
                                //                     await contracts[action.contract]
                                //                         .connect(
                                //                             users[action.executer]
                                //                         )
                                //                         [action.action](
                                //                             contracts["adapter"]
                                //                                 .address,
                                //                             BigNumber.from(
                                //                                 amount
                                //                                     ? amount[
                                //                                           strategy.token
                                //                                       ]
                                //                                     : "0"
                                //                             )
                                //                         );
                                //                 } else {
                                //                     await expect(
                                //                         contracts[action.contract]
                                //                             .connect(
                                //                                 users[
                                //                                     action.executer
                                //                                 ]
                                //                             )
                                //                             [action.action](
                                //                                 contracts["adapter"]
                                //                                     .address,
                                //                                 BigNumber.from(
                                //                                     amount
                                //                                         ? amount[
                                //                                               strategy
                                //                                                   .token
                                //                                           ]
                                //                                         : "0"
                                //                                 )
                                //                             )
                                //                     ).to.be.revertedWith(
                                //                         action.message
                                //                     );
                                //                 }
                                //                 break;
                                //             }
                                //             case "approve(address,uint256)": {
                                //                 if (action.expect === "success") {
                                //                     await contracts[action.contract]
                                //                         .connect(
                                //                             users[action.executer]
                                //                         )
                                //                         [action.action](
                                //                             contracts["vault"].address,
                                //                             investedValue
                                //                         );
                                //                 } else {
                                //                     await expect(
                                //                         contracts[action.contract]
                                //                             .connect(
                                //                                 users[
                                //                                     action.executer
                                //                                 ]
                                //                             )
                                //                             [action.action](
                                //                                 contracts["vault"]
                                //                                     .address,
                                //                                 investedValue
                                //                             )
                                //                     ).to.be.revertedWith(
                                //                         action.message
                                //                     );
                                //                 }
                                //                 break;
                                //             }
                                //             case "userDepositRebalance(uint256)": {
                                //                 if (action.expect === "success") {
                                //                     await contracts[action.contract]
                                //                         .connect(
                                //                             users[action.executer]
                                //                         )
                                //                         [action.action](
                                //                             investedValue
                                //                         );
                                //                 } else {
                                //                     await expect(
                                //                         contracts[action.contract]
                                //                             .connect(
                                //                                 users[
                                //                                     action.executer
                                //                                 ]
                                //                             )
                                //                             [action.action](
                                //                                 investedValue
                                //                             )
                                //                     ).to.be.revertedWith(
                                //                         action.message
                                //                     );
                                //                 }
                                //                 break;
                                //             }
                                //             default:
                                //                 break;
                                //         }
                                //     }
                                //     for (let i = 0; i < story.getActions.length; i++) {
                                //         const getAction = story.getActions[i];
                                //         switch (getAction.action) {
                                //             case "balance": {
                                //                 const balance = await contracts[
                                //                     getAction.contract
                                //                 ][getAction.action]();
                                //                 expect(balance).to.equal(
                                //                     investedValue.sub(maxValue)
                                //                 );
                                //             }
                                //         }
                                //     }
                                // }
                            }).timeout(150000);
                        }
                    });
                }
            }
        });
    }
});
