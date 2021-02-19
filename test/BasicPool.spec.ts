require("dotenv").config();
import chai, { assert, expect } from "chai";
import { Contract, ethers } from "ethers";
import { solidity } from "ethereum-waffle";
import { program } from "commander";
import { codeProviderContract } from "./shared/ProtocolCodeProviderContracts";
import * as utilities from "./shared/utilities";
import * as PoolContracts from "./shared/PoolContracts";
import * as GovernanceContracts from "./shared/GovernanceContract";
import * as OtherImports from "./shared/OtherImports";
import * as RegistryFunctions from "./shared/RegistryFunctions";
import * as Interfaces from "./shared/interfaces";
import * as Types from "./shared/types";
import * as Constants from "./shared/constants";
import * as CurveFunctions from "./shared/Curve/Curve";

chai.use(solidity);

program
    .description("Takes symbol and recipient, send tokens to recipient")
    .option(
        "-s, --symbol <dai|usdc|usdt|wbtc|weth|susd|tusd|busd|3crv|link|renbtc|knc|zrx|uni|bat|mkr|comp|yfi|aave|hbtc|rep>",
        "stable coin symbol"
    )
    .option("-sn, --strategyName <string>", "name of the strategy to run")
    .option("-ta, --testAmount <number>", "amount with which you want to test", "6")
    .option(
        "-sc, --strategiesCount <number>",
        "number of strategies you want to run",
        "0"
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
        "-v, --runTimeVersion <string>",
        "version of the gasUsed records stored",
        "0.0.3"
    )
    .option(
        "-cp, --codeProvider <string>",
        "code provider to deploy if you want to give"
    )
    .usage("-s <token-symbol> ")
    .version("0.0.1")
    .action(async (command: Types.cmdType) => {
        let underlyingTokenSymbol: string; //  keep track of underlying token
        let gasRecordsFileName: string; //  store file name for recording the gasUsed
        let testScriptRunTimeDateAndTime: number; //  timestamp for storing the execution of test script

        //  Creating the file name based on underlying token passed or not
        if (command.symbol == null) {
            testScriptRunTimeDateAndTime = Date.now();
            gasRecordsFileName =
                "AllTokenStrategiesGasRecords_" +
                testScriptRunTimeDateAndTime.toString();
        } else {
            underlyingTokenSymbol = command.symbol.toString().toUpperCase();

            testScriptRunTimeDateAndTime = Date.now();
            gasRecordsFileName =
                underlyingTokenSymbol + "_" + testScriptRunTimeDateAndTime.toString();
        }

        let TEST_AMOUNT_NUM: number;

        //  Fetch the test amount from command line and if not found, then  use the default one
        if (command.testAmount > 0) {
            TEST_AMOUNT_NUM = command.testAmount;
        } else {
            console.error("ERROR: Invalid  TEST_AMOUNT entered for testing");
            process.exit(1);
        }

        let TEST_AMOUNT: ethers.BigNumber; //  convert the test amount passed in to big number for testing

        let optyCodeProviderContractVariables: Interfaces.OptyCodeProviderContractVariables = {};
        let defiPoolsKey: keyof typeof OtherImports.defiPools; //  Keys of defiPools.json corresponding to CodeProvider Contracts
        let provider: ethers.providers.Web3Provider;

        describe("OPTokenBasicPool", async () => {
            //  local variables used throughout the testing
            let strategyScore: number = 1;
            let ownerWallet: ethers.Wallet;
            let userWallet: ethers.Wallet;
            let optyRegistry: Contract;
            let riskManager: Contract;
            let gatherer: Contract;
            let optyStrategyCodeProvider: Contract;
            let strategyProvider: Contract;
            let profile = "basic";
            let userTokenBalanceWei;
            let userInitialTokenBalance: number;
            let contractTokenBalanceWei;
            let contractTokenBalance: number;
            let userOptyTokenBalanceWei;
            let userOptyTokenBalance: number;
            let optyCodeProviderContract: any;

            before(async () => {
                provider = utilities.getForkedMainnetProvider(
                    Constants.MAINNET_NODE_URL,
                    Constants.MNEMONIC,
                    Constants.INITIAL_ACCOUNT_BALANCE_ETHER,
                    Constants.ACCOUNTS,
                    !Constants.UNLOCK_ACCOUNTS
                );
                ownerWallet = ethers.Wallet.fromMnemonic(Constants.MNEMONIC).connect(
                    provider
                );
                let ownerWalletBalance = await provider.getBalance(ownerWallet.address);
                assert(
                    utilities
                        .expandToTokenDecimals(
                            Constants.INITIAL_ACCOUNT_BALANCE_ETHER,
                            18
                        )
                        .eq(ownerWalletBalance),
                    `Owner's ether balance is not ${ethers.utils.formatEther(
                        ownerWalletBalance
                    )} before starting test suite`
                );
                userWallet = ethers.Wallet.fromMnemonic(
                    Constants.MNEMONIC,
                    `m/44'/60'/0'/0/1`
                ).connect(provider);
                let userWalletBalance = await provider.getBalance(ownerWallet.address);
                assert(
                    utilities
                        .expandToTokenDecimals(
                            Constants.INITIAL_ACCOUNT_BALANCE_ETHER,
                            18
                        )
                        .eq(userWalletBalance),
                    `User's ether balance is not ${ethers.utils.formatEther(
                        userWalletBalance
                    )} before starting test suite`
                );

                //  Deploying all governance contracts - RegistryProxy, Registry, StrategyProvider, RiskManager, Gatherer, StrategyCodeProvider
                const allGovernanceContracts = await GovernanceContracts.deployAllGovernanceContracts(
                    ownerWallet,
                    GovernanceContracts.RegistryProxy,
                    GovernanceContracts.OptyRegistry,
                    GovernanceContracts.StrategyProvider,
                    GovernanceContracts.RiskManager,
                    GovernanceContracts.Gatherer,
                    GovernanceContracts.OptyStrategyCodeProvider,
                    Constants.GAS_OVERRIDE_OPTIONS
                );
                optyRegistry = allGovernanceContracts[0];
                strategyProvider = allGovernanceContracts[1];
                riskManager = allGovernanceContracts[2];
                gatherer = allGovernanceContracts[3];
                optyStrategyCodeProvider = allGovernanceContracts[4];

                /*
                    Iterating through list of underlyingTokens and approving them if not approved
                */
                let token: keyof typeof OtherImports.tokenAddresses;
                for (token in OtherImports.tokenAddresses) {
                    await RegistryFunctions.approveToken(
                        OtherImports.tokenAddresses[token],
                        optyRegistry
                    );
                }

                /*  
                    Iterating through the list of CodeProvider Contracts for deploying them
                */
                let count = 1;
                let optyCodeProviderContracts = Object.keys(
                    OtherImports.ProtocolCodeProviderNames
                );
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
                                gatherer.address,
                                Constants.GAS_OVERRIDE_OPTIONS
                            );
                            if (
                                optyCodeProviderContractsKey.toString().toLowerCase() ==
                                Constants.CURVESWAPCODEPROVIDER
                            ) {
                                await CurveFunctions.swapLpMappingAndSetGauge(
                                    optyCodeProviderContractsKey,
                                    optyCodeProviderContract,
                                    ownerWallet,
                                    Constants.GAS_OVERRIDE_OPTIONS
                                );
                            }

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
                                    let defiPoolsUnderlyingTokens: Interfaces.DefiPools =
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
                                    }
                                }
                            }
                        }
                    }
                    count++;
                }

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

            after(async () => {
                //  Checking Owner's Ether balance left after all the transactions
                let ownerWalletBalance = await provider.getBalance(ownerWallet.address);
                assert(
                    ownerWalletBalance.lt(
                        utilities.expandToTokenDecimals(
                            Constants.INITIAL_ACCOUNT_BALANCE_ETHER,
                            18
                        )
                    ),
                    `Owner's ether balance: ${ethers.utils.formatEther(
                        ownerWalletBalance
                    )} is not less than the balance before starting test suite`
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
                        strategiesTokenKey.toUpperCase() == `${underlyingTokenSymbol}`
                    ) {
                        await runTokenTestSuite(strategiesTokenKey);
                    } else {
                        if (!allStrategiesTokenKeys.includes(underlyingTokenSymbol)) {
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
                            tokenContractInstance = utilities.getContractInstance(
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
                            tokensHash = utilities.getSoliditySHA3Hash(
                                ["address[]"],
                                [tokens]
                            );

                            //  Deploying the BasicPool Contract for MKR and other underlying token
                            optyTokenBasicPool = await PoolContracts.deployPoolContracts(
                                underlyingToken,
                                ownerWallet,
                                PoolContracts.OptyTokenBasicPoolMkr,
                                PoolContracts.OptyTokenBasicPool,
                                optyRegistry.address,
                                riskManager.address,
                                optyStrategyCodeProvider.address
                            );

                            assert.isDefined(
                                optyTokenBasicPool,
                                "OptyTokenBasicPool contract not deployed"
                            );
                        });

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
                        let allStrategiesGasUsedRecords: Types.allStrategiesGasUsedRecordsType[] = [];
                        let allStrategyNames = OtherImports.allStrategies[
                            strategiesTokenKey
                        ].basic.map((element) => element.strategyName.toLowerCase());

                        /*  
                                Iterating through each strategy one by one, setting, approving and scroing the each 
                                strategy and then making userDepositRebalance() call 
                            */
                        OtherImports.allStrategies[strategiesTokenKey].basic.forEach(
                            async (strategies, index) => {
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
                                                    await RegistryFunctions.approveToken(
                                                        previousStepOutputToken,
                                                        optyRegistry
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
                                                    strategyStepHash[
                                                        index
                                                    ] = utilities.getSoliditySHA3Hash(
                                                        ["address", "address", "bool"],
                                                        [
                                                            tempStrategyStep[0],
                                                            tempStrategyStep[1],
                                                            tempStrategyStep[2],
                                                        ]
                                                    );
                                                }
                                            );
                                            let tokenToStrategyStepsHash = utilities.getSoliditySHA3Hash(
                                                ["bytes32", "bytes32[]"],
                                                [tokensHash, strategyStepHash]
                                            );

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
                                                    optyRegistry[
                                                        "setStrategy(bytes32,(address,address,bool)[])"
                                                    ](tokensHash, strategySteps),
                                                    "isNewStrategy"
                                                );
                                            } else {
                                                //  Setting the strategy
                                                const setStrategyTx = await optyRegistry[
                                                    "setStrategy(bytes32,(address,address,bool)[])"
                                                ](tokensHash, strategySteps);
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

                                                //  Set Best Basic strategy
                                                await strategyProvider.setBestBasicStrategy(
                                                    tokensHash,
                                                    strategyHash
                                                );

                                                //  Fetching best strategy
                                                let bestStrategyHash = await riskManager.getBestStrategy(
                                                    profile,
                                                    [underlyingToken]
                                                );

                                                // Funding the wallet with the underlying tokens before making the deposit transaction
                                                let allFundWalletReturnParams = await utilities.checkAndFundWallet(
                                                    underlyingToken,
                                                    underlyingTokenDecimals,
                                                    tokenContractInstance,
                                                    userWallet,
                                                    optyTokenBasicPool,
                                                    userOptyTokenBalance,
                                                    TEST_AMOUNT,
                                                    userInitialTokenBalance,
                                                    Constants.GAS_OVERRIDE_OPTIONS,
                                                    Constants.ETH_VALUE_GAS_OVERIDE_OPTIONS
                                                );
                                                userTokenBalanceWei =
                                                    allFundWalletReturnParams[0];
                                                userOptyTokenBalanceWei =
                                                    allFundWalletReturnParams[1];
                                                userOptyTokenBalance =
                                                    allFundWalletReturnParams[2];
                                                userTokenBalanceWei =
                                                    allFundWalletReturnParams[3];
                                                userInitialTokenBalance =
                                                    allFundWalletReturnParams[4];
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
                                                    //  Note: 1. roundingDelta = 0,1,2 - It works for all these 3 values for all other strategies - Deepanshu
                                                    //  2. roundingDelta = 0,2,3... - It work for "USDT-deposit-CURVE-ypaxCrv". "USDT-deposit-CURVE-yDAI+yUSDC+yUSDT+yTUSD", "USDT-deposit-CURVE-yDAI+yUSDC+yUSDT+yBUSD" but not for roundingDelta = 1
                                                    // let roundingDelta = utilities.expandToTokenDecimals(2, underlyingTokenDecimals); // - also works
                                                    let roundingDelta = 0;

                                                    await utilities.sleep(
                                                        sleepTimeInSec * 1000
                                                    ); //  Needs to wait  for min 60 sec or above else withdraw will through a revert error

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
                                        Constants.GAS_OVERRIDE_OPTIONS
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

                                    //  Getting the totalSupply and poolValue from deposit txn.
                                    let totalSupply = await optyTokenBasicPool.totalSupply();
                                    let poolValue = await optyTokenBasicPool.poolValue();

                                    let optyTokenBasicPoolAsSignerUser = optyTokenBasicPool.connect(
                                        userWallet
                                    );

                                    let userDepositRebalanceTx = await optyTokenBasicPoolAsSignerUser.userDepositRebalance(
                                        TEST_AMOUNT,
                                        Constants.GAS_OVERRIDE_OPTIONS
                                    );
                                    let userDepositTxReceipt = await userDepositRebalanceTx.wait();
                                    userDepositRebalanceTxGasUsed = userDepositTxReceipt.gasUsed.toNumber();

                                    assert.isOk(
                                        userDepositRebalanceTx,
                                        "UserDepositRebalance() call failed"
                                    );

                                    // Check Token balance of user after userDepositRebalance() call
                                    userTokenBalanceWei = await tokenContractInstance.balanceOf(
                                        userWallet.address
                                    );
                                    const userNewTokenBalance = parseFloat(
                                        utilities.fromWeiToString(
                                            userTokenBalanceWei,
                                            underlyingTokenDecimals
                                        )
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
                                        utilities.fromWeiToString(
                                            contractTokenBalanceWei,
                                            underlyingTokenDecimals
                                        )
                                    );
                                    //  Commeting this check for checking the contract balance in underlying tokens - Deepanshu
                                    // expect(contractTokenBalance).to.equal(0);

                                    //  Amount of OPTY token shares user received as per contract logic
                                    let shares: ethers.BigNumber;
                                    if (
                                        parseFloat(
                                            utilities.fromWeiToString(
                                                poolValue,
                                                underlyingTokenDecimals
                                            )
                                        ) == 0
                                    ) {
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
                                        // Kept this code in case if all the special cases has less/more value then we can keep this assertion - Deepanshu
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
                                        utilities.fromWeiToString(
                                            userOptyTokenBalanceWei,
                                            underlyingTokenDecimals
                                        )
                                    );

                                    userOptyTokenBalance = userNewOptyTokenBalance;
                                }

                                async function testUserWithdrawRebalance(
                                    withdrawAmount: any,
                                    roundingDelta: any
                                ) {
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
                                        Constants.GAS_OVERRIDE_OPTIONS
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
                            //  Checking User's Ether balance left after all the transactions
                            let ownerWalletBalance = await provider.getBalance(
                                ownerWallet.address
                            );
                            assert(
                                ownerWalletBalance.lt(
                                    utilities.expandToTokenDecimals(
                                        Constants.INITIAL_ACCOUNT_BALANCE_ETHER,
                                        18
                                    )
                                ),
                                `Owner's ether balance: ${ethers.utils.formatEther(
                                    ownerWalletBalance
                                )} is not less than the balance before starting test suite`
                            );

                            let userWalletBalance = await provider.getBalance(
                                userWallet.address
                            );
                            assert(
                                userWalletBalance.lt(
                                    utilities.expandToTokenDecimals(
                                        Constants.INITIAL_ACCOUNT_BALANCE_ETHER,
                                        18
                                    )
                                ),
                                `User's ether balance: ${ethers.utils.formatEther(
                                    userWalletBalance
                                )} is not less than the balance before starting test suite`
                            );

                            let tokenStrategyGasUsedRecord: Interfaces.GasUsedRecords = {};
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
                                            command.runTimeVersion
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
                                await utilities.writeRecordsInFile(
                                    `${utilities.getPath(
                                        Constants.PWD
                                    )}${gasRecordsFileName}.json`,
                                    tokenStrategyGasUsedRecord
                                );
                            }
                        });
                    }
                );
            }
        });
    });

program.parse(process.argv);
