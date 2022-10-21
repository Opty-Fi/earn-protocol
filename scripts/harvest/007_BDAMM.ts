import { deployments, ethers } from "hardhat";
import ethereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { MetaTransactionData, EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import { ICompound, ICompound__factory, Vault, Vault__factory } from "../../typechain";
import { BigNumber } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";

const comptrollerABI = [
  //   {
  //     constant: false,
  //     inputs: [
  //       { internalType: "address", name: "holder", type: "address" },
  //       {
  //         internalType: "contract CToken[]",
  //         name: "cTokens",
  //         type: "address[]",
  //       },
  //     ],
  //     name: "claimComp",
  //     outputs: [],
  //     payable: false,
  //     stateMutability: "nonpayable",
  //     type: "function",
  //   },
  {
    constant: true,
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "compAccrued",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "holders",
        type: "address[]",
      },
      {
        internalType: "contract CToken[]",
        name: "cTokens",
        type: "address[]",
      },
      {
        internalType: "bool",
        name: "borrowers",
        type: "bool",
      },
      {
        internalType: "bool",
        name: "suppliers",
        type: "bool",
      },
    ],
    name: "claimComp",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const uniswapV3Router = ethers.utils.getAddress("0xE592427A0AEce92De3Edee1F18E0157C05861564");
const bdamm = ethers.utils.getAddress("0xfa372fF1547fa1a283B5112a4685F1358CE5574d");

async function main() {
  const opUSDCEarn = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opUSDC-Earn_Proxy")).address)
  );
  const opWETHEarn = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opWETH-Earn_Proxy")).address)
  );
  const opWBTCEarn = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opWBTC-Earn_Proxy")).address)
  );
  const cUSDCInstanceopUSDCEarn = <ICompound>(
    await ethers.getContractAt(ICompound__factory.abi, "0xa3006250a22E1Ca3C3f19fd1FB080C5dc65992c5")
  );

  const compoundComptroller = await cUSDCInstanceopUSDCEarn.comptroller();
  const compoundComptrollerInstance = await ethers.getContractAt(comptrollerABI, compoundComptroller);

  //   const unclaimedCompopUSDCEarn = await compoundComptrollerInstance.compAccrued(opUSDCEarn.address);
  //   const unclaimedCompopWETHEarn = await compoundComptrollerInstance.compAccrued(opWETHEarn.address);
  //   const unclaimedCompopWBTCEarn = await compoundComptrollerInstance.compAccrued(opWBTCEarn.address);

  const timestamp = await (await ethers.provider.getBlock("latest")).timestamp;

  // ================================================
  //   console.log("unclaimedCompopWETHEarn ", formatEther(unclaimedCompopWETHEarn));
  //   console.log("unclaimedCompopUSDCEarn ", formatEther(unclaimedCompopUSDCEarn));
  //   console.log("unclaimedCompopWBTCEarn ", formatEther(unclaimedCompopWBTCEarn));

  const uniV3SwapPathForBDAMMtoUSDC = ethers.utils.solidityPack(
    ["address", "uint24", "address"],
    [bdamm, 10000, ethereumTokens.PLAIN_TOKENS.USDC],
  );
  const uniV3SwapPathForBDAMMtoWETH = ethers.utils.solidityPack(
    ["address", "uint24", "address", "uint24", "address"],
    [bdamm, 10000, ethereumTokens.PLAIN_TOKENS.USDC, 500, ethereumTokens.WRAPPED_TOKENS.WETH],
  );
  const uniV3SwapPathForBDAMMtoWBTC = ethers.utils.solidityPack(
    ["address", "uint24", "address", "uint24", "address"],
    [bdamm, 10000, ethereumTokens.PLAIN_TOKENS.USDC, 10000, ethereumTokens.BTC_TOKENS.WBTC],
  );
  const transactions: MetaTransactionData[] = [
    {
      to: compoundComptrollerInstance.address,
      value: "0",
      data: compoundComptrollerInstance.interface.encodeFunctionData("claimComp", [
        [opUSDCEarn.address, opWETHEarn.address, opWBTCEarn.address],
        [
          "0xa3006250a22E1Ca3C3f19fd1FB080C5dc65992c5",
          "0x118823514681353634FF95837939E783D85B18AF",
          "0x63D6b99659f7b05b054DEEF582F5DaAa51780E80",
        ],
        false,
        true,
      ]),
    },
    {
      to: opUSDCEarn.address,
      value: "0",
      data: opUSDCEarn.interface.encodeFunctionData("harvest", [
        bdamm,
        uniswapV3Router,
        true,
        parseUnits("45", "6"),
        BigNumber.from(timestamp).add("600"),
        [],
        uniV3SwapPathForBDAMMtoUSDC,
      ]),
    },
    {
      to: opUSDCEarn.address,
      value: "0",
      data: opUSDCEarn.interface.encodeFunctionData("vaultDepositAllToStrategy"),
    },
    {
      to: opWETHEarn.address,
      value: "0",
      data: opWETHEarn.interface.encodeFunctionData("harvest", [
        bdamm,
        uniswapV3Router,
        true,
        parseEther("0.014"),
        BigNumber.from(timestamp).add("600"),
        [],
        uniV3SwapPathForBDAMMtoWETH,
      ]),
    },
    {
      to: opWETHEarn.address,
      value: "0",
      data: opWETHEarn.interface.encodeFunctionData("vaultDepositAllToStrategy"),
    },
    {
      to: opWBTCEarn.address,
      value: "0",
      data: opWBTCEarn.interface.encodeFunctionData("harvest", [
        bdamm,
        uniswapV3Router,
        true,
        parseUnits("0.0000325", "8"),
        BigNumber.from(timestamp).add("600"),
        [],
        uniV3SwapPathForBDAMMtoWBTC,
      ]),
    },
    {
      to: opWBTCEarn.address,
      value: "0",
      data: opWBTCEarn.interface.encodeFunctionData("vaultDepositAllToStrategy"),
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
