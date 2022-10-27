import { deployments, ethers } from "hardhat";
import ethereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { MetaTransactionData, EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import { ERC20, ERC20__factory, ICompound, ICompound__factory, Vault, Vault__factory } from "../../typechain";
import { BigNumber } from "ethers";
import { formatEther, parseEther, parseUnits } from "ethers/lib/utils";

const comptrollerABI = [
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

const compoundLensABI = [
  {
    constant: true,
    inputs: [
      {
        internalType: "contract Comp",
        name: "comp",
        type: "address",
      },
      {
        internalType: "contract ComptrollerLensInterface",
        name: "comptroller",
        type: "address",
      },
      {
        internalType: "address",
        name: "account",
        type: "address",
      },
    ],
    name: "getCompBalanceMetadataExt",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "balance",
            type: "uint256",
          },
          {
            internalType: "uint256",
            name: "votes",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "delegate",
            type: "address",
          },
          {
            internalType: "uint256",
            name: "allocated",
            type: "uint256",
          },
        ],
        internalType: "struct CompoundLens.CompBalanceMetadataExt",
        name: "",
        type: "tuple",
      },
    ],
    payable: false,
    stateMutability: "view",
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
  const compoundLens = await ethers.getContractAt(compoundLensABI, "0xd513d22422a3062bd342ae374b4b9c20e0a9a074");
  const bdammInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, bdamm);

  const { allocated: unclaimedCompopUSDCEarn } = await compoundLens.getCompBalanceMetadataExt(
    bdamm,
    compoundComptrollerInstance.address,
    opUSDCEarn.address,
  );
  const { allocated: unclaimedCompopWETHEarn } = await compoundLens.getCompBalanceMetadataExt(
    bdamm,
    compoundComptrollerInstance.address,
    opWETHEarn.address,
  );
  const { allocated: unclaimedCompopWBTCEarn } = await compoundLens.getCompBalanceMetadataExt(
    bdamm,
    compoundComptrollerInstance.address,
    opWBTCEarn.address,
  );

  const compBalanceopUSDCEarn = await bdammInstance.balanceOf(opUSDCEarn.address);
  const compBalanceopWETHEarn = await bdammInstance.balanceOf(opWETHEarn.address);
  const compBalanceopWBTCEarn = await bdammInstance.balanceOf(opWBTCEarn.address);

  console.log("opUSDCEarn ", formatEther(unclaimedCompopUSDCEarn));
  console.log("opWETHEarn ", formatEther(unclaimedCompopWETHEarn));
  console.log("opWBTCEarn ", formatEther(unclaimedCompopWBTCEarn));

  console.log("accrue opUSDCEarn", formatEther(compBalanceopUSDCEarn));
  console.log("accrue opWETHEarn ", formatEther(compBalanceopWETHEarn));
  console.log("accrue opWBTCEarn ", formatEther(compBalanceopWBTCEarn));

  const timestamp = await (await ethers.provider.getBlock("latest")).timestamp;

  const totalUnharvestedBDAMMopUSDCEarn = BigNumber.from(unclaimedCompopUSDCEarn).add(compBalanceopUSDCEarn);
  const totalUnharvestedBDAMMopWETHEarn = BigNumber.from(unclaimedCompopWETHEarn).add(compBalanceopWETHEarn);
  const totalUnharvestedBDAMMopWBTCEarn = BigNumber.from(unclaimedCompopWBTCEarn).add(compBalanceopWBTCEarn);

  const oneBDAMMToUSDC = parseUnits("0.27", "6");
  const oneBDAMMToWETH = parseEther("0.00018");
  const oneBDAMMToWBTC = parseUnits("0.00001", "8");

  const expectedMinUSDC = totalUnharvestedBDAMMopUSDCEarn.mul(oneBDAMMToUSDC).div(parseEther("1"));
  const expectedMinETH = totalUnharvestedBDAMMopWETHEarn.mul(oneBDAMMToWETH).div(parseEther("1"));
  const expectedMinWBTC = totalUnharvestedBDAMMopWBTCEarn.mul(oneBDAMMToWBTC).div(parseEther("1"));

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
          // "0xa3006250a22E1Ca3C3f19fd1FB080C5dc65992c5", // dAMM finance - dUSDC
          // "0x118823514681353634FF95837939E783D85B18AF", // dAMM finance - dWETH
          // "0x63D6b99659f7b05b054DEEF582F5DaAa51780E80", // dAMM finance - dWBTC
          "0x5714EB15A226059202CdfA1bF304167e36752862", // dAMM finance - dCUSDC
          "0x3Be69a1D7B8821cDcCE90509aBB62D250A5AeFcc", // dAMM finance - dCWETH
          "0x9Dd451aB7bB62DA57b638070760A747bB6b1c5b1", //dAMM finance - dAWBTC
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
        expectedMinUSDC.mul("9900").div("10000"),
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
        expectedMinETH.mul("9700").div("10000"),
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
        expectedMinWBTC.mul("9900").div("10000"),
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
