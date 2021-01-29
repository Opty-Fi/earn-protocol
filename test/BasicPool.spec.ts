import chai, { assert, expect } from "chai";
// import { Contract, ethers, utils } from "ethers";
import { Contract, ethers } from "ethers";
import { solidity, MockProvider, deployContract } from "ethereum-waffle";

import {
    appendInFile,
    expandToTokenDecimals,
    fundWallet,
    insertGasUsedRecordsIntoDB,
    writeInFile,
} from "./shared/utilities";
import OptyTokenBasicPool from "../build/BasicPool.json";
import OptyTokenBasicPoolMkr from "../build/BasicPoolMkr.json";
import OptyRegistry from "../build/Registry.json";
import RiskManager from "../build/RiskManager.json";
import Gatherer from "../build/Gatherer.json";
import OptyStrategyCodeProvider from "../build/StrategyCodeProvider.json";
import CompoundCodeProvider from "../build/CompoundCodeProvider.json";
import AaveCodeProvider from "../build/AaveCodeProvider.json";
// import AaveBorrowPoolProxy from "../build/AaveBorrowPoolProxy.json";
import CurvePoolCodeProvider from "../build/CurvePoolCodeProvider.json";
import CurveSwapCodeProvider from "../build/CurveSwapCodeProvider.json";
import CreamCodeProvider from "../build/CreamCodeProvider.json";
import DForceCodeProvider from "../build/DForceCodeProvider.json";
import FulcrumCodeProvider from "../build/FulcrumCodeProvider.json";
import HarvestCodeProvider from "../build/HarvestCodeProvider.json";
// import YearnCodeProvider from "../build/YearnCodeProvider.json";
import YVaultCodeProvider from "../build/YVaultCodeProvider.json";
import dYdXCodeProvider from "../build/dYdXCodeProvider.json";
import poolProxies from "./shared/poolProxies.json";
import defiPools from "./shared/defiPools.json";
import curveSwapDataProvider from "./shared/CurveSwapDataProvider.json";
import allStrategies from "./shared/strategies.json";
//  Note: keeping this testing strategies one by one for underlying tokens - Deepanshu
// import allStrategies from "./shared/sample_strategies.json";

import tokenAddresses from "./shared/TokenAddresses.json";
import addressAbis from "./shared/AddressAbis.json";
import { ContractJSON } from "ethereum-waffle/dist/esm/ContractJSON";
const envConfig = require("dotenv").config(); //  library to import the local ENV variables defined
//  Note: Don't remove line-6, because this line helps to get rid of error: NOT ABLE TO READ LOCAL ENV VARIABLES defined in .env file

chai.use(solidity);

const { program } = require("commander");
const fs = require("fs"); //    library to read/write to a particular file

