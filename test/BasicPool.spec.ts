import chai, { assert, expect } from "chai";
import { Contract, ethers } from "ethers";
import { solidity, deployContract } from "ethereum-waffle";
import * as utilities from "./shared/utilities";
import * as PoolContractAbis from "./shared/PoolContractAbis";
import * as GovernanceContractAbis from "./shared/GovernanceContractAbis";
import * as ProtocolCodeProviderAbis from "./shared/ProtocolCodeProvidersAbi";
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
                CompoundCodeProvider: ProtocolCodeProviderAbis.CompoundCodeProvider,
                AaveV1CodeProvider: ProtocolCodeProviderAbis.AaveV1CodeProvider,
                FulcrumCodeProvider: ProtocolCodeProviderAbis.FulcrumCodeProvider,
                DForceCodeProvider: ProtocolCodeProviderAbis.DForceCodeProvider,
                HarvestCodeProvider: ProtocolCodeProviderAbis.HarvestCodeProvider,
                YVaultCodeProvider: ProtocolCodeProviderAbis.YVaultCodeProvider,
                CurvePoolCodeProvider: ProtocolCodeProviderAbis.CurvePoolCodeProvider,
                CurveSwapCodeProvider: ProtocolCodeProviderAbis.CurveSwapCodeProvider,
                dYdXCodeProvider: ProtocolCodeProviderAbis.dYdXCodeProvider,
                CreamCodeProvider: ProtocolCodeProviderAbis.CreamCodeProvider,
                AaveV2CodeProvider: ProtocolCodeProviderAbis.AaveV2CodeProvider,
                YearnCodeProvider: ProtocolCodeProviderAbis.YearnCodeProvider,
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

                    console.log(
                        "\n" +
                            `------ Deploying Registry, RiskManager, Gatherer and StrategyCodeProvider Contracts` +
                            "\n"
                    );
                    //  Deploying Registry, RiskManager, Gatherer and StrategyCodeProvider Contracts
                    optyRegistry = await deployContract(
                        ownerWallet,
                        GovernanceContractAbis.OptyRegistry,
                        [],
                        {
                            gasLimit: 5141327,
                        }
                    );
                    assert.isDefined(
                        optyRegistry,
                        "OptyRegistry contract not deployed"
                    );
                    console.log("Registry: ", optyRegistry.address);

                    riskManager = await deployContract(
                        ownerWallet,
                        GovernanceContractAbis.RiskManager,
                        [optyRegistry.address]
                    );
                    assert.isDefined(riskManager, "RiskManager contract not deployed");
                    console.log("RiskManager: ", riskManager.address);

                    gatherer = await deployContract(
                        ownerWallet,
                        GovernanceContractAbis.Gatherer,
                        [optyRegistry.address]
                    );
                    assert.isDefined(gatherer, "Gatherer contract not deployed");
                    console.log("Gatherer: ", gatherer.address);

                    optyStrategyCodeProvider = await deployContract(
                        ownerWallet,
                        GovernanceContractAbis.OptyStrategyCodeProvider,
                        [optyRegistry.address]
                    );
                    assert.isDefined(
                        optyStrategyCodeProvider,
                        "OptyStrategyCodeProvider contract not deployed"
                    );
                    console.log(
                        "StrategyCodeProvider: ",
                        optyStrategyCodeProvider.address
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
                            let optyCodeProviderContracts = OtherImports.ProtocolCodeProviderNames.BasicPool;
                            for (let optyCodeProviderContractsKey of optyCodeProviderContracts) {
                                let flag: boolean;
                                if (
                                    optyCodeProviderContractsKey == command.codeProvider
                                ) {
                                    console.log("matched");
                                    flag = true;
                                } else if (command.codeProvider == null) {
                                    console.log("all");
                                    flag = true;
                                } else {
                                    console.log("not matched");
                                    flag = false;
                                }

                                if (flag && count <= optyCodeProviderContracts.length) {
                                    if (
                                        codeProviderContract.hasOwnProperty(
                                            optyCodeProviderContractsKey.toString()
                                        )
                                    ) {
                                        //  In if condition, deploying the code provider contract with only registry address
                                        //  and in else deploy CodeProvider Contract with registry and gatherer addresses
                                        if (
                                            optyCodeProviderContractsKey
                                                .toString()
                                                .toLowerCase() == "dydxcodeprovider" ||
                                            optyCodeProviderContractsKey
                                                .toString()
                                                .toLowerCase() ==
                                                "aavev1codeprovider" ||
                                            optyCodeProviderContractsKey
                                                .toString()
                                                .toLowerCase() ==
                                                "fulcrumcodeprovider" ||
                                            optyCodeProviderContractsKey
                                                .toString()
                                                .toLowerCase() ==
                                                "yvaultcodeprovider" ||
                                            optyCodeProviderContractsKey
                                                .toString()
                                                .toLowerCase() ==
                                                "aavev2codeprovider" ||
                                            optyCodeProviderContractsKey
                                                .toString()
                                                .toLowerCase() == "yearncodeprovider"
                                        ) {
                                            console.log(
                                                "==== 1. Depoying " +
                                                    optyCodeProviderContractsKey +
                                                    "  Contract ===="
                                            );

                                            //  Deploying the code provider contracts
                                            optyCodeProviderContract = await deployContract(
                                                ownerWallet,
                                                codeProviderContract[
                                                    optyCodeProviderContractsKey
                                                ],
                                                [optyRegistry.address]
                                            );
                                            console.log(
                                                "Printing " +
                                                    optyCodeProviderContractsKey +
                                                    "'s address: ",
                                                optyCodeProviderContract.address
                                            );
                                        } else {
                                            console.log(
                                                "==== 2. Depoying " +
                                                    optyCodeProviderContractsKey +
                                                    "  Contract ===="
                                            );
                                            var overrideOptions: ethers.providers.TransactionRequest = {
                                                gasLimit: 6721975,
                                            };

                                            //  Special case for deploying the CurveSwapCodeProvider.sol
                                            if (
                                                optyCodeProviderContractsKey ==
                                                "CurveSwapCodeProvider"
                                            ) {
                                                var overrideOptions: ethers.providers.TransactionRequest = {
                                                    gasLimit: 6721975,
                                                };
                                                console.log("Deploy in IF condition..");
                                                let factory = new ethers.ContractFactory(
                                                    codeProviderContract[
                                                        optyCodeProviderContractsKey
                                                    ].abi,
                                                    OtherImports.ByteCodes.CurveSwapCodeProvider,
                                                    ownerWallet
                                                );
                                                console.log(
                                                    "deploying curveSwap contract"
                                                );
                                                //  Deploying the curveSwap code provider contract
                                                optyCodeProviderContract = await factory.deploy(
                                                    optyRegistry.address,
                                                    gatherer.address,
                                                    overrideOptions
                                                );
                                                console.log("deployed curve swap.....");
                                                // console.log("deploying txn: ", optyCodeProviderContract.deployTransaction)
                                                let curveSwapDeployReceipt = await optyCodeProviderContract.deployTransaction.wait();
                                                // console.log("Curve swap deployed receipt:  ", curveSwapDeployReceipt)
                                                console.log(
                                                    "Printing " +
                                                        optyCodeProviderContractsKey +
                                                        "'s address: ",
                                                    optyCodeProviderContract.address
                                                );
                                            } else {
                                                console.log("Deploy in else condition");
                                                var overrideOptions: ethers.providers.TransactionRequest = {
                                                    gasLimit: 6721975,
                                                };

                                                //  Deploying the code provider contracts
                                                optyCodeProviderContract = await deployContract(
                                                    ownerWallet,
                                                    codeProviderContract[
                                                        optyCodeProviderContractsKey
                                                    ],
                                                    [
                                                        optyRegistry.address,
                                                        gatherer.address,
                                                    ],
                                                    overrideOptions
                                                );
                                                console.log(
                                                    "Printing " +
                                                        optyCodeProviderContractsKey +
                                                        "'s address: ",
                                                    optyCodeProviderContract.address
                                                );
                                                // process.exit(32)
                                            }

                                            //  Setting/Mapping the liquidityPoolToken, SwapPoolTOUnderlyingTokens and gauge address as pre-requisites in CurveSwapCodeProvider
                                            let curveSwapDataProviderKey: keyof typeof OtherImports.curveSwapDataProvider;
                                            for (curveSwapDataProviderKey in OtherImports.curveSwapDataProvider) {
                                                if (
                                                    curveSwapDataProviderKey
                                                        .toString()
                                                        .toLowerCase() ==
                                                    optyCodeProviderContractsKey
                                                        .toString()
                                                        .toLowerCase()
                                                ) {
                                                    console.log(
                                                        "CurveSwapCodeProvider contract address: ",
                                                        optyCodeProviderContract.address
                                                    );
                                                    let tokenPairs =
                                                        OtherImports
                                                            .curveSwapDataProvider[
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

                                                        var overrideOptions: ethers.providers.TransactionRequest = {
                                                            value: 0,
                                                            gasLimit: 6721970,
                                                        };
                                                        console.log("step-1");
                                                        let optyCodeProviderContractOwnerSigner = optyCodeProviderContract.connect(
                                                            ownerWallet
                                                        );

                                                        console.log("step-1a");
                                                        //  Mapping lpToken to swapPool contract
                                                        await optyCodeProviderContractOwnerSigner.functions.setLiquidityPoolToken(
                                                            _swapPool,
                                                            _liquidityPoolToken,
                                                            {
                                                                gasLimit: 6700000,
                                                            }
                                                        );

                                                        console.log("step-2");
                                                        //  Mapping UnderlyingTokens to SwapPool Contract
                                                        await optyCodeProviderContract.setSwapPoolToUnderlyingTokens(
                                                            _swapPool,
                                                            _underlyingTokens
                                                        );

                                                        console.log("step-3");
                                                        //  Mapping Gauge contract to the SwapPool Contract
                                                        await optyCodeProviderContract.setSwapPoolToGauges(
                                                            _swapPool,
                                                            _guage
                                                        );
                                                    }
                                                }
                                            }
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
                                                let defiPoolsUnderlyingTokens: DefiPools =
                                                    OtherImports.defiPools[
                                                        defiPoolsKey
                                                    ];
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
                                                    if (
                                                        defiPoolsKey
                                                            .toString()
                                                            .includes("Borrow")
                                                    ) {
                                                        // Approving pool as creditPool if it is borrow
                                                        await RegistryFunctions.approveLpCpAndMapLpToCodeProvider(
                                                            defiPoolsUnderlyingTokens[
                                                                defiPoolsUnderlyingTokensKey
                                                            ].pool,
                                                            optyCodeProviderContractVariables[
                                                                optyCodeProviderContractsKey
                                                            ].address,
                                                            true,
                                                            optyRegistry
                                                        );
                                                    } else {
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
                                                    // Fetching the lpToken corresponding to the liquidity pool and underlying token
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

                it.skip("should check if the code provider contracts are deployed", async () => {
                    assert.isOk(
                        optyCodeProviderContractVariables.CompoundCodeProvider.address,
                        "CompoundCodeProvider Contract is not deployed"
                    );
                    assert.isOk(
                        optyCodeProviderContractVariables.AaveV1CodeProvider.address,
                        "AaveV1CodeProvider Contract is not deployed"
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
                        console.log("coming in when no symbol is passed!");
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
                                        PoolContractAbis.OptyTokenBasicPoolMkr,
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
                                        PoolContractAbis.OptyTokenBasicPool,
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
                                console.log("BEFORE IF CONDITION..");
                                //  If user's underlying token balance is less than TEST_AMOUNT then, fund user's wallet with underlying token
                                if (
                                    userTokenBalanceWei.lt(TEST_AMOUNT) ||
                                    userTokenBalanceWei == undefined
                                ) {
                                    console.log("Coming in If condition");
                                    let FUND_AMOUNT;
                                    //  Edge case for funding the HBTC token
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
                                    await utilities.fundWallet(
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
                                    //  If still user's wallet is not funded with TEST_AMOUNT, then fund the wallet again with remaining tokens
                                    if (userTokenBalanceWei.lt(TEST_AMOUNT)) {
                                        console.log("Coming in 2nd if condition");
                                        console.log(
                                            "User's balance in 2nd if condition before funding: ",
                                            ethers.utils.formatUnits(
                                                userTokenBalanceWei,
                                                underlyingTokenDecimals
                                            )
                                        );

                                        await utilities.fundWallet(
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

                                                //  Fetching best strategy
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

                                            //  If condition is checking if the withdrawal is 0 or not. This can happen when
                                            //  depositRebalance() is called after setting up the same strategy. This can happen
                                            //  user doesn't have any Op<Token>Bsc tokens.
                                            if (
                                                initialUserOptyTokenBalanceWei
                                                    .sub(1)
                                                    .eq(0) ||
                                                initialUserOptyTokenBalanceWei.eq(0) ||
                                                initialUserOptyTokenBalanceWei
                                                    .sub(
                                                        utilities.expandToTokenDecimals(
                                                            1,
                                                            11
                                                        )
                                                    )
                                                    .eq(0)
                                            ) {
                                                //TUSD-deposit-YEARN-yTUSD
                                                console.log("Withdrawal amount = 0");
                                            } else {
                                                console.log("Withdrawal amount > 0");
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
                                                        // let roundingDelta = utilities.expandToTokenDecimals(2, underlyingTokenDecimals); // - also works
                                                        let roundingDelta = 1;
                                                        console.log("Started waiting");
                                                        await utilities.sleep(
                                                            60 * 1000
                                                        ); //  Needs to wait  for min 60 sec or above else withdraw will through a revert error
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
                                                        // let roundingDelta = utilities.expandToTokenDecimals(2, underlyingTokenDecimals); // - also works
                                                        let roundingDelta = 0;
                                                        console.log("Started waiting");
                                                        await utilities.sleep(
                                                            120 * 1000
                                                        ); //  Needs to wait  for min 105-120 sec or above else withdraw will through revert error
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
                                                        // let roundingDelta = utilities.expandToTokenDecimals(2, underlyingTokenDecimals); // - also works
                                                        let roundingDelta = 0;
                                                        console.log("Started waiting");
                                                        await utilities.sleep(
                                                            180 * 1000
                                                        ); //  Needs to wait  for min 105-120 sec or above else withdraw will through revert error
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
                                                        // let roundingDelta = utilities.expandToTokenDecimals(2, underlyingTokenDecimals); // - also works
                                                        let roundingDelta = 0;
                                                        console.log("Started waiting");
                                                        await utilities.sleep(
                                                            240 * 1000
                                                        ); //  Needs to wait  for min 105-120 sec or above else withdraw will through revert error
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
                                                    // let roundingDelta = utilities.expandToTokenDecimals(2, underlyingTokenDecimals);
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

                                    console.log("User deposit rebalance successful");
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
                                        ethers.utils.formatEther(userTokenBalanceWei)
                                    );
                                    expect(
                                        userTokenBalanceWei.eq(
                                            userInitialTokenBalanceWei.sub(TEST_AMOUNT)
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
                                    console.log(
                                        "User's Opty token balance: ",
                                        userNewOptyTokenBalance
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

                                    console.log(
                                        "Before: User's Opty  token balance: ",
                                        ethers.utils.formatUnits(
                                            withdrawAmount,
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
                                            withdrawAmount.sub(roundingDelta),
                                            underlyingTokenDecimals
                                        )
                                    );
                                    // console.log("---- Manual withdrawal amount: ", ethers.utils.formatUnits(utilities.expandToTokenDecimals(5999999999,9),underlyingTokenDecimals))
                                    console.log(
                                        "---- Manual withdrawal amount: ",
                                        ethers.utils.formatUnits(
                                            withdrawAmount,
                                            underlyingTokenDecimals
                                        )
                                    );
                                    console.log(
                                        "****  BEFORE WITHDRAW TXN, Actual withdrawal amount: ",
                                        ethers.utils.formatUnits(
                                            withdrawAmount,
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
                                    // utilities.expandToTokenDecimals(5999999999,9) -- working
                                    // (initialUserOptyTokenBalanceWei.sub(utilities.expandToTokenDecimals(1,18))).sub(1)
                                    // const userWithdrawTxOutput = await optyTokenBasicPoolAsSignerUser.userWithdrawAllRebalance()
                                    const userWithdrawTxOutput = await optyTokenBasicPoolAsSignerUser.functions.userWithdrawRebalance(
                                        withdrawAmount.sub(roundingDelta),
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
                                            withdrawAmount,
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
                                        .mul(withdrawAmount.sub(1))
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
                                        afterUserOptyTokenBalanceWei.eq(roundingDelta)
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
                                        expect(afterContractTokenBalanceWei.eq(0)).to.be
                                            .true;
                                        expect(initialContractTokenBalanceWei.eq(0)).to
                                            .be.true;
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

                                    //  Appending into the file (if exists) else creating new file and adding data into it
                                    fs.stat(fileName, async function (
                                        err: { code: string } | null,
                                        stat: any
                                    ) {
                                        if (err == null) {
                                            console.log(
                                                "File exists, therefore appending.."
                                            );
                                            await utilities.appendInFile(
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
                                            await utilities.writeInFile(
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
            });
        }
    );

program.parse(process.argv);
