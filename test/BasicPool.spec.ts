import chai, { assert, expect } from "chai";
import { Contract, ethers, utils } from "ethers";
import { solidity, deployContract } from "ethereum-waffle";

import { expandToTokenDecimals, fundWallet } from "./shared/utilities";
import OptyTokenBasicPool from "../build/BasicPool.json";
import OptyRegistry from "../build/Registry.json";
import RiskManager from "../build/RiskManager.json";
import OptyStrategyManager from "../build/StrategyManager.json";
import CompoundDepositPoolProxy from "../build/CompoundDepositPoolProxy.json";
import AaveDepositPoolProxy from "../build/AaveDepositPoolProxy.json";
import AaveBorrowPoolProxy from "../build/AaveBorrowPoolProxy.json";
import CurveDepositPoolProxy from "../build/CurveDepositPoolProxy.json";
import CreamDepositPoolProxy from "../build/CreamDepositPoolProxy.json";
import DForceDepositPoolProxy from "../build/DForceDepositPoolProxy.json";
import FulcrumDepositPoolProxy from "../build/FulcrumDepositPoolProxy.json";
import HarvestDepositPoolProxy from "../build/HarvestDepositPoolProxy.json";
import YearnDepositPoolProxy from "../build/YearnDepositPoolProxy.json";
import dYdXDepositPoolProxy from "../build/dYdXDepositPoolProxy.json";
// import { CompoundDepositPoolProxy, AaveDepositPoolProxy } from "../build/";
import poolProxies from "./shared/poolProxies.json";
import defiPools from "./shared/defiPools.json";
import allStrategies from "./shared/strategies.json";
// import allStrategies from "./shared/sample_strategies.json";

import tokenAddresses from "./shared/TokenAddresses.json";
import addressAbis from "./shared/AddressAbis.json";
import { ContractJSON } from "ethereum-waffle/dist/esm/ContractJSON";
// import { ContractJSON } from "ethereum-waffle/dist/esm/ContractJSON";
const envConfig = require("dotenv").config(); //  library to import the local ENV variables defined
//  Note: Don't remove line-6, because this line helps to get rid of error: NOT ABLE TO READ LOCAL ENV VARIABLES defined in .env file

chai.use(solidity);

const Ganache = require("ganache-core");
const abi = require("ethereumjs-abi");
const MAINNET_NODE_URL = process.env.MAINNET_NODE_URL;
const TEST_AMOUNT_NUM: number = 2;
let TEST_AMOUNT: ethers.utils.BigNumber;

interface PoolProxyContract {
    [id: string]: ContractJSON;
}
interface DefiPools {
    [id: string]: {
        pool: string;
        lpToken: string;
        tokens: string[];
    };
}
let poolProxyContract: PoolProxyContract = {
    CompoundDepositPoolProxy,
    AaveDepositPoolProxy,
    FulcrumDepositPoolProxy,
    DForceDepositPoolProxy,
    HarvestDepositPoolProxy,
    YearnDepositPoolProxy,
    CurveDepositPoolProxy,
    dYdXDepositPoolProxy,
    CreamDepositPoolProxy,
};

interface OptyPoolProxyContractVariables {
    [id: string]: Contract;
}
let optyPoolProxyContractVariables: OptyPoolProxyContractVariables = {};
let poolProxiesKey: keyof typeof poolProxies;
let defiPoolsKey: keyof typeof defiPools;

async function startChain() {
    const ganache = await Ganache.provider({
        fork: MAINNET_NODE_URL,
        network_id: 1,
        mnemonic: `${process.env.MY_METAMASK_MNEMONIC}`,
    });
    const provider = new ethers.providers.Web3Provider(ganache);
    const wallet = ethers.Wallet.fromMnemonic(
        `${process.env.MY_METAMASK_MNEMONIC}`
    ).connect(provider);

    return wallet;
}

