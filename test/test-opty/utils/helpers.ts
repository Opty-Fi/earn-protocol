import abi from "ethereumjs-abi";
import { Signer, BigNumber } from "ethers";
import { ethers } from "hardhat";
import exchange from "../data/exchange.json";
import tokenAddresses from "../data/TokenAddresses.json";
// funtion to get the equivalient hash (as generated by the solidity) of data passed in args
export function getSoliditySHA3Hash(argTypes: string[], args: any[]): string {
    const soliditySHA3Hash = "0x" + abi.soliditySHA3(argTypes, args).toString("hex");
    return soliditySHA3Hash;
}

function amountInHex(fundAmount: BigNumber): string {
    const amount: string = "0x" + Number(fundAmount).toString(16);
    return amount;
}

export function delay(ms: number): Promise<unknown> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fundWalletToken(
    tokenAddress: string,
    wallet: Signer,
    fundAmount: BigNumber,
    deadlineTimestamp: number
): Promise<void> {
    const amount = amountInHex(fundAmount);
    const uniswapInstance = new ethers.Contract(
        exchange.uniswap.address,
        exchange.uniswap.abi,
        wallet
    );
    const ETH_VALUE_GAS_OVERIDE_OPTIONS = {
        value: ethers.utils.hexlify(ethers.utils.parseEther("9500")),
        gasLimit: 6721975,
    };
    const address = await wallet.getAddress();
    await uniswapInstance.swapETHForExactTokens(
        amount,
        [tokenAddresses.underlyingTokens.weth, tokenAddress],
        address,
        deadlineTimestamp,
        ETH_VALUE_GAS_OVERIDE_OPTIONS
    );
}

export async function getBlockTimestamp(): Promise<number> {
    const blockNumber = await ethers.provider.getBlockNumber();
    const block = await ethers.provider.getBlock(blockNumber);
    const timestamp = block.timestamp;
    return timestamp;
}

export async function getTokenName(tokenName: string): Promise<string> {
    if (tokenName.toLowerCase() == "mkr") {
        return "Maker";
    } else {
        const ERC20Instance = await ethers.getContractAt(
            "ERC20",
            tokenAddresses.underlyingTokens[
                <keyof typeof tokenAddresses.underlyingTokens>tokenName.toLowerCase()
            ]
        );
        const name: string = await ERC20Instance.name();
        return name;
    }
}

export async function getTokenSymbol(tokenName: string): Promise<string> {
    if (tokenName.toLowerCase() == "mkr") {
        return "MKR";
    } else {
        const ERC20Instance = await ethers.getContractAt(
            "ERC20",
            tokenAddresses.underlyingTokens[
                <keyof typeof tokenAddresses.underlyingTokens>tokenName.toLowerCase()
            ]
        );
        const symbol = await ERC20Instance.symbol();
        return symbol;
    }
}
