import Ganache from "ganache-core";
import { Contract, ethers } from "ethers";
import { deployContract } from "ethereum-waffle";
import { expect } from "chai";
import abi from "ethereumjs-abi";
import exchange from "../data/exchange.json";
import addressAbis from "../data/AddressAbis.json";
import tokenAddresses from "../data/TokenAddresses.json";
import * as OtherImports from "./OtherImports";
import * as Constants from "./constants";
import { outputHelp } from "commander";
import * as Interfaces from "./interfaces";

const Pool = require("pg").Pool;
const fs = require("fs"); //    library to read/write to a particular file

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

let provider: ethers.providers.Web3Provider;

//  Function to start the Ganache provider with forked mainnet using chainstack's network URL
//  Getting 2 Wallets in return - one acting as Owner and another one acting as user
export function getForkedMainnetProvider(
    ethereumNodeProvider: string,
    mnemonic: string,
    default_balance_ether: number,
    total_accounts: number,
    locked: boolean
) {
    const ganache = Ganache.provider({
        fork: ethereumNodeProvider,
        network_id: 1,
        mnemonic,
        default_balance_ether,
        total_accounts,
        locked,
    });
    provider = new ethers.providers.Web3Provider(ganache as any);
    return provider;
}

export function expandToTokenDecimals(n: number, exponent: number): ethers.BigNumber {
    // bigNumberify(n).mul(bigNumberify(10).pow(exponent)); -> ethers_V4.0.48 working code (kept until testing gets completed)
    return ethers.BigNumber.from(n).mul(
        ethers.BigNumber.from("10").pow(ethers.BigNumber.from(exponent))
    );
}

export async function fundWallet(
    tokenAddress: string,
    wallet: ethers.Wallet,
    FUND_AMOUNT: ethers.BigNumber,
    deadlineTimestamp: string,
    GAS_OVERRIDE_OPTIONS: any,
    ETH_VALUE_GAS_OVERIDE_OPTIONS: any
) {
    if (
        OtherImports.tokenAddresses.underlyingTokens.weth.toLowerCase() ==
        tokenAddress.toLowerCase()
    ) {
        await fundWalletWithWeth(wallet, FUND_AMOUNT);
    } else if (
        OtherImports.tokenAddresses.underlyingTokens["3crv"].toLowerCase() ==
        tokenAddress.toLowerCase()
    ) {
        await fundWalletWith3Crv(
            wallet,
            FUND_AMOUNT,
            deadlineTimestamp,
            GAS_OVERRIDE_OPTIONS,
            ETH_VALUE_GAS_OVERIDE_OPTIONS
        );
    } else {
        await fundWalletAnyToken(
            tokenAddress,
            wallet,
            FUND_AMOUNT,
            deadlineTimestamp,
            ETH_VALUE_GAS_OVERIDE_OPTIONS
        );
    }
}

async function fundWalletWithWeth(wallet: ethers.Wallet, fundAmount: ethers.BigNumber) {
    const amount = amountInHex(fundAmount);
    const wEthInstance = getContractInstance(
        exchange.weth.address,
        exchange.weth.abi,
        wallet
    );
    //  Funding user's wallet with WETH tokens
    await wEthInstance.deposit({ value: amount });
}

