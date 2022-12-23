/* eslint-disable @typescript-eslint/no-unused-vars */
import Convex from "@optyfi/defi-legos/ethereum/convex";
import EthereumSushiswap from "@optyfi/defi-legos/ethereum/sushiswap/index";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { deployments, ethers } from "hardhat";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { MetaTransactionData, EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import { ERC20, ERC20__factory, IUniswapV2Router02, IUniswapV2Router02__factory } from "../../typechain";
import { parseEther, parseUnits } from "ethers/lib/utils";
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

  const cvxInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.REWARD_TOKENS.CVX);
  const crvInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.REWARD_TOKENS.CRV);
  const ldoInstance = <ERC20>(
    await ethers.getContractAt(ERC20__factory.abi, "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32")
  );
  const sushiInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.REWARD_TOKENS.SUSHI);

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

  const ldoUnclaimedForopWETHEarn = parseEther("13.310000000000000000");
  const ldoBalanceForopWETHEarn = await ldoInstance.balanceOf(opWETHEarn.address);

  const sushiBalanceForopUSDCInvst = await sushiInstance.balanceOf(opUSDCInvst.address);
  const sushiBalanceForopWETHInvst = await sushiInstance.balanceOf(opWETHInvst.address);

  const oneCRVToUSDC = parseUnits("0.5", "6"); //0.53 crv - usdc
  const oneCVXToUSDC = parseUnits("3.2", "6"); // 3.3
  const oneLDOToWETH = parseEther("0.0007"); //0.0008
  const oneSUSHIToUSDC = parseUnits("0.96", "6");
  const oneSUSHIToWETH = parseEther("0.0007"); // sushi-dai-weth

  const expectedMinUSDCFromCRVForopUSDCEarn = BigNumber.from(crvBalanceForopUSDCEarn.add(crvUnclaimedForopUSDCEarn))
    .mul(oneCRVToUSDC)
    .div(parseEther("1"));

  const expectedMinWETHFromLDOForopWETHEarn = BigNumber.from(ldoBalanceForopWETHEarn.add(ldoUnclaimedForopWETHEarn))
    .mul(oneLDOToWETH)
    .div(parseEther("1"));

  const expectedMInUSDCFromCVXForopUSDCEarn = BigNumber.from(cvxBalanceForopUSDCEarn.add(cvxUnclaimedForopUSDCEarn))
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
    // harvest SUSHI for opUSDCInvst
    {
      to: opUSDCInvst.address,
      value: "0",
      data: opUSDCInvst.interface.encodeFunctionData("harvest", [
        sushiInstance.address,
        sushiswapRouter.address,
        false,
        expectedMinUSDCFromSUSHIForopUSDCInvst,
        BigNumber.from(timestamp).add("600"),
        [
          sushiInstance.address,
          EthereumTokens.PLAIN_TOKENS.USDT,
          EthereumTokens.PLAIN_TOKENS.DAI,
          EthereumTokens.PLAIN_TOKENS.USDC,
        ],
        "0x",
      ]),
    },
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
    // vaultDepositAllToStrategy for opWETHInvst
    {
      to: opWETHInvst.address,
      value: "0",
      data: opWETHInvst.interface.encodeFunctionData("vaultDepositAllToStrategy"),
    },
    // vaultDepositAllToStrategy for opUSDCInvst
    {
      to: opUSDCInvst.address,
      value: "0",
      data: opUSDCInvst.interface.encodeFunctionData("vaultDepositAllToStrategy"),
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