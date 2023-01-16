/* eslint-disable @typescript-eslint/no-unused-vars */
import Convex from "@optyfi/defi-legos/ethereum/convex";
import EthereumSushiswap from "@optyfi/defi-legos/ethereum/sushiswap/index";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { deployments, ethers } from "hardhat";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { MetaTransactionData, EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import { ERC20, ERC20__factory, IUniswapV2Router02, IUniswapV2Router02__factory } from "../../typechain";
import { formatEther, parseEther, parseUnits } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import { getCVXUnclaimed } from "./003_claim_and_swap_CRV_CVX_to_USDC";
import { VaultV6, VaultV6__factory } from "../../helpers/types/vaultv6";

const uniswapV3Router = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

async function main() {
  const opUSDCEarn = <VaultV6>(
    await ethers.getContractAt(VaultV6__factory.abi, (await deployments.get("opUSDC-Earn_Proxy")).address)
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

  const opWBTCEarn = <VaultV6>(
    await ethers.getContractAt(VaultV6__factory.abi, (await deployments.get("opWBTC-Earn_Proxy")).address)
  );

  const opUSD3Earn = <VaultV6>(
    await ethers.getContractAt(VaultV6__factory.abi, (await deployments.get("opUSD3-Earn_Proxy")).address)
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

  const crvWSBTCGaugeInstance = await ethers.getContractAt(curveGuageABI, "0x6D787113F23bED1D5e1530402B3f364D0A6e5Af3");

  const cvxStEthGaugeInstance = await ethers.getContractAt(cvxABI, Convex.pools.steth.stakingPool);

  const cvxInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.REWARD_TOKENS.CVX);
  const crvInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.REWARD_TOKENS.CRV);
  const ldoInstance = <ERC20>(
    await ethers.getContractAt(ERC20__factory.abi, "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32")
  );
  const sushiInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.REWARD_TOKENS.SUSHI);

  const crvUnclaimedForopUSDCEarn = await cvxMIM3lp3GaugeInstance.earned(opUSDCEarn.address);
  const crvBalanceForopUSDCEarn = await crvInstance.balanceOf(opUSDCEarn.address);
  const crvBalanceForopWBTCEarn = await crvInstance.balanceOf(opWBTCEarn.address);

  const crvUnclaimedForopWBTCEarn = await crvWSBTCGaugeInstance.claimable_tokens(opWBTCEarn.address);

  console.log(formatEther(crvUnclaimedForopWBTCEarn));

  const cvxUnclaimedForopUSDCEarn = getCVXUnclaimed(
    crvUnclaimedForopUSDCEarn,
    await cvxInstance.totalSupply(),
    BigNumber.from("100000000000000000000000"),
    BigNumber.from("1000"),
    BigNumber.from("100000000000000000000000000"),
  );
  const cvxBalanceForopUSDCEarn = await cvxInstance.balanceOf(opUSDCEarn.address);

  const ldoUnclaimedForopWETHEarn = parseEther("21.460000000000000000");
  const ldoBalanceForopWETHEarn = await ldoInstance.balanceOf(opWETHEarn.address);

  const sushiBalanceForopUSDCInvst = await sushiInstance.balanceOf(opUSDCInvst.address);
  const sushiBalanceForopWETHInvst = await sushiInstance.balanceOf(opWETHInvst.address);

  const crvBalanceForOPUSD3Earn = await crvInstance.balanceOf(opUSD3Earn.address);
  const crvUnclaimedForopUSD3Earn = await cvxMIM3lp3GaugeInstance.earned(opUSD3Earn.address);
  const cvxBalanceForopUSD3Earn = await cvxInstance.balanceOf(opUSD3Earn.address);
  const cvxUnclaimedForopUSD3Earn = getCVXUnclaimed(
    crvUnclaimedForopUSD3Earn,
    await cvxInstance.totalSupply(),
    BigNumber.from("100000000000000000000000"),
    BigNumber.from("1000"),
    BigNumber.from("100000000000000000000000000"),
  );

  const oneCRVToUSDC = parseUnits("0.7", "6"); //0.53 crv - usdc
  const oneCVXToUSDC = parseUnits("3.6", "6"); // 3.3
  const oneLDOToWETH = parseEther("0.001"); //0.0008
  const oneSUSHIToUSDC = parseUnits("0.96", "6");
  const oneSUSHIToWETH = parseEther("0.0007"); // sushi-dai-weth
  const oneCRVToWBTC = parseUnits("0", "8");
  const oneCRVToUSD3 = parseUnits("0.7", "18");
  const oneCVXToUSD3 = parseUnits("3.4", "18");

  const expectedMinUSD3FromCRVForopUSD3Earn = BigNumber.from(crvBalanceForOPUSD3Earn.add(crvUnclaimedForopUSD3Earn))
    .mul(oneCRVToUSD3)
    .div(parseEther("1"));
  const expectedMinUSD3FromCVXForopUSD3Earn = BigNumber.from(cvxBalanceForopUSD3Earn.add(cvxUnclaimedForopUSD3Earn))
    .mul(oneCVXToUSD3)
    .div(parseEther("1"));

  const expectedMinUSDCFromCRVForopUSDCEarn = BigNumber.from(crvBalanceForopUSDCEarn.add(crvUnclaimedForopUSDCEarn))
    .mul(oneCRVToUSDC)
    .div(parseEther("1"));

  const expectedMinWETHFromLDOForopWETHEarn = BigNumber.from(ldoBalanceForopWETHEarn.add(ldoUnclaimedForopWETHEarn))
    .mul(oneLDOToWETH)
    .div(parseEther("1"));

  const expectedMInUSDCFromCVXForopUSDCEarn = BigNumber.from(cvxBalanceForopUSDCEarn.add(cvxUnclaimedForopUSDCEarn))
    .mul(oneCVXToUSDC)
    .div(parseEther("1"));

  const expectedMinWBTCFromCRVForopWBTCEarn = BigNumber.from(crvBalanceForopWBTCEarn.add(crvUnclaimedForopWBTCEarn))
    .mul(oneCRVToWBTC)
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

  const uniV3SwapPathForCRVtoWBTC = ethers.utils.solidityPack(
    ["address", "uint24", "address", "uint24", "address"],
    [EthereumTokens.REWARD_TOKENS.CRV, 3000, EthereumTokens.PLAIN_TOKENS.USDT, 3000, EthereumTokens.BTC_TOKENS.WBTC],
  );

  const uniV3SwapPathForCRVtoUSD3 = ethers.utils.solidityPack(
    ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
    [
      EthereumTokens.REWARD_TOKENS.CRV,
      10000,
      EthereumTokens.WRAPPED_TOKENS.WETH,
      500,
      EthereumTokens.PLAIN_TOKENS.USDC,
      3000,
      EthereumTokens.WRAPPED_TOKENS.THREE_CRV,
    ],
  );

  const uniV3SwapPathForCVXtoUSD3 = ethers.utils.solidityPack(
    ["address", "uint24", "address", "uint24", "address"],
    [
      EthereumTokens.REWARD_TOKENS.CVX,
      10000,
      EthereumTokens.PLAIN_TOKENS.USDC,
      3000,
      EthereumTokens.WRAPPED_TOKENS.THREE_CRV,
    ],
  );

  const transactions: MetaTransactionData[] = [
    // claim CRV, CVX for opUSDC Earn
    {
      to: cvxMIM3lp3GaugeInstance.address,
      value: "0",
      data: cvxMIM3lp3GaugeInstance.interface.encodeFunctionData("getReward", [opUSDCEarn.address, true]),
    },
    // claim LDO,CRV,CVX for opWETHEarn
    {
      to: cvxStEthGaugeInstance.address,
      value: "0",
      data: cvxStEthGaugeInstance.interface.encodeFunctionData("getReward", [opWETHEarn.address, true]),
    },
    // claim CRV, CVX for opUSD3Earn
    {
      to: cvxMIM3lp3GaugeInstance.address,
      value: "0",
      data: cvxMIM3lp3GaugeInstance.interface.encodeFunctionData("getReward", [opUSD3Earn.address, true]),
    },
    // // claim CRV for opWBTCEarn
    // {
    //   to: crvWSBTCGaugeInstance.address,
    //   value: "0",
    //   data: crvWSBTCGaugeInstance.interface.encodeFunctionData("claim_rewards", [opWBTCEarn.address]),
    // },
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
    // // harvest CRV for opWBTCEarn
    // {
    //   to: opWBTCEarn.address,
    //   value: "0",
    //   data: opWBTCEarn.interface.encodeFunctionData("harvest", [
    //     crvInstance.address,
    //     uniswapV3Router, // "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    //     true,
    //     "0",
    //     BigNumber.from(timestamp).add("600"),
    //     [/*crvInstance.address, EthereumTokens.PLAIN_TOKENS.USDC, EthereumTokens.BTC_TOKENS.WBTC*/],
    //     uniV3SwapPathForCRVtoWBTC,
    //   ]),
    // },
    // harvest CVX for opUSD3Earn
    {
      to: opUSD3Earn.address,
      value: "0",
      data: opUSD3Earn.interface.encodeFunctionData("harvest", [
        EthereumTokens.REWARD_TOKENS.CVX,
        uniswapV3Router,
        true,
        expectedMinUSD3FromCVXForopUSD3Earn,
        BigNumber.from(timestamp).add("600"),
        [],
        uniV3SwapPathForCVXtoUSD3,
      ]),
    },
    // harvest CRV for opUSD3Earn
    {
      to: opUSD3Earn.address,
      value: "0",
      data: opUSD3Earn.interface.encodeFunctionData("harvest", [
        EthereumTokens.REWARD_TOKENS.CRV,
        uniswapV3Router,
        true,
        expectedMinUSD3FromCRVForopUSD3Earn,
        BigNumber.from(timestamp).add("600"),
        [],
        uniV3SwapPathForCRVtoUSD3,
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
          // EthereumTokens.PLAIN_TOKENS.USDT,
          // EthereumTokens.PLAIN_TOKENS.DAI,
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
    //     [
    //       sushiInstance.address,
    //       EthereumTokens.PLAIN_TOKENS.USDT,
    //       EthereumTokens.PLAIN_TOKENS.DAI,
    //       EthereumTokens.PLAIN_TOKENS.USDC,
    //     ],
    //     "0x",
    //   ]),
    // },
    // vaultDepositAllToStrategy for opUSDCEarn
    {
      to: opUSDCEarn.address,
      value: "0",
      data: opUSDCEarn.interface.encodeFunctionData("vaultDepositAllToStrategy"),
    },
    // vaultDepositAllToStrategy for opWETHEarn
    {
      to: opWETHEarn.address,
      value: "0",
      data: opWETHEarn.interface.encodeFunctionData("vaultDepositAllToStrategy"),
    },
    // // vaultDepositAllToStrategy for opWBTCEarn
    // {
    //   to: opWBTCEarn.address,
    //   value: "0",
    //   data: opWBTCEarn.interface.encodeFunctionData("vaultDepositAllToStrategy"),
    // },
    // // vaultDepositAllToStrategy for opWETHInvst
    // {
    //   to: opWETHInvst.address,
    //   value: "0",
    //   data: opWETHInvst.interface.encodeFunctionData("vaultDepositAllToStrategy"),
    // },
    // // vaultDepositAllToStrategy for opUSDCInvst
    // {
    //   to: opUSDCInvst.address,
    //   value: "0",
    //   data: opUSDCInvst.interface.encodeFunctionData("vaultDepositAllToStrategy"),
    // },
    // vaultDepositAllToStrategy for opWBTCEarn
    {
      to: opUSD3Earn.address,
      value: "0",
      data: opUSD3Earn.interface.encodeFunctionData("vaultDepositAllToStrategy"),
    },
  ];

  const safeOwner = ethers.provider.getSigner(0);
  const safeAddress = "0x9DD0E8A985315785473f7EB81bc4e28838e13D96";
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

const curveGuageABI = [
  {
    stateMutability: "nonpayable",
    type: "function",
    name: "claim_rewards",
    inputs: [
      {
        name: "_addr",
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
