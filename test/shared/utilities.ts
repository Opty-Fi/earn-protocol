import { BigNumber, bigNumberify } from "ethers/utils";
import { ethers } from "ethers";
import exchange from "./exchange.json";
import tokenAddresses from "./TokenAddresses.json";

export function expandToTokenDecimals(n: number, exponent: number): BigNumber {
    return bigNumberify(n).mul(bigNumberify(10).pow(exponent));
}

export async function fundWallet(
    tokenAddress: string,
    wallet: ethers.Wallet,
    amount: string
) {
    const uniswapInstance = new ethers.Contract(
        exchange.uniswap.address,
        exchange.uniswap.abi,
        wallet
    );
    if (tokenAddresses.weth.toLowerCase() == tokenAddress.toLowerCase()) {
        // console.log("COMING TO FUND WALLET FOR WETH")
        const wEthInstance = new ethers.Contract(
            exchange.weth.address,
            exchange.weth.abi,
            wallet
        )
        await wEthInstance.deposit(
            { value: amount }
        );
    } else {
        // console.log("FUND WALLET WITH TOKENS EXCEPT WETH")
        await uniswapInstance.swapETHForExactTokens(
            amount,
            [tokenAddresses.weth, tokenAddress],
            wallet.address,
            "1000000000000000000",
            { value: ethers.utils.hexlify(ethers.utils.parseEther("90")) }
        );
    }
}
