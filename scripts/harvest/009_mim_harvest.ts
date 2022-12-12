/* eslint-disable @typescript-eslint/no-unused-vars */
import Convex from "@optyfi/defi-legos/ethereum/convex";
import EthereumSushiswap from "@optyfi/defi-legos/ethereum/sushiswap/index";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { deployments, ethers } from "hardhat";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { MetaTransactionData, EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import {
  ERC20,
  ERC20__factory,
  IConvexStake,
  ICurveSwap,
  ICurveSwap__factory,
  IUniswapV2Router02,
  IUniswapV2Router02__factory,
} from "../../typechain";
import { formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import { getCVXUnclaimed } from "./003_claim_and_swap_CRV_CVX_to_USDC";
import { VaultV6, VaultV6__factory } from "../../helpers/types/vaultv6";

const uniswapV3Router = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

async function main() {
  const opUSDCEarn = <VaultV6>(
    await ethers.getContractAt(VaultV6__factory.abi, (await deployments.get("opUSDC-Earn_Proxy")).address)
  );
  const opUSD3Earn = <VaultV6>(
    await ethers.getContractAt(VaultV6__factory.abi, (await deployments.get("opUSD3-Earn_Proxy")).address)
  );
  const opWETHEarn = <VaultV6>(
    await ethers.getContractAt(VaultV6__factory.abi, (await deployments.get("opWETH-Earn_Proxy")).address)
  );
  const opUSDCInvst = <VaultV6>(
    await ethers.getContractAt(VaultV6__factory.abi, (await deployments.get("opUSDC-Invst_Proxy")).address)
  );
  const opWETHInvst = <VaultV6>(
    await ethers.getContractAt(VaultV6__factory.abi, (await deployments.get("opWETH-Invst_Proxy")).address)
  );
  const sushiswapRouter = <IUniswapV2Router02>(
    await ethers.getContractAt(IUniswapV2Router02__factory.abi, EthereumSushiswap.SushiswapRouter.address)
  );

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

  const cvxMIM3lp3GaugeInstance = await ethers.getContractAt(cvxABI, Convex.pools.mim.stakingPool);

  const cvxStEthGaugeInstance = await ethers.getContractAt(cvxABI, Convex.pools.steth.stakingPool);

  const threeCrvPool = <ICurveSwap>(
    await ethers.getContractAt(ICurveSwap__factory.abi, "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7")
  );

  const cvxInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.REWARD_TOKENS.CVX);
  const crvInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.REWARD_TOKENS.CRV);
  const ldoInstance = <ERC20>(
    await ethers.getContractAt(ERC20__factory.abi, "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32")
  );
  const sushiInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.REWARD_TOKENS.SUSHI);
  const usdcInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.PLAIN_TOKENS.USDC);

  const crvUnclaimedForopUSDCEarn = await cvxMIM3lp3GaugeInstance.earned(opUSDCEarn.address);
  const crvBalanceForopUSDCEarn = await crvInstance.balanceOf(opUSDCEarn.address);

  const cvxUnclaimedForopUSDCEarn = getCVXUnclaimed(
    crvUnclaimedForopUSDCEarn,
    await cvxInstance.totalSupply(),
    BigNumber.from("100000000000000000000000"),
    BigNumber.from("1000"),
    BigNumber.from("100000000000000000000000000"),
  );
  const cvxBalanceForopUSDCEarn = await cvxInstance.balanceOf(opUSDCEarn.address);

  const ldoUnclaimedForopWETHEarn = parseEther("15.510000000000000000");
  const ldoBalanceForopWETHEarn = await ldoInstance.balanceOf(opWETHEarn.address);

  const crvUnclaimedForopUSD3Earn = await cvxMIM3lp3GaugeInstance.earned(opUSD3Earn.address);
  const crvBalanceForOPUSD3Earn = await crvInstance.balanceOf(opUSD3Earn.address);
  const usdcBalanceForopUSD3Earn = await usdcInstance.balanceOf(opUSD3Earn.address);

  const cvxUnclaimedForopUSD3Earn = getCVXUnclaimed(
    crvUnclaimedForopUSD3Earn,
    await cvxInstance.totalSupply(),
    BigNumber.from("100000000000000000000000"),
    BigNumber.from("1000"),
    BigNumber.from("100000000000000000000000000"),
  );
  const cvxBalanceForopUSD3Earn = await cvxInstance.balanceOf(opUSD3Earn.address);

  const sushiBalanceForopUSDCInvst = await sushiInstance.balanceOf(opUSDCInvst.address);
  const sushiBalanceForopWETHInvst = await sushiInstance.balanceOf(opWETHInvst.address);

  const oneCRVToUSDC = parseUnits("0.59", "6"); // crv - usdc
  const oneCVXToUSDC = parseUnits("3.7", "6");
  const oneLDOToWETH = parseEther("0.0008");
  const oneSUSHIToUSDC = parseUnits("1.33", "6");
  const oneSUSHIToWETH = parseEther("0.001"); // sushi-dai-weth

  const expectedMinUSDCFromCRVForopUSDCEarn = BigNumber.from(crvBalanceForopUSDCEarn.add(crvUnclaimedForopUSDCEarn))
    .mul(oneCRVToUSDC)
    .div(parseEther("1"));

  const expectedMinWETHFromLDOForopWETHEarn = BigNumber.from(ldoBalanceForopWETHEarn.add(ldoUnclaimedForopWETHEarn))
    .mul(oneLDOToWETH)
    .div(parseEther("1"));

  const expectedMInUSDCFromCVXForopUSDCEarn = BigNumber.from(cvxBalanceForopUSDCEarn.add(cvxUnclaimedForopUSDCEarn))
    .mul(oneCVXToUSDC)
    .div(parseEther("1"));

  const expectedMinUSDCFromCRVForopUSD3Earn = BigNumber.from(crvBalanceForOPUSD3Earn.add(crvUnclaimedForopUSD3Earn))
    .mul(oneCRVToUSDC)
    .div(parseEther("1"));
  const expectedMinUSDCFromCVXForopUSD3Earn = BigNumber.from(cvxBalanceForopUSD3Earn.add(cvxUnclaimedForopUSD3Earn))
    .mul(oneCVXToUSDC)
    .div(parseEther("1"));
  const expectedMinUSDCFromSUSHIForopUSDCInvst = sushiBalanceForopUSDCInvst.mul(oneSUSHIToUSDC).div(parseEther("1"));
  const expectMinWETHFromSUSHIForopWETHInvst = sushiBalanceForopWETHInvst.mul(oneSUSHIToWETH).div(parseEther("1"));

  const timestamp = (await ethers.provider.getBlock("latest")).timestamp;

  const uniV3SwapPathForCRVtoUSDC = ethers.utils.solidityPack(
    ["address", "uint24", "address"],
    [EthereumTokens.REWARD_TOKENS.CRV, 10000, EthereumTokens.PLAIN_TOKENS.USDC],
  );

  const uniV3SwapPathForCVXtoUSDC = ethers.utils.solidityPack(
    ["address", "uint24", "address"],
    [EthereumTokens.REWARD_TOKENS.CVX, 10000, EthereumTokens.PLAIN_TOKENS.USDC],
  );

  const transactions: MetaTransactionData[] = [
    // claim CRV, CVX for opUSDC Earn
    {
      to: cvxMIM3lp3GaugeInstance.address,
      value: "0",
      data: cvxMIM3lp3GaugeInstance.interface.encodeFunctionData("getReward", [opUSDCEarn.address, true]),
    },
    // // ----
    // claim CRV, CVX for opUSD3Earn
    {
      to: cvxMIM3lp3GaugeInstance.address,
      value: "0",
      data: cvxMIM3lp3GaugeInstance.interface.encodeFunctionData("getReward", [opUSD3Earn.address, true]),
    },
    // // ----
    // claim LDO,CRV,CVX for opWETHEarn
    {
      to: cvxStEthGaugeInstance.address,
      value: "0",
      data: cvxStEthGaugeInstance.interface.encodeFunctionData("getReward", [opWETHEarn.address, true]),
    },
    // harvest CRV for opUSDCEarn
    {
      to: opUSDCEarn.address,
      value: "0",
      data: opUSDCEarn.interface.encodeFunctionData("harvest", [
        EthereumTokens.REWARD_TOKENS.CRV,
        uniswapV3Router,
        true,
        expectedMinUSDCFromCRVForopUSDCEarn,
        BigNumber.from(timestamp).add("600"),
        [
          /*EthereumTokens.REWARD_TOKENS.CRV, EthereumTokens.PLAIN_TOKENS.DAI, EthereumTokens.PLAIN_TOKENS.USDC*/
        ],
        uniV3SwapPathForCRVtoUSDC,
      ]),
    },
    // // ----
    // // swap CRV to USDC
    // {
    //   to: opUSD3Earn.address,
    //   value: "0",
    //   data: opUSD3Earn.interface.encodeFunctionData("adminCall", [
    //     [
    //       ethers.utils.defaultAbiCoder.encode(
    //         ["address", "bytes"],
    //         [
    //           sushiswapRouter.address,
    //           sushiswapRouter.interface.encodeFunctionData("swapExactTokensForTokens", [
    //             crvBalanceForOPUSD3Earn.add(crvUnclaimedForopUSD3Earn),
    //             expectedMinUSDCFromCRVForopUSD3Earn,
    //             [
    //               EthereumTokens.REWARD_TOKENS.CRV,
    //               EthereumTokens.PLAIN_TOKENS.DAI,
    //               EthereumTokens.PLAIN_TOKENS.USDT,
    //               EthereumTokens.PLAIN_TOKENS.USDC,
    //             ],
    //             opUSD3Earn.address,
    //             BigNumber.from(timestamp).add(600),
    //           ]),
    //         ],
    //       ),
    //     ],
    //   ]),
    // },
    // // ----
    // harvest CVX for opUSDCEarn
    {
      to: opUSDCEarn.address,
      value: "0",
      data: opUSDCEarn.interface.encodeFunctionData("harvest", [
        EthereumTokens.REWARD_TOKENS.CVX,
        uniswapV3Router,
        true,
        expectedMInUSDCFromCVXForopUSDCEarn,
        BigNumber.from(timestamp).add("600"),
        [
          /*EthereumTokens.REWARD_TOKENS.CVX, EthereumTokens.PLAIN_TOKENS.USDC*/
        ],
        uniV3SwapPathForCVXtoUSDC,
      ]),
    },
    // // ----
    // // harvest CVX for opUSD3Earn
    // // swap CVX to USDC
    // {
    //   to: opUSD3Earn.address,
    //   value: "0",
    //   data: opUSD3Earn.interface.encodeFunctionData("adminCall", [
    //     [
    //       ethers.utils.defaultAbiCoder.encode(
    //         ["address", "bytes"],
    //         [
    //           sushiswapRouter.address,
    //           sushiswapRouter.interface.encodeFunctionData("swapExactTokensForTokens", [
    //             cvxBalanceForopUSD3Earn.add(cvxUnclaimedForopUSD3Earn),
    //             expectedMinUSDCFromCVXForopUSD3Earn,
    //             [
    //               EthereumTokens.REWARD_TOKENS.CVX,
    //               EthereumTokens.WRAPPED_TOKENS.WETH,
    //               EthereumTokens.REWARD_TOKENS.SUSHI,
    //               EthereumTokens.PLAIN_TOKENS.USDC,
    //             ],
    //             opUSD3Earn.address,
    //             BigNumber.from(timestamp).add(600),
    //           ]),
    //         ],
    //       ),
    //     ],
    //   ]),
    // },
    // // swap USDC to 3crv
    // {
    //   to: opUSD3Earn.address,
    //   value: "0",
    //   data: opUSD3Earn.interface.encodeFunctionData("adminCall", [
    //     [
    //       ethers.utils.defaultAbiCoder.encode(
    //         ["address", "bytes"],
    //         [
    //           threeCrvPool.address,
    //           threeCrvPool.interface.encodeFunctionData("add_liquidity(uint256[3],uint256)", [
    //             [
    //               0,
    //               expectedMinUSDCFromCRVForopUSD3Earn
    //                 .add(expectedMinUSDCFromCVXForopUSD3Earn)
    //                 .add(usdcBalanceForopUSD3Earn),
    //               0,
    //             ],
    //             "18000000000000000000",
    //           ]),
    //         ],
    //       ),
    //     ],
    //   ]),
    // },
    // // ----
    // harvest CVX for opWETHEarn
    // harvest LDO for opWETHEarn
    {
      to: opWETHEarn.address,
      value: "0",
      data: opWETHEarn.interface.encodeFunctionData("harvest", [
        ldoInstance.address,
        sushiswapRouter.address,
        false,
        expectedMinWETHFromLDOForopWETHEarn,
        BigNumber.from(timestamp).add("600"),
        [ldoInstance.address, EthereumTokens.WRAPPED_TOKENS.WETH],
        "0x",
      ]),
    },
    // harvest SUSHI for opWETHInvst
    {
      to: opWETHInvst.address,
      value: "0",
      data: opWETHInvst.interface.encodeFunctionData("harvest", [
        sushiInstance.address,
        sushiswapRouter.address,
        false,
        expectMinWETHFromSUSHIForopWETHInvst,
        BigNumber.from(timestamp).add("600"),
        [
          sushiInstance.address,
          EthereumTokens.PLAIN_TOKENS.USDT,
          EthereumTokens.PLAIN_TOKENS.DAI,
          EthereumTokens.WRAPPED_TOKENS.WETH,
        ],
        "0x",
      ]),
    },
    // // harvest SUSHI for opUSDCInvst
    // {
    //   to: opUSDCInvst.address,
    //   value: "0",
    //   data: opUSDCInvst.interface.encodeFunctionData("harvest", [
    //     sushiInstance.address,
    //     sushiswapRouter.address,
    //     false,
    //     expectedMinUSDCFromSUSHIForopUSDCInvst,
    //     BigNumber.from(timestamp).add("600"),
    //     [sushiInstance.address, EthereumTokens.PLAIN_TOKENS.USDT,EthereumTokens.PLAIN_TOKENS.DAI, EthereumTokens.PLAIN_TOKENS.USDC],
    //     "0x",
    //   ]),
    // },
    // vaultDepositAllToStrategy for opUSDCEarn
    {
      to: opUSDCEarn.address,
      value: "0",
      data: opUSDCEarn.interface.encodeFunctionData("vaultDepositAllToStrategy"),
    },
    // // ----
    // // vaultDepositAllToStrategy for opUSD3Earn
    // {
    //   to: opUSD3Earn.address,
    //   value: "0",
    //   data: opUSD3Earn.interface.encodeFunctionData("vaultDepositAllToStrategy"),
    // },
    // // ----
    // vaultDepositAllToStrategy for opWETHEarn
    {
      to: opWETHEarn.address,
      value: "0",
      data: opWETHEarn.interface.encodeFunctionData("vaultDepositAllToStrategy"),
    },
    // vaultDepositAllToStrategy for opWETHInvst
    {
      to: opWETHInvst.address,
      value: "0",
      data: opWETHInvst.interface.encodeFunctionData("vaultDepositAllToStrategy"),
    },
    // // vaultDepositAllToStrategy for opUSDCInvst
    // {
    //   to: opUSDCInvst.address,
    //   value: "0",
    //   data: opUSDCInvst.interface.encodeFunctionData("vaultDepositAllToStrategy"),
    // },
  ];

  const safeOwner = ethers.provider.getSigner(0);
  const safeAddress = "0x9DD0E8A985315785473f7EB81bc4e28838e13D96";
  // const safeAddress = "0xb95dff9A2D1d0003e74A64A1f36eE6767c8fb9Ed";
  const ethAdapter = <EthAdapter>new EthersAdapter({
    ethers,
    signer: safeOwner,
  });
  const safeSdk: Safe = await Safe.create({ ethAdapter, safeAddress });
  const safeTransaction = await safeSdk.createTransaction(transactions);

  console.log("safeTransaction ", safeTransaction.data);
  const tx = await safeSdk.executeTransaction(safeTransaction);
  const txR = await tx.transactionResponse?.wait(1);
  console.log(txR);
}

main().then(console.log).catch(console.error);
