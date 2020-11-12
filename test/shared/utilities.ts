import { BigNumber, bigNumberify } from "ethers/utils";
import { ethers } from "ethers";
import exchange from "./exchange.json";

export function expandTo18Decimals(n: number): BigNumber {
    return bigNumberify(n).mul(bigNumberify(10).pow(18));
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
    await uniswapInstance.swapETHForExactTokens(
        amount,
        ["0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", tokenAddress],
        wallet.address,
        "1000000000000000000",
        { value: ethers.utils.hexlify(ethers.utils.parseEther("90")) }
    );
}
