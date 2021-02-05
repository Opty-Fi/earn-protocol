import { BigNumber, bigNumberify } from "ethers/utils";
import { Contract, ethers } from "ethers";
import exchange from "../data/exchange.json";
import addressAbis from "../data/AddressAbis.json";
import tokenAddresses from "../data/TokenAddresses.json";
import { expect } from "chai";
import * as OtherImports from "./OtherImports";
import { OptyRegistry } from "./GovernanceContract";
import { solidity, deployContract } from "ethereum-waffle";

const dotenv = require("dotenv");
dotenv.config();
const Pool = require("pg").Pool;
const fs = require("fs"); //    library to read/write to a particular file

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

const Ganache = require("ganache-core");
let provider: ethers.providers.Web3Provider;
const MAINNET_NODE_URL = process.env.MAINNET_NODE_URL;

//  Function to start the Ganache provider with forked mainnet using chainstack's network URL
//  Getting 2 Wallets in return - one acting as Owner and another one acting as user
export async function startChain() {
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
    return [ownerWallet, userWallet, provider];
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
    FUND_AMOUNT: ethers.BigNumber
) {
    let amount = "0x" + Number(FUND_AMOUNT).toString(16);
    const uniswapInstance = new ethers.Contract(
        exchange.uniswap.address,
        exchange.uniswap.abi,
        wallet
    );
    if (tokenAddresses.weth.toLowerCase() == tokenAddress.toLowerCase()) {
        const wEthInstance = new ethers.Contract(
            exchange.weth.address,
            exchange.weth.abi,
            wallet
        );
        //  Funding user's wallet with WETH tokens
        await wEthInstance.deposit({ value: amount });
    } else if (tokenAddress.toLowerCase() == tokenAddresses["3crv"].toLowerCase()) {
        //  Funding user's wallet with DAI tokens
        let daiAmount = FUND_AMOUNT.add(expandToTokenDecimals(10, 18));
        await uniswapInstance.swapETHForExactTokens(
            daiAmount,
            [tokenAddresses.weth, tokenAddresses.dai],
            wallet.address,
            "1000000000000000000",
            { value: ethers.utils.hexlify(ethers.utils.parseEther("90")) }
        );

        // Instantiate DAI token contract
        let daiTokenContractInstance = new ethers.Contract(
            tokenAddresses.dai,
            addressAbis.erc20.abi,
            wallet
        );

        //  Approve Curve Swap contract for spending DAI on behalf of user
        let approve_amount = FUND_AMOUNT.add(expandToTokenDecimals(100000000, 18));
        await daiTokenContractInstance.approve(
            exchange.curveSwapContract.address,
            approve_amount
        );

        // Instantiate Curve Swap contract
        let curveSwapContractInstance = new ethers.Contract(
            exchange.curveSwapContract.address,
            <ethers.ContractInterface>exchange.curveSwapContract.abi,
            wallet
        );

        //  Funding wallet with 3Crv tokens
        var overrideOptions = { gasLimit: ethers.utils.hexlify(468201) };
        let mint_amount = FUND_AMOUNT.add(expandToTokenDecimals(1, 18));
        let zero_number = expandToTokenDecimals(0, 18);
        await curveSwapContractInstance.add_liquidity(
            [mint_amount, zero_number, zero_number],
            zero_number,
            overrideOptions
        );

        // Instantiate 3Crv ERC20 token contract
        let erc20TokenContractInstance = new ethers.Contract(
            tokenAddresses["3crv"],
            addressAbis.erc20.abi,
            wallet
        );

        let users3CrvBalance = await erc20TokenContractInstance.balanceOf(
            wallet.address
        );

        // Make the user's wallet balance equals to the TEST_AMOUNT
        await curveSwapContractInstance.remove_liquidity(users3CrvBalance.sub(amount), [
            0,
            0,
            0,
        ]);
    } else {
        await uniswapInstance.swapETHForExactTokens(
            amount,
            [tokenAddresses.weth, tokenAddress],
            wallet.address,
            "1000000000000000000",
            {
                value: ethers.utils.hexlify(ethers.utils.parseEther("9500")),
                gasLimit: 4590162,
            }
        );
    }
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

//  function to write the data(token holders addresses) in a file(scrapedData.json)
export async function writeInFile(fileName: string, data: any) {
    await fs.writeFile(fileName, JSON.stringify(data), "utf8", function (err: any) {
        if (err) {
            //  Handling error occured while writing JSON Object to File
            return console.log(err);
        }
    });
}

export async function appendInFile(fileName: string, data: any) {
    await fs.appendFileSync(fileName, JSON.stringify(","), "utf8", function (err: any) {
        if (err) {
            //  Handling error occured while appending JSON Object to File
            return console.log(err);
        }
    });
    await fs.appendFileSync(fileName, JSON.stringify(data), "utf8", function (
        err: any
    ) {
        if (err) {
            //  Handling error occured while appending JSON Object to File
            return console.log(err);
        }
    });
    await formatFile(fileName);
}

async function formatFile(fileName: string) {
    await fs.readFile(fileName, "utf8", async function (err: any, data: string) {
        if (err) {
            return console.log(err);
        }
        //  refactoring text data of string format into json
        var result = data.replace(/}","{/g, ",");
        var final_data = JSON.parse(result);

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

    let status = await expectException(promise, expectedError);
}

//  sleep function
export async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deployCodeProviderContracts(
    optyCodeProviderContractsKey: any,
    ownerWallet: any,
    codeProviderAbi: any,
    OptyRegistryAddress: any,
    GathererAddress: any
) {
    let optyCodeProviderContract;
    if (
        optyCodeProviderContractsKey.toString().toLowerCase() == "dydxcodeprovider" ||
        optyCodeProviderContractsKey.toString().toLowerCase() == "aavev1codeprovider" ||
        optyCodeProviderContractsKey.toString().toLowerCase() ==
            "fulcrumcodeprovider" ||
        optyCodeProviderContractsKey.toString().toLowerCase() == "yvaultcodeprovider" ||
        optyCodeProviderContractsKey.toString().toLowerCase() == "aavev2codeprovider" ||
        optyCodeProviderContractsKey.toString().toLowerCase() == "yearncodeprovider"
    ) {
        //  Deploying the code provider contracts
        optyCodeProviderContract = await deployContract(ownerWallet, codeProviderAbi, [
            OptyRegistryAddress,
        ]);
    } else {
        var overrideOptions: ethers.providers.TransactionRequest = {
            gasLimit: 6721975,
        };

        //  Special case for deploying the CurveSwapCodeProvider.sol
        if (optyCodeProviderContractsKey == "CurveSwapCodeProvider") {
            var overrideOptions: ethers.providers.TransactionRequest = {
                gasLimit: 6721975,
            };
            let factory = new ethers.ContractFactory(
                codeProviderAbi.abi,
                OtherImports.ByteCodes.CurveSwapCodeProvider,
                ownerWallet
            );
            //  Deploying the curveSwap code provider contract
            optyCodeProviderContract = await factory.deploy(
                OptyRegistryAddress,
                GathererAddress,
                overrideOptions
            );

            let curveSwapDeployReceipt = await optyCodeProviderContract.deployTransaction.wait();
        } else {
            var overrideOptions: ethers.providers.TransactionRequest = {
                gasLimit: 6721975,
            };

            //  Deploying the code provider contracts
            optyCodeProviderContract = await deployContract(
                ownerWallet,
                codeProviderAbi,
                [OptyRegistryAddress, GathererAddress],
                overrideOptions
            );
        }

        //  Setting/Mapping the liquidityPoolToken, SwapPoolTOUnderlyingTokens and gauge address as pre-requisites in CurveSwapCodeProvider
        let curveSwapDataProviderKey: keyof typeof OtherImports.curveSwapDataProvider;
        for (curveSwapDataProviderKey in OtherImports.curveSwapDataProvider) {
            if (
                curveSwapDataProviderKey.toString().toLowerCase() ==
                optyCodeProviderContractsKey.toString().toLowerCase()
            ) {
                let tokenPairs =
                    OtherImports.curveSwapDataProvider[curveSwapDataProviderKey];
                let tokenPair: keyof typeof tokenPairs;
                for (tokenPair in tokenPairs) {
                    let _liquidityPoolToken = tokenPairs[tokenPair].liquidityPoolToken;
                    let _swapPool = tokenPairs[tokenPair].swapPool;
                    let _guage = tokenPairs[tokenPair].gauge;
                    let _underlyingTokens = tokenPairs[tokenPair].underlyingTokens;

                    var overrideOptions: ethers.providers.TransactionRequest = {
                        value: 0,
                        gasLimit: 6721970,
                    };

                    let optyCodeProviderContractOwnerSigner = optyCodeProviderContract.connect(
                        ownerWallet
                    );

                    //  Mapping lpToken to swapPool contract
                    await optyCodeProviderContractOwnerSigner.functions.setLiquidityPoolToken(
                        _swapPool,
                        _liquidityPoolToken,
                        {
                            gasLimit: 6700000,
                        }
                    );

                    //  Mapping UnderlyingTokens to SwapPool Contract
                    await optyCodeProviderContract.setSwapPoolToUnderlyingTokens(
                        _swapPool,
                        _underlyingTokens
                    );

                    //  Mapping Gauge contract to the SwapPool Contract
                    await optyCodeProviderContract.setSwapPoolToGauges(
                        _swapPool,
                        _guage
                    );
                }
            }
        }
    }

    return optyCodeProviderContract;
}