describe("OptyTokenBasicPool", async () => {
    let strategyScore: number = 1;
    let wallet: ethers.Wallet;
    let optyRegistry: Contract;
    let riskManager: Contract;
    let optyStrategyManager: Contract;
    let optyAaveBorrowPoolProxy: Contract;
    let optyCurveDepositPoolProxy: Contract;
    let optyCreamDepositPoolProxy: Contract;
    let optyDForceDepositPoolProxy: Contract;
    let optyFulcrumDepositPoolProxy: Contract;
    let optyHarvestDepositPoolProxy: Contract;
    let optyYearnDepositPoolProxy: Contract;
    let profile = "basic";
    let userTokenBalanceWei;
    let userInitialTokenBalance: number;
    let userTotalTokenBalance: number;
    let contractTokenBalanceWei;
    let contractTokenBalance: number;
    let contractTotalTokenBalance: number;
    let userOptyTokenBalanceWei;
    let userOptyTokenBalance: number;
    let userTokenOptyTokenBalance: number;
    let optyPoolProxyContract: Contract;
    let optyAaveDepositPoolProxy: Contract;
    let underlyingTokenDecimals: number;
    let underlyingTokenName;
    let strategies: {
        compound: { pool: string; outputToken: string; isBorrow: boolean };
        aave: { pool: string; outputToken: string; isBorrow: boolean };
    };
    let tokensHash: string = "";

    // util function for converting expanded values to Deimals number for readability and Testing
    const fromWei = (x: string) => ethers.utils.formatUnits(x, underlyingTokenDecimals);

    before(async () => {
        // strategyScore = 1
        wallet = await startChain();

        console.log(
            "\n------ Deploying Registry, RiskManager and StrategyManager Contracts ---------\n"
        );
        //  Deploying Registry, RiskManager and StrategyManager Contract
        optyRegistry = await deployContract(wallet, OptyRegistry);
        assert.isDefined(optyRegistry, "OptyRegistry contract not deployed");
        console.log("Registry: ", optyRegistry.address);

        riskManager = await deployContract(wallet, RiskManager, [optyRegistry.address]);
        assert.isDefined(riskManager, "RiskManager contract not deployed");
        console.log("Risk Manager: ", riskManager.address);

        optyStrategyManager = await deployContract(wallet, OptyStrategyManager, [
            optyRegistry.address,
        ]);
        assert.isDefined(
            optyStrategyManager,
            "OptyStrategyManager contract not deployed"
        );
        console.log("Strategy Manager: ", optyStrategyManager.address);

        let token: keyof typeof tokenAddresses;
        for (token in tokenAddresses) {
            if (token != "uniswapFactory") {
                let tokenStatus = await optyRegistry.tokens(tokenAddresses[token]);
                if (!tokenStatus) {
                    await optyRegistry.approveToken(tokenAddresses[token]);
                }
            }
        }
        for (poolProxiesKey in poolProxies) {
            if (poolProxiesKey == "opDAIBsc") {
                console.log("Pool Proxy contracts: ", poolProxies[poolProxiesKey]);
                let optyPoolProxyContracts = poolProxies[poolProxiesKey];

                // let poolProxyConttractKey: keyof typeof poolProxyConttract;
                let count = 1;
                for (let optyPoolProxyContractsKey of optyPoolProxyContracts) {
                    // if (optyPoolProxyContractsKey == "CurveDepositPoolProxy") {
                    if (count <= 9) {
                        if (
                            poolProxyContract.hasOwnProperty(
                                optyPoolProxyContractsKey.toString()
                            )
                        ) {
                            if (
                                optyPoolProxyContractsKey.toString().includes("Borrow")
                            ) {
                                optyPoolProxyContract = await deployContract(
                                    wallet,
                                    poolProxyContract[optyPoolProxyContractsKey],
                                    [optyRegistry.address]
                                );
                            } else {
                                optyPoolProxyContract = await deployContract(
                                    wallet,
                                    poolProxyContract[optyPoolProxyContractsKey]
                                );
                            }
                            optyPoolProxyContractVariables[
                                optyPoolProxyContractsKey
                            ] = optyPoolProxyContract;

                            assert.isDefined(
                                optyPoolProxyContractVariables[
                                    optyPoolProxyContractsKey
                                ],
                                "optyPoolProxyContract contract not deployed"
                            );
                            for (defiPoolsKey in defiPools) {
                                if (
                                    defiPoolsKey.toString() ==
                                    optyPoolProxyContractsKey.toString()
                                ) {
                                    let defiPoolsUnderlyingTokens: DefiPools =
                                        defiPools[defiPoolsKey];
                                    for (let defiPoolsUnderlyingTokensKey in defiPoolsUnderlyingTokens) {
                                        // if (defiPoolsUnderlyingTokensKey == "dai+usdc+usdt") {

                                        await approveTokenLpToken(
                                            defiPoolsUnderlyingTokens[
                                                defiPoolsUnderlyingTokensKey
                                            ].lpToken,
                                            defiPoolsUnderlyingTokens[
                                                defiPoolsUnderlyingTokensKey
                                            ].tokens
                                        );
                                        await setTokensHashToTokens(
                                            defiPoolsUnderlyingTokens[
                                                defiPoolsUnderlyingTokensKey
                                            ].tokens
                                        );
                                        if (
                                            defiPoolsKey.toString().includes("Borrow")
                                        ) {
                                            await approveLpCpAndMapLpToPoolProxy(
                                                defiPoolsUnderlyingTokens[
                                                    defiPoolsUnderlyingTokensKey
                                                ].pool,
                                                optyPoolProxyContractVariables[
                                                    optyPoolProxyContractsKey
                                                ].address,
                                                true
                                            );
                                        } else {
                                            await approveLpCpAndMapLpToPoolProxy(
                                                defiPoolsUnderlyingTokens[
                                                    defiPoolsUnderlyingTokensKey
                                                ].pool,
                                                optyPoolProxyContractVariables[
                                                    optyPoolProxyContractsKey
                                                ].address,
                                                false
                                            );
                                        }
                                        if (
                                            defiPoolsUnderlyingTokens[
                                                defiPoolsUnderlyingTokensKey
                                            ].lpToken != "0x0000000000000000000000000000000000000000"
                                        ) {
                                            await optyRegistry.setLiquidityPoolToLPToken(
                                                defiPoolsUnderlyingTokens[
                                                    defiPoolsUnderlyingTokensKey
                                                ].pool,
                                                defiPoolsUnderlyingTokens[
                                                    defiPoolsUnderlyingTokensKey
                                                ].tokens,
                                                defiPoolsUnderlyingTokens[
                                                    defiPoolsUnderlyingTokensKey
                                                ].lpToken
                                            );
                                        }
                                        let mapResult = await optyRegistry.liquidityPoolToLPTokens(
                                            defiPoolsUnderlyingTokens[
                                                defiPoolsUnderlyingTokensKey
                                            ].pool,
                                            "0x" +
                                                abi
                                                    .soliditySHA3(
                                                        ["address[]"],
                                                        [
                                                            defiPoolsUnderlyingTokens[
                                                                defiPoolsUnderlyingTokensKey
                                                            ].tokens,
                                                        ]
                                                    )
                                                    .toString("hex")
                                        );

                                        // }
                                    }
                                }
                            }
                        }
                    }
                    count++;
                }
            }
        }
    });

    it("should check if the pool proxy contracts are deployed", async () => {
        assert.isOk(
            optyPoolProxyContractVariables.CompoundDepositPoolProxy.address,
            "CompoundDepositPoolProxy Contract is not deployed"
        );
        assert.isOk(
            optyPoolProxyContractVariables.AaveDepositPoolProxy.address,
            "AaveDepositPoolProxy Contract is not deployed"
        );
        // assert.isOk(optyPoolProxyContractVariables.AaveBorrowPoolProxy.address, "AaveBorrowPoolProxy Contract is not deployed");
        assert.isOk(
            optyPoolProxyContractVariables.FulcrumDepositPoolProxy.address,
            "AaveDepositPoolProxy Contract is not deployed"
        );
        assert.isOk(
            optyPoolProxyContractVariables.DForceDepositPoolProxy.address,
            "AaveDepositPoolProxy Contract is not deployed"
        );
    });

    let strategiesTokenKey: keyof typeof allStrategies;
    for (strategiesTokenKey in allStrategies) {
        if (strategiesTokenKey == "DAI" || strategiesTokenKey == "USDC") {
            await runTokenTestSuite(strategiesTokenKey);
        }
    }

    async function runTokenTestSuite(strategiesTokenKey: keyof typeof allStrategies) {
        describe("TEST CASES FOR: " + strategiesTokenKey.toUpperCase(), async () => {
            let underlyingToken: string;
            let tokens: string[];
            let tokenContractInstance: Contract;
            let optyTokenBasicPool: Contract;

            before(async () => {
                underlyingToken =
                    tokenAddresses[
                        <keyof typeof tokenAddresses>strategiesTokenKey.toLowerCase()
                    ];
                tokens = [underlyingToken];

                // Instantiate token contract
                tokenContractInstance = new ethers.Contract(
                    underlyingToken,
                    addressAbis.erc20.abi,
                    wallet
                );
                underlyingTokenDecimals = await tokenContractInstance.decimals();
                TEST_AMOUNT = expandToTokenDecimals(
                    TEST_AMOUNT_NUM,
                    underlyingTokenDecimals
                );
                tokensHash =
                    "0x" + abi.soliditySHA3(["address[]"], [tokens]).toString("hex");

                underlyingTokenName = await tokenContractInstance.symbol();

                console.log(
                    "DYDX DEPOSIT POOL PROXY CONTRACT ADDRESS: ",
                    optyPoolProxyContractVariables.dYdXDepositPoolProxy.address
                );
                optyTokenBasicPool = await deployContract(wallet, OptyTokenBasicPool, [
                    profile,
                    riskManager.address,
                    underlyingToken,
                    optyStrategyManager.address,
                    "0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e",
                    optyPoolProxyContractVariables.dYdXDepositPoolProxy.address,
                ]);
                assert.isDefined(
                    optyTokenBasicPool,
                    "OptyTokenBasicPool contract not deployed"
                );
            });

            beforeEach(async () => {
                await checkAndFundWallet();
            });

            async function checkAndFundWallet() {
                userTokenBalanceWei = await tokenContractInstance.balanceOf(
                    wallet.address
                );
                userInitialTokenBalance = parseFloat(fromWei(userTokenBalanceWei));

                userOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(
                    wallet.address
                );
                userOptyTokenBalance = parseFloat(fromWei(userOptyTokenBalanceWei));
                if (
                    userInitialTokenBalance < TEST_AMOUNT_NUM ||
                    userInitialTokenBalance == undefined
                ) {
                    let FUND_AMOUNT = expandToTokenDecimals(
                        TEST_AMOUNT_NUM - userInitialTokenBalance,
                        underlyingTokenDecimals
                    );
                    let TEST_AMOUNT_HEX = "0x" + Number(FUND_AMOUNT).toString(16);

                    //  Fund the user's wallet with some amount of tokens
                    await fundWallet(underlyingToken, wallet, TEST_AMOUNT_HEX);

                    // Check Token and opToken balance of User's wallet and OptyTokenBaiscPool Contract
                    userTokenBalanceWei = await tokenContractInstance.balanceOf(
                        wallet.address
                    );
                    userInitialTokenBalance = parseFloat(fromWei(userTokenBalanceWei));
                    expect(userInitialTokenBalance).to.equal(TEST_AMOUNT_NUM);
                }
            }

            it("should check OptyTokenBasicPool contract is deployed", async () => {
                assert.isOk(
                    optyTokenBasicPool.address,
                    "BasicPool Contract is not deployed"
                );
            });

            it("should deposit using userDeposit()", async () => {
                await tokenContractInstance.approve(
                    optyTokenBasicPool.address,
                    TEST_AMOUNT
                );
                expect(
                    await tokenContractInstance.allowance(
                        wallet.address,
                        optyTokenBasicPool.address
                    )
                ).to.equal(TEST_AMOUNT);
                const userDepositOutput = await optyTokenBasicPool.userDeposit(
                    TEST_AMOUNT
                );
                assert.isOk(userDepositOutput, "UserDeposit() call failed");

                // Check Token and opToken balance after userDeposit() call
                userTokenBalanceWei = await tokenContractInstance.balanceOf(
                    wallet.address
                );
                const userNewTokenBalance = parseFloat(fromWei(userTokenBalanceWei));
                expect(userNewTokenBalance).to.equal(
                    userInitialTokenBalance - TEST_AMOUNT_NUM
                );

                contractTokenBalanceWei = await tokenContractInstance.balanceOf(
                    optyTokenBasicPool.address
                );
                contractTokenBalance = parseFloat(fromWei(contractTokenBalanceWei));
                expect(contractTokenBalance).to.equal(TEST_AMOUNT_NUM);

                userOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(
                    wallet.address
                );
                userOptyTokenBalance = parseFloat(fromWei(userOptyTokenBalanceWei));
                expect(userOptyTokenBalance).to.equal(TEST_AMOUNT_NUM);
            });

            allStrategies[strategiesTokenKey].basic.forEach(
                async (strategies, index) => {
                    // if (allStrategies[strategiesTokenKey].basic[index].strategyName == "DAI-deposit-CURVE-yDAI+yUSDC+yUSDT+yBUSD") {
                    if (index <= 30) {
                        it(
                            "should deposit using userDepositRebalance() using Strategy - " +
                                strategies.strategyName,
                            async () => {
                                let strategySteps: (string | boolean)[][] = [];
                                let previousStepOutputToken = "";
                                for (
                                    let index = 0;
                                    index < strategies.strategy.length;
                                    index++
                                ) {
                                    let tempArr: (string | boolean)[] = [];
                                    if (previousStepOutputToken.length > 0) {
                                        await optyRegistry.setTokensHashToTokens([
                                            previousStepOutputToken,
                                        ]);
                                        // await optyRegistry.approveToken(previousStepOutputToken);
                                        await optyRegistry.setLiquidityPoolToLPToken(
                                            strategies.strategy[index].contract,
                                            [previousStepOutputToken],
                                            strategies.strategy[index].outputToken
                                        );
                                    }

                                    tempArr.push(
                                        strategies.strategy[index].contract,
                                        strategies.strategy[index].outputToken,
                                        strategies.strategy[index].isBorrow
                                    );
                                    previousStepOutputToken =
                                        strategies.strategy[index].outputToken;
                                    // strategySteps = [tempArr];
                                    strategySteps.push(tempArr);
                                }

                                let strategyStepHash: string[] = [];
                                strategySteps.forEach((tempStrategyStep, index) => {
                                    strategyStepHash[index] =
                                        "0x" +
                                        abi
                                            .soliditySHA3(
                                                ["address", "address", "bool"],
                                                [
                                                    tempStrategyStep[0],
                                                    tempStrategyStep[1],
                                                    tempStrategyStep[2],
                                                ]
                                            )
                                            .toString("hex");
                                });

                                let tokenToStrategyStepsHash =
                                    "0x" +
                                    abi
                                        .soliditySHA3(
                                            ["bytes32", "bytes32[]"],
                                            [tokensHash, strategyStepHash]
                                        )
                                        .toString("hex");

                                let tokenToStrategyHashes = await optyRegistry.getTokenToStrategies(
                                    tokensHash
                                );

                                if (
                                    tokenToStrategyHashes.includes(
                                        tokenToStrategyStepsHash
                                    )
                                ) {
                                    await expectRevert(
                                        optyRegistry.setStrategy(
                                            tokensHash,
                                            strategySteps
                                        ),
                                        "isNewStrategy"
                                    );
                                } else {
                                    const setStrategyTx = await optyRegistry.setStrategy(
                                        tokensHash,
                                        strategySteps
                                    );
                                    assert.isDefined(
                                        setStrategyTx,
                                        "Setting StrategySteps has failed!"
                                    );

                                    const receipt = await setStrategyTx.wait();
                                    let strategyHash = receipt.events[0].args[2];
                                    expect(strategyHash.toString().length).to.equal(66);

                                    let strategy = await optyRegistry.getStrategy(
                                        strategyHash.toString()
                                    );
                                    if (!strategy["_isStrategy"]) {
                                        await optyRegistry.approveStrategy(
                                            strategyHash.toString()
                                        );
                                        strategy = await optyRegistry.getStrategy(
                                            strategyHash.toString()
                                        );
                                        assert.isTrue(
                                            strategy["_isStrategy"],
                                            "Strategy is not approved"
                                        );
                                        // let strategyScore = count + 1;
                                        await optyRegistry.scoreStrategy(
                                            strategyHash.toString(),
                                            index + 1
                                        );
                                    }
                                    // await checkAndFundWallet();
                                    let bestStrategyHash = await riskManager.getBestStrategy(
                                        profile,
                                        [underlyingToken]
                                    );

                                    let bestStrategy = await optyRegistry.getStrategy(
                                        bestStrategyHash.toString()
                                    );

                                    await testUserDepositRebalance();
                                    strategyScore = strategyScore + 1;
                                }
                            }
                        );
                    }
                }
            );

            async function testUserDepositRebalance() {
                await tokenContractInstance.approve(
                    optyTokenBasicPool.address,
                    TEST_AMOUNT,
                    {
                        gasLimit: 1000000,
                    }
                );
                expect(
                    await tokenContractInstance.allowance(
                        wallet.address,
                        optyTokenBasicPool.address
                    )
                ).to.equal(TEST_AMOUNT);

                const userDepositRebalanceTx = await optyTokenBasicPool.userDepositRebalance(
                    TEST_AMOUNT
                );
                assert.isOk(
                    userDepositRebalanceTx,
                    "UserDepositRebalance() call failed"
                );

                // Check Token and opToken balance after userDeposit() call
                userTokenBalanceWei = await tokenContractInstance.balanceOf(
                    wallet.address
                );
                const userNewTokenBalance = parseFloat(fromWei(userTokenBalanceWei));
                expect(userNewTokenBalance).to.equal(
                    userInitialTokenBalance - TEST_AMOUNT_NUM
                );
                userInitialTokenBalance = userNewTokenBalance;

                contractTokenBalanceWei = await tokenContractInstance.balanceOf(
                    optyTokenBasicPool.address
                );
                contractTokenBalance = parseFloat(fromWei(contractTokenBalanceWei));
                expect(contractTokenBalance).to.equal(0);

                userOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(
                    wallet.address
                );
                const userNewOptyTokenBalance = parseFloat(
                    fromWei(userOptyTokenBalanceWei)
                );
                console.log("User's Opty token balance: ", userNewOptyTokenBalance);
                //  TODO: Need to fix this assertion error for the decimals values - Deepanshu
                // expect(userNewOptyTokenBalance).to.equal(userOptyTokenBalance + TEST_AMOUNT_NUM);
                userOptyTokenBalance = userNewOptyTokenBalance;
            }
        });
    }

    async function approveTokenLpToken(lpToken: string, tokens: string[]) {
        // if (!!lpToken || lpToken.length > 0) {
        if (lpToken != "0x0000000000000000000000000000000000000000") {
            let lpTokenApproveStatus = await optyRegistry.tokens(lpToken);
            if (!lpTokenApproveStatus) {
                await optyRegistry.approveToken(lpToken);
            }
        }

        if (tokens.length > 0) {
            tokens.forEach(async (token) => {
                let tokenApproveStatus = await optyRegistry.tokens(token);
                if (!tokenApproveStatus) {
                    await optyRegistry.approveToken(token);
                }
            });
        }
    }

    async function setTokensHashToTokens(tokens: string[]) {
        let tokensHash =
            "0x" + abi.soliditySHA3(["address[]"], [tokens]).toString("hex");
        let tokensHashIndex: ethers.utils.BigNumber = await optyRegistry.tokensHashToTokens(
            tokensHash
        );

        if (
            tokensHashIndex.eq(0) &&
            tokensHash !==
                "0x50440c05332207ba7b1bb0dcaf90d1864e3aa44dd98a51f88d0796a7623f0c80"
        ) {
            await optyRegistry.setTokensHashToTokens(tokens);
        }
    }

    async function approveLpCpAndMapLpToPoolProxy(
        pool: string,
        poolProxy: string,
        isBorrow: boolean
    ) {
        let liquidityPools = await optyRegistry.liquidityPools(pool);
        let creditPools = await optyRegistry.creditPools(pool);
        if (!liquidityPools.isLiquidityPool) {
            await optyRegistry.approveLiquidityPool(pool);
        }
        liquidityPools = await optyRegistry.liquidityPools(pool);
        if (!creditPools.isLiquidityPool) {
            await optyRegistry.approveCreditPool(pool);
        }
        if (isBorrow) {
            await optyRegistry.setLiquidityPoolToBorrowPoolProxy(pool, poolProxy);
        } else {
            await optyRegistry.setLiquidityPoolToDepositPoolProxy(pool, poolProxy);
        }
    }

    // Handle revert exception occured further..
    async function expectException(promise: Promise<any>, expectedError: any) {
        try {
            await promise;
        } catch (error) {
            if (error.message.indexOf(expectedError) === -1) {
                // When the exception was a revert, the resulting string will include only
                // the revert reason, otherwise it will be the type of exception (e.g. 'invalid opcode')
                const actualError = error.message.replace(
                    /Returned error: VM Exception while processing transaction: (revert )?/,
                    ""
                );
                expect(actualError).to.equal(
                    expectedError,
                    "Wrong kind of exception received"
                );
            }
            return;
        }
        expect.fail("Expected an exception but none was received");
    }

    // function for checking the revert conditions
    const expectRevert = async function (promise: Promise<any>, expectedError: any) {
        promise.catch(() => {}); // Avoids uncaught promise rejections in case an input validation causes us to return early

        if (!expectedError) {
            throw Error(
                "No revert reason specified: call expectRevert with the reason string, or use expectRevert.unspecified \
        if your 'require' statement doesn't have one."
            );
        }

        await expectException(promise, expectedError);
    };
});
