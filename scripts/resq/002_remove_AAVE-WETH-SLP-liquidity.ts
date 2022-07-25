import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import bn from "bignumber.js";
import {
  ERC20,
  ERC20__factory,
  IUniswapV2Pair,
  IUniswapV2Pair__factory,
  IUniswapV2Router02,
  IUniswapV2Router02__factory,
  Registry,
  Registry__factory,
  Vault,
  Vault__factory,
} from "../../typechain";

async function main(aggregatorV3InterfaceABI: any[]) {
  const aaveWethSlp = ethers.utils.getAddress("0xD75EA151a61d06868E31F8988D28DFE5E9df57B4");
  const AAVE = ethers.utils.getAddress("0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9");
  const WETH = ethers.utils.getAddress("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
  const sushiswapRouter = ethers.utils.getAddress("0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F");
  const registryProxyAddress = ethers.utils.getAddress("0x99fa011e33a8c6196869dec7bc407e896ba67fe3");
  const opAAVEaggr = ethers.utils.getAddress("0xd610c0CcE9792321BfEd3c2f31dceA6784c84F19");

  const aaveWethSlpInstance = <IUniswapV2Pair>await ethers.getContractAt(IUniswapV2Pair__factory.abi, aaveWethSlp);
  const registryInstance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
  const sushiswapRouterInstance = <IUniswapV2Router02>(
    await ethers.getContractAt(IUniswapV2Router02__factory.abi, sushiswapRouter)
  );
  const opAAVEaggrInstance = <Vault>await ethers.getContractAt(Vault__factory.abi, opAAVEaggr);
  const aaveInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, AAVE);
  const wethInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, WETH);
  const aaveWethSlpBalance = await aaveWethSlpInstance.balanceOf(opAAVEaggr);
  const operatorSigner = await ethers.getSigner(await registryInstance.getOperator());

  const abi = [
    "function approve(address spender, uint256 amount)",
    "function removeLiquidity(address tokenA,address tokenB,uint256 liquidity,uint256 amountAmin,uint256 amountBMin,address recipient,uint256 deadline)",
  ];

  const iface = new ethers.utils.Interface(abi);
  const codes = [];

  // approve AAVE-WETH-SLP to be spend by sushiswaprouter
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [aaveWethSlp, iface.encodeFunctionData("approve", [sushiswapRouter, aaveWethSlpBalance])],
    ),
  );

  const aave_eth_feed = ethers.utils.getAddress("0x6Df09E975c830ECae5bd4eD9d90f3A95a4f88012");
  const priceFeed = await ethers.getContractAt(aggregatorV3InterfaceABI, aave_eth_feed);
  const wethPerAave = priceFeed.answer;
  const reserves = await aaveWethSlpInstance.getReserves();
  let totalSupply = await aaveWethSlpInstance.totalSupply();
  const klast = await aaveWethSlpInstance.kLast();
  if (!klast.eq("0")) {
    const rootK = BigNumber.from(
      new bn(reserves.reserve0.mul(reserves.reserve1).toString()).sqrt().toFixed().split(".")[0],
    );
    const rootKLast = BigNumber.from(new bn(klast.toString()).sqrt().toFixed().split(".")[0]);
    if (rootK.gt(rootKLast)) {
      const numerator = totalSupply.mul(rootK.sub(rootKLast));
      const denominator = BigNumber.from(rootK.mul(BigNumber.from("5"))).add(rootKLast);
      const liquidity = numerator.div(denominator);
      if (liquidity.gt("0")) {
        totalSupply = totalSupply.add(liquidity);
      }
    }
  }
  const aaveMin = reserves.reserve0.mul(aaveWethSlpBalance).div(totalSupply);
  const wethMin = reserves.reserve1.mul(aaveWethSlpBalance).div(totalSupply);

  const blockTimestamp = await (await ethers.provider.getBlock("latest")).timestamp;
  // Remove liquidity from Sushi
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        sushiswapRouter,
        iface.encodeFunctionData("removeLiquidity", [
          AAVE,
          WETH,
          aaveWethSlpBalance,
          aaveMin,
          wethMin,
          opAAVEaggr,
          blockTimestamp + 300,
        ]),
      ],
    ),
  );

  const aave_balance_before = await aaveInstance.balanceOf(opAAVEaggr);
  console.log("AAVE balance before : ", ethers.utils.formatEther(aave_balance_before));
  const weth_balance_before = await wethInstance.balanceOf(opAAVEaggr);
  console.log("WETH balance before : ", ethers.utils.formatEther(weth_balance_before));
  const tx = await opAAVEaggrInstance.connect(operatorSigner).adminCall(codes);
  await tx.wait(1);
  const aave_balance_after = await aaveInstance.balanceOf(opAAVEaggr);
  console.log("AAVE balance after : ", ethers.utils.formatEther(aave_balance_after));
  const weth_balance_after = await wethInstance.balanceOf(opAAVEaggr);
  console.log("WETH balance after : ", ethers.utils.formatEther(weth_balance_after));
}

const aggregatorV3InterfaceABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "description",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint80", name: "_roundId", type: "uint80" }],
    name: "getRoundData",
    outputs: [
      { internalType: "uint80", name: "roundId", type: "uint80" },
      { internalType: "int256", name: "answer", type: "int256" },
      { internalType: "uint256", name: "startedAt", type: "uint256" },
      { internalType: "uint256", name: "updatedAt", type: "uint256" },
      { internalType: "uint80", name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { internalType: "uint80", name: "roundId", type: "uint80" },
      { internalType: "int256", name: "answer", type: "int256" },
      { internalType: "uint256", name: "startedAt", type: "uint256" },
      { internalType: "uint256", name: "updatedAt", type: "uint256" },
      { internalType: "uint80", name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "version",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

main(aggregatorV3InterfaceABI).then(console.log).catch(console.error);
