/* eslint-disable @typescript-eslint/no-unused-vars */
import EthereumSushiswap from "@optyfi/defi-legos/ethereum/sushiswap/index";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { deployments, ethers } from "hardhat";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import Convex from "@optyfi/defi-legos/ethereum/convex";
import { MetaTransactionData, EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import {
  ERC20,
  ERC20__factory,
  ICompound,
  ICompound__factory,
  ICurveSwap,
  ICurveSwap__factory,
  ISwapRouter,
  ISwapRouter__factory,
  IUniswapV2Router02,
  IUniswapV2Router02__factory,
} from "../../typechain";
import { formatEther, parseEther, parseUnits } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import { comptrollerABI } from "./007_BDAMM";
import { VaultV6, VaultV6__factory } from "../../helpers/types/vaultv6";
import { getCVXUnclaimed } from "./003_claim_and_swap_CRV_CVX_to_USDC";

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

const uniswapV3Router = ethers.utils.getAddress("0xE592427A0AEce92De3Edee1F18E0157C05861564");
const dWBTCAddress = "0x63D6b99659f7b05b054DEEF582F5DaAa51780E80";
async function main() {
  const uniswapV3RouterInstance = <ISwapRouter>await ethers.getContractAt(ISwapRouter__factory.abi, uniswapV3Router);
  const compoundComptrollerInstance = await ethers.getContractAt(
    comptrollerABI,
    "0x4F96AB61520a6636331a48A11eaFBA8FB51f74e4",
  );
  const bdammRedemption = await ethers.getContractAt(redemptionABI, "0x46b825C8Ff734D534e6E40b2fE2C21643eCBF493");
  const sushiswapRouter = <IUniswapV2Router02>(
    await ethers.getContractAt(IUniswapV2Router02__factory.abi, EthereumSushiswap.SushiswapRouter.address)
  );
  const opWBTCEarn = <VaultV6>(
    await ethers.getContractAt(VaultV6__factory.abi, (await deployments.get("opWBTC-Earn_Proxy")).address)
  );
  const opUSD3Earn = <VaultV6>(
    await ethers.getContractAt(VaultV6__factory.abi, (await deployments.get("opUSD3-Earn_Proxy")).address)
  );
  const usdc = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.PLAIN_TOKENS.USDC);

  const usdcBalanceForopUSD3Earn = await usdc.balanceOf(opUSD3Earn.address);

  const dWBTCInstance = <ICompound>await ethers.getContractAt(ICompound__factory.abi, dWBTCAddress);
  const dWBTCERC20Instance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, dWBTCInstance.address);

  const dwbtcBalance = await dWBTCERC20Instance.balanceOf(opWBTCEarn.address);

  const cvxMIM3lp3GaugeInstance = await ethers.getContractAt(cvxABI, Convex.pools.mim.stakingPool);

  const cvxInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.REWARD_TOKENS.CVX);
  const crvInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.REWARD_TOKENS.CRV);

  const cvxBalanceForopUSD3Earn = await cvxInstance.balanceOf(opUSD3Earn.address);
  const crvUnclaimedForopUSD3Earn = await cvxMIM3lp3GaugeInstance.earned(opUSD3Earn.address);
  const crvBalanceForOPUSD3Earn = await crvInstance.balanceOf(opUSD3Earn.address);

  const threeCrvPool = <ICurveSwap>(
    await ethers.getContractAt(ICurveSwap__factory.abi, "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7")
  );

  const cvxUnclaimedForopUSD3Earn = getCVXUnclaimed(
    crvUnclaimedForopUSD3Earn,
    await cvxInstance.totalSupply(),
    BigNumber.from("100000000000000000000000"),
    BigNumber.from("1000"),
    BigNumber.from("100000000000000000000000000"),
  );

  console.log(formatEther(crvUnclaimedForopUSD3Earn));
  console.log(formatEther(cvxUnclaimedForopUSD3Earn));

  const oneCRVToUSDC = parseUnits("0.5", "6"); //0.53 crv - usdc
  const oneCVXToUSDC = parseUnits("3.1", "6"); // 3.3
  const oneCRVToUSD3 = parseUnits("0.5", "18");
  const oneCVXToUSD3 = parseUnits("3", "18");

  const expectedMinUSDCFromCRVForopUSD3Earn = BigNumber.from(crvBalanceForOPUSD3Earn.add(crvUnclaimedForopUSD3Earn))
    .mul(oneCRVToUSDC)
    .div(parseEther("1"));
  const expectedMinUSDCFromCVXForopUSD3Earn = BigNumber.from(cvxBalanceForopUSD3Earn.add(cvxUnclaimedForopUSD3Earn))
    .mul(oneCVXToUSDC)
    .div(parseEther("1"));

  const safeOwner = ethers.provider.getSigner(0);
  const safeAddress = "0xb95dff9A2D1d0003e74A64A1f36eE6767c8fb9Ed";
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
  const uniV3SwapPathForCRVtoUSDC = ethers.utils.solidityPack(
    ["address", "uint24", "address"],
    [EthereumTokens.REWARD_TOKENS.CRV, 10000, EthereumTokens.PLAIN_TOKENS.USDC],
  );
  const uniV3SwapPathForCVXtoUSDC = ethers.utils.solidityPack(
    ["address", "uint24", "address"],
    [EthereumTokens.REWARD_TOKENS.CVX, 10000, EthereumTokens.PLAIN_TOKENS.USDC],
  );
  const crvWSBTCGaugeInstance = await ethers.getContractAt(curveGuageABI, "0x6D787113F23bED1D5e1530402B3f364D0A6e5Af3");
  const transactions: MetaTransactionData[] = [
    // {
    //   to: compoundComptrollerInstance.address,
    //   value: "0",
    //   data: compoundComptrollerInstance.interface.encodeFunctionData("claimComp", [
    //     [opWBTCEarn.address],
    //     [
    //       "0x63D6b99659f7b05b054DEEF582F5DaAa51780E80", // dAMM finance - dWBTC
    //     ],
    //     false,
    //     true,
    //   ]),
    // },
    // {
    //   to: opWBTCEarn.address,
    //   value: "0",
    //   data: opWBTCEarn.interface.encodeFunctionData("adminCall", [
    //     [
    //       ethers.utils.defaultAbiCoder.encode(
    //         ["address", "bytes"],
    //         [dWBTCInstance.address, dWBTCInstance.interface.encodeFunctionData("redeem", [dwbtcBalance])],
    //       ),
    //       ethers.utils.defaultAbiCoder.encode(
    //         ["address", "bytes"],
    //         [
    //           sushiswapRouter.address,
    //           sushiswapRouter.interface.encodeFunctionData("swapTokensForExactTokens", [
    //             parseUnits("57.886070", "6"),
    //             parseUnits("0.0035", "8"),
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
    //           usdc.interface.encodeFunctionData("approve", [bdammRedemption.address, parseUnits("57.886070", "6")]),
    //         ],
    //       ),
    //       ethers.utils.defaultAbiCoder.encode(
    //         ["address", "bytes"],
    //         [
    //           "0xfa372fF1547fa1a283B5112a4685F1358CE5574d",
    //           usdc.interface.encodeFunctionData("approve", [bdammRedemption.address, parseEther("526.237")]),
    //         ],
    //       ),
    //       ethers.utils.defaultAbiCoder.encode(
    //         ["address", "bytes"],
    //         [
    //           bdammRedemption.address,
    //           bdammRedemption.interface.encodeFunctionData("redeem", [
    //             parseEther("526.237"),
    //             parseUnits("57.886070", "6"),
    //           ]),
    //         ],
    //       ),
    //       ethers.utils.defaultAbiCoder.encode(
    //         ["address", "bytes"],
    //         [
    //           uniswapV3Router,
    //           uniswapV3RouterInstance.interface.encodeFunctionData("exactInput", [
    //             {
    //               path: uniV3SwapPathForDAMMtoWBTC,
    //               recipient: opWBTCEarn.address,
    //               deadline: BigNumber.from(timestamp).add("600"),
    //               amountIn: parseEther("526.237"),
    //               amountOutMinimum: parseUnits("0", "6"),
    //             },
    //           ]),
    //         ],
    //       ),
    //       ethers.utils.defaultAbiCoder.encode(
    //         ["address", "bytes"],
    //         [opWBTCEarn.address, opWBTCEarn.interface.encodeFunctionData("vaultDepositAllToStrategy")],
    //       ),
    //     ],
    //   ]),
    // },
    // claim CRV, CVX for opUSD3Earn
    {
      to: cvxMIM3lp3GaugeInstance.address,
      value: "0",
      data: cvxMIM3lp3GaugeInstance.interface.encodeFunctionData("getReward", [opUSD3Earn.address, true]),
    },
    {
      to: opUSD3Earn.address,
      value: "0",
      data: opUSD3Earn.interface.encodeFunctionData("adminCall", [
        [
          // CRV to USDC
          ethers.utils.defaultAbiCoder.encode(
            ["address", "bytes"],
            [
              uniswapV3RouterInstance.address,
              uniswapV3RouterInstance.interface.encodeFunctionData("exactInput", [
                {
                  path: uniV3SwapPathForCRVtoUSDC,
                  deadline: BigNumber.from(timestamp).add("600"),
                  amountIn: crvBalanceForOPUSD3Earn.add(crvUnclaimedForopUSD3Earn),
                  amountOutMinimum: expectedMinUSDCFromCRVForopUSD3Earn,
                  recipient: opUSD3Earn.address,
                },
              ]),
            ],
          ),
          // CVX to USDC
          ethers.utils.defaultAbiCoder.encode(
            ["address", "bytes"],
            [
              uniswapV3RouterInstance.address,
              uniswapV3RouterInstance.interface.encodeFunctionData("exactInput", [
                {
                  path: uniV3SwapPathForCVXtoUSDC,
                  deadline: BigNumber.from(timestamp).add("600"),
                  amountIn: cvxBalanceForopUSD3Earn.add(cvxUnclaimedForopUSD3Earn),
                  amountOutMinimum: expectedMinUSDCFromCVXForopUSD3Earn,
                  recipient: opUSD3Earn.address,
                },
              ]),
            ],
          ),
          // USDC to 3Crv
          ethers.utils.defaultAbiCoder.encode(
            ["address", "bytes"],
            [
              threeCrvPool.address,
              threeCrvPool.interface.encodeFunctionData("add_liquidity(uint256[3],uint256)", [
                [
                  0,
                  expectedMinUSDCFromCRVForopUSD3Earn
                    .add(expectedMinUSDCFromCVXForopUSD3Earn)
                    .add(usdcBalanceForopUSD3Earn),
                  0,
                ],
                "11000000000000000000",
              ]),
            ],
          ),
          ethers.utils.defaultAbiCoder.encode(
            ["address", "bytes"],
            [opUSD3Earn.address, opUSD3Earn.interface.encodeFunctionData("vaultDepositAllToStrategy")],
          ),
        ],
      ]),
    },
    // {
    //   to: opWBTCEarn.address,
    //   value: "0",
    //   data: opWBTCEarn.interface.encodeFunctionData("adminCall", [
    //     ethers.utils.defaultAbiCoder.encode(
    //       ["address", "bytes"],
    //       [
    //         crvWSBTCGaugeInstance.address,
    //         crvWSBTCGaugeInstance.interface.encodeFunctionData("claim_rewards(address,address)", [opWBTCEarn.address, opWBTCEarn.address])
    //       ]
    //     )
    //   ])
    // }
  ];

  const safeTransaction = await safeSdk.createTransaction(transactions);

  const tx = await safeSdk.executeTransaction(safeTransaction);
  const txR = await tx.transactionResponse?.wait(1);
  console.log(txR);
}

main().then(console.log).catch(console.error);

const cvxABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_account",
        type: "address",
      },
      {
        internalType: "bool",
        name: "_claimExtras",
        type: "bool",
      },
    ],
    name: "getReward",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "earned",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const curveGuageABI = [
  // {
  //   stateMutability: "nonpayable",
  //   type: "function",
  //   name: "claim_rewards",
  //   inputs: [
  //     {
  //       name: "_addr",
  //       type: "address",
  //     },
  //   ],
  //   outputs: [],
  // },
  // {
  //   "stateMutability": "nonpayable",
  //   "type": "function",
  //   "name": "claim_rewards",
  //   "inputs": [],
  //   "outputs": []
  // },
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "claim_rewards",
    inputs: [
      {
        name: "_addr",
        type: "address",
      },
      {
        name: "_receiver",
        type: "address",
      },
    ],
    outputs: [],
  },
  {
    name: "claimable_tokens",
    outputs: [
      {
        type: "uint256",
        name: "",
      },
    ],
    inputs: [
      {
        type: "address",
        name: "addr",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    name: "minter",
    outputs: [
      {
        type: "address",
        name: "",
      },
    ],
    inputs: [],
    stateMutability: "view",
    type: "function",
  },
];
