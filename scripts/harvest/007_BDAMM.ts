import { deployments, ethers } from "hardhat";
import ethereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import Safe from "@gnosis.pm/safe-core-sdk";
import { MetaTransactionData, EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import {
  ERC20,
  ERC20__factory,
  ICompound,
  ICompound__factory,
  StrategyProvider,
  StrategyProvider__factory,
} from "../../typechain";
import { BigNumber } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { VaultV6, VaultV6__factory } from "../../helpers/types/vaultv6";

const cryptoPoolGaugeABI = [
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
    stateMutability: "view",
    type: "function",
    name: "claimable_reward",
    inputs: [
      {
        name: "_user",
        type: "address",
      },
      {
        name: "_reward_token",
        type: "address",
      },
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
      },
    ],
  },
];

export const comptrollerABI = [
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
const bLUSDLUSD3FactoryGaugeAddress = "0xdA0DD1798BE66E17d5aB1Dc476302b56689C2DB4";

async function main() {
  const opUSDCEarn = <VaultV6>(
    await ethers.getContractAt(VaultV6__factory.abi, (await deployments.get("opUSDC-Earn_Proxy")).address)
  );
  const opWETHEarn = <VaultV6>(
    await ethers.getContractAt(VaultV6__factory.abi, (await deployments.get("opWETH-Earn_Proxy")).address)
  );
  const opWBTCEarn = <VaultV6>(
    await ethers.getContractAt(VaultV6__factory.abi, (await deployments.get("opWBTC-Earn_Proxy")).address)
  );
  const opUSD3Earn = <VaultV6>(
    await ethers.getContractAt(VaultV6__factory.abi, (await deployments.get("opUSD3-Earn_Proxy")).address)
  );
  const cUSDCInstanceopUSDCEarn = <ICompound>(
    await ethers.getContractAt(ICompound__factory.abi, "0xa3006250a22E1Ca3C3f19fd1FB080C5dc65992c5")
  );

  const compoundComptroller = await cUSDCInstanceopUSDCEarn.comptroller();
  const compoundComptrollerInstance = await ethers.getContractAt(comptrollerABI, compoundComptroller);
  const compoundLens = await ethers.getContractAt(compoundLensABI, "0xd513d22422a3062bd342ae374b4b9c20e0a9a074");
  const bdammInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, bdamm);

  const strategyProvider = <StrategyProvider>(
    await ethers.getContractAt(StrategyProvider__factory.abi, (await deployments.get("StrategyProvider")).address)
  );

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

  // LUSD
  const bLUSDLUSD3FactoryGauge = await ethers.getContractAt(cryptoPoolGaugeABI, bLUSDLUSD3FactoryGaugeAddress);
  const lusd = <ERC20>await ethers.getContractAt(ERC20__factory.abi, ethereumTokens.PLAIN_TOKENS.LUSD);
  const lusdBalanceInopUSD3Earn = await lusd.balanceOf(opUSD3Earn.address);
  const unclaimedLUSDInopUSD3Earn = await bLUSDLUSD3FactoryGauge.claimable_reward(opUSD3Earn.address, lusd.address);
  const totalLusdInopUSD3Earn = lusdBalanceInopUSD3Earn.add(unclaimedLUSDInopUSD3Earn);

  // console.log("opUSDCEarn ", formatEther(unclaimedCompopUSDCEarn));
  // console.log("opWETHEarn ", formatEther(unclaimedCompopWETHEarn));
  // console.log("opWBTCEarn ", formatEther(unclaimedCompopWBTCEarn));

  // console.log("accrue opUSDCEarn", formatEther(compBalanceopUSDCEarn));
  // console.log("accrue opWETHEarn ", formatEther(compBalanceopWETHEarn));
  // console.log("accrue opWBTCEarn ", formatEther(compBalanceopWBTCEarn));

  const timestamp = await (await ethers.provider.getBlock("latest")).timestamp;

  const totalUnharvestedBDAMMopUSDCEarn = BigNumber.from(unclaimedCompopUSDCEarn).add(compBalanceopUSDCEarn);
  const totalUnharvestedBDAMMopWETHEarn = BigNumber.from(unclaimedCompopWETHEarn).add(compBalanceopWETHEarn);
  const totalUnharvestedBDAMMopWBTCEarn = BigNumber.from(unclaimedCompopWBTCEarn).add(compBalanceopWBTCEarn);

  console.log("totalUnharvestedBDAMMopWBTCEarn ", totalUnharvestedBDAMMopWBTCEarn.toString());

  const oneBDAMMToUSDC = parseUnits("0.26", "6");
  const oneBDAMMToWETH = parseEther("0.0001");
  const oneBDAMMToWBTC = parseUnits("0.00001", "8");
  const oneLUSDTo3CRV = parseEther("1");

  const expectedMinUSDC = totalUnharvestedBDAMMopUSDCEarn.mul(oneBDAMMToUSDC).div(parseEther("1"));
  const expectedMinETH = totalUnharvestedBDAMMopWETHEarn.mul(oneBDAMMToWETH).div(parseEther("1"));
  const expectedMinWBTC = totalUnharvestedBDAMMopWBTCEarn.mul(oneBDAMMToWBTC).div(parseEther("1"));
  const expected3CRVForopUSD3EarnFromLUSD = totalLusdInopUSD3Earn.mul(oneLUSDTo3CRV).div(parseEther("1"));

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
    [bdamm, 10000, ethereumTokens.PLAIN_TOKENS.USDC, 500, ethereumTokens.BTC_TOKENS.WBTC],
  );
  const uniV3SwapPathForLUSDto3CRV = ethers.utils.solidityPack(
    ["address", "uint24", "address", "uint24", "address", "uint24", "address"],
    [
      lusd.address,
      10000,
      ethereumTokens.WRAPPED_TOKENS.WETH,
      3000,
      ethereumTokens.PLAIN_TOKENS.USDC,
      3000,
      ethereumTokens.WRAPPED_TOKENS.THREE_CRV,
    ],
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
          "0x63D6b99659f7b05b054DEEF582F5DaAa51780E80", // dAMM finance - dWBTC
          "0x5714EB15A226059202CdfA1bF304167e36752862", // dAMM finance - dCUSDC
          "0x3Be69a1D7B8821cDcCE90509aBB62D250A5AeFcc", // dAMM finance - dCWETH
          // "0x9Dd451aB7bB62DA57b638070760A747bB6b1c5b1", //dAMM finance - dAWBTC
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
      to: strategyProvider.address,
      value: "0",
      data: strategyProvider.interface.encodeFunctionData("setBestStrategy", [
        "1",
        await opWBTCEarn.underlyingTokensHash(),
        [
          {
            pool: "0x63D6b99659f7b05b054DEEF582F5DaAa51780E80",
            outputToken: "0x63D6b99659f7b05b054DEEF582F5DaAa51780E80",
            isBorrow: false,
          },
        ],
      ]),
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
      data: opWBTCEarn.interface.encodeFunctionData("rebalance"),
    },
    {
      to: bLUSDLUSD3FactoryGauge.address,
      value: "0",
      data: bLUSDLUSD3FactoryGauge.interface.encodeFunctionData("claim_rewards", [opUSD3Earn.address]),
    },
    {
      to: opUSD3Earn.address,
      value: "0",
      data: opUSD3Earn.interface.encodeFunctionData("harvest", [
        lusd.address,
        uniswapV3Router,
        true,
        expected3CRVForopUSD3EarnFromLUSD.mul("9900").div("10000"),
        BigNumber.from(timestamp).add("600"),
        [],
        uniV3SwapPathForLUSDto3CRV,
      ]),
    },
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
