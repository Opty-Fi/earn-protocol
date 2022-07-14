import { ethers } from "hardhat";
import { ERC20, ERC20__factory, Registry, Registry__factory, Vault, Vault__factory } from "../../typechain";

async function main() {
  const AAVE = ethers.utils.getAddress("0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9");
  const WETH = ethers.utils.getAddress("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
  const sushiswapRouter = ethers.utils.getAddress("0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F");
  const registryProxyAddress = ethers.utils.getAddress("0x99fa011e33a8c6196869dec7bc407e896ba67fe3");
  const opAAVEaggr = ethers.utils.getAddress("0xd610c0CcE9792321BfEd3c2f31dceA6784c84F19");

  const registryInstance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
  const opAAVEaggrInstance = <Vault>await ethers.getContractAt(Vault__factory.abi, opAAVEaggr);
  const aaveInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, AAVE);
  const wethInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, WETH);
  const operatorSigner = await ethers.getSigner(await registryInstance.getOperator());

  const abi = [
    "function approve(address spender, uint256 amount)",
    "function swapExactTokensForTokens(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline)",
  ];

  const iface = new ethers.utils.Interface(abi);
  const codes = [];

  const wethBalance = await wethInstance.balanceOf(opAAVEaggr);

  const aave_eth_feed = ethers.utils.getAddress("0x6Df09E975c830ECae5bd4eD9d90f3A95a4f88012");
  const priceFeed = await ethers.getContractAt(aggregatorV3InterfaceABI, aave_eth_feed);
  const wethPerAave = priceFeed.answer;
  const expectedAave = wethBalance.mul(9900).div(wethPerAave.div(10000));

  const timestamp = await (await ethers.provider.getBlock("latest")).timestamp;

  // approve WETH to be spend by sushiswap
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [WETH, iface.encodeFunctionData("approve", [sushiswapRouter, wethBalance])],
    ),
  );
  // swap WETH for AAVE on sushiswap
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        sushiswapRouter,
        iface.encodeFunctionData("swapExactTokensForTokens", [
          wethBalance,
          expectedAave,
          [WETH, AAVE],
          opAAVEaggr,
          timestamp + 300,
        ]),
      ],
    ),
  );

  const WETHBalanceBefore = await wethInstance.balanceOf(opAAVEaggr);
  const AAVEBalanceBefore = await aaveInstance.balanceOf(opAAVEaggr);
  console.log("WETH balance before ", WETHBalanceBefore.toString());
  console.log("AAVE balance before ", AAVEBalanceBefore.toString());
  const tx = await opAAVEaggrInstance.connect(operatorSigner).adminCall(codes);
  await tx.wait(1);
  const WETHBalanceAfter = await wethInstance.balanceOf(opAAVEaggr);
  const AAVEBalanceAfter = await aaveInstance.balanceOf(opAAVEaggr);
  console.log("WETH balance After ", WETHBalanceAfter.toString());
  console.log("AAVE balance After ", AAVEBalanceAfter.toString());
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

main().then(console.log).catch(console.error);
