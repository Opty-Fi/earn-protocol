/* eslint-disable @typescript-eslint/no-unused-vars */
import EthereumSushiswap from "@optyfi/defi-legos/ethereum/sushiswap/index";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { deployments, ethers } from "hardhat";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { MetaTransactionData, EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import {
  ERC20,
  ERC20__factory,
  IUniswapV2Router02,
  IUniswapV2Router02__factory,
  Vault,
  Vault__factory,
} from "../../typechain";
import { parseUnits } from "ethers/lib/utils";
import { BigNumber } from "ethers";

const redemptionABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "redemptionFee",
        type: "uint256",
      },
    ],
    name: "redeem",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

async function main() {
  const bdammRedemption = await ethers.getContractAt(redemptionABI, "0x46b825C8Ff734D534e6E40b2fE2C21643eCBF493");
  const sushiswapRouter = <IUniswapV2Router02>(
    await ethers.getContractAt(IUniswapV2Router02__factory.abi, EthereumSushiswap.SushiswapRouter.address)
  );
  const opWBTCEarn = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opWBTC-Earn_Proxy")).address)
  );
  const usdc = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.PLAIN_TOKENS.USDC);

  const safeOwner = ethers.provider.getSigner(0);
  const safeAddress = "0x9DD0E8A985315785473f7EB81bc4e28838e13D96";
  //   const safeAddress = "0xb95dff9A2D1d0003e74A64A1f36eE6767c8fb9Ed";
  const ethAdapter = <EthAdapter>new EthersAdapter({
    ethers,
    signer: safeOwner,
  });
  const safeSdk: Safe = await Safe.create({ ethAdapter, safeAddress });
  const timestamp = await (await ethers.provider.getBlock("latest")).timestamp;

  const uniV3SwapPathForDAMMtoWBTC = ethers.utils.solidityPack(
    ["address", "uint24", "address", "uint24", "address"],
    [
      "0xb3207935FF56120f3499e8aD08461Dd403bF16b8",
      10000,
      EthereumTokens.PLAIN_TOKENS.USDC,
      500,
      EthereumTokens.BTC_TOKENS.WBTC,
    ],
  );
  const transactions: MetaTransactionData[] = [
    // {
    //   to: opWBTCEarn.address,
    //   value: "0",
    //   data: opWBTCEarn.interface.encodeFunctionData("giveAllowances", [
    //     [EthereumTokens.BTC_TOKENS.WBTC, EthereumTokens.BTC_TOKENS.WBTC, EthereumTokens.BTC_TOKENS.WBTC],
    //     [
    //       "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    //       "0xd9e1ce17f2641f24ae83637ab66a2cca9c378b9f",
    //       "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    //     ],
    //   ]),
    // },
    // {
    //   to: opWBTCEarn.address,
    //   value: "0",
    //   data: opWBTCEarn.interface.encodeFunctionData("adminCall", [
    //     [
    //       ethers.utils.defaultAbiCoder.encode(
    //         ["address", "bytes"],
    //         [
    //           sushiswapRouter.address,
    //           sushiswapRouter.interface.encodeFunctionData("swapTokensForExactTokens", [
    //             parseUnits("7.516050", "6"),
    //             parseUnits("0.00047", "8"),
    //             [EthereumTokens.BTC_TOKENS.WBTC, EthereumTokens.WRAPPED_TOKENS.WETH, EthereumTokens.PLAIN_TOKENS.USDC],
    //             opWBTCEarn.address,
    //             BigNumber.from(timestamp).add("600"),
    //           ]),
    //         ],
    //       ),
    //       ethers.utils.defaultAbiCoder.encode(
    //         ["address", "bytes"],
    //         [
    //           EthereumTokens.PLAIN_TOKENS.USDC,
    //           usdc.interface.encodeFunctionData("approve", [bdammRedemption.address, parseUnits("7.516050", "6")]),
    //         ],
    //       ),
    //       ethers.utils.defaultAbiCoder.encode(
    //         ["address", "bytes"],
    //         [
    //           "0xfa372fF1547fa1a283B5112a4685F1358CE5574d",
    //           usdc.interface.encodeFunctionData("approve", [bdammRedemption.address, parseEther("50.107000000000000000")]),
    //         ],
    //       ),
    //       ethers.utils.defaultAbiCoder.encode(
    //         ["address", "bytes"],
    //         [
    //           bdammRedemption.address,
    //           bdammRedemption.interface.encodeFunctionData("redeem", [
    //             parseEther("50.107000000000000000"),// 50.107374749199942111
    //             parseUnits("7.516050", "6"),
    //           ]),
    //         ],
    //       ),
    //     ],
    //   ]),
    // },
    {
      to: opWBTCEarn.address,
      value: "0",
      data: opWBTCEarn.interface.encodeFunctionData("harvest", [
        "0xb3207935FF56120f3499e8aD08461Dd403bF16b8",
        "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        true,
        parseUnits("0.0004", "8"),
        BigNumber.from(timestamp).add("600"),
        [],
        uniV3SwapPathForDAMMtoWBTC,
      ]),
    },
    {
      to: opWBTCEarn.address,
      value: "0",
      data: opWBTCEarn.interface.encodeFunctionData("rebalance"),
    },
  ];

  const safeTransaction = await safeSdk.createTransaction(transactions);

  const tx = await safeSdk.executeTransaction(safeTransaction);
  const txR = await tx.transactionResponse?.wait(1);
  console.log(txR);
}

main().then(console.log).catch(console.error);
