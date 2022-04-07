import { ethers } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { ERC20, IUniswapV2Router02, Registry, Vault } from "../../typechain";

async function main() {
  const uniswapV2Router02Address = ethers.utils.getAddress("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
  const sushiswapRouterAddress = ethers.utils.getAddress("0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F");
  const CVX = ethers.utils.getAddress("0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B");
  const CRV = ethers.utils.getAddress("0xD533a949740bb3306d119CC777fa900bA034cd52");
  const SNX = ethers.utils.getAddress("0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F");
  const USDC = ethers.utils.getAddress("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
  const WETH = ethers.utils.getAddress("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
  const opUSDCgrowProxyAddress = ethers.utils.getAddress("0x6d8bfdb4c4975bb086fc9027e48d5775f609ff88");
  const registryProxyAddress = ethers.utils.getAddress("0x99fa011e33a8c6196869dec7bc407e896ba67fe3");
  const vaultInstance = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, opUSDCgrowProxyAddress);
  const registryInstance = <Registry>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const uniswapRouterInstance = <IUniswapV2Router02>(
    await ethers.getContractAt("IUniswapV2Router02", uniswapV2Router02Address)
  );
  const sushiswapRouterInstance = <IUniswapV2Router02>(
    await ethers.getContractAt("IUniswapV2Router02", sushiswapRouterAddress)
  );
  const cvxInstance = <ERC20>await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, CVX);
  const crvInstance = <ERC20>await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, CRV);
  const snxInstance = <ERC20>await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, SNX);
  const usdcInstance = <ERC20>await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, USDC);
  const governanceSigner = await ethers.getSigner(await registryInstance.governance());
  const abi = [
    "function approve(address spender, uint256 amount)",
    "function swapExactTokensForTokens(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline)",
    "function vaultDepositAllToStrategy()",
  ];
  const iface = new ethers.utils.Interface(abi);
  const codes = [];

  const cvxBalance = await cvxInstance.balanceOf(opUSDCgrowProxyAddress);
  const crvBalance = await crvInstance.balanceOf(opUSDCgrowProxyAddress);
  const snxBalance = await snxInstance.balanceOf(opUSDCgrowProxyAddress);

  const [_u0crv, _1crvU, crvToUsdcExpectedU] = await uniswapRouterInstance.getAmountsOut(crvBalance, [CRV, WETH, USDC]);
  // const [_s0crv, _1crvS, crvToUsdcExpectedS] = await sushiswapRouterInstance.getAmountsOut(crvBalance, [CRV, WETH, USDC]);
  const [_u0snx, _1snxU, snxToUsdcExpectedU] = await uniswapRouterInstance.getAmountsOut(snxBalance, [SNX, WETH, USDC]);
  // const [_s0snx, _1snxS, snxToUsdcExpectedS] = await sushiswapRouterInstance.getAmountsOut(snxBalance, [SNX, WETH, USDC]);
  // const [_u0cvx, _u1cvx, cvxToUsdcExpectedU] = await uniswapRouterInstance.getAmountsOut(cvxBalance, [CVX, WETH, USDC]);
  const [_s0cvx, _s1cvx, cvxToUsdcExpectedS] = await sushiswapRouterInstance.getAmountsOut(cvxBalance, [
    CVX,
    WETH,
    USDC,
  ]);

  const timestamp = await (await ethers.provider.getBlock("latest")).timestamp;

  // approve CVX to be spend by sushiswap
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [CVX, iface.encodeFunctionData("approve", [sushiswapRouterAddress, cvxBalance])],
    ),
  );
  // swap on sushiswap
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        sushiswapRouterAddress,
        iface.encodeFunctionData("swapExactTokensForTokens", [
          cvxBalance,
          cvxToUsdcExpectedS.mul(9500).div(10000),
          [CVX, WETH, USDC],
          opUSDCgrowProxyAddress,
          timestamp * 2,
        ]),
      ],
    ),
  );
  // approve CRV to be spend by uniswap
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [CRV, iface.encodeFunctionData("approve", [uniswapV2Router02Address, crvBalance])],
    ),
  );
  // swap on uniswap
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        uniswapV2Router02Address,
        iface.encodeFunctionData("swapExactTokensForTokens", [
          crvBalance,
          crvToUsdcExpectedU.mul(9500).div(10000),
          [CRV, WETH, USDC],
          opUSDCgrowProxyAddress,
          timestamp * 2,
        ]),
      ],
    ),
  );
  // approve SNX to be spend by uniswap
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [SNX, iface.encodeFunctionData("approve", [uniswapV2Router02Address, snxBalance])],
    ),
  );
  // swap on uniswap
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        uniswapV2Router02Address,
        iface.encodeFunctionData("swapExactTokensForTokens", [
          snxBalance,
          snxToUsdcExpectedU.mul(9500).div(10000),
          [SNX, WETH, USDC],
          opUSDCgrowProxyAddress,
          timestamp * 2,
        ]),
      ],
    ),
  );
  // vault deposit all to strategy
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [opUSDCgrowProxyAddress, iface.encodeFunctionData("vaultDepositAllToStrategy", [])],
    ),
  );
  const USDCBalanceBefore = await usdcInstance.balanceOf(opUSDCgrowProxyAddress);
  console.log("USDC balance before ", USDCBalanceBefore.toString());
  const tx = await vaultInstance.connect(governanceSigner).adminCall(codes);
  const rcpt = await tx.wait(1);
  console.log(await rcpt.events);
  const USDCBalanceAfter = await usdcInstance.balanceOf(opUSDCgrowProxyAddress);
  console.log("USDC balance after ", USDCBalanceAfter.toString());
}

main().then(console.log).catch(console.error);
