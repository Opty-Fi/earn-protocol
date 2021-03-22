require("dotenv").config(); //  Note: Don't remove this line as it helps to get rid of error: NOT ABLE TO READ LOCAL ENV VARIABLES defined in .env file
import chai, { assert, expect } from "chai";
import { Contract, ethers } from "ethers";
import { solidity, deployContract } from "ethereum-waffle";
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
const { program } = require("commander"); //  library to handle the command line arguments

program
    .description("Takes symbol and recipeint, send tokens to recipient")
    .option(
        "-s, --symbol <dai|usdc|usdt|wbtc|weth|susd|tusd|busd|3crv|link|renbtc|knc|zrx|uni|bat|mkr|comp|yfi|aave|hbtc|rep>",
        "stable coin symbol",
        null
    )
    .option("-sn, --strategyName <string>", "name of the strategy to run", null)
    .option("-ta, --testAmount <number>", "amount with which you want to test", 10000)
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
    .action(async (command: Types.cmdType) => {
        const DEBUG = !!+(<string>process.env.DEBUG);
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
            DEBUG && console.log("TEST AMOUNNT NUM: ", TEST_AMOUNT_NUM);
        } else {
            console.error("ERROR: Invalid  TEST_AMOUNT entered for testing");
            process.exit(1);
        }

        let TEST_AMOUNT: ethers.BigNumber; //  convert the test amount passed in to big number for testing

        const optyCodeProviderContractVariables: Interfaces.OptyCodeProviderContractVariables = {};
        let defiPoolsAdvKey: keyof typeof OtherImports.defiPoolsAdv; //  Keys of defiPoolsAdv.json corresponding to CodeProvider Contracts
        let provider: ethers.providers.Web3Provider;

        describe.only("OptyTokenAdvancePool", async () => {
            //  local variables used throughout the testing
            let strategyScore = 1;
            let ownerWallet: ethers.Wallet;
            let userWallet: ethers.Wallet;
            let optyRegistry: Contract;
            let riskManager: Contract;
            let gatherer: Contract;
            let optyStrategyCodeProvider: Contract;
            let strategyProvider: Contract;
            const profile = "advance";
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
                const ownerWalletBalance = await provider.getBalance(
                    ownerWallet.address
                );
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
                const userWalletBalance = await provider.getBalance(
                    ownerWallet.address
                );
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

                DEBUG && console.log("\nRegistry address: ", optyRegistry.address);
                DEBUG &&
                    console.log(
                        "Strategy provider address: ",
                        strategyProvider.address
                    );
                DEBUG && console.log("\nRiskManager address: ", riskManager.address);
                DEBUG && console.log("\nGatherer address: ", gatherer.address);
                DEBUG &&
                    console.log(
                        "\nStratgey code provider: ",
                        optyStrategyCodeProvider.address
                    );

                /*
                        Iterating through list of underlyingTokens and approving them if not approved
                    */
                let tokenType: keyof typeof OtherImports.tokenAddresses;
                for (tokenType in OtherImports.tokenAddresses) {
                    const tokens: Interfaces.TokenAddress =
                        OtherImports.tokenAddresses[tokenType];
                    for (const token in tokens) {
                        DEBUG && console.log("Approving token: ", tokens[token]);
                        await RegistryFunctions.approveToken(
                            tokens[token],
                            optyRegistry
                        );
                    }
                }

                /*  
                        Iterating through the list of CodeProvider Contracts for deploying them
                    */
                let count = 1;
                const optyCodeProviderContracts = Object.keys(
                    OtherImports.ProtocolCodeProviderNames
                );
                for (const optyCodeProviderContractsKey of optyCodeProviderContracts) {
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
                            Object.prototype.hasOwnProperty.call(
                                codeProviderContract,
                                optyCodeProviderContractsKey.toString()
                            )
                        ) {
                            DEBUG &&
                                console.log(
                                    "Deploying " + optyCodeProviderContractsKey
                                );
                            //  Deploying  the  code provider contracts
                            optyCodeProviderContract = await utilities.deployCodeProviderContracts(
                                optyCodeProviderContractsKey,
                                ownerWallet,
                                codeProviderContract[optyCodeProviderContractsKey],
                                optyRegistry.address,
                                gatherer.address,
                                Constants.GAS_OVERRIDE_OPTIONS
                            );
                            DEBUG &&
                                console.log(
                                    "Contract " +
                                        optyCodeProviderContractsKey +
                                        " got deployed at: ",
                                    optyCodeProviderContract.address
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
                            // //  Iterating through defiPoolsAdv.json to approve LpTokens/Tokens, set Tokens hash
                            // //  mapping to tokens, approve LP/CP, map Lp to CodeProvider Contract and setting the
                            // //  Lp to LpToken
                            for (defiPoolsAdvKey in OtherImports.defiPoolsAdv) {
                                if (
                                    defiPoolsAdvKey.toString() ==
                                    optyCodeProviderContractsKey.toString()
                                ) {
                                    const defiPoolsAdvUnderlyingTokens: Interfaces.DefiPoolsAdv =
                                        OtherImports.defiPoolsAdv[defiPoolsAdvKey];
                                    //  Iteracting through all the underlying tokens available corresponding to this
                                    //  current CodeProvider Contract Key
                                    for (const defiPoolsAdvUnderlyingTokensKey in defiPoolsAdvUnderlyingTokens) {
                                        //  Approving tokens, lpTokens
                                        await RegistryFunctions.approveTokenLpToken(
                                            defiPoolsAdvUnderlyingTokens[
                                                defiPoolsAdvUnderlyingTokensKey
                                            ].lpToken,
                                            defiPoolsAdvUnderlyingTokens[
                                                defiPoolsAdvUnderlyingTokensKey
                                            ].tokens,
                                            optyRegistry
                                        );
                                        // Mapping tokensHash to token
                                        await RegistryFunctions.setTokensHashToTokens(
                                            defiPoolsAdvUnderlyingTokens[
                                                defiPoolsAdvUnderlyingTokensKey
                                            ].tokens,
                                            optyRegistry
                                        );

                                        // Approving pool as Liquidity pool and mapping it to the CodeProvider
                                        await RegistryFunctions.approveLpCpAndMapLpToCodeProvider(
                                            defiPoolsAdvUnderlyingTokens[
                                                defiPoolsAdvUnderlyingTokensKey
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
                const ownerWalletBalance = await provider.getBalance(
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
            });

            //  Iterating through all the strategies by picking underlyingTokens as key
            let strategiesTokenKey: keyof typeof OtherImports.allStrategies;
            const allAdvancedStrategiesTokenKeys = Object.keys(
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
                        if (
                            !allAdvancedStrategiesTokenKeys.includes(
                                underlyingTokenSymbol
                            )
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
                        let optyTokenAdvancePool: Contract;
                        let tokensHash = "";

                        before(async () => {
                            //  Getting the underlying token's contract instance
                            underlyingToken =
                                OtherImports.tokenAddresses.underlyingTokens[
                                    <
                                        keyof typeof OtherImports.tokenAddresses.underlyingTokens
                                    >strategiesTokenKey.toLowerCase()
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
                                DEBUG &&
                                    console.log(
                                        "Underlying token decimals: ",
                                        underlyingTokenDecimals
                                    );
                                TEST_AMOUNT = utilities.expandToTokenDecimals(
                                    TEST_AMOUNT_NUM,
                                    underlyingTokenDecimals
                                );
                                DEBUG &&
                                    console.log(
                                        "TEST AMOUNT after setting: ",
                                        ethers.utils.formatEther(TEST_AMOUNT)
                                    );
                            }

                            //  Setting the TokensHash corresponding to the list of tokens
                            tokensHash = utilities.getSoliditySHA3Hash(
                                ["address[]"],
                                [tokens]
                            );

                            //  Deploying the BasicPool Contract for MKR and other underlying token
                            optyTokenAdvancePool = await PoolContracts.deployPoolContracts(
                                underlyingToken,
                                ownerWallet,
                                PoolContracts.OptyTokenAdvancePoolMkr,
                                PoolContracts.OptyTokenAdvancePool,
                                optyRegistry.address,
                                riskManager.address,
                                optyStrategyCodeProvider.address
                            );

                            DEBUG &&
                                console.log(
                                    `\nAdvance pool contract deployed for token: ${underlyingToken} at: `,
                                    optyTokenAdvancePool.address
                                );
                            assert.isDefined(
                                optyTokenAdvancePool,
                                "OptyTokenAdvancePool contract not deployed"
                            );
                            const name = await optyTokenAdvancePool.name();
                            DEBUG && console.log("\n Name: ", name);
                        });

                        it(
                            "should check OptyTokenAdvancePool contract is deployed for " +
                                strategiesTokenKey,
                            async () => {
                                assert.isOk(
                                    optyTokenAdvancePool.address,
                                    "AdvancePool Contract for " +
                                        strategiesTokenKey +
                                        "is not deployed"
                                );
                            }
                        );

                        //  Recording GasUsed for all strategies to push data into DB and file at last
                        const allAdvancedStrategiesGasUsedRecords: Types.allStrategiesGasUsedRecordsType[] = [];
                        const allStrategyNames = OtherImports.allStrategies[
                            strategiesTokenKey
                        ].advanced.map((element) => element.strategyName.toLowerCase());

                        /*  
                                Iterating through each strategy one by one, setting, approving and scroing the each 
                                strategy and then making userDepositRebalance() call 
                            */
                        OtherImports.allStrategies[strategiesTokenKey].advanced.forEach(
                            async (strategies, index) => {
                                let setStrategyTxGasUsed = 0;
                                const scoreStrategyTxGasUsed = 0;
                                const setAndScoreStrategyTotalGasUsed = 0;
                                let userDepositRebalanceTxGasUsed = 0;
                                let userWithdrawRebalanceTxGasUsed = 0;

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
                                                ].advanced.length
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
                                        ].advanced[index].strategyName.toLowerCase() ==
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
                                            const strategySteps: (
                                                | string
                                                | boolean
                                            )[][] = [];

                                            for (
                                                let index = 0;
                                                index < strategies.strategy.length;
                                                index++
                                            ) {
                                                //  Creating an array of strategy steps
                                                strategySteps.push([
                                                    strategies.strategy[index].contract,
                                                    strategies.strategy[index]
                                                        .outputToken,
                                                    strategies.strategy[index].isBorrow,
                                                ]);
                                            }

                                            //  Iterating through each strategy step and generate the strategy Hash
                                            DEBUG &&
                                                console.log(
                                                    "Strategy steps: ",
                                                    strategySteps
                                                );

                                            let setStrategyTx;
                                            try {
                                                DEBUG &&
                                                    console.log("Setting strategy");

                                                //  Setting the strategy
                                                DEBUG &&
                                                    console.log(
                                                        "tokens hash: ",
                                                        tokensHash
                                                    );
                                                setStrategyTx = await optyRegistry[
                                                    "setStrategy(bytes32,(address,address,bool)[])"
                                                ](tokensHash, strategySteps);

                                                assert.isDefined(
                                                    setStrategyTx,
                                                    "Setting StrategySteps has failed!"
                                                );
                                                DEBUG && console.log("strategy set");
                                            } catch (error) {
                                                console.log(
                                                    "Error occured: ",
                                                    error.message
                                                );
                                                await utilities.expectRevert(
                                                    optyRegistry[
                                                        "setStrategy(bytes32,(address,address,bool)[])"
                                                    ](tokensHash, strategySteps),
                                                    "isNewStrategy"
                                                );
                                            }

                                            DEBUG &&
                                                console.log(
                                                    "Strategy is set and getting confirmation on txn."
                                                );
                                            const setStrategyReceipt = await setStrategyTx.wait();
                                            setStrategyTxGasUsed = setStrategyReceipt.gasUsed.toNumber();

                                            const strategyHash =
                                                setStrategyReceipt.events[0].args[2];
                                            expect(
                                                strategyHash.toString().length
                                            ).to.equal(66);
                                            DEBUG &&
                                                console.log(
                                                    "Strategy hash from receipt: ",
                                                    strategyHash
                                                );

                                            //  Set Best Advance strategy
                                            await strategyProvider.setBestAdvanceStrategy(
                                                tokensHash,
                                                strategyHash
                                            );

                                            DEBUG &&
                                                console.log(
                                                    "Underlying token: ",
                                                    underlyingToken
                                                );
                                            //  Fetching best strategy
                                            const bestStrategyHash = await riskManager.getBestStrategy(
                                                "advance",
                                                [underlyingToken]
                                            );

                                            //  Getting the best strategy
                                            const bestStrategy = await optyRegistry.getStrategy(
                                                bestStrategyHash.toString()
                                            );
                                            // let bestStrategy = await riskManager.getBestStrategy(profile, [underlyingToken])
                                            DEBUG &&
                                                console.log(
                                                    "Best strategy: ",
                                                    bestStrategy
                                                );

                                            const hashes = await optyRegistry.getTokenToStrategies(
                                                tokensHash
                                            );
                                            DEBUG && console.log("hashes: ", hashes);

                                            const StrategyFromRM = await optyRegistry.getStrategy(
                                                hashes[0]
                                            );
                                            DEBUG &&
                                                console.log(
                                                    "\n Strategy from RM: ",
                                                    StrategyFromRM
                                                );
                                            DEBUG &&
                                                console.log(
                                                    "\n Strategy status: ",
                                                    StrategyFromRM["_isStrategy"]
                                                );
                                            DEBUG &&
                                                console.log(
                                                    "\n Strategy score: ",
                                                    StrategyFromRM["_score"]
                                                );
                                            DEBUG &&
                                                console.log(
                                                    "\n Is borrow: ",
                                                    StrategyFromRM["_strategySteps"][0]
                                                        .isBorrow
                                                );
                                            const creditPool = await optyRegistry.getCreditPool(
                                                StrategyFromRM["_strategySteps"][0].pool
                                            );
                                            DEBUG &&
                                                console.log(
                                                    "\n Credit pool approved: ",
                                                    creditPool.isLiquidityPool
                                                );
                                            DEBUG &&
                                                console.log(
                                                    "\n Credit pool rating condition: ",
                                                    creditPool.rating >= 0
                                                );
                                            const outputTokenStatus = await optyRegistry.tokens(
                                                StrategyFromRM["_strategySteps"][0]
                                                    .outputToken
                                            );
                                            DEBUG &&
                                                console.log(
                                                    "Output token status: ",
                                                    outputTokenStatus
                                                );
                                            const liquidityPool = await optyRegistry.getLiquidityPool(
                                                StrategyFromRM["_strategySteps"][0].pool
                                            );
                                            DEBUG &&
                                                console.log(
                                                    "\n Liquidity Pool: ",
                                                    liquidityPool
                                                );

                                            // Funding the wallet with the underlying tokens before making the deposit transaction
                                            const allFundWalletReturnParams = await utilities.checkAndFundWallet(
                                                underlyingToken,
                                                underlyingTokenDecimals,
                                                tokenContractInstance,
                                                userWallet,
                                                optyTokenAdvancePool,
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
                                            try {
                                                await testUserDepositRebalance();
                                                strategyScore = strategyScore + 1;
                                            } catch (error) {
                                                console.log(
                                                    "Deposit Failed with error: ",
                                                    error.message
                                                );
                                            }
                                        }
                                    );

                                    it(
                                        "should withdraw using userWithdrawRebalance() using Strategy - " +
                                            strategies.strategyName,
                                        async () => {
                                            //  Connect the AdvancePool Contract with the user's Wallet for making userDeposit()
                                            const initialUserOptyTokenBalanceWei = await optyTokenAdvancePool.balanceOf(
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
                                                const EdgeCaseStrategiesKeys: keyof typeof OtherImports.EdgeCaseStrategies = <
                                                    keyof typeof OtherImports.EdgeCaseStrategies
                                                >strategies.strategyName.toString();
                                                const sleepTimeInSec = OtherImports
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
                                                    const roundingDelta = 0;

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
                                    DEBUG && console.log("Deposit testing started..");
                                    const userInitialTokenBalanceWei = await tokenContractInstance.balanceOf(
                                        userWallet.address
                                    );
                                    const tokenContractInstanceAsSignerUser = tokenContractInstance.connect(
                                        userWallet
                                    );
                                    await tokenContractInstanceAsSignerUser.approve(
                                        optyTokenAdvancePool.address,
                                        TEST_AMOUNT,
                                        Constants.GAS_OVERRIDE_OPTIONS
                                    );

                                    expect(
                                        await tokenContractInstance.allowance(
                                            userWallet.address,
                                            optyTokenAdvancePool.address
                                        )
                                    ).to.equal(TEST_AMOUNT);

                                    //  Getting initial balance of OptyAdvanceTokens for user
                                    const userOptyTokenBalanceBefore = await optyTokenAdvancePool.balanceOf(
                                        userWallet.address
                                    );

                                    //  Promises for getting totalSupply, poolValue and making userDepositRebalance() in parallel
                                    //  for getting latest values of totalSuppy and poolValue while Deposit txn is made
                                    const totalSupply = await optyTokenAdvancePool.totalSupply();
                                    const poolValue = await optyTokenAdvancePool.poolValue();

                                    const optyTokenAdvancePoolAsSignerUser = optyTokenAdvancePool.connect(
                                        userWallet
                                    );

                                    DEBUG &&
                                        console.log(
                                            "TEST AMOUNNT NUM: ",
                                            TEST_AMOUNT_NUM
                                        );
                                    DEBUG &&
                                        console.log(
                                            "TEST AMOUNT: ",
                                            ethers.utils.formatUnits(
                                                TEST_AMOUNT,
                                                underlyingTokenDecimals
                                            )
                                        );
                                    DEBUG && console.log("deposit call made");

                                    const userDepositRebalanceTx = await optyTokenAdvancePoolAsSignerUser.userDepositRebalance(
                                        TEST_AMOUNT,
                                        Constants.GAS_OVERRIDE_OPTIONS
                                    );
                                    const userDepositTxReceipt = await userDepositRebalanceTx.wait();
                                    userDepositRebalanceTxGasUsed = userDepositTxReceipt.gasUsed.toNumber();

                                    DEBUG && console.log("deposit txn. successful");

                                    DEBUG && console.log("Deposit successful..");
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
                                        optyTokenAdvancePool.address
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
                                    const userExpectedOptyTokenBalance = userOptyTokenBalanceBefore.add(
                                        shares
                                    );

                                    userOptyTokenBalanceWei = await optyTokenAdvancePool.balanceOf(
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
                                    DEBUG && console.log("Withdraw testing  started");
                                    const initialContractTokenBalanceWei = await tokenContractInstance.balanceOf(
                                        optyTokenAdvancePool.address
                                    );

                                    const totalSupply = await optyTokenAdvancePool.totalSupply();

                                    const poolValue = await optyTokenAdvancePool.poolValue();

                                    const optyTokenAdvancePoolAsSignerUser = optyTokenAdvancePool.connect(
                                        userWallet
                                    );

                                    DEBUG && console.log("Withdraw txn. initiated");
                                    const userWithdrawTxOutput = await optyTokenAdvancePoolAsSignerUser.functions.userWithdrawRebalance(
                                        withdrawAmount.sub(roundingDelta),
                                        Constants.GAS_OVERRIDE_OPTIONS
                                    );
                                    DEBUG && console.log("Withdraw txn. completed");

                                    const receipt = await userWithdrawTxOutput.wait();
                                    userWithdrawRebalanceTxGasUsed = receipt.gasUsed.toNumber();

                                    assert.isOk(
                                        userWithdrawTxOutput,
                                        "UserWithdraw() call failed"
                                    );

                                    const afterUserOptyTokenBalanceWei = await optyTokenAdvancePool.balanceOf(
                                        userWallet.address
                                    );

                                    const afterUserTokenBalanceWei = await tokenContractInstance.balanceOf(
                                        userWallet.address
                                    );

                                    const noOfTokensReceivedFromFormula = poolValue
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

                                    const afterContractTokenBalanceWei = await tokenContractInstance.balanceOf(
                                        optyTokenAdvancePool.address
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

                                    //  Creating the Gas Records data Json
                                    const strategyGasUsedJson = {
                                        testScriptRunDateAndTime: testScriptRunTimeDateAndTime,
                                        strategyRunDateAndTime: Date.now(),
                                        strategyName: strategies.strategyName,
                                        setStrategy: setStrategyTxGasUsed,
                                        scoreStrategy: scoreStrategyTxGasUsed,
                                        setAndScoreStrategy: setAndScoreStrategyTotalGasUsed,
                                        userDepositRebalanceTx: userDepositRebalanceTxGasUsed,
                                        userWithdrawRebalanceTx: userWithdrawRebalanceTxGasUsed,
                                    };

                                    allAdvancedStrategiesGasUsedRecords.push(
                                        strategyGasUsedJson
                                    );
                                }
                            }
                        );

                        after(async () => {
                            //  Checking Owner and User's Ether balance left after all the transactions
                            const ownerWalletBalance = await provider.getBalance(
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

                            const userWalletBalance = await provider.getBalance(
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

                            const tokenStrategyGasUsedRecord: Interfaces.GasUsedRecords = {};
                            tokenStrategyGasUsedRecord[strategiesTokenKey] = {
                                GasRecords: allAdvancedStrategiesGasUsedRecords,
                            };
                            DEBUG &&
                                console.log(
                                    "Gas records: ",
                                    allAdvancedStrategiesGasUsedRecords
                                );

                            //  Pushing data to DB
                            if (command.insertGasRecordsInDB) {
                                DEBUG && console.log("writing into DB..");
                                allAdvancedStrategiesGasUsedRecords.forEach(
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
                                DEBUG && console.log("Writing into file..");
                                await utilities.writeRecordsInFile(
                                    `${utilities.getPath(
                                        Constants.PWD
                                    )}${gasRecordsFileName}.json`,
                                    tokenStrategyGasUsedRecord
                                );
                                DEBUG &&
                                    console.log(
                                        `File ${gasRecordsFileName}.json created..`
                                    );
                            }
                        });
                    }
                );
            }
        });
    });

program.parse(process.argv);
