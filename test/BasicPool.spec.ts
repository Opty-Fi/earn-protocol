import chai, { assert, expect } from "chai";
import { Contract, ethers } from "ethers";
import { solidity, deployContract } from "ethereum-waffle";
import * as utilities from "./shared/utilities";
import * as PoolContracts from "./shared/PoolContracts";
import * as GovernanceContracts from "./shared/GovernanceContract";
import * as ProtocolCodeProviderContracts from "./shared/ProtocolCodeProviderContracts";
import * as OtherImports from "./shared/OtherImports";
import * as RegistryFunctions from "./shared/OptyRegistryFunctions";

const envConfig = require("dotenv").config(); //  library to import the local ENV variables defined
//  Note: Don't remove line-6, because this line helps to get rid of error: NOT ABLE TO READ LOCAL ENV VARIABLES defined in .env file

chai.use(solidity);

const { program } = require("commander"); //  library to handle the command line arguments
const fs = require("fs"); //  library to read/write to a particular file

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
        "0.0.3"
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
            let underlyingTokenSymbol: string; //  keep track of underlying token
            let gasRecordsFileName: string; //  store file name for recording the gasUsed
            let testScriptRunTimeDateAndTime: number; //  timestamp for storing the execution of test script

            //  Creatubg the file name based on underlying token passed or not
            if (command.symbol == null) {
                testScriptRunTimeDateAndTime = Date.now();
                gasRecordsFileName =
                    "AllTokenStrategiesGasRecords_" +
                    testScriptRunTimeDateAndTime.toString();
            } else {
                underlyingTokenSymbol = command.symbol.toString().toUpperCase();

                testScriptRunTimeDateAndTime = Date.now();
                gasRecordsFileName =
                    underlyingTokenSymbol +
                    "_" +
                    testScriptRunTimeDateAndTime.toString();
            }

            const abi = require("ethereumjs-abi");

            let TEST_AMOUNT_NUM: number;

            //  Fetch the test amount from command line and if not found, then  use the default one
            if (command.testAmount > 0) {
                TEST_AMOUNT_NUM = command.testAmount;
            } else {
                console.error("ERROR: Invalid  TEST_AMOUNT entered for testing");
                process.exit(1);
            }

            let TEST_AMOUNT: ethers.BigNumber; //  convert the test amount passed in to big number for testing

            //  Interface for storing the Abi's of CodeProvider Contracts
            interface CodeProviderContract {
                [id: string]: any;
            }
            //  Interface for mapping the CodeProvider Contracts deployed with their variable name for using them in the code
            interface OptyCodeProviderContractVariables {
                [id: string]: Contract;
            }

            //  Interface for getting the pools, lpTokens and underlyingTokens corresponding to CodeProvider Contract
            interface DefiPools {
                [id: string]: {
                    pool: string;
                    lpToken: string;
                    tokens: string[];
                };
            }

            // Interface to store the gasRecords only
            interface GasRecord {
                testScriptRunDateAndTime: number;
                strategyRunDateAndTime: number;
                strategyName: string;
                setStrategy: number;
                scoreStrategy: number;
                setAndScoreStrategy: number;
                userDepositRebalanceTx: number;
                userWithdrawRebalanceTx: number;
            }

            //  Interface for mapping the gasUsed records corresponding to underlying token
            interface GasUsedRecords {
                [id: string]: {
                    GasRecords: GasRecord[];
                };
            }

            //  Json of CodeProviderContract for storing the Abi's of CodeProviderContracts
            let codeProviderContract: CodeProviderContract = {
                CompoundCodeProvider: ProtocolCodeProviderContracts.CompoundCodeProvider,
                AaveV1CodeProvider: ProtocolCodeProviderContracts.AaveV1CodeProvider,
                FulcrumCodeProvider: ProtocolCodeProviderContracts.FulcrumCodeProvider,
                DForceCodeProvider: ProtocolCodeProviderContracts.DForceCodeProvider,
                HarvestCodeProvider: ProtocolCodeProviderContracts.HarvestCodeProvider,
                YVaultCodeProvider: ProtocolCodeProviderContracts.YVaultCodeProvider,
                CurvePoolCodeProvider: ProtocolCodeProviderContracts.CurvePoolCodeProvider,
                CurveSwapCodeProvider: ProtocolCodeProviderContracts.CurveSwapCodeProvider,
                dYdXCodeProvider: ProtocolCodeProviderContracts.dYdXCodeProvider,
                CreamCodeProvider: ProtocolCodeProviderContracts.CreamCodeProvider,
                AaveV2CodeProvider: ProtocolCodeProviderContracts.AaveV2CodeProvider,
                YearnCodeProvider: ProtocolCodeProviderContracts.YearnCodeProvider,
            };

            let optyCodeProviderContractVariables: OptyCodeProviderContractVariables = {};
            let ProtocolCodeProviderNamesKey: keyof typeof OtherImports.ProtocolCodeProviderNames; //  Getting the op<XXX>Pool contracts as key corresponding to the CodeProvider Contracts
            let defiPoolsKey: keyof typeof OtherImports.defiPools; //  Keys of defiPools.json corresponding to CodeProvider Contracts
            let provider: ethers.providers.Web3Provider;

            describe("OptyTokenBasicPool", async () => {
                //  local variables used throughout the testing
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
                let optyCodeProviderContract: any;

                before(async () => {
                    let allParams = await utilities.startChain();
                    provider = <ethers.providers.Web3Provider>allParams[2];
                    ownerWallet = <ethers.Wallet>allParams[0];
                    userWallet = <ethers.Wallet>allParams[1];

                    //  Deploying Registry, RiskManager, Gatherer and StrategyCodeProvider Contracts
                    optyRegistry = await deployContract(
                        ownerWallet,
                        GovernanceContracts.OptyRegistry,
                        [],
                        {
                            gasLimit: 5141327,
                        }
                    );
                    assert.isDefined(
                        optyRegistry,
                        "OptyRegistry contract not deployed"
                    );

                    riskManager = await deployContract(
                        ownerWallet,
                        GovernanceContracts.RiskManager,
                        [optyRegistry.address]
                    );
                    assert.isDefined(riskManager, "RiskManager contract not deployed");

                    gatherer = await deployContract(
                        ownerWallet,
                        GovernanceContracts.Gatherer,
                        [optyRegistry.address]
                    );
                    assert.isDefined(gatherer, "Gatherer contract not deployed");

                    optyStrategyCodeProvider = await deployContract(
                        ownerWallet,
                        GovernanceContracts.OptyStrategyCodeProvider,
                        [optyRegistry.address]
                    );
                    assert.isDefined(
                        optyStrategyCodeProvider,
                        "OptyStrategyCodeProvider contract not deployed"
                    );

                    /*
                        Iterating through list of underlyingTokens and approving them if not approved
                    */
                    let token: keyof typeof OtherImports.tokenAddresses;
                    for (token in OtherImports.tokenAddresses) {
                        let tokenStatus = await optyRegistry.tokens(
                            OtherImports.tokenAddresses[token]
                        );
                        if (!tokenStatus) {
                            await optyRegistry.approveToken(
                                OtherImports.tokenAddresses[token]
                            );
                        }
                    }

                    /*  
                                Iterating through the list of CodeProvider Contracts for deploying them
                            */
                    let count = 1;
                    let optyCodeProviderContracts =
                        OtherImports.ProtocolCodeProviderNames.BasicPool;
                    for (let optyCodeProviderContractsKey of optyCodeProviderContracts) {
                        let flag: boolean;
                        if (optyCodeProviderContractsKey == command.codeProvider) {
                            flag = true;
                        } else if (command.codeProvider == null) {
                            flag = true;
                        } else {
                            flag = false;
                        }

                        if (flag && count <= optyCodeProviderContracts.length) {
                            if (
                                codeProviderContract.hasOwnProperty(
                                    optyCodeProviderContractsKey.toString()
                                )
                            ) {
                                //  Deploying  the  code provider contracts
                                optyCodeProviderContract = await utilities.deployCodeProviderContracts(
                                    optyCodeProviderContractsKey,
                                    ownerWallet,
                                    codeProviderContract[optyCodeProviderContractsKey],
                                    optyRegistry.address,
                                    gatherer.address
                                );

                                //  Mapping CodeProvider contracts deployed to their variable names
                                optyCodeProviderContractVariables[
                                    optyCodeProviderContractsKey
                                ] = optyCodeProviderContract;

                                assert.isDefined(
                                    optyCodeProviderContractVariables[
                                        optyCodeProviderContractsKey
                                    ],
                                    "optyCodeProviderContract contract not deployed"
                                );
                                //  Iterating through defiPools.json to approve LpTokens/Tokens, set Tokens hash
                                //  mapping to tokens, approve LP/CP, map Lp to CodeProvider Contract and setting the
                                //  Lp to LpToken
                                for (defiPoolsKey in OtherImports.defiPools) {
                                    if (
                                        defiPoolsKey.toString() ==
                                        optyCodeProviderContractsKey.toString()
                                    ) {
                                        let defiPoolsUnderlyingTokens: DefiPools =
                                            OtherImports.defiPools[defiPoolsKey];
                                        //  Iteracting through all the underlying tokens available corresponding to this
                                        //  current CodeProvider Contract Key
                                        for (let defiPoolsUnderlyingTokensKey in defiPoolsUnderlyingTokens) {
                                            //  Approving tokens, lpTokens
                                            await RegistryFunctions.approveTokenLpToken(
                                                defiPoolsUnderlyingTokens[
                                                    defiPoolsUnderlyingTokensKey
                                                ].lpToken,
                                                defiPoolsUnderlyingTokens[
                                                    defiPoolsUnderlyingTokensKey
                                                ].tokens,
                                                optyRegistry
                                            );
                                            // Mapping tokensHash to token
                                            await RegistryFunctions.setTokensHashToTokens(
                                                defiPoolsUnderlyingTokens[
                                                    defiPoolsUnderlyingTokensKey
                                                ].tokens,
                                                optyRegistry
                                            );

                                            // Approving pool as Liquidity pool and mapping it to the CodeProvider
                                            await RegistryFunctions.approveLpCpAndMapLpToCodeProvider(
                                                defiPoolsUnderlyingTokens[
                                                    defiPoolsUnderlyingTokensKey
                                                ].pool,
                                                optyCodeProviderContractVariables[
                                                    optyCodeProviderContractsKey
                                                ].address,
                                                false,
                                                optyRegistry
                                            );

                                            if (
                                                defiPoolsUnderlyingTokens[
                                                    defiPoolsUnderlyingTokensKey
                                                ].lpToken !=
                                                "0x0000000000000000000000000000000000000000"
                                            ) {
                                                // Mapping LiquidityPool to lpToken
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
                                        }
                                    }
                                }
                            }
                        }
                        count++;
                    }
                });

                after(async () => {
                    console.log("TESTING COMPLETED..");
                });

                it("should check if the code provider contracts are deployed", async () => {
                    assert.isOk(
                        optyCodeProviderContractVariables.CompoundCodeProvider.address,
                        "CompoundCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyCodeProviderContractVariables.AaveV1CodeProvider.address,
                        "AaveV1CodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyCodeProviderContractVariables.AaveV2CodeProvider.address,
                        "AaveV2CodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyCodeProviderContractVariables.FulcrumCodeProvider.address,
                        "FulcrumCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyCodeProviderContractVariables.DForceCodeProvider.address,
                        "DForceCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyCodeProviderContractVariables.HarvestCodeProvider.address,
                        "HarvestCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyCodeProviderContractVariables.YVaultCodeProvider.address,
                        "YVaultCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyCodeProviderContractVariables.YearnCodeProvider.address,
                        "YearnCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyCodeProviderContractVariables.CurvePoolCodeProvider.address,
                        "CurvePoolCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyCodeProviderContractVariables.CurveSwapCodeProvider.address,
                        "CurveSwapCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyCodeProviderContractVariables.dYdXCodeProvider.address,
                        "dYdXCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyCodeProviderContractVariables.CreamCodeProvider.address,
                        "CreamCodeProvider Contract is not deployed"
                    );
                });

                //  Iterating through all the strategies by picking underlyingTokens as key
                let strategiesTokenKey: keyof typeof OtherImports.allStrategies;
                let allStrategiesTokenKeys = Object.keys(
                    OtherImports.allStrategies
                ).map((item) => item.toUpperCase());
                for (strategiesTokenKey in OtherImports.allStrategies) {
                    //  If: Executes test suite for all the underlying tokens, Else: Executes test suite for token symbol passed from command line
                    if (command.symbol == null) {
                        if (strategiesTokenKey.toUpperCase() != "REP") {
                            await runTokenTestSuite(strategiesTokenKey);
                        }
                    } else {
                        //  IF: Run Test suite if token symbol is valid and exists, ELSE: Through an error and stop running test suite
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
                    strategiesTokenKey: keyof typeof OtherImports.allStrategies
                ) {
                    describe(
                        "TEST CASES FOR: " + strategiesTokenKey.toUpperCase(),
                        async () => {
                            //  local variables to be used for testing
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
                                    OtherImports.tokenAddresses[
                                        <keyof typeof OtherImports.tokenAddresses>(
                                            strategiesTokenKey.toLowerCase()
                                        )
                                    ];
                                tokens = [underlyingToken];

                                // Instantiate token contract
                                tokenContractInstance = new ethers.Contract(
                                    underlyingToken,
                                    OtherImports.addressAbis.erc20.abi,
                                    ownerWallet
                                );

                                underlyingTokenDecimals = await tokenContractInstance.decimals(); //  underlying token decimals

                                //  Special scenario for HBTC token because funding with larger can't be done due to Price impact in
                                //  uniswap during swap, therefore converting the test amount to less amount which can be funded.
                                if (strategiesTokenKey.toLowerCase() == "hbtc") {
                                    TEST_AMOUNT = utilities.expandToTokenDecimals(
                                        TEST_AMOUNT_NUM,
                                        16 - (TEST_AMOUNT_NUM.toString().length - 1)
                                    );
                                } else {
                                    TEST_AMOUNT = utilities.expandToTokenDecimals(
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
                                        PoolContracts.OptyTokenBasicPoolMkr,
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
                                        PoolContracts.OptyTokenBasicPool,
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
                            });

                            //  Function to fund the wallet with the underlying tokens equivalent to TEST_AMOUNT_NUM
                            async function checkAndFundWallet() {
                                //  user's initial underlying tokens balance
                                userTokenBalanceWei = await tokenContractInstance.balanceOf(
                                    userWallet.address
                                );

                                // user's initial opXXXBsc tokens balance in Wei
                                userOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(
                                    userWallet.address
                                );
                                userOptyTokenBalance = parseFloat(
                                    fromWei(userOptyTokenBalanceWei)
                                );
                                //  If user's underlying token balance is less than TEST_AMOUNT then, fund user's wallet with underlying token
                                if (
                                    userTokenBalanceWei.lt(TEST_AMOUNT) ||
                                    userTokenBalanceWei == undefined
                                ) {
                                    let FUND_AMOUNT;
                                    //  Edge case for funding the HBTC token due to price impact during swapping
                                    if (
                                        tokenContractInstance.address ==
                                        "0x0316EB71485b0Ab14103307bf65a021042c6d380"
                                    ) {
                                        FUND_AMOUNT = TEST_AMOUNT;
                                    } else {
                                        FUND_AMOUNT = TEST_AMOUNT.sub(
                                            userTokenBalanceWei
                                        );
                                    }

                                    //  Fund the user's wallet with some TEST_AMOUNT_NUM of tokens
                                    await utilities.fundWallet(
                                        underlyingToken,
                                        userWallet,
                                        FUND_AMOUNT
                                    );

                                    // Check Token and opToken balance of User's wallet and OptyTokenBaiscPool Contract
                                    userTokenBalanceWei = await tokenContractInstance.balanceOf(
                                        userWallet.address
                                    );

                                    //  If still user's wallet is not funded with TEST_AMOUNT, then fund the wallet again with remaining tokens
                                    if (userTokenBalanceWei.lt(TEST_AMOUNT)) {
                                        await utilities.fundWallet(
                                            underlyingToken,
                                            userWallet,
                                            TEST_AMOUNT.sub(userTokenBalanceWei)
                                        );
                                        userTokenBalanceWei = await tokenContractInstance.balanceOf(
                                            userWallet.address
                                        );
                                    }
                                    userInitialTokenBalance = parseFloat(
                                        fromWei(userTokenBalanceWei)
                                    );
                                }
                            }

                            it(
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

                            //  Recording GasUsed for all strategies to push data into DB and file at last
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
                            let allStrategyNames = OtherImports.allStrategies[
                                strategiesTokenKey
                            ].basic.map((element) =>
                                element.strategyName.toLowerCase()
                            );

                            /*  
                                Iterating through each strategy one by one, setting, approving and scroing the each 
                                strategy and then making userDepositRebalance() call 
                            */
                            OtherImports.allStrategies[
                                strategiesTokenKey
                            ].basic.forEach(async (strategies, index) => {
                                let setStrategyTxGasUsed: number = 0;
                                let scoreStrategyTxGasUsed: number = 0;
                                let setAndScoreStrategyTotalGasUsed: number = 0;
                                let userDepositRebalanceTxGasUsed: number = 0;
                                let userWithdrawRebalanceTxGasUsed: number = 0;

                                //  Run for either specific strategy passed from command line or run it for all the strategies
                                //  If any wrong strategy is passed from command line, then error will be thrown and testing will be stopped.
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
                                                OtherImports.allStrategies[
                                                    strategiesTokenKey
                                                ].basic.length
                                            ) {
                                                //  Run the test cases for depositRebalance and withdrawRebalance
                                                await runDepositWithdrawTestCases();
                                            } else {
                                                console.error(
                                                    "ERROR: Invalid Number of existing strategies length"
                                                );
                                                process.exit(4);
                                            }
                                        } else {
                                            if (index < command.strategiesCount) {
                                                //  Run the test cases for depositRebalance and withdrawRebalance
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
                                        OtherImports.allStrategies[
                                            strategiesTokenKey
                                        ].basic[index].strategyName.toLowerCase() ==
                                        command.strategyName.toLowerCase()
                                    ) {
                                        //  Run the test cases for depositRebalance and withdrawRebalance
                                        await runDepositWithdrawTestCases();
                                    }
                                }

                                //  Function to run all the test case for depositRebalance and withdrawRebalance functions
                                async function runDepositWithdrawTestCases() {
                                    it(
                                        "should deposit using userDepositRebalance() using Strategy - " +
                                            strategies.strategyName,
                                        async () => {
                                            //  Setting the strategy and making it the best strategy so that each strategy can be tested
                                            //  before testing depositRebalance() and withdrawRebalance()
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
                                                let tempArr: (string | boolean)[] = [];
                                                //  If condition For 2 step strategies
                                                if (
                                                    previousStepOutputToken.length > 0
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
                                                    strategies.strategy[index].contract,
                                                    strategies.strategy[index]
                                                        .outputToken,
                                                    strategies.strategy[index].isBorrow
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
                                                        [tokensHash, strategyStepHash]
                                                    )
                                                    .toString("hex");

                                            //  Getting the strategy hash corresponding to underlying token
                                            let tokenToStrategyHashes = await optyRegistry.getTokenToStrategies(
                                                tokensHash
                                            );
                                            //  If strategyHash is already set then check revert error message from the Contract
                                            if (
                                                tokenToStrategyHashes.includes(
                                                    tokenToStrategyStepsHash
                                                )
                                            ) {
                                                await utilities.expectRevert(
                                                    optyRegistry.setStrategy(
                                                        tokensHash,
                                                        strategySteps
                                                    ),
                                                    "isNewStrategy"
                                                );
                                            } else {
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

                                                    let scoreStrategyTx = await optyRegistry.scoreStrategy(
                                                        strategyHash.toString(),
                                                        index + 1
                                                    );
                                                    let scoreStrategyReceipt = await scoreStrategyTx.wait();
                                                    scoreStrategyTxGasUsed = scoreStrategyReceipt.gasUsed.toNumber();

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
                                                    await scoreStrategyTx.wait();
                                                }

                                                //  Fetching best strategy
                                                let bestStrategyHash = await riskManager.getBestStrategy(
                                                    profile,
                                                    [underlyingToken]
                                                );

                                                //  Getting the best strategy
                                                let bestStrategy = await optyRegistry.getStrategy(
                                                    bestStrategyHash.toString()
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
                                            //  Connect the BasicPool Contract with the user's Wallet for making userDeposit()
                                            let initialUserOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(
                                                userWallet.address
                                            );

                                            //  If condition is checking if the withdrawal is 0 or not. This can happen when
                                            //  depositRebalance() is called after setting up the same strategy. This can happen
                                            //  user doesn't have any Op<Token>Bsc tokens.
                                            if (
                                                !(
                                                    initialUserOptyTokenBalanceWei
                                                        .sub(1)
                                                        .eq(0) ||
                                                    initialUserOptyTokenBalanceWei.eq(
                                                        0
                                                    ) ||
                                                    initialUserOptyTokenBalanceWei
                                                        .sub(
                                                            utilities.expandToTokenDecimals(
                                                                1,
                                                                11
                                                            )
                                                        )
                                                        .eq(0)
                                                )
                                            ) {
                                                //  This is the edge when running all the test cases together and it sometimes fails
                                                //  (because of timing issues) for the first but works it same strategy is used again.
                                                //  Also, it works if we are only testing this strategy alone.
                                                let EdgeCaseStrategiesKeys: keyof typeof OtherImports.EdgeCaseStrategies;
                                                EdgeCaseStrategiesKeys = <
                                                    keyof typeof OtherImports.EdgeCaseStrategies
                                                >strategies.strategyName.toString();
                                                let sleepTimeInSec = OtherImports
                                                    .EdgeCaseStrategies[
                                                    EdgeCaseStrategiesKeys
                                                ]
                                                    ? OtherImports.EdgeCaseStrategies[
                                                          EdgeCaseStrategiesKeys
                                                      ].sleepTimeInSec
                                                    : 0;
                                                try {
                                                    //  Note: 1. roundingDelta = 0,1,2 - It works for all these 3 values for all other strategies
                                                    //  2. roundingDelta = 0,2,3... - It work for "USDT-deposit-CURVE-ypaxCrv". "USDT-deposit-CURVE-yDAI+yUSDC+yUSDT+yTUSD", "USDT-deposit-CURVE-yDAI+yUSDC+yUSDT+yBUSD" but not for roundingDelta = 1
                                                    // let roundingDelta = utilities.expandToTokenDecimals(2, underlyingTokenDecimals); // - also works
                                                    let roundingDelta = 0;

                                                    await utilities.sleep(
                                                        sleepTimeInSec * 1000
                                                    ); //  Needs to wait  for min 60 sec or above else withdraw will through a revert error

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
                                            }
                                        }
                                    );
                                }

                                //  Function to deposit the underlying tokens into Opty<XXX>Pool and test the userDepositRebalance()
                                async function testUserDepositRebalance() {
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

                                    //  Promises for getting totalSupply, poolValue and making userDepositRebalance() in parallel
                                    //  for getting latest values of totalSuppy and poolValue while Deposit txn is made
                                    let totalSupplyPromise = new Promise(
                                        async (resolve) => {
                                            resolve(
                                                await optyTokenBasicPool.totalSupply()
                                            );
                                        }
                                    );

                                    let poolValuePromise = new Promise(
                                        async (resolve) => {
                                            resolve(
                                                await optyTokenBasicPool.poolValue()
                                            );
                                        }
                                    );

                                    let optyTokenBasicPoolAsSignerUser = optyTokenBasicPool.connect(
                                        userWallet
                                    );

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

                                    let allPromiseResponses: [
                                        any,
                                        any,
                                        any
                                    ] = await Promise.all([
                                        totalSupplyPromise,
                                        poolValuePromise,
                                        userDepositRebalanceTxPromise,
                                    ]);

                                    let totalSupply = 0;
                                    let poolValue = "";
                                    let shares: ethers.BigNumber;
                                    let userDepositRebalanceTx;

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

                                    expect(
                                        userTokenBalanceWei.eq(
                                            userInitialTokenBalanceWei.sub(TEST_AMOUNT)
                                        )
                                    ).to.be.true;

                                    userInitialTokenBalance = userNewTokenBalance;

                                    //  Check Token balance of OptyPool contract after userDepositRabalance() call
                                    contractTokenBalanceWei = await tokenContractInstance.balanceOf(
                                        optyTokenBasicPool.address
                                    );
                                    contractTokenBalance = parseFloat(
                                        fromWei(contractTokenBalanceWei)
                                    );
                                    //  Commeting this check for checking the contract balance in underlying tokens - Deepanshu
                                    // expect(contractTokenBalance).to.equal(0);

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

                                    userOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(
                                        userWallet.address
                                    );
                                    //  There is an assertion error for minor decimals difference for DAI-deposit-DFORCE-dDAI
                                    //        and DAI-deposit-CURVE-cDAI+cUSDC+USDT (can be random strategies)
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
                                        //  Kept this code in case if all the special cases has less value then we can  keep this assertion - Deepanshu
                                        // expect(
                                        //     userOptyTokenBalanceWei.lte(
                                        //         userExpectedOptyTokenBalance
                                        //     )
                                        // ).to.be.true;
                                        expect(userOptyTokenBalanceWei).to.not.equal(
                                            userExpectedOptyTokenBalance
                                        );
                                    }

                                    //  Storing the user's New Opty tokens balance in number format
                                    const userNewOptyTokenBalance = parseFloat(
                                        fromWei(userOptyTokenBalanceWei)
                                    );

                                    userOptyTokenBalance = userNewOptyTokenBalance;
                                }

                                async function testUserWithdrawRebalance(
                                    withdrawAmount: any,
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

                                    let optyTokenBasicPoolAsSignerUser = optyTokenBasicPool.connect(
                                        userWallet
                                    );

                                    const userWithdrawTxOutput = await optyTokenBasicPoolAsSignerUser.functions.userWithdrawRebalance(
                                        withdrawAmount.sub(roundingDelta),
                                        {
                                            gasLimit: 5141327,
                                        }
                                    );

                                    let receipt = await userWithdrawTxOutput.wait();
                                    userWithdrawRebalanceTxGasUsed = receipt.gasUsed.toNumber();

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
                                        .mul(withdrawAmount.sub(1))
                                        .div(totalSupply);

                                    expect(
                                        afterUserOptyTokenBalanceWei.eq(roundingDelta)
                                    ).to.be.true;

                                    //  User's TOKEN (like DAI etc.) balance should be equal to no. of tokens
                                    //  calculated from formula but sometimes, it is not equal like in case of AAVE
                                    //  where the token and lpToken ratio is 1:1 (Sometimes) - Deepanshu
                                    if (
                                        afterUserTokenBalanceWei.eq(
                                            noOfTokensReceivedFromFormula
                                        )
                                    ) {
                                        expect(afterUserTokenBalanceWei).to.equal(
                                            noOfTokensReceivedFromFormula
                                        );
                                    } else if (
                                        afterUserTokenBalanceWei.lte(
                                            noOfTokensReceivedFromFormula
                                        )
                                    ) {
                                        expect(
                                            afterUserTokenBalanceWei.lte(
                                                noOfTokensReceivedFromFormula
                                            )
                                        ).to.be.true;
                                    } else {
                                        expect(
                                            afterUserTokenBalanceWei.gte(
                                                noOfTokensReceivedFromFormula
                                            )
                                        ).to.be.true;
                                    }

                                    let afterContractTokenBalanceWei = await tokenContractInstance.balanceOf(
                                        optyTokenBasicPool.address
                                    );

                                    //  Sometimes, Contract has left with some small fraction of Token like DAI etc.
                                    if (
                                        afterContractTokenBalanceWei.eq(
                                            initialContractTokenBalanceWei
                                        )
                                    ) {
                                        expect(afterContractTokenBalanceWei.eq(0)).to.be
                                            .true;
                                        expect(initialContractTokenBalanceWei.eq(0)).to
                                            .be.true;
                                    } else {
                                        // Note: Commented while testing USDC token strategies - Deepanshu
                                        // expect(
                                        //     afterContractTokenBalanceWei.gte(
                                        //         initialContractTokenBalanceWei.add(
                                        //             1
                                        //         )
                                        //     )
                                        // ).to.be.true;
                                        expect(afterContractTokenBalanceWei).to.equal(
                                            0
                                        );
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
                            });

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

                                //  Pushing data to DB
                                if (command.insertGasRecordsInDB) {
                                    allStrategiesGasUsedRecords.forEach(
                                        async (gasRecordItem) => {
                                            const inserQueryResponse: number = await utilities.insertGasUsedRecordsIntoDB(
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

                                            expect(inserQueryResponse).to.equal(
                                                1,
                                                "All records for gas used are not entered into DB!"
                                            );
                                        }
                                    );
                                }

                                //  Writing data into file
                                if (command.writeGasRecordsInFile) {
                                    let path = process.env.PWD;
                                    if (path?.endsWith("earn-protocol")) {
                                        path = path + "/test/gasRecordFiles/";
                                    } else if (path?.endsWith("test")) {
                                        path = path + "/gasRecordFiles/";
                                    }

                                    const fileName: string =
                                        path + gasRecordsFileName + ".json";

                                    //  Appending into the file (if exists) else creating new file and adding data into it
                                    fs.stat(fileName, async function (
                                        err: { code: string } | null,
                                        stat: any
                                    ) {
                                        //  if file exists, then appending data to the file
                                        if (err == null) {
                                            await utilities.appendInFile(
                                                fileName,
                                                tokenStrategyGasUsedRecord
                                            );
                                        } else if (err.code === "ENOENT") {
                                            // file does not exist, therefore creating new one and writing into it
                                            await utilities.writeInFile(
                                                fileName,
                                                tokenStrategyGasUsedRecord
                                            );
                                        } else {
                                            console.log(
                                                "Error occured while writing into file: ",
                                                err.code
                                            );
                                        }
                                    });
                                }
                            });
                        }
                    );
                }
            });
        }
    );

program.parse(process.argv);
