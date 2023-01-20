/* eslint-disable @typescript-eslint/no-unused-vars */
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { deployments, ethers } from "hardhat";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { MetaTransactionData, EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import { VaultV6, VaultV6__factory } from "../helpers/types/vaultv6";
import { VaultMigrator__factory } from "../typechain/factories/VaultMigrator__factory";
import { VaultMigrator } from "../typechain/VaultMigrator";
import { ERC20, ERC20__factory } from "../typechain";
import opUSDCEarnHolders from "./opUSDC-Earn-holders.json";
import opWETHEarnHolders from "./opWETH-Earn-holders.json";

async function main() {
  const opUSDCEarnOldAddress = "0x6d8bfdb4c4975bb086fc9027e48d5775f609ff88";
  const opWETHEarnOldAddress = "0xff2fbd9fbc6d03baa77cf97a3d5671bea183b9a8";

  const opUSDCEarnOld = <VaultV6>await ethers.getContractAt(VaultV6__factory.abi, opUSDCEarnOldAddress);
  const opUSDCEarnNew = <VaultMigrator>(
    await ethers.getContractAt(VaultMigrator__factory.abi, (await deployments.get("opUSDC-Earn_Proxy")).address)
  );
  const opWETHEarnOld = <VaultV6>await ethers.getContractAt(VaultV6__factory.abi, opWETHEarnOldAddress);

  const opWETHEarnNew = <VaultMigrator>(
    await ethers.getContractAt(VaultMigrator__factory.abi, (await deployments.get("opWETH-Earn_Proxy")).address)
  );

  const usdcInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.PLAIN_TOKENS.USDC);
  const wethInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.WRAPPED_TOKENS.WETH);

  const opUSDCEarnHolderAddresses = opUSDCEarnHolders.map(x => x.HolderAddress);
  const opWETHEarnHolderAddresses = opWETHEarnHolders.map(x => x.HolderAddress);

  const opUSDCEarnHolderBalances = [];
  const opWETHEarnHolderBalances = [];

  for (const opUSDCEarnHolderAddress of opUSDCEarnHolderAddresses) {
    const balance = await usdcInstance.balanceOf(opUSDCEarnHolderAddress, { blockTag: 16446249 });
    opUSDCEarnHolderBalances.push(balance);
  }

  for (const opWETHEarnHolderAddress of opWETHEarnHolderAddresses) {
    const balance = await wethInstance.balanceOf(opWETHEarnHolderAddress, { blockTag: 16446249 });
    opWETHEarnHolderBalances.push(balance);
  }

  const transactions: MetaTransactionData[] = [
    // transfer USDC from old opUSDC-Earn to new opUSDC-Earn
    {
      to: opUSDCEarnOld.address,
      value: "0",
      data: opUSDCEarnOld.interface.encodeFunctionData("adminCall", [
        [
          ethers.utils.defaultAbiCoder.encode(
            ["address", "bytes"],
            [
              usdcInstance.address,
              usdcInstance.interface.encodeFunctionData("transfer", [
                opUSDCEarnNew.address,
                await usdcInstance.balanceOf(opUSDCEarnOld.address),
              ]),
            ],
          ),
        ],
      ]),
    },
    // transfer WETH from old opWETH-Earn to new opWETH-Earn
    {
      to: opWETHEarnOld.address,
      value: "0",
      data: opWETHEarnOld.interface.encodeFunctionData("adminCall", [
        [
          ethers.utils.defaultAbiCoder.encode(
            ["address", "bytes"],
            [
              wethInstance.address,
              wethInstance.interface.encodeFunctionData("transfer", [
                opWETHEarnNew.address,
                await wethInstance.balanceOf(opWETHEarnOld.address),
              ]),
            ],
          ),
        ],
      ]),
    },
    // mint opUSDC-Earn
    {
      to: opUSDCEarnNew.address,
      value: "0",
      data: opUSDCEarnNew.interface.encodeFunctionData("adminMint", [
        opUSDCEarnHolderAddresses,
        opUSDCEarnHolderBalances,
      ]),
    },
    // mint opWETH-Earn
    {
      to: opWETHEarnNew.address,
      value: "0",
      data: opWETHEarnNew.interface.encodeFunctionData("adminMint", [
        opWETHEarnHolderAddresses,
        opWETHEarnHolderBalances,
      ]),
    },
  ];

  const safeOwner = ethers.provider.getSigner(0);
  const safeAddress = "0xb95dff9A2D1d0003e74A64A1f36eE6767c8fb9Ed";
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