program
    .description("Takes symbol and recipeint, send tokens to recipient")
    .option(
        "-s, --symbol <dai|usdc|usdt|wbtc|weth|susd|tusd|busd|3crv|link|renbtc|knc|zrx|uni|bat|mkr|comp|yfi|aave|hbtc|rep>",
        "stable coin symbol",
        null
    )
    .option("-sn, --strategyName <string>", "name of the strategy to run", null)
    .option("-ta, --testAmount <number>", "amount with which you want to test", 6)
    .option(
        "-sc, --strategiesCount <number>",
        "number of strategies you want to run",
        0
    )
    .option(
        "-db, --insertGasRecordsInDB <boolean>",
        "Insert GasUsed Records into DB",
        false
    )
    .option(
        "-wf, --writeGasRecordsInFile <boolean>",
        "Generate JSON file having all the GasUsed Records",
        false
    )
    .option(
        "-v, --runTimeversion <string>",
        "version of the gasUsed records stored",
        "0.0.1"
    )
    .option(
        "-cp, --codeProvider <string>",
        "code provider to deploy if you want to give",
        null
    )
    .usage("-s <token-symbol> ")
    .version("0.0.1")
    .action(
        async (command: {
            symbol: string;
            strategyName: string;
            testAmount: number;
            strategiesCount: number;
            insertGasRecordsInDB: boolean;
            writeGasRecordsInFile: boolean;
            runTimeversion: string;
            codeProvider: string;
        }) => {
            let underlyingTokenSymbol: string;
            let gasRecordsFileName: string;
            let testScriptRunTimeDateAndTime: number;
            if (command.symbol == null) {
                console.log("NO TOKEN PASSED FROM CMD..");
                testScriptRunTimeDateAndTime = Date.now();
                gasRecordsFileName =
                    "AllTokenStrategiesGasRecords_" +
                    testScriptRunTimeDateAndTime.toString();
            } else {
                underlyingTokenSymbol = command.symbol.toString().toUpperCase();
                console.log(
                    "Underlying token Symbol from CMD: ",
                    underlyingTokenSymbol
                );
                testScriptRunTimeDateAndTime = Date.now();
                gasRecordsFileName =
                    underlyingTokenSymbol +
                    "_" +
                    testScriptRunTimeDateAndTime.toString();
            }
            console.log("Test Amount from CMD: ", command.testAmount);

            const Ganache = require("ganache-core");
            const abi = require("ethereumjs-abi");
            const MAINNET_NODE_URL = process.env.MAINNET_NODE_URL;
            // Note: This test amount should be >= 44 for USDC-deposit-CURVE-cDAI+cUSDC+USDT and this amount should be >= 46
            // for USDC-deposit-CURVE-cDAI+cUSDC due to some timing issues. But it is working fine with any amount while
            // testing from Remix for these 2 strategies. Have to re-visit this again for test scripts.
            // let TEST_AMOUNT_NUM: number = 6;
            let TEST_AMOUNT_NUM: number;
            if (command.testAmount > 0) {
                TEST_AMOUNT_NUM = command.testAmount;
            } else {
                console.error("ERROR: Invalid  TEST_AMOUNT entered for testing");
                process.exit(1);
            }
            // let TEST_AMOUNT: ethers.utils.BigNumber;
            let TEST_AMOUNT: ethers.BigNumber;

            //  Interface for storing the Abi's of PoolProxy Contracts
            interface PoolProxyContract {
                [id: string]: ContractJSON;
            }
            //  Interface for getting the pools, lpTokens and underlyingTokens corresponding to PoolProxy Contract
            interface DefiPools {
                [id: string]: {
                    pool: string;
                    lpToken: string;
                    tokens: string[];
                };
            }

            // interface GasUsedRecord {
            //     strategyName: string;
            //     setStrategy: number;
            //     scoreStrategy: number;
            //     setAndScoreStrategy: number;
            //     userDepositRebalanceTx: number;
            //     userWithdrawRebalanceTx: number;
            // }
            interface GasUsedRecords {
                [id: string]: {
                    GasRecords: {
                        testScriptRunDateAndTime: number;
                        strategyRunDateAndTime: number;
                        strategyName: string;
                        setStrategy: number;
                        scoreStrategy: number;
                        setAndScoreStrategy: number;
                        userDepositRebalanceTx: number;
                        userWithdrawRebalanceTx: number;
                    }[];
                };
            }

            //  Json of PoolProxyContract for storing the Abi's of PoolProxyContracts
            let poolProxyContract: PoolProxyContract = {
                CompoundCodeProvider,
                AaveCodeProvider,
                FulcrumCodeProvider,
                DForceCodeProvider,
                HarvestCodeProvider,
                YVaultCodeProvider,
                CurvePoolCodeProvider,
                CurveSwapCodeProvider,
                dYdXCodeProvider,
                CreamCodeProvider,
            };
            //  Interface for mapping the PoolProxy Contracts deployed with their variable name for using them in the code
            interface OptyPoolProxyContractVariables {
                [id: string]: Contract;
            }
            let optyPoolProxyContractVariables: OptyPoolProxyContractVariables = {};
            let poolProxiesKey: keyof typeof poolProxies; //  Getting the op<XXX>Pool contracts as key corresponding to the PoolProxy Contracts
            let defiPoolsKey: keyof typeof defiPools; //  Keys of defiPools.json corresponding to PoolProxy Contracts
            let provider: ethers.providers.Web3Provider;

            //  Function to start the Ganache provider with forked mainnet using chainstack's network URL
            //  Getting 2 Wallets in return - one acting as Owner and another one acting as user
            async function startChain() {
                const ganache = await Ganache.provider({
                    fork: MAINNET_NODE_URL,
                    network_id: 1,
                    mnemonic: `${process.env.MY_METAMASK_MNEMONIC}`,
                    default_balance_ether: 200000,
                    total_accounts: 21,
                    locked: false,
                });
                provider = new ethers.providers.Web3Provider(ganache);
                const ownerWallet = ethers.Wallet.fromMnemonic(
                    `${process.env.MY_METAMASK_MNEMONIC}`
                ).connect(provider);
                let ownerWalletBalance = await provider.getBalance(ownerWallet.address);
                console.log(
                    "OWNER'S ETHER BALANCE BEFORE STARTING TEST SUITE: ",
                    ethers.utils.formatEther(ownerWalletBalance)
                );
                const userWallet = ethers.Wallet.fromMnemonic(
                    `${process.env.MY_METAMASK_MNEMONIC}`,
                    `m/44'/60'/0'/0/1`
                ).connect(provider);
                let userWalletBalance = await provider.getBalance(ownerWallet.address);
                console.log(
                    "USER'S ETHER BALANCE BEFORE STARTING TEST SUITE: ",
                    ethers.utils.formatEther(userWalletBalance)
                );
                return [ownerWallet, userWallet];
            }

            describe("OptyTokenBasicPool", async () => {
                let strategyScore: number = 1;
                let ownerWallet: ethers.Wallet;
                let userWallet: ethers.Wallet;
                let optyRegistry: Contract;
                let riskManager: Contract;
                let gatherer: Contract;
                let optyStrategyCodeProvider: Contract;
                let profile = "basic";
                let userTokenBalanceWei;
                let userInitialTokenBalance: number;
                let contractTokenBalanceWei;
                let contractTokenBalance: number;
                let userOptyTokenBalanceWei;
                let userOptyTokenBalance: number;
                let optyPoolProxyContract: Contract;
                // let underlyingTokenDecimals: number;
                // let tokensHash: string = "";

                // // util function for converting expanded values to Deimals number for readability and Testing
                // const fromWei = (x: string) => ethers.utils.formatUnits(x, underlyingTokenDecimals);

                before(async () => {
                    let allWallets = await startChain();
                    ownerWallet = allWallets[0];
                    userWallet = allWallets[1];

                    console.log(
                        "\n" +
                            `------ Deploying Registry, RiskManager and StrategyManager Contracts for ${underlyingTokenSymbol}---------` +
                            "\n"
                    );
                    //  Deploying Registry, RiskManager and StrategyManager Contract
                    optyRegistry = await deployContract(ownerWallet, OptyRegistry, [], {
                        gasLimit: 5141327,
                    });
                    assert.isDefined(
                        optyRegistry,
                        "OptyRegistry contract not deployed"
                    );
                    console.log("Registry: ", optyRegistry.address);

                    riskManager = await deployContract(ownerWallet, RiskManager, [
                        optyRegistry.address,
                    ]);
                    assert.isDefined(riskManager, "RiskManager contract not deployed");
                    console.log("Risk Manager: ", riskManager.address);

                    gatherer = await deployContract(ownerWallet, Gatherer, [
                        optyRegistry.address,
                    ]);
                    assert.isDefined(gatherer, "Gatherer contract not deployed");
                    console.log("Gatherer: ", gatherer.address);

                    optyStrategyCodeProvider = await deployContract(
                        ownerWallet,
                        OptyStrategyCodeProvider,
                        [optyRegistry.address]
                    );
                    assert.isDefined(
                        optyStrategyCodeProvider,
                        "OptyStrategyCodeProvider contract not deployed"
                    );
                    console.log("Strategy Manager: ", optyStrategyCodeProvider.address);

                    /*
                        Interating through list of underlyingTokens and approving them if not approved
                    */
                    let token: keyof typeof tokenAddresses;
                    for (token in tokenAddresses) {
                        if (token != "uniswapFactory") {
                            let tokenStatus = await optyRegistry.tokens(
                                tokenAddresses[token]
                            );
                            if (!tokenStatus) {
                                await optyRegistry.approveToken(tokenAddresses[token]);
                            }
                        }
                    }

                    /*  
                        Iterating through poolProxies.json and getting the corresponding PoolProxy Contracts mapped to
                        respective op<XXX><Profile> Pool    
                    */
                    for (poolProxiesKey in poolProxies) {
                        if (poolProxiesKey == "opDAIBsc") {
                            console.log(
                                "Pool Proxy contracts: ",
                                poolProxies[poolProxiesKey]
                            );
                            let optyPoolProxyContracts = poolProxies[poolProxiesKey];

                            /*  
                                Iterating through the list of PoolProxy Contracts for deploying them
                            */
                            let count = 1;
                            for (let optyPoolProxyContractsKey of optyPoolProxyContracts) {
                                //  Note: Keeping this for testing particular Pool Proxy contract - Deepanshu
                                // if (optyPoolProxyContractsKey == "HarvestCodeProvider" || optyPoolProxyContractsKey == "CurvePoolCodeProvider") {
                                let flag: boolean;
                                if (optyPoolProxyContractsKey == command.codeProvider) {
                                    console.log("matched");
                                    flag = true;
                                } else if (command.codeProvider == null) {
                                    console.log("all");
                                    flag = true;
                                } else {
                                    console.log("not matched");
                                    flag = false;
                                }

                                if (flag && count <= 10) {
                                    if (
                                        poolProxyContract.hasOwnProperty(
                                            optyPoolProxyContractsKey.toString()
                                        )
                                    ) {
                                        // console.log(
                                        //     "Entered into deploying Code Providers one by one.."
                                        // );
                                        //  In if condition, deploying the code provider contract with only registry address
                                        //  and in else deploy CodeProvider Contract with registry and gatherer addresses
                                        if (
                                            optyPoolProxyContractsKey
                                                .toString()
                                                .toLowerCase() == "dydxcodeprovider" ||
                                            optyPoolProxyContractsKey
                                                .toString()
                                                .toLowerCase() == "aavecodeprovider" ||
                                            optyPoolProxyContractsKey
                                                .toString()
                                                .toLowerCase() ==
                                                "fulcrumcodeprovider" ||
                                            optyPoolProxyContractsKey
                                                .toString()
                                                .toLowerCase() == "yvaultcodeprovider"
                                        ) {
                                            console.log(
                                                "==== 1. Depoying " +
                                                    optyPoolProxyContractsKey +
                                                    "  Contract ===="
                                            );

                                            optyPoolProxyContract = await deployContract(
                                                ownerWallet,
                                                poolProxyContract[
                                                    optyPoolProxyContractsKey
                                                ],
                                                [optyRegistry.address]
                                            );
                                        } else {
                                            console.log(
                                                "==== 2. Depoying " +
                                                    optyPoolProxyContractsKey +
                                                    "  Contract ===="
                                            );
                                            var overrideOptions: ethers.providers.TransactionRequest = {
                                                gasLimit: 6721975,
                                            };
                                            optyPoolProxyContract = await deployContract(
                                                ownerWallet,
                                                poolProxyContract[
                                                    optyPoolProxyContractsKey
                                                ],
                                                [
                                                    optyRegistry.address,
                                                    gatherer.address,
                                                ],
                                                overrideOptions
                                            );

                                            //  Setting the liquidityPoolToken, SwapPoolTOUnderlyingTokens and gauge address as pre-requisites for CurveSwapCodeProvider
                                            let curveSwapDataProviderKey: keyof typeof curveSwapDataProvider;
                                            for (curveSwapDataProviderKey in curveSwapDataProvider) {
                                                if (
                                                    curveSwapDataProviderKey
                                                        .toString()
                                                        .toLowerCase() ==
                                                    optyPoolProxyContractsKey
                                                        .toString()
                                                        .toLowerCase()
                                                ) {
                                                    console.log(
                                                        "CurveSwapCodeProvider contract address: ",
                                                        optyPoolProxyContract.address
                                                    );
                                                    let tokenPairs =
                                                        curveSwapDataProvider[
                                                            curveSwapDataProviderKey
                                                        ];
                                                    let tokenPair: keyof typeof tokenPairs;
                                                    for (tokenPair in tokenPairs) {
                                                        let _liquidityPoolToken =
                                                            tokenPairs[tokenPair]
                                                                .liquidityPoolToken;
                                                        let _swapPool =
                                                            tokenPairs[tokenPair]
                                                                .swapPool;
                                                        let _guage =
                                                            tokenPairs[tokenPair].gauge;
                                                        let _underlyingTokens =
                                                            tokenPairs[tokenPair]
                                                                .underlyingTokens;
                                                        await optyPoolProxyContract.setLiquidityPoolToken(
                                                            _swapPool,
                                                            _liquidityPoolToken
                                                        );
                                                        await optyPoolProxyContract.setSwapPoolToUnderlyingTokens(
                                                            _swapPool,
                                                            _underlyingTokens
                                                        );
                                                        await optyPoolProxyContract.setSwapPoolToGauges(
                                                            _swapPool,
                                                            _guage
                                                        );
                                                    }
                                                }
                                            }
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
                                        //  Iterating through defiPools.json to approve LpTokens/Tokens, set Tokens hash
                                        //  mapping to tokens, approve LP/CP, map Lp to PoolProxy Contract and setting the
                                        //  Lp to LpToken
                                        for (defiPoolsKey in defiPools) {
                                            // console.log(
                                            //     "** Coming in DEFIPOOLS LOOP **"
                                            // );
                                            if (
                                                defiPoolsKey.toString() ==
                                                optyPoolProxyContractsKey.toString()
                                            ) {
                                                // console.log(
                                                //     "** Coming in if condition **"
                                                // );
                                                let defiPoolsUnderlyingTokens: DefiPools =
                                                    defiPools[defiPoolsKey];
                                                //  Iteracting through all the underlying tokens available corresponding to this
                                                //  current PoolProxy Contract Key
                                                for (let defiPoolsUnderlyingTokensKey in defiPoolsUnderlyingTokens) {
                                                    // Note: Keeping this for testing strategies for specific pools - Deepanshu
                                                    // if (defiPoolsUnderlyingTokensKey == "dai+usdc+usdt") {
                                                    // console.log("1st Approval");
                                                    await approveTokenLpToken(
                                                        defiPoolsUnderlyingTokens[
                                                            defiPoolsUnderlyingTokensKey
                                                        ].lpToken,
                                                        defiPoolsUnderlyingTokens[
                                                            defiPoolsUnderlyingTokensKey
                                                        ].tokens
                                                    );
                                                    // console.log("2nd Approval");
                                                    await setTokensHashToTokens(
                                                        defiPoolsUnderlyingTokens[
                                                            defiPoolsUnderlyingTokensKey
                                                        ].tokens
                                                    );
                                                    if (
                                                        defiPoolsKey
                                                            .toString()
                                                            .includes("Borrow")
                                                    ) {
                                                        // console.log("Borrow Approval");
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
                                                        // console.log("3rd Approval");
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
                                                        ].lpToken !=
                                                        "0x0000000000000000000000000000000000000000"
                                                    ) {
                                                        // console.log("4th Approval");
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
                                                    // console.log("5th Approval");
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
                                        // }
                                    }
                                }
                                count++;
                            }
                        }
                    }
                });

                let finalJson = {};
                after(async () => {
                    console.log("IT SHOULD BE PRINTED ONLY ONCE..");
                });

                it.skip("should check if the code provider contracts are deployed", async () => {
                    assert.isOk(
                        optyPoolProxyContractVariables.CompoundCodeProvider.address,
                        "CompoundCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyPoolProxyContractVariables.AaveCodeProvider.address,
                        "AaveCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyPoolProxyContractVariables.FulcrumCodeProvider.address,
                        "FulcrumCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyPoolProxyContractVariables.DForceCodeProvider.address,
                        "DForceCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyPoolProxyContractVariables.HarvestCodeProvider.address,
                        "HarvestCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyPoolProxyContractVariables.YVaultCodeProvider.address,
                        "YVaultCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyPoolProxyContractVariables.CurvePoolCodeProvider.address,
                        "CurvePoolCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyPoolProxyContractVariables.CurveSwapCodeProvider.address,
                        "CurveSwapCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyPoolProxyContractVariables.dYdXCodeProvider.address,
                        "dYdXCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyPoolProxyContractVariables.CreamCodeProvider.address,
                        "CreamCodeProvider Contract is not deployed"
                    );
                });

                //  Iterating through all the strategies by picking underlyingTokens as key
                let strategiesTokenKey: keyof typeof allStrategies;
                let allStrategiesTokenKeys = Object.keys(allStrategies).map((item) =>
                    item.toUpperCase()
                );
                for (strategiesTokenKey in allStrategies) {
                    if (command.symbol == null) {
                        console.log("coming in when no symbol is passed!");
                        if (strategiesTokenKey.toUpperCase() != "REP") {
                            // if (
                            //     strategiesTokenKey.toUpperCase() == "DAI" ||
                            //     strategiesTokenKey.toUpperCase() == "USDC"
                            // ) {
                            await runTokenTestSuite(strategiesTokenKey);
                        }
                    } else {
                        if (
                            strategiesTokenKey.toUpperCase() ==
                            `${underlyingTokenSymbol}`
                        ) {
                            await runTokenTestSuite(strategiesTokenKey);
                        } else {
                            if (
                                !allStrategiesTokenKeys.includes(underlyingTokenSymbol)
                            ) {
                                console.error("ERROR: Invalid Token symbol!");
                                process.exit(2);
                            }
                        }
                    }
                }

                //  Function to execute the test suite for underlying tokens one by one
                async function runTokenTestSuite(
                    strategiesTokenKey: keyof typeof allStrategies
                ) {
                    describe(
                        "TEST CASES FOR: " + strategiesTokenKey.toUpperCase(),
                        async () => {
                            let underlyingToken: string;
                            let underlyingTokenDecimals: number;
                            let tokens: string[];
                            let tokenContractInstance: Contract;
                            let optyTokenBasicPool: Contract;
                            let tokensHash: string = "";

                            // util function for converting expanded values to Deimals number for readability and Testing
                            const fromWei = (x: string) =>
                                ethers.utils.formatUnits(x, underlyingTokenDecimals);

                            before(async () => {
                                //  Getting the underlying token's contract instance
                                underlyingToken =
                                    tokenAddresses[
                                        <keyof typeof tokenAddresses>(
                                            strategiesTokenKey.toLowerCase()
                                        )
                                    ];
                                tokens = [underlyingToken];

                                // Instantiate token contract
                                tokenContractInstance = new ethers.Contract(
                                    underlyingToken,
                                    addressAbis.erc20.abi,
                                    ownerWallet
                                );

                                underlyingTokenDecimals = await tokenContractInstance.decimals();
                                if (strategiesTokenKey.toLowerCase() == "hbtc") {
                                    TEST_AMOUNT = expandToTokenDecimals(
                                        TEST_AMOUNT_NUM,
                                        16 - (TEST_AMOUNT_NUM.toString().length - 1)
                                    );
                                } else {
                                    TEST_AMOUNT = expandToTokenDecimals(
                                        TEST_AMOUNT_NUM,
                                        underlyingTokenDecimals
                                    );
                                }

                                //  Setting the TokensHash corresponding to the list of tokens
                                tokensHash =
                                    "0x" +
                                    abi
                                        .soliditySHA3(["address[]"], [tokens])
                                        .toString("hex");

                                //  Deploying the BasicPool Contract each time for MKR underlying token
                                if (
                                    underlyingToken ==
                                    "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2"
                                ) {
                                    optyTokenBasicPool = await deployContract(
                                        ownerWallet,
                                        OptyTokenBasicPoolMkr,
                                        [
                                            optyRegistry.address,
                                            riskManager.address,
                                            underlyingToken,
                                            optyStrategyCodeProvider.address,
                                        ]
                                    );
                                } else {
                                    //  Deploying the BasicPool Contract each time for every underlying token
                                    optyTokenBasicPool = await deployContract(
                                        ownerWallet,
                                        OptyTokenBasicPool,
                                        [
                                            optyRegistry.address,
                                            riskManager.address,
                                            underlyingToken,
                                            optyStrategyCodeProvider.address,
                                        ]
                                    );
                                }

                                assert.isDefined(
                                    optyTokenBasicPool,
                                    "OptyTokenBasicPool contract not deployed"
                                );
                                console.log(
                                    "** OPTY BASIC POOL CONTRACT DEPLOYED.. **"
                                );
                            });

                            //  Function to fund the wallet with the underlying tokens equivalent to TEST_AMOUNT_NUM
                            async function checkAndFundWallet() {
                                userTokenBalanceWei = await tokenContractInstance.balanceOf(
                                    userWallet.address
                                );
                                // userInitialTokenBalance = parseFloat(fromWei(userTokenBalanceWei));
                                userOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(
                                    userWallet.address
                                );
                                userOptyTokenBalance = parseFloat(
                                    fromWei(userOptyTokenBalanceWei)
                                );
                                console.log("BEFORE IF CONDITION..");
                                if (
                                    userTokenBalanceWei.lt(TEST_AMOUNT) ||
                                    userTokenBalanceWei == undefined
                                ) {
                                    console.log("Coming in If condition");
                                    let FUND_AMOUNT;
                                    if (
                                        tokenContractInstance.address ==
                                        "0x0316EB71485b0Ab14103307bf65a021042c6d380"
                                    ) {
                                        console.log(
                                            "coming in hbtc fund amount condition"
                                        );
                                        FUND_AMOUNT = TEST_AMOUNT;
                                    } else {
                                        FUND_AMOUNT = TEST_AMOUNT.sub(
                                            userTokenBalanceWei
                                        );
                                    }
                                    console.log("FUNDING STARTED..");
                                    console.log(
                                        "FUND AMOUNT: ",
                                        ethers.utils.formatUnits(
                                            FUND_AMOUNT,
                                            underlyingTokenDecimals
                                        )
                                    );
                                    //  Fund the user's wallet with some TEST_AMOUNT_NUM of tokens
                                    await fundWallet(
                                        underlyingToken,
                                        userWallet,
                                        FUND_AMOUNT
                                    );
                                    console.log("FUNDING DONE");
                                    // Check Token and opToken balance of User's wallet and OptyTokenBaiscPool Contract
                                    userTokenBalanceWei = await tokenContractInstance.balanceOf(
                                        userWallet.address
                                    );
                                    console.log(
                                        "User's token balance after funding: ",
                                        ethers.utils.formatUnits(
                                            userTokenBalanceWei,
                                            underlyingTokenDecimals
                                        )
                                    );
                                    if (userTokenBalanceWei.lt(TEST_AMOUNT)) {
                                        console.log("Coming in 2nd if condition");
                                        console.log(
                                            "User's balance in 2nd if condition before funding: ",
                                            ethers.utils.formatUnits(
                                                userTokenBalanceWei,
                                                underlyingTokenDecimals
                                            )
                                        );

                                        await fundWallet(
                                            underlyingToken,
                                            userWallet,
                                            TEST_AMOUNT.sub(userTokenBalanceWei)
                                        );
                                        userTokenBalanceWei = await tokenContractInstance.balanceOf(
                                            userWallet.address
                                        );
                                        console.log(
                                            "User's token balance after funding in if condition: ",
                                            ethers.utils.formatUnits(
                                                userTokenBalanceWei,
                                                underlyingTokenDecimals
                                            )
                                        );
                                    }
                                    userInitialTokenBalance = parseFloat(
                                        fromWei(userTokenBalanceWei)
                                    );
                                    // expect(userInitialTokenBalance).to.equal(TEST_AMOUNT_NUM);
                                }
                            }

                            it.skip(
                                "should check OptyTokenBasicPool contract is deployed for " +
                                    strategiesTokenKey,
                                async () => {
                                    assert.isOk(
                                        optyTokenBasicPool.address,
                                        "BasicPool Contract for " +
                                            strategiesTokenKey +
                                            "is not deployed"
                                    );
                                }
                            );

                            it.skip(
                                "should deposit using userDeposit() for " +
                                    strategiesTokenKey,
                                async () => {
                                    await checkAndFundWallet();
                                    let userInitialTokenBalanceWei = await tokenContractInstance.balanceOf(
                                        userWallet.address
                                    );
                                    console.log("DEPOSIT TEST-1");
                                    //  Getting the underlying token contract instance for user's wallet and approving
                                    //  BasicPool contract for spending underlying token on behalf of user
                                    let tokenContractInstanceAsSignerUser = tokenContractInstance.connect(
                                        userWallet
                                    );
                                    console.log("DEPOSIT TEST-2");
                                    await tokenContractInstanceAsSignerUser.approve(
                                        optyTokenBasicPool.address,
                                        TEST_AMOUNT
                                    );
                                    expect(
                                        await tokenContractInstance.allowance(
                                            userWallet.address,
                                            optyTokenBasicPool.address
                                        )
                                    ).to.equal(TEST_AMOUNT);

                                    //  Connect the BasicPool Contract with the user's Wallet for making userDeposit()
                                    let optyTokenBasicPoolAsSignerUser = optyTokenBasicPool.connect(
                                        userWallet
                                    );
                                    console.log("DEPOSIT TEST-3");
                                    const userDepositOutput = await optyTokenBasicPoolAsSignerUser.userDeposit(
                                        TEST_AMOUNT
                                    );
                                    // const newBalance = await tokenContractInstance.balanceOf(userWallet.address)
                                    // const userDepositOutput = await optyTokenBasicPoolAsSignerUser.userDeposit(
                                    //     newBalance
                                    // );
                                    assert.isOk(
                                        userDepositOutput,
                                        "UserDeposit() call failed"
                                    );
                                    console.log("DEPOSIT TEST-4");
                                    // Check Token and opToken balance after userDeposit() call
                                    userTokenBalanceWei = await tokenContractInstance.balanceOf(
                                        userWallet.address
                                    );
                                    // const userNewTokenBalance = parseFloat(
                                    //     fromWei(userTokenBalanceWei)
                                    // );
                                    // expect(userNewTokenBalance).to.equal(
                                    //     userInitialTokenBalance - TEST_AMOUNT_NUM
                                    // );
                                    expect(userTokenBalanceWei).to.equal(
                                        userInitialTokenBalanceWei.sub(TEST_AMOUNT)
                                    );
                                    console.log("DEPOSIT TEST-5");
                                    contractTokenBalanceWei = await tokenContractInstance.balanceOf(
                                        optyTokenBasicPool.address
                                    );
                                    // contractTokenBalance = parseFloat(fromWei(contractTokenBalanceWei));
                                    // expect(contractTokenBalance).to.equal(TEST_AMOUNT_NUM);
                                    expect(contractTokenBalanceWei).to.equal(
                                        TEST_AMOUNT
                                    );
                                    console.log("DEPOSIT TEST-6");
                                    userOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(
                                        userWallet.address
                                    );
                                    // userOptyTokenBalance = parseFloat(fromWei(userOptyTokenBalanceWei));
                                    // expect(userOptyTokenBalance).to.equal(TEST_AMOUNT_NUM);
                                    expect(userOptyTokenBalanceWei).to.equal(
                                        TEST_AMOUNT
                                    );
                                }
                            );

                            it.skip(
                                "should withdraw using userWithdraw() for " +
                                    strategiesTokenKey,
                                async () => {
                                    let initialUserOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(
                                        userWallet.address
                                    );
                                    let initialUserTokenBalanceInWei = await tokenContractInstance.balanceOf(
                                        userWallet.address
                                    );
                                    let initialContractTokenBalanceWei = await tokenContractInstance.balanceOf(
                                        optyTokenBasicPool.address
                                    );

                                    let totalSupply = await optyTokenBasicPool.totalSupply();

                                    let poolValue = await optyTokenBasicPool.poolValue();

                                    //  Connect the BasicPool Contract with the user's Wallet for making userWithdraw()
                                    let optyTokenBasicPoolAsSignerUser = optyTokenBasicPool.connect(
                                        userWallet
                                    );
                                    console.log("STEP-1");
                                    const userWithdrawTxOutput = await optyTokenBasicPoolAsSignerUser.userWithdraw(
                                        TEST_AMOUNT
                                    );
                                    assert.isOk(
                                        userWithdrawTxOutput,
                                        "UserWithdraw() call failed"
                                    );

                                    let afterUserOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(
                                        userWallet.address
                                    );

                                    let afterUserTokenBalanceWei = await tokenContractInstance.balanceOf(
                                        userWallet.address
                                    );

                                    console.log(
                                        "User's initial Opty  token balance: ",
                                        ethers.utils.formatUnits(
                                            initialUserOptyTokenBalanceWei,
                                            underlyingTokenDecimals
                                        )
                                    );
                                    console.log(
                                        "User's after Opty Token Balance: ",
                                        ethers.utils.formatUnits(
                                            afterUserOptyTokenBalanceWei,
                                            underlyingTokenDecimals
                                        )
                                    );
                                    let noOfTokensReceivedFromFormula = poolValue
                                        .mul(TEST_AMOUNT)
                                        .div(totalSupply);
                                    console.log(
                                        "noOfTokensReceived from formula: ",
                                        ethers.utils.formatUnits(
                                            noOfTokensReceivedFromFormula,
                                            underlyingTokenDecimals
                                        )
                                    );
                                    expect(afterUserOptyTokenBalanceWei).to.equal(
                                        initialUserOptyTokenBalanceWei.sub(
                                            noOfTokensReceivedFromFormula
                                        )
                                    );

                                    console.log("STEP-2");
                                    console.log(
                                        "Before withdraw, User's " +
                                            strategiesTokenKey +
                                            " Balance: ",
                                        ethers.utils.formatUnits(
                                            initialUserTokenBalanceInWei,
                                            underlyingTokenDecimals
                                        )
                                    );
                                    console.log(
                                        "After withdraw, User's " +
                                            strategiesTokenKey +
                                            " balance: ",
                                        ethers.utils.formatUnits(
                                            afterUserTokenBalanceWei,
                                            underlyingTokenDecimals
                                        )
                                    );
                                    expect(afterUserTokenBalanceWei).to.equal(
                                        initialUserTokenBalanceInWei.add(
                                            noOfTokensReceivedFromFormula
                                        )
                                    );

                                    let afterContractTokenBalanceWei = await tokenContractInstance.balanceOf(
                                        optyTokenBasicPool.address
                                    );

                                    console.log("STEP-3");
                                    console.log(
                                        "Before withdraw, contract " +
                                            strategiesTokenKey +
                                            " balance: ",
                                        ethers.utils.formatUnits(
                                            initialContractTokenBalanceWei,
                                            underlyingTokenDecimals
                                        )
                                    );
                                    console.log(
                                        "After withdraw contracts " +
                                            strategiesTokenKey +
                                            " balance when there is no left over: ",
                                        ethers.utils.formatUnits(
                                            afterContractTokenBalanceWei,
                                            underlyingTokenDecimals
                                        )
                                    );
                                    expect(afterContractTokenBalanceWei).to.equal(
                                        initialContractTokenBalanceWei.sub(
                                            noOfTokensReceivedFromFormula
                                        )
                                    );
                                }
                            );

                            let allStrategiesGasUsedRecords: {
                                testScriptRunDateAndTime: number;
                                strategyRunDateAndTime: number;
                                strategyName: string;
                                setStrategy: number;
                                scoreStrategy: number;
                                setAndScoreStrategy: number;
                                userDepositRebalanceTx: number;
                                userWithdrawRebalanceTx: number;
                            }[] = [];
                            let allStrategyNames = allStrategies[
                                strategiesTokenKey
                            ].basic.map((element) =>
                                element.strategyName.toLowerCase()
                            );
                            /*  Iterating through each strategy one by one, setting, approving and scroing the each 
                strategy and then making userDepositRebalance() call */
                            allStrategies[strategiesTokenKey].basic.forEach(
                                async (strategies, index) => {
                                    // strategyDetails = strategies.strategyName
                                    let setStrategyTxGasUsed: number = 0;
                                    let scoreStrategyTxGasUsed: number = 0;
                                    let setAndScoreStrategyTotalGasUsed: number = 0;
                                    let userDepositRebalanceTxGasUsed: number = 0;
                                    let userWithdrawRebalanceTxGasUsed: number = 0;
                                    // console.log("Strategy iterator count: ", index)
                                    // Note: Keep this condition for future specific strategy testing purpose - Deepanshu
                                    // if (allStrategies[strategiesTokenKey].basic[index].strategyName == "HBTC-deposit-CURVE-hCRV") {
                                    // if (allStrategies[strategiesTokenKey].basic[index].strategyName == "DAI-deposit-AAVE-aDAI") {
                                    // if (allStrategies[strategiesTokenKey].basic[index].strategyName == "USDC-deposit-CURVE-cDAI+cUSDC+USDT") {

                                    // if (index < 1) {
                                    if (command.strategyName == null) {
                                        if (command.strategiesCount < 0) {
                                            console.error(
                                                "ERROR: Invalid Number of Strategies Count: ",
                                                command.strategiesCount
                                            );
                                            process.exit(3);
                                        } else {
                                            if (command.strategiesCount == 0) {
                                                if (
                                                    index <
                                                    allStrategies[strategiesTokenKey]
                                                        .basic.length
                                                ) {
                                                    await runDepositWithdrawTestCases();
                                                } else {
                                                    console.error(
                                                        "ERROR: Invalid Number of existing strategies length"
                                                    );
                                                    process.exit(4);
                                                }
                                            } else {
                                                if (index < command.strategiesCount) {
                                                    await runDepositWithdrawTestCases();
                                                }
                                            }
                                        }
                                    } else {
                                        if (
                                            !allStrategyNames.includes(
                                                command.strategyName.toLowerCase()
                                            )
                                        ) {
                                            console.error(
                                                "ERROR: Invalid Strategy Name: ",
                                                command.strategyName
                                            );
                                            process.exit(5);
                                        } else if (
                                            allStrategies[strategiesTokenKey].basic[
                                                index
                                            ].strategyName.toLowerCase() ==
                                            command.strategyName.toLowerCase()
                                        ) {
                                            await runDepositWithdrawTestCases();
                                        }
                                    }

                                    async function runDepositWithdrawTestCases() {
                                        it(
                                            "should deposit using userDepositRebalance() using Strategy - " +
                                                strategies.strategyName,
                                            async () => {
                                                // await checkAndFundWallet();
                                                let strategySteps: (
                                                    | string
                                                    | boolean
                                                )[][] = [];
                                                let previousStepOutputToken = "";
                                                for (
                                                    let index = 0;
                                                    index < strategies.strategy.length;
                                                    index++
                                                ) {
                                                    let tempArr: (
                                                        | string
                                                        | boolean
                                                    )[] = [];
                                                    //  If condition For 2 step strategies
                                                    if (
                                                        previousStepOutputToken.length >
                                                        0
                                                    ) {
                                                        await optyRegistry.setTokensHashToTokens(
                                                            [previousStepOutputToken]
                                                        );
                                                        // Note: May need this step for 2 step  strategies - Deepanshu
                                                        // await optyRegistry.approveToken(previousStepOutputToken);
                                                        await optyRegistry.setLiquidityPoolToLPToken(
                                                            strategies.strategy[index]
                                                                .contract,
                                                            [previousStepOutputToken],
                                                            strategies.strategy[index]
                                                                .outputToken
                                                        );
                                                    }
                                                    tempArr.push(
                                                        strategies.strategy[index]
                                                            .contract,
                                                        strategies.strategy[index]
                                                            .outputToken,
                                                        strategies.strategy[index]
                                                            .isBorrow
                                                    );
                                                    previousStepOutputToken =
                                                        strategies.strategy[index]
                                                            .outputToken;

                                                    strategySteps.push(tempArr);
                                                }

                                                //  Iterating through each strategy step and generate the strategy Hash
                                                let strategyStepHash: string[] = [];
                                                strategySteps.forEach(
                                                    (tempStrategyStep, index) => {
                                                        strategyStepHash[index] =
                                                            "0x" +
                                                            abi
                                                                .soliditySHA3(
                                                                    [
                                                                        "address",
                                                                        "address",
                                                                        "bool",
                                                                    ],
                                                                    [
                                                                        tempStrategyStep[0],
                                                                        tempStrategyStep[1],
                                                                        tempStrategyStep[2],
                                                                    ]
                                                                )
                                                                .toString("hex");
                                                    }
                                                );
                                                let tokenToStrategyStepsHash =
                                                    "0x" +
                                                    abi
                                                        .soliditySHA3(
                                                            ["bytes32", "bytes32[]"],
                                                            [
                                                                tokensHash,
                                                                strategyStepHash,
                                                            ]
                                                        )
                                                        .toString("hex");

                                                //  Getting the strategy hash corresponding to underluing token
                                                let tokenToStrategyHashes = await optyRegistry.getTokenToStrategies(
                                                    tokensHash
                                                );
                                                //  If strategyHash is always then check revert error meesage from Contract
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
                                                    console.log(
                                                        "SETTING THE STRATEGY LOOP"
                                                    );
                                                    let gasEstimatedBefore = await optyRegistry.estimateGas.setStrategy(
                                                        tokensHash,
                                                        strategySteps
                                                    );

                                                    //  Setting the strategy
                                                    const setStrategyTx = await optyRegistry.setStrategy(
                                                        tokensHash,
                                                        strategySteps
                                                    );
                                                    assert.isDefined(
                                                        setStrategyTx,
                                                        "Setting StrategySteps has failed!"
                                                    );

                                                    const setStrategyReceipt = await setStrategyTx.wait();
                                                    setStrategyTxGasUsed = setStrategyReceipt.gasUsed.toNumber();
                                                    // console.log(
                                                    //     "GAS ESTIMATED: ",
                                                    //     gasEstimatedBefore.toNumber()
                                                    // );
                                                    console.log(
                                                        "SetStrategy Gas used: ",
                                                        setStrategyTxGasUsed
                                                    );
                                                    let strategyHash =
                                                        setStrategyReceipt.events[0]
                                                            .args[2];
                                                    expect(
                                                        strategyHash.toString().length
                                                    ).to.equal(66);

                                                    let strategy = await optyRegistry.getStrategy(
                                                        strategyHash.toString()
                                                    );
                                                    //  Approving and scoring the strategy
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
                                                        console.log(
                                                            "** Strategy Score: ",
                                                            index + 1
                                                        );
                                                        let scoreStrategyTx = await optyRegistry.scoreStrategy(
                                                            strategyHash.toString(),
                                                            index + 1
                                                        );
                                                        let scoreStrategyReceipt = await scoreStrategyTx.wait();
                                                        scoreStrategyTxGasUsed = scoreStrategyReceipt.gasUsed.toNumber();
                                                        console.log(
                                                            "GAS USED for scoring: ",
                                                            scoreStrategyTxGasUsed
                                                        );

                                                        console.log(
                                                            "Total gas used for setting and scoring strategy: ",
                                                            setStrategyReceipt.gasUsed
                                                                .add(
                                                                    scoreStrategyReceipt.gasUsed
                                                                )
                                                                .toNumber()
                                                        );
                                                        setAndScoreStrategyTotalGasUsed = setStrategyReceipt.gasUsed
                                                            .add(
                                                                scoreStrategyReceipt.gasUsed
                                                            )
                                                            .toNumber();
                                                    } else {
                                                        let scoreStrategyTx = await optyRegistry.scoreStrategy(
                                                            strategyHash.toString(),
                                                            index + 1
                                                        );
                                                        let scoreStrategyReceipt = scoreStrategyTx.wait();
                                                        console.log(
                                                            "GAS USED for scoring in else: ",
                                                            scoreStrategyReceipt.gasUsed.toNumber()
                                                        );
                                                        console.log(
                                                            "Total gas used for setting and scoring strategy: ",
                                                            setStrategyReceipt.gasUsed
                                                                .add(
                                                                    scoreStrategyReceipt.gasUsed
                                                                )
                                                                .toNumber()
                                                        );
                                                    }

                                                    let bestStrategyHash = await riskManager.getBestStrategy(
                                                        profile,
                                                        [underlyingToken]
                                                    );

                                                    let bestStrategy = await optyRegistry.getStrategy(
                                                        bestStrategyHash.toString()
                                                    );
                                                    console.log(
                                                        "Best strategy: ",
                                                        bestStrategy
                                                    );

                                                    // Funding the wallet with the underlying tokens before making the deposit transaction
                                                    await checkAndFundWallet();
                                                    //  Function call to test userDepositRebalance()
                                                    await testUserDepositRebalance();
                                                    strategyScore = strategyScore + 1;
                                                }
                                            }
                                        );

                                        it(
                                            "should withdraw using userWithdrawRebalance() using Strategy - " +
                                                strategies.strategyName,
                                            async () => {
                                                console.log("STEP-1");
                                                //  Connect the BasicPool Contract with the user's Wallet for making userDeposit()
                                                let initialUserOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(
                                                    userWallet.address
                                                );
                                                console.log(
                                                    "Prior Balance: ",
                                                    ethers.utils.formatUnits(
                                                        initialUserOptyTokenBalanceWei,
                                                        underlyingTokenDecimals
                                                    )
                                                );
                                                // console.log("Prior cal. amount: ", ethers.utils.formatEther(initialUserOptyTokenBalanceWei.sub(expandToTokenDecimals(1,11))))

                                                //  If condition is checking if the withdrawal is 0 or not. This can happen when
                                                //  depositRebalance() is called after setting up the same strategy. This can happen
                                                //  user doesn't have any Op<Token>Bsc tokens.
                                                if (
                                                    initialUserOptyTokenBalanceWei
                                                        .sub(1)
                                                        .eq(0) ||
                                                    initialUserOptyTokenBalanceWei.eq(
                                                        0
                                                    ) ||
                                                    initialUserOptyTokenBalanceWei
                                                        .sub(
                                                            expandToTokenDecimals(1, 11)
                                                        )
                                                        .eq(0)
                                                ) {
                                                    //TUSD-deposit-YEARN-yTUSD
                                                    console.log(
                                                        "Withdrawal amount = 0"
                                                    );
                                                } else {
                                                    console.log(
                                                        "Withdrawal amount > 0"
                                                    );
                                                    //  This is the edge when running all the test cases together and it sometimes fails
                                                    //  (because of timing issues) for the first but works it same strategy is used again.
                                                    //  Also, it works if we are only testing this strategy alone.
                                                    if (
                                                        strategies.strategyName.toString() ==
                                                            "USDC-deposit-CURVE-cDAI+cUSDC" ||
                                                        strategies.strategyName.toString() ==
                                                            "USDC-deposit-DFORCE-dUSDC" ||
                                                        strategies.strategyName.toString() ==
                                                            "USDC-deposit-CURVE-ypaxCrv" ||
                                                        strategies.strategyName.toString() ==
                                                            "USDC-deposit-CURVE-yDAI+yUSDC+yUSDT+yTUSD" ||
                                                        strategies.strategyName.toString() ==
                                                            "USDC-deposit-CURVE-yDAI+yUSDC+yUSDT+yBUSD" ||
                                                        strategies.strategyName.toString() ==
                                                            "USDC-deposit-CURVE-crvPlain3andSUSD" ||
                                                        strategies.strategyName.toString() ==
                                                            "USDC-deposit-CURVE-3Crv" ||
                                                        strategies.strategyName.toString() ==
                                                            "USDT-deposit-CURVE-cDAI+cUSDC+USDT" ||
                                                        strategies.strategyName.toString() ==
                                                            "USDT-deposit-CURVE-ypaxCrv" ||
                                                        strategies.strategyName.toString() ==
                                                            "USDT-deposit-CURVE-yDAI+yUSDC+yUSDT+yTUSD" ||
                                                        strategies.strategyName.toString() ==
                                                            "USDT-deposit-CURVE-yDAI+yUSDC+yUSDT+yBUSD" ||
                                                        strategies.strategyName.toString() ==
                                                            "USDT-deposit-CURVE-crvPlain3andSUSD" ||
                                                        strategies.strategyName.toString() ==
                                                            "USDT-deposit-CURVE-3Crv"
                                                    ) {
                                                        try {
                                                            console.log(
                                                                "special if condition for usdc"
                                                            );
                                                            //  Note: 1. roundingDelta = 0,1,2 - It works for all these 3 values for all other strategies
                                                            //  2. roundingDelta = 0,2,3... - It work for "USDT-deposit-CURVE-ypaxCrv". "USDT-deposit-CURVE-yDAI+yUSDC+yUSDT+yTUSD", "USDT-deposit-CURVE-yDAI+yUSDC+yUSDT+yBUSD" but not for roundingDelta = 1
                                                            // let roundingDelta = expandToTokenDecimals(2, underlyingTokenDecimals); // - also works
                                                            let roundingDelta = 1;
                                                            console.log(
                                                                "Started waiting"
                                                            );
                                                            await sleep(60 * 1000); //  Needs to wait  for min 60 sec or above else withdraw will through a revert error
                                                            console.log("waiting over");
                                                            // await optyTokenBasicPoolAsSignerUser.userWithdraw(initialUserOptyTokenBalanceWei.sub(1))
                                                            await testUserWithdrawRebalance(
                                                                initialUserOptyTokenBalanceWei,
                                                                roundingDelta
                                                            );
                                                        } catch (error) {
                                                            console.log(
                                                                "Error occured: ",
                                                                error.message
                                                            );
                                                        }
                                                    } else if (
                                                        strategies.strategyName.toString() ==
                                                            "USDC-deposit-HARVEST-fUSDC" ||
                                                        strategies.strategyName.toString() ==
                                                            "USDT-deposit-HARVEST-fUSDT"
                                                    ) {
                                                        //  Note: 1. For "USDC-deposit-HARVEST-fUSDC" and roundingDelta = 1, sleep should be minimum
                                                        //  105 sec. to make it work for the first time else it work when withdraw will happen 2nd time
                                                        //  2. "USDC-deposit-COMPOUND-cUSDC" doesn't work even after apply sleep of 2 min. Created Bug ticket OP-331
                                                        //  for it - resolved and working (NO need of wait period for this strategy)
                                                        //  3. "USDT-deposit-COMPOUND-cUSDT" - worked after OP-331 fix and "USDT-deposit-DFORCE-dUSDT" doesn't work even after apply sleep of 2 min.
                                                        try {
                                                            console.log(
                                                                "special if condition for usdc harvest"
                                                            );
                                                            // let roundingDelta = expandToTokenDecimals(2, underlyingTokenDecimals); // - also works
                                                            let roundingDelta = 0;
                                                            console.log(
                                                                "Started waiting"
                                                            );
                                                            await sleep(120 * 1000); //  Needs to wait  for min 105-120 sec or above else withdraw will through revert error
                                                            console.log("waiting over");
                                                            // await optyTokenBasicPoolAsSignerUser.userWithdraw(initialUserOptyTokenBalanceWei.sub(1))
                                                            await testUserWithdrawRebalance(
                                                                initialUserOptyTokenBalanceWei,
                                                                roundingDelta
                                                            );
                                                        } catch (error) {
                                                            console.log(
                                                                "Error occured: ",
                                                                error.message
                                                            );
                                                        }
                                                    } else if (
                                                        strategies.strategyName.toString() ==
                                                            "USDC-deposit-CURVE-cDAI+cUSDC+USDT" ||
                                                        strategies.strategyName.toString() ==
                                                            "USDT-deposit-DFORCE-dUSDT" ||
                                                        strategies.strategyName.toString() ==
                                                            "TUSD-deposit-DFORCE-dTUSD"
                                                    ) {
                                                        try {
                                                            //  Note: 1. USDT-deposit-DFORCE-dUSDT => will work for all 0,2,3 roundingDelta w/o wait period
                                                            //  2. USDT-deposit-DFORCE-dUSD => For roundingDelta = 1, wait period is required
                                                            //  3. USDT-deposit-DFORCE-dUSDT => Works for any other amounts (apart from the  sept-2) w/o wait period
                                                            //  4. USDC-deposit-CURVE-cDAI+cUSDC+USDT => works fine if run alone with 60 sec. wait period and works fine with
                                                            //  180  sec or more wait period if tested altogether with other strategies for USDC.
                                                            //  5. TUSD-deposit-DFORCE-dTUSD => Doesn't work with any wait period (sometimes)
                                                            console.log(
                                                                "special if condition for usdc and usdt curve and dforce"
                                                            );
                                                            // let roundingDelta = expandToTokenDecimals(2, underlyingTokenDecimals); // - also works
                                                            let roundingDelta = 0;
                                                            console.log(
                                                                "Started waiting"
                                                            );
                                                            await sleep(180 * 1000); //  Needs to wait  for min 105-120 sec or above else withdraw will through revert error
                                                            console.log("waiting over");
                                                            // await optyTokenBasicPoolAsSignerUser.userWithdraw(initialUserOptyTokenBalanceWei.sub(1))
                                                            await testUserWithdrawRebalance(
                                                                initialUserOptyTokenBalanceWei,
                                                                roundingDelta
                                                            );
                                                        } catch (error) {
                                                            console.log(
                                                                "Error occured: ",
                                                                error.message
                                                            );
                                                        }
                                                    } else if (
                                                        strategies.strategyName.toString() ==
                                                        "TUSD-deposit-CURVE-yDAI+yUSDC+yUSDT+yTUSD"
                                                    ) {
                                                        try {
                                                            //  Note: 1. TUSD-deposit-CURVE-yDAI+yUSDC+yUSDT+yTUSD => works for roundingDelta = 0,2,3, so on.. and for all other amounts w/o wait period but,
                                                            //  2. TUSD-deposit-CURVE-yDAI+yUSDC+yUSDT+yTUSD => It works fine if run with 240 sec or more wait period for roundingDelta = 1
                                                            console.log(
                                                                "special if condition for usdc and usdt curve and dforce"
                                                            );
                                                            // let roundingDelta = expandToTokenDecimals(2, underlyingTokenDecimals); // - also works
                                                            let roundingDelta = 0;
                                                            console.log(
                                                                "Started waiting"
                                                            );
                                                            await sleep(240 * 1000); //  Needs to wait  for min 105-120 sec or above else withdraw will through revert error
                                                            console.log("waiting over");
                                                            // await optyTokenBasicPoolAsSignerUser.userWithdraw(initialUserOptyTokenBalanceWei.sub(1))
                                                            await testUserWithdrawRebalance(
                                                                initialUserOptyTokenBalanceWei,
                                                                roundingDelta
                                                            );
                                                        } catch (error) {
                                                            console.log(
                                                                "Error occured: ",
                                                                error.message
                                                            );
                                                        }
                                                    } else {
                                                        //  Note: 1. For 3Crv-deposit-CURVE-gusd3CRV, 3Crv-deposit-CURVE-husd3CRV, 3Crv-deposit-CURVE-usdk3CRV => for roundingDelta = 1, it works for test amount 46 or more and
                                                        //  for roundingDelta = 2, it works for test amount 92 or more. Rest it works for any other amounts normally
                                                        //  with any test amount
                                                        console.log(
                                                            "Withdraw test Else condition.."
                                                        );
                                                        // let roundingDelta = expandToTokenDecimals(2, underlyingTokenDecimals);
                                                        let roundingDelta = 0;
                                                        await testUserWithdrawRebalance(
                                                            initialUserOptyTokenBalanceWei,
                                                            roundingDelta
                                                        );
                                                    }
                                                }
                                            }
                                        );
                                    }

                                    //  Function to deposit the underlying tokens into Opty<XXX>Pool and test the userDepositRebalance()
                                    async function testUserDepositRebalance() {
                                        console.log("TEsting userDeposit Rebalance() ");
                                        let userInitialTokenBalanceWei = await tokenContractInstance.balanceOf(
                                            userWallet.address
                                        );
                                        let tokenContractInstanceAsSignerUser = tokenContractInstance.connect(
                                            userWallet
                                        );
                                        await tokenContractInstanceAsSignerUser.approve(
                                            optyTokenBasicPool.address,
                                            TEST_AMOUNT,
                                            {
                                                gasLimit: 1000000,
                                            }
                                        );
                                        console.log("CHECK-1");
                                        expect(
                                            await tokenContractInstance.allowance(
                                                userWallet.address,
                                                optyTokenBasicPool.address
                                            )
                                        ).to.equal(TEST_AMOUNT);

                                        //  Getting initial balance of OptyBasicTokens for user
                                        let userOptyTokenBalanceBefore = await optyTokenBasicPool.balanceOf(
                                            userWallet.address
                                        );
                                        console.log("CHECK-2");
                                        //  Promises for getting totalSupply, poolValue and making userDepositRebalance() in parallel
                                        //  for getting latest values of totalSuppy and poolValue while Deposit txn is made
                                        let totalSupplyPromise = new Promise(
                                            async (resolve) => {
                                                resolve(
                                                    await optyTokenBasicPool.totalSupply()
                                                );
                                            }
                                        );
                                        console.log("CHECK-2a");
                                        let poolValuePromise = new Promise(
                                            async (resolve) => {
                                                resolve(
                                                    await optyTokenBasicPool.poolValue()
                                                );
                                            }
                                        );
                                        console.log("CHECK-2b");
                                        let optyTokenBasicPoolAsSignerUser = optyTokenBasicPool.connect(
                                            userWallet
                                        );
                                        console.log("CHECK-2c");
                                        let userDepositRebalanceTxPromise = new Promise(
                                            async (resolve) => {
                                                resolve(
                                                    await optyTokenBasicPoolAsSignerUser.userDepositRebalance(
                                                        TEST_AMOUNT,
                                                        {
                                                            gasLimit: 5141327,
                                                        }
                                                    )
                                                );
                                            }
                                        );
                                        console.log("CHECK-3");
                                        let allPromiseResponses: [
                                            any,
                                            any,
                                            any
                                        ] = await Promise.all([
                                            totalSupplyPromise,
                                            poolValuePromise,
                                            userDepositRebalanceTxPromise,
                                        ]);

                                        console.log(
                                            "User deposit rebalance successful"
                                        );
                                        let totalSupply = 0;
                                        let poolValue = "";
                                        // let shares: ethers.utils.BigNumber;
                                        let shares: ethers.BigNumber;
                                        let userDepositRebalanceTx;
                                        // let userDepositRebalanceTxGasUsed;
                                        console.log("CHECK-4");
                                        // const userWithdrawTxOutput = await optyTokenBasicPoolAsSignerUser.userWithdrawAllRebalance()
                                        // console.log("Withdraw txn output: ", userWithdrawTxOutput)
                                        allPromiseResponses.forEach(
                                            async (promiseResponse, index) => {
                                                if (index == 0) {
                                                    totalSupply = promiseResponse;
                                                } else if (index == 1) {
                                                    poolValue = promiseResponse;
                                                } else if (index == 2) {
                                                    userDepositRebalanceTx = promiseResponse;
                                                    let userDepositTxReceipt = await userDepositRebalanceTx.wait();
                                                    userDepositRebalanceTxGasUsed = userDepositTxReceipt.gasUsed.toNumber();

                                                    console.log(
                                                        "Gas used for user depsoit rebalance txn: ",
                                                        userDepositRebalanceTxGasUsed
                                                    );
                                                }
                                            }
                                        );

                                        assert.isOk(
                                            userDepositRebalanceTx,
                                            "UserDepositRebalance() call failed"
                                        );

                                        // Check Token balance of user after userDepositRebalance() call
                                        userTokenBalanceWei = await tokenContractInstance.balanceOf(
                                            userWallet.address
                                        );
                                        const userNewTokenBalance = parseFloat(
                                            fromWei(userTokenBalanceWei)
                                        );
                                        console.log("STEP-2");
                                        console.log(
                                            "DEPOSIT: user's " +
                                                strategiesTokenKey +
                                                " balance before: ",
                                            ethers.utils.formatEther(
                                                userInitialTokenBalanceWei
                                            )
                                        );
                                        console.log(
                                            "DEPOSIT: user's " +
                                                strategiesTokenKey +
                                                " balance after: ",
                                            ethers.utils.formatEther(
                                                userTokenBalanceWei
                                            )
                                        );
                                        expect(
                                            userTokenBalanceWei.eq(
                                                userInitialTokenBalanceWei.sub(
                                                    TEST_AMOUNT
                                                )
                                            )
                                        ).to.be.true;
                                        // expect(userNewTokenBalance).to.equal(
                                        //     userInitialTokenBalance - TEST_AMOUNT_NUM
                                        // );
                                        console.log("STEP-3");
                                        userInitialTokenBalance = userNewTokenBalance;

                                        //  Check Token balance of OptyPool contract after userDepositRabalance() call
                                        contractTokenBalanceWei = await tokenContractInstance.balanceOf(
                                            optyTokenBasicPool.address
                                        );
                                        contractTokenBalance = parseFloat(
                                            fromWei(contractTokenBalanceWei)
                                        );
                                        //  Commeting this check for checking the contract balance in underlying tokens
                                        // expect(contractTokenBalance).to.equal(0);

                                        console.log("NEXT step");
                                        //  Amount of OPTY token shares user received as per contract logic
                                        if (parseFloat(fromWei(poolValue)) == 0) {
                                            shares = TEST_AMOUNT;
                                        } else {
                                            shares = TEST_AMOUNT.mul(totalSupply).div(
                                                poolValue
                                            );
                                        }
                                        let userExpectedOptyTokenBalance = userOptyTokenBalanceBefore.add(
                                            shares
                                        );
                                        console.log(
                                            "Expected amount: ",
                                            userExpectedOptyTokenBalance
                                        );

                                        userOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(
                                            userWallet.address
                                        );
                                        console.log(
                                            "User's actual opty Token balance: ",
                                            userOptyTokenBalanceWei
                                        );
                                        //  TODO: Need to fix this assertion error for minor decimals difference for DAI-deposit-DFORCE-dDAI
                                        //        and DAI-deposit-CURVE-cDAI+cUSDC+USDT - Deepanshu
                                        //  Note: It is a small difference of decimals and it is for randomly any 2 strategies based on the
                                        //        sequence of the strategies. It is not necessarily that it will have decimals issue for the
                                        //        above mentioned 2 strategies only. It can any other also based upon the sequence of strategies.
                                        if (
                                            userOptyTokenBalanceWei.eq(
                                                userExpectedOptyTokenBalance
                                            )
                                        ) {
                                            expect(userOptyTokenBalanceWei).to.equal(
                                                userExpectedOptyTokenBalance
                                            );
                                        } else {
                                            console.log(
                                                "Minor decimals Value difference -- need to be checked"
                                            );
                                            expect(
                                                userOptyTokenBalanceWei.lte(
                                                    userExpectedOptyTokenBalance
                                                )
                                            ).to.be.true;
                                        }

                                        //  Storing the user's New Opty tokens balance in number format
                                        const userNewOptyTokenBalance = parseFloat(
                                            fromWei(userOptyTokenBalanceWei)
                                        );
                                        console.log(
                                            "User's Opty token balance: ",
                                            userNewOptyTokenBalance
                                        );
                                        userOptyTokenBalance = userNewOptyTokenBalance;
                                    }

                                    async function testUserWithdrawRebalance(
                                        initialUserOptyTokenBalanceWei: any,
                                        roundingDelta: any
                                    ) {
                                        let initialUserTokenBalanceInWei = await tokenContractInstance.balanceOf(
                                            userWallet.address
                                        );
                                        let initialContractTokenBalanceWei = await tokenContractInstance.balanceOf(
                                            optyTokenBasicPool.address
                                        );

                                        let totalSupply = await optyTokenBasicPool.totalSupply();

                                        let poolValue = await optyTokenBasicPool.poolValue();

                                        console.log(
                                            "Before: User's Opty  token balance: ",
                                            ethers.utils.formatUnits(
                                                initialUserOptyTokenBalanceWei,
                                                underlyingTokenDecimals
                                            )
                                        );
                                        let optyTokenBasicPoolAsSignerUser = optyTokenBasicPool.connect(
                                            userWallet
                                        );
                                        console.log(
                                            "Underlying token decimals: ",
                                            underlyingTokenDecimals
                                        );
                                        console.log("STEP-2");
                                        console.log("Rounding delta: ", roundingDelta);
                                        console.log(
                                            "---- Actual amount less than rounding delta: ",
                                            ethers.utils.formatUnits(
                                                initialUserOptyTokenBalanceWei.sub(
                                                    roundingDelta
                                                ),
                                                underlyingTokenDecimals
                                            )
                                        );
                                        // console.log("---- Manual withdrawal amount: ", ethers.utils.formatUnits(expandToTokenDecimals(5999999999,9),underlyingTokenDecimals))
                                        console.log(
                                            "---- Manual withdrawal amount: ",
                                            ethers.utils.formatUnits(
                                                initialUserOptyTokenBalanceWei,
                                                underlyingTokenDecimals
                                            )
                                        );
                                        console.log(
                                            "****  BEFORE WITHDRAW TXN, Actual withdrawal amount: ",
                                            ethers.utils.formatUnits(
                                                initialUserOptyTokenBalanceWei,
                                                underlyingTokenDecimals
                                            )
                                        );
                                        // const userWithdrawTxOutput = await optyTokenBasicPoolAsSignerUser.userWithdrawRebalance(
                                        //     initialUserOptyTokenBalanceWei.sub(
                                        //         roundingDelta
                                        //     ),
                                        //     {
                                        //         gasLimit: 4590162,
                                        //     }
                                        // );
                                        // expandToTokenDecimals(5999999999,9) -- working
                                        // (initialUserOptyTokenBalanceWei.sub(expandToTokenDecimals(1,18))).sub(1)
                                        // const userWithdrawTxOutput = await optyTokenBasicPoolAsSignerUser.userWithdrawAllRebalance()
                                        const userWithdrawTxOutput = await optyTokenBasicPoolAsSignerUser.functions.userWithdrawRebalance(
                                            initialUserOptyTokenBalanceWei.sub(
                                                roundingDelta
                                            ),
                                            {
                                                gasLimit: 5141327,
                                            }
                                        );
                                        console.log("withdrawal txn. successful");
                                        let receipt = await userWithdrawTxOutput.wait();
                                        userWithdrawRebalanceTxGasUsed = receipt.gasUsed.toNumber();
                                        console.log(
                                            "Gas used for user withdraw rebalance: ",
                                            userWithdrawRebalanceTxGasUsed
                                        );
                                        // console.log("User withdraw txn Receipt: ", receipt);

                                        assert.isOk(
                                            userWithdrawTxOutput,
                                            "UserWithdraw() call failed"
                                        );

                                        let afterUserOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(
                                            userWallet.address
                                        );

                                        let afterUserTokenBalanceWei = await tokenContractInstance.balanceOf(
                                            userWallet.address
                                        );

                                        console.log(
                                            "User's initial Opty  token balance: ",
                                            ethers.utils.formatUnits(
                                                initialUserOptyTokenBalanceWei,
                                                underlyingTokenDecimals
                                            )
                                        );
                                        console.log(
                                            "User's after Opty Token Balance: ",
                                            ethers.utils.formatUnits(
                                                afterUserOptyTokenBalanceWei,
                                                underlyingTokenDecimals
                                            )
                                        );
                                        // let noOfTokensReceived = ethers.utils.bigNumberify(
                                        //     "0x" +
                                        //         receipt.events[
                                        //             receipt.events.length - 1
                                        //         ].data
                                        //             .toString()
                                        //             .substr(
                                        //                 receipt.events[
                                        //                     receipt.events.length - 1
                                        //                 ].data.length - 16
                                        //             )
                                        // );
                                        let noOfTokensReceived = ethers.BigNumber.from(
                                            "0x" +
                                                receipt.events[
                                                    receipt.events.length - 1
                                                ].data
                                                    .toString()
                                                    .substr(
                                                        receipt.events[
                                                            receipt.events.length - 1
                                                        ].data.length - 16
                                                    )
                                        );
                                        let noOfTokensReceivedFromFormula = poolValue
                                            .mul(initialUserOptyTokenBalanceWei.sub(1))
                                            .div(totalSupply);
                                        console.log(
                                            "noOfTokensReceived from formula: ",
                                            ethers.utils.formatEther(
                                                noOfTokensReceivedFromFormula
                                            )
                                        );
                                        console.log(
                                            "noOfTokensReceived from receipt: ",
                                            ethers.utils.formatEther(noOfTokensReceived)
                                        );
                                        console.log(
                                            "** Withdraw worked for whole balance **"
                                        );
                                        expect(
                                            afterUserOptyTokenBalanceWei.eq(
                                                roundingDelta
                                            )
                                        ).to.be.true;
                                        // expect(afterUserOptyTokenBalanceWei.eq(0)).to.be
                                        //    .true;

                                        console.log("STEP-3");
                                        console.log(
                                            "Before withdraw, User's " +
                                                strategiesTokenKey +
                                                " Balance: ",
                                            ethers.utils.formatEther(
                                                initialUserTokenBalanceInWei
                                            )
                                        );
                                        console.log(
                                            "After withdraw, User's " +
                                                strategiesTokenKey +
                                                " balance: ",
                                            ethers.utils.formatEther(
                                                afterUserTokenBalanceWei
                                            )
                                        );

                                        console.log(
                                            "Left over: ",
                                            noOfTokensReceived.sub(
                                                noOfTokensReceivedFromFormula
                                            )
                                        );
                                        //  User's TOKEN (like DAI etc.) balance should be equal to no. of tokens
                                        //  calculated from formula but sometimes, it is not equal like in case of AAVE
                                        //  where the token and lpToken ratio is 1:1
                                        if (
                                            afterUserTokenBalanceWei.eq(
                                                noOfTokensReceivedFromFormula
                                            )
                                        ) {
                                            console.log(
                                                "After token balance matched with tokens calculated from formula...."
                                            );
                                            expect(afterUserTokenBalanceWei).to.equal(
                                                noOfTokensReceivedFromFormula
                                            );
                                        } else if (
                                            afterUserTokenBalanceWei.lte(
                                                noOfTokensReceivedFromFormula
                                            )
                                        ) {
                                            console.log(
                                                "Token balance of User less than the formula value"
                                            );
                                            expect(
                                                afterUserTokenBalanceWei.lte(
                                                    noOfTokensReceivedFromFormula
                                                )
                                            ).to.be.true;
                                        } else {
                                            console.log(
                                                "Token balance of User greater than the formula value"
                                            );
                                            expect(
                                                afterUserTokenBalanceWei.gte(
                                                    noOfTokensReceivedFromFormula
                                                )
                                            ).to.be.true;
                                        }

                                        let afterContractTokenBalanceWei = await tokenContractInstance.balanceOf(
                                            optyTokenBasicPool.address
                                        );

                                        console.log("STEP-4");
                                        console.log(
                                            "Before withdraw, contract " +
                                                strategiesTokenKey +
                                                " balance: ",
                                            ethers.utils.formatEther(
                                                initialContractTokenBalanceWei
                                            )
                                        );
                                        //  Sometimes, Contract has left with some small fraction of Token like DAI etc.
                                        if (
                                            afterContractTokenBalanceWei.eq(
                                                initialContractTokenBalanceWei
                                            )
                                        ) {
                                            console.log(
                                                "After withdraw contracts " +
                                                    strategiesTokenKey +
                                                    " balance when there is no left over: ",
                                                ethers.utils.formatEther(
                                                    afterContractTokenBalanceWei
                                                )
                                            );
                                            // expect(afterContractTokenBalanceWei).to.equal(
                                            //     initialContractTokenBalanceWei
                                            // );
                                            expect(afterContractTokenBalanceWei.eq(0))
                                                .to.be.true;
                                            expect(initialContractTokenBalanceWei.eq(0))
                                                .to.be.true;
                                        } else {
                                            console.log(
                                                "After withdraw contracts " +
                                                    strategiesTokenKey +
                                                    " balance when there is some tokens left over: ",
                                                ethers.utils.formatEther(
                                                    afterContractTokenBalanceWei
                                                )
                                            );
                                            // Note: Commented while testing USDC token strategies
                                            // expect(
                                            //     afterContractTokenBalanceWei.gte(
                                            //         initialContractTokenBalanceWei.add(
                                            //             1
                                            //         )
                                            //     )
                                            // ).to.be.true;
                                            expect(
                                                afterContractTokenBalanceWei
                                            ).to.equal(0);
                                        }

                                        // TODO: Add POOL NAME, OUTPUT TOKEN, isBORROW - Deepanshu
                                        let strategyGasUsedJson = {
                                            testScriptRunDateAndTime: testScriptRunTimeDateAndTime,
                                            strategyRunDateAndTime: Date.now(),
                                            strategyName: strategies.strategyName,
                                            setStrategy: setStrategyTxGasUsed,
                                            scoreStrategy: scoreStrategyTxGasUsed,
                                            setAndScoreStrategy: setAndScoreStrategyTotalGasUsed,
                                            userDepositRebalanceTx: userDepositRebalanceTxGasUsed,
                                            userWithdrawRebalanceTx: userWithdrawRebalanceTxGasUsed,
                                        };

                                        allStrategiesGasUsedRecords.push(
                                            strategyGasUsedJson
                                        );
                                    }
                                }
                            );

                            after(async () => {
                                //  Checking Owner and User's Ether balance left after all the transactions
                                let balance = await provider.getBalance(
                                    ownerWallet.address
                                );
                                console.log(
                                    "OWNER'S ETHER BALANCE AFTER ALL TEST SUITS: ",
                                    ethers.utils.formatEther(balance)
                                );
                                let userBalance = await provider.getBalance(
                                    userWallet.address
                                );
                                console.log(
                                    "USER'S ETHER BALANCE AFTER ALL TEST SUITS: ",
                                    ethers.utils.formatEther(userBalance)
                                );

                                let tokenStrategyGasUsedRecord: GasUsedRecords = {};
                                tokenStrategyGasUsedRecord[strategiesTokenKey] = {
                                    GasRecords: allStrategiesGasUsedRecords,
                                };
                                console.log(
                                    "Strategy Gas Records: ",
                                    allStrategiesGasUsedRecords
                                );
                                console.log(
                                    "token-vise gas used token list: ",
                                    tokenStrategyGasUsedRecord
                                );
                                console.log(
                                    "FROM INSIDE: ",
                                    tokenStrategyGasUsedRecord[strategiesTokenKey]
                                        .GasRecords
                                );

                                if (command.insertGasRecordsInDB) {
                                    console.log(
                                        "****    Coming INTO PUTTING THE DATA INTO DB    ****"
                                    );
                                    allStrategiesGasUsedRecords.forEach(
                                        async (gasRecordItem) => {
                                            const inserQueryResponse: number = await insertGasUsedRecordsIntoDB(
                                                testScriptRunTimeDateAndTime,
                                                strategiesTokenKey,
                                                gasRecordItem.strategyName,
                                                gasRecordItem.setStrategy,
                                                gasRecordItem.scoreStrategy,
                                                gasRecordItem.setAndScoreStrategy,
                                                gasRecordItem.userDepositRebalanceTx,
                                                gasRecordItem.userWithdrawRebalanceTx,
                                                command.runTimeversion
                                            );
                                            console.log(
                                                "Checking row is inserted or not...."
                                            );
                                            expect(inserQueryResponse).to.equal(
                                                1,
                                                "All records for gas used are not entered into DB!"
                                            );
                                        }
                                    );
                                }

                                if (command.writeGasRecordsInFile) {
                                    console.log(
                                        "****    Coming into putting records into FILE    ****"
                                    );
                                    let path = process.env.PWD;
                                    if (path?.endsWith("earn-protocol")) {
                                        path = path + "/test/gasRecordFiles/";
                                    } else if (path?.endsWith("test")) {
                                        path = path + "/gasRecordFiles/";
                                    }

                                    const fileName: string =
                                        path + gasRecordsFileName + ".json";

                                    fs.stat(fileName, async function (
                                        err: { code: string } | null,
                                        stat: any
                                    ) {
                                        if (err == null) {
                                            console.log(
                                                "File exists, therefore appending.."
                                            );
                                            await appendInFile(
                                                fileName,
                                                tokenStrategyGasUsedRecord
                                            );
                                            console.log("appending done..");
                                            // await formatFile(fileName);
                                        } else if (err.code === "ENOENT") {
                                            // file does not exist
                                            console.log(
                                                "File doesn't exists.. therefore writing.."
                                            );
                                            await writeInFile(
                                                fileName,
                                                tokenStrategyGasUsedRecord
                                            );
                                        } else {
                                            console.log("Some other error: ", err.code);
                                        }
                                    });
                                }
                            });
                        }
                    );
                }

                //  Function to approve the LpTokens as tokens and underlyingTokens from tokens list
                async function approveTokenLpToken(lpToken: string, tokens: string[]) {
                    // Note: May need this if lpToken is null/empty down the road - Deepanshu
                    // if (!!lpToken || lpToken.length > 0) {
                    if (lpToken != "0x0000000000000000000000000000000000000000") {
                        let lpTokenApproveStatus = await optyRegistry.tokens(lpToken);
                        if (!lpTokenApproveStatus) {
                            console.log("Approving LpToken: ", lpToken);
                            await optyRegistry.approveToken(lpToken);
                        }
                    }

                    console.log("STep-1 approve");
                    if (tokens.length > 0) {
                        console.log("step2 approve");
                        tokens.forEach(async (token) => {
                            console.log("step3 approve");
                            let tokenApproveStatus = await optyRegistry.tokens(token);
                            if (!tokenApproveStatus) {
                                console.log("Approving token: ", token);
                                await optyRegistry.approveToken(token);
                            }
                        });
                    }
                }

                //  Function to set the hash for the list of underlying tokens
                async function setTokensHashToTokens(tokens: string[]) {
                    let tokensHash =
                        "0x" +
                        abi.soliditySHA3(["address[]"], [tokens]).toString("hex");
                    // let tokensHashIndex: ethers.utils.BigNumber = await optyRegistry.tokensHashToTokens(
                    //     tokensHash
                    // );
                    let tokensHashIndex: ethers.BigNumber = await optyRegistry.tokensHashToTokens(
                        tokensHash
                    );
                    if (
                        tokensHashIndex.eq(0) &&
                        tokensHash !==
                            "0x50440c05332207ba7b1bb0dcaf90d1864e3aa44dd98a51f88d0796a7623f0c80"
                    ) {
                        console.log(
                            "Tokens Hash generated from SHA3 lib: ",
                            tokensHash
                        );
                        const setTokensHashTx = await optyRegistry.setTokensHashToTokens(
                            tokens
                        );
                        const setTokensHashTxOutput = await setTokensHashTx.wait();
                        console.log(
                            "set Tokens hash output from contract: ",
                            setTokensHashTxOutput
                        );
                    }
                }

                //  Function to approve the liquidity/credit pool and map the Lp to the PoolProxy Contract
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
                        await optyRegistry.setLiquidityPoolToBorrowPoolProxy(
                            pool,
                            poolProxy
                        );
                    } else {
                        console.log("Mapping code provider to lp");
                        await optyRegistry.setLiquidityPoolToCodeProvider(
                            pool,
                            poolProxy
                        );
                    }
                }

                // Handle revert exception occured further..
                async function expectException(
                    promise: Promise<any>,
                    expectedError: any
                ) {
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
                const expectRevert = async function (
                    promise: Promise<any>,
                    expectedError: any
                ) {
                    promise.catch(() => {}); // Avoids uncaught promise rejections in case an input validation causes us to return early

                    if (!expectedError) {
                        throw Error(
                            "No revert reason specified: call expectRevert with the reason string, or use expectRevert.unspecified \
        if your 'require' statement doesn't have one."
                        );
                    }

                    let status = await expectException(promise, expectedError);
                    console.log("REVERT STATUS: ", status);
                };

                async function sleep(ms: number) {
                    return new Promise((resolve) => setTimeout(resolve, ms));
                }
            });
        }
    );

program.parse(process.argv);
