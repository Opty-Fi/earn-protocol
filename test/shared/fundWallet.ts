import { Contract, ethers, utils } from 'ethers';
import addressAbis from "./AddressAbis.json";
import tokenAddresses from "./TokenAddresses.json";

export async function fundWallet(tokenAddress:string, wallet:ethers.Wallet, amount:string) {
    // 1. instantiate contracts
      const uniswapFactoryContract = new ethers.Contract(
        tokenAddresses.uniswapFactory,
        addressAbis.uniswapFactory.abi,
        wallet,
      )
      const tokenExchangeAddress = await uniswapFactoryContract.getExchange(
        tokenAddress,
      )
      const tokenExchangeContract = new ethers.Contract(
        tokenExchangeAddress,
        addressAbis.uniswapExchange.abi,
        wallet,
      )

      // 2. do the actual swapping
      await tokenExchangeContract.ethToTokenSwapInput(
        1, // min amount of token retrieved
        2525644800, // random timestamp in the future (year 2050)
        {
          gasLimit: 4000000,
          value: ethers.utils.parseEther(amount),
        },
      )  
}