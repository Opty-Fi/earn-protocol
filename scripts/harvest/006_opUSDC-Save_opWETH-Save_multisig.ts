import { deployments, ethers, getNamedAccounts } from "hardhat";
import ethereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import Compound from "@optyfi/defi-legos/ethereum/compound";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { MetaTransactionData, EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import {
  ERC20,
  ERC20__factory,
  ICompound,
  ICompound__factory,
  // IUniswapV2Factory,
  // IUniswapV2Factory__factory,
  IUniswapV2Router02,
  IUniswapV2Router02__factory,
  Registry,
  Registry__factory,
  Vault,
  Vault__factory,
} from "../../typechain";
import { BigNumber } from "ethers";
import { hexlify, parseEther, parseUnits } from "ethers/lib/utils";

// const uniswapV2Router02Address = ethers.utils.getAddress("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
const sushiswapRouterAddress = ethers.utils.getAddress("0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F");
const uniswapV3Router = ethers.utils.getAddress("0xE592427A0AEce92De3Edee1F18E0157C05861564");
const STK_AAVE = ethers.utils.getAddress("0x4da27a545c0c5B758a6BA100e3a049001de870f5");

const comptrollerABI = [
  {
    constant: false,
    inputs: [
      { internalType: "address", name: "holder", type: "address" },
      {
        internalType: "contract CToken[]",
        name: "cTokens",
        type: "address[]",
      },
    ],
    name: "claimComp",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "compAccrued",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];

async function main() {
  const opUSDCSave = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opUSDC-Save_Proxy")).address)
  );
  const opWETHSave = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opWETH-Save_Proxy")).address)
  );
  const registry = <Registry>(
    await ethers.getContractAt(Registry__factory.abi, (await deployments.get("RegistryProxy")).address)
  );

  const comp = <ERC20>await ethers.getContractAt(ERC20__factory.abi, ethereumTokens.REWARD_TOKENS.COMP);
  const stkAAVE = <ERC20>await ethers.getContractAt(ERC20__factory.abi, STK_AAVE);

  // const uniswapV2 = <IUniswapV2Router02>(
  //   await ethers.getContractAt(IUniswapV2Router02__factory.abi, uniswapV2Router02Address)
  // );
  const sushiswap = <IUniswapV2Router02>(
    await ethers.getContractAt(IUniswapV2Router02__factory.abi, sushiswapRouterAddress)
  );
  // const uniswapFactory = <IUniswapV2Factory>(
  //   await ethers.getContractAt(IUniswapV2Factory__factory.abi, await uniswapV2.factory())
  // );
  // const sushiswapFactory = <IUniswapV2Factory>(
  //   await ethers.getContractAt(IUniswapV2Factory__factory.abi, await sushiswap.factory())
  // );
  const cUSDC = <ICompound>await ethers.getContractAt(ICompound__factory.abi, Compound.cUSDC.address);
  const compoundComptrolleropUSDCSave = await cUSDC.comptroller();
  const compoundComptrollerInstance = await ethers.getContractAt(comptrollerABI, compoundComptrolleropUSDCSave);

  const safeOwnerAddress = (await getNamedAccounts()).deployer;
  const safeOwner = ethers.provider.getSigner(safeOwnerAddress);
  const ethAdapter = <EthAdapter>new EthersAdapter({
    ethers,
    signer: safeOwner,
  });
  const safeAddress = await registry.strategyOperator();
  const safeSdk: Safe = await Safe.create({ ethAdapter, safeAddress });

  console.log(await safeSdk.getAddress());

  const transactions: MetaTransactionData[] = [];
  const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
  const deadline = BigNumber.from(currentTimestamp).add(1800);

  // ==================opUSDC-Save========================

  // COMP
  const opUSDCSaveClaimedCOMP = await comp.balanceOf(opUSDCSave.address);
  const opUSDCSaveUnclaimedCOMP = await compoundComptrollerInstance.compAccrued(opUSDCSave.address);
  const totalCOMP = opUSDCSaveClaimedCOMP.add(opUSDCSaveUnclaimedCOMP);

  const [_a, _b, opUSDCSaveExpectedUSDCFromCOMP] = await sushiswap.getAmountsOut(totalCOMP, [
    comp.address,
    ethereumTokens.WRAPPED_TOKENS.WETH,
    ethereumTokens.PLAIN_TOKENS.USDC,
  ]);

  transactions.push({
    to: opUSDCSave.address,
    value: "0",
    data: opUSDCSave.interface.encodeFunctionData("claimRewardToken", [cUSDC.address]),
  });

  transactions.push({
    to: opUSDCSave.address,
    value: "0",
    data: opUSDCSave.interface.encodeFunctionData("harvest", [
      comp.address,
      sushiswap.address,
      false,
      opUSDCSaveExpectedUSDCFromCOMP.mul(9900).div(10000),
      deadline,
      [comp.address, ethereumTokens.WRAPPED_TOKENS.WETH, ethereumTokens.PLAIN_TOKENS.USDC],
      hexlify(0),
    ]),
  });

  // stkAAVE
  const opUSDCSaveExpectedUSDCFromstkAAVE = parseUnits("50", 6);

  const uniV3SwapPathForstkAAVEToUSDC = ethers.utils.solidityPack(
    ["address", "uint24", "address", "uint24", "address"],
    [stkAAVE.address, 10000, ethereumTokens.WRAPPED_TOKENS.WETH, 500, ethereumTokens.PLAIN_TOKENS.USDC],
  );

  transactions.push({
    to: opUSDCSave.address,
    value: "0",
    data: opUSDCSave.interface.encodeFunctionData("harvest", [
      stkAAVE.address,
      uniswapV3Router,
      true,
      opUSDCSaveExpectedUSDCFromstkAAVE,
      deadline,
      [],
      uniV3SwapPathForstkAAVEToUSDC,
    ]),
  });

  // DEPOSIT
  transactions.push({
    to: opUSDCSave.address,
    value: "0",
    data: opUSDCSave.interface.encodeFunctionData("vaultDepositAllToStrategy"),
  });

  // ==================opWETH-Save========================

  // stkAAVE
  const opWETHSaveExpectedWETHFromstkAAVE = parseEther("0.020");

  const uniV3SwapPathForstkAAVEToWETH = ethers.utils.solidityPack(
    ["address", "uint24", "address"],
    [stkAAVE.address, 10000, ethereumTokens.WRAPPED_TOKENS.WETH],
  );

  transactions.push({
    to: opWETHSave.address,
    value: "0",
    data: opWETHSave.interface.encodeFunctionData("harvest", [
      stkAAVE.address,
      uniswapV3Router,
      true,
      opWETHSaveExpectedWETHFromstkAAVE,
      deadline,
      [],
      uniV3SwapPathForstkAAVEToWETH,
    ]),
  });

  // DEPOSIT
  transactions.push({
    to: opWETHSave.address,
    value: "0",
    data: opWETHSave.interface.encodeFunctionData("vaultDepositAllToStrategy"),
  });

  const safeTransaction = await safeSdk.createTransaction(transactions);
  console.log("safeTransaction ", safeTransaction.data);
  const tx = await safeSdk.executeTransaction(safeTransaction);
  const txR = await tx.transactionResponse?.wait(1);
  console.log(txR);
}

main().then(console.log).catch(console.error);