async function fundWalletWith3Crv(
    wallet: ethers.Wallet,
    fundAmount: ethers.BigNumber,
    deadlineTimestamp: any,
    gasOverideOptions: any,
    ethValueGasOverrideOptions: any
) {
    const amount = amountInHex(fundAmount);
    const uniswapInstance = getContractInstance(
        exchange.uniswap.address,
        exchange.uniswap.abi,
        wallet
    );
    //  Funding user's wallet with DAI tokens
    const daiAmount = fundAmount.add(expandToTokenDecimals(10, 18));
    await uniswapInstance.swapETHForExactTokens(
        daiAmount,
        [tokenAddresses.underlyingTokens.weth, tokenAddresses.underlyingTokens.dai],
        wallet.address,
        deadlineTimestamp,
        ethValueGasOverrideOptions
    );

    // Instantiate DAI token contract
    const daiTokenContractInstance = getContractInstance(
        tokenAddresses.underlyingTokens.dai,
        addressAbis.erc20.abi,
        wallet
    );

    //  Approve Curve Swap contract for spending DAI on behalf of user
    const approve_amount = fundAmount.mul(expandToTokenDecimals(100, 18));
    await daiTokenContractInstance.approve(
        exchange.curveSwapContract.address,
        approve_amount
    );

    // Instantiate Curve Swap contract
    const curveSwapContractInstance = getContractInstance(
        exchange.curveSwapContract.address,
        <ethers.ContractInterface>exchange.curveSwapContract.abi,
        wallet
    );

    //  Funding wallet with 3Crv tokens
    const mint_amount = fundAmount.add(expandToTokenDecimals(1, 18));
    const zero_number = expandToTokenDecimals(0, 18);
    await curveSwapContractInstance.add_liquidity(
        [mint_amount, zero_number, zero_number],
        zero_number,
        gasOverideOptions
    );

    // Instantiate 3Crv ERC20 token contract
    const erc20TokenContractInstance = getContractInstance(
        tokenAddresses.underlyingTokens["3crv"],
        addressAbis.erc20.abi,
        wallet
    );

    const users3CrvBalance = await erc20TokenContractInstance.balanceOf(wallet.address);

    // Make the user's wallet balance equals to the TEST_AMOUNT
    await curveSwapContractInstance.remove_liquidity(users3CrvBalance.sub(amount), [
        0,
        0,
        0,
    ]);
}

async function fundWalletAnyToken(
    tokenAddress: string,
    wallet: ethers.Wallet,
    fundAmount: ethers.BigNumber,
    deadlineTimestamp: any,
    ethValueGasOverrideOptions: any
) {
    const amount = amountInHex(fundAmount);
    const uniswapInstance = getContractInstance(
        exchange.uniswap.address,
        exchange.uniswap.abi,
        wallet
    );

    await uniswapInstance.swapETHForExactTokens(
        amount,
        [tokenAddresses.underlyingTokens.weth, tokenAddress],
        wallet.address,
        deadlineTimestamp,
        ethValueGasOverrideOptions
    );
}

function amountInHex(fundAmount: ethers.BigNumber): string {
    const amount: string = "0x" + Number(fundAmount).toString(16);
    return amount;
}

export function getContractInstance(
    contractAddress: string,
    contractAbi: any,
    signerAccount: ethers.Signer
): ethers.Contract {
    return new ethers.Contract(contractAddress, contractAbi, signerAccount);
}

export async function insertGasUsedRecordsIntoDB(
    dateAndTime: number,
    tokenSymbol: string,
    strategyName: string,
    setStrategyGasUsed: number,
    scoreStrategyGasUsed: number,
    setAndScoreStrategyGasUsed: number,
    userDepositRebalanceTxGasUsed: number,
    userWithdrawRebalanceTxGasUsed: number,
    runTimeVersion: string
): Promise<number> {
    return new Promise(async (resolve, reject) => {
        try {
            const res = await pool.query(
                `INSERT INTO public."gasRecords" VALUES (${dateAndTime},'${tokenSymbol}','${strategyName}',${setStrategyGasUsed},${scoreStrategyGasUsed},${setAndScoreStrategyGasUsed},${userDepositRebalanceTxGasUsed},${userWithdrawRebalanceTxGasUsed},'${runTimeVersion}')`
            );
            resolve(res.rowCount);
        } catch (error) {
            reject(`Got error: ${error}`);
        }
    });
}

//  function to write the Records in a file(Pattern: <Token>_<Data>.json)
export async function writeRecordsInFile(fileName: string, data: any) {
    fs.stat(fileName, async function (err: { code: string } | null, stat: any) {
        //  if file exists, then appending data to the file
        if (err == null) {
            await appendInFile(fileName, data);
        } else if (err.code === "ENOENT") {
            // file does not exist, therefore creating new one and writing into it
            await writeInFile(fileName, data);
        } else {
            console.log("Error occured while writing into file: ", err.code);
        }
    });
}

//  function to write into the file if file doesn't exist
async function writeInFile(fileName: string, data: any) {
    await fs.writeFile(fileName, JSON.stringify(data), "utf8", function (err: any) {
        if (err) {
            //  Handling error occured while writing JSON Object to File
            return console.log(err);
        }
    });
}

async function appendInFile(fileName: string, data: any) {
    await fs.appendFileSync(fileName, JSON.stringify(","), "utf8", function (err: any) {
        if (err) {
            //  Handling error occured while appending JSON Object to File
            return console.log(err);
        }
    });
    await fs.appendFileSync(
        fileName,
        JSON.stringify(data),
        "utf8",
        function (err: any) {
            if (err) {
                //  Handling error occured while appending JSON Object to File
                return console.log(err);
            }
        }
    );
    await formatFile(fileName);
}

async function formatFile(fileName: string) {
    await fs.readFile(fileName, "utf8", async function (err: any, data: string) {
        if (err) {
            return console.log(err);
        }
        //  refactoring text data of string format into json
        const result = data.replace(/}","{/g, ",");
        const final_data = JSON.parse(result);

        //  writing into file
        await writeInFile(fileName, final_data);
    });
}

// Handle revert exception occured further..
export async function expectException(promise: Promise<any>, expectedError: any) {
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
export async function expectRevert(promise: Promise<any>, expectedError: any) {
    promise.catch(() => {}); // Avoids uncaught promise rejections in case an input validation causes us to return early

    if (!expectedError) {
        throw Error(
            "No revert reason specified: call expectRevert with the reason string, or use expectRevert.unspecified \
if your 'require' statement doesn't have one."
        );
    }

    const status = await expectException(promise, expectedError);
}

//  sleep function
export async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deployCodeProviderContracts(
    optyCodeProviderContractsKey: string,
    ownerWallet: any,
    codeProviderAbi: any,
    OptyRegistryAddress: any,
    GathererAddress: any,
    overrideOptions: any
) {
    const ProtocolCodeProviderNames: Interfaces.DeployCodeProviderContracts =
        OtherImports.ProtocolCodeProviderNames;
    const canHarvestStatus: boolean =
        ProtocolCodeProviderNames[optyCodeProviderContractsKey].canHarvest;

    optyCodeProviderContractsKey = optyCodeProviderContractsKey
        .toString()
        .toLowerCase();
    if (!canHarvestStatus) {
        //  Deploying the code provider contracts
        const optyCodeProviderContract = await deployContract(
            ownerWallet,
            codeProviderAbi,
            [OptyRegistryAddress],
            overrideOptions
        );
        return optyCodeProviderContract;
    } else {
        //  Special case for deploying the CurveSwapCodeProvider.sol
        if (optyCodeProviderContractsKey == Constants.CURVESWAPCODEPROVIDER) {
            const factory = new ethers.ContractFactory(
                codeProviderAbi.abi,
                OtherImports.ByteCodes.CurveSwapCodeProvider,
                ownerWallet
            );
            //  Deploying the curveSwap code provider contract
            const optyCodeProviderContract = await factory.deploy(
                OptyRegistryAddress,
                GathererAddress,
                overrideOptions
            );

            await optyCodeProviderContract.deployTransaction.wait();
            return optyCodeProviderContract;
        } else {
            //  Deploying the code provider contracts
            const optyCodeProviderContract = await deployContract(
                ownerWallet,
                codeProviderAbi,
                [OptyRegistryAddress, GathererAddress],
                overrideOptions
            );
            return optyCodeProviderContract;
        }
    }
}

export function getPath(filePath: string): string {
    if (filePath?.endsWith("earn-protocol")) {
        return `${filePath}/test/gasRecordFiles/`;
    } else if (filePath?.endsWith("test")) {
        return `${filePath}/gasRecordFiles/`;
    }
    return filePath;
}

// util function for converting expanded values to Deimals number for readability and Testing
export function fromWeiToString(weiNumber: string, tokenDecimals: number): string {
    return ethers.utils.formatUnits(weiNumber, tokenDecimals);
}

// funtion to get the equivalient hash (as generated by the solidity) of data passed in args
export function getSoliditySHA3Hash(argTypes: string[], args: any[]): string {
    const soliditySHA3Hash = "0x" + abi.soliditySHA3(argTypes, args).toString("hex");
    return soliditySHA3Hash;
}

export async function getBlockTimestamp(provider: any) {
    const blockNumber = await provider.getBlockNumber();
    const block = await provider.getBlock(blockNumber);
    const timestamp = block.timestamp;
    return timestamp;
}

//  Function to fund the wallet with the underlying tokens equivalent to TEST_AMOUNT_NUM
export async function checkAndFundWallet(
    underlyingToken: any,
    underlyingTokenDecimals: any,
    tokenContractInstance: Contract,
    userWallet: any,
    optyTokenBasicPool: Contract,
    userOptyTokenBalance: number,
    TEST_AMOUNT: ethers.BigNumber,
    userInitialTokenBalance: any,
    GAS_OVERRIDE_OPTIONS: any,
    ETH_VALUE_GAS_OVERIDE_OPTIONS: any
) {
    //  user's initial underlying tokens balance
    let userTokenBalanceWei = await tokenContractInstance.balanceOf(userWallet.address);

    // user's initial opXXXBsc tokens balance in Wei
    const userOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(
        userWallet.address
    );
    userOptyTokenBalance = parseFloat(
        fromWeiToString(userOptyTokenBalanceWei, underlyingTokenDecimals)
    );
    //  If user's underlying token balance is less than TEST_AMOUNT then, fund user's wallet with underlying token
    if (userTokenBalanceWei.lt(TEST_AMOUNT) || userTokenBalanceWei == undefined) {
        let FUND_AMOUNT;
        //  Edge case for funding the HBTC token due to price impact during swapping
        if (
            tokenContractInstance.address ==
            "0x0316EB71485b0Ab14103307bf65a021042c6d380"
        ) {
            FUND_AMOUNT = TEST_AMOUNT;
        } else {
            FUND_AMOUNT = TEST_AMOUNT.sub(userTokenBalanceWei);
        }

        //  Getting block timestamp for passing as deadline time param for uniswap instance while swapping
        const timestamp = (await getBlockTimestamp(provider)) * 2;
        //  Fund the user's wallet with some TEST_AMOUNT_NUM of tokens
        await fundWallet(
            underlyingToken,
            userWallet,
            TEST_AMOUNT.sub(userTokenBalanceWei),
            timestamp.toString(),
            GAS_OVERRIDE_OPTIONS,
            ETH_VALUE_GAS_OVERIDE_OPTIONS
        );

        // Check Token and opToken balance of User's wallet and OptyTokenBaiscPool Contract
        userTokenBalanceWei = await tokenContractInstance.balanceOf(userWallet.address);

        //  If still user's wallet is not funded with TEST_AMOUNT, then fund the wallet again with remaining tokens
        if (userTokenBalanceWei.lt(TEST_AMOUNT)) {
            const timestamp = (await getBlockTimestamp(provider)) * 2;
            await fundWallet(
                underlyingToken,
                userWallet,
                TEST_AMOUNT.sub(userTokenBalanceWei),
                timestamp.toString(),
                GAS_OVERRIDE_OPTIONS,
                ETH_VALUE_GAS_OVERIDE_OPTIONS
            );
            userTokenBalanceWei = await tokenContractInstance.balanceOf(
                userWallet.address
            );
        }
        userInitialTokenBalance = parseFloat(
            fromWeiToString(userTokenBalanceWei, underlyingTokenDecimals)
        );
    }
    return [
        userTokenBalanceWei,
        userOptyTokenBalanceWei,
        userOptyTokenBalance,
        userTokenBalanceWei,
        userInitialTokenBalance,
    ];
}
