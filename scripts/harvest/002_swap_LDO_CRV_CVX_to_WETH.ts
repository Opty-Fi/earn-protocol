import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { ERC20, IUniswapV2Router02, Registry, Vault } from "../../typechain";

async function main() {
  const uniswapV2Router02Address = ethers.utils.getAddress("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
  const sushiswapRouterAddress = ethers.utils.getAddress("0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F");
  const CVX = ethers.utils.getAddress("0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B");
  const CRV = ethers.utils.getAddress("0xD533a949740bb3306d119CC777fa900bA034cd52");
  const LDO = ethers.utils.getAddress("0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32");
  const WETH = ethers.utils.getAddress("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
  const opWETHgrowProxyAddress = ethers.utils.getAddress("0xff2fbd9fbc6d03baa77cf97a3d5671bea183b9a8");
  const registryProxyAddress = ethers.utils.getAddress("0x99fa011e33a8c6196869dec7bc407e896ba67fe3");
  const vaultInstance = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, opWETHgrowProxyAddress);
  const registryInstance = <Registry>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const uniswapRouterInstance = <IUniswapV2Router02>(
    await ethers.getContractAt("IUniswapV2Router02", uniswapV2Router02Address)
  );
  const sushiswapRouterInstance = <IUniswapV2Router02>(
    await ethers.getContractAt("IUniswapV2Router02", sushiswapRouterAddress)
  );
  const cvxInstance = <ERC20>await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, CVX);
  const crvInstance = <ERC20>await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, CRV);
  const ldoInstance = <ERC20>await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, LDO);
  const wethInstance = <ERC20>await ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, WETH);
  const governanceSigner = await ethers.getSigner(await registryInstance.governance());
  const abi = [
    "function approve(address spender, uint256 amount)",
    "function swapExactTokensForTokens(uint amountIn,uint amountOutMin,address[] calldata path,address to,uint deadline)",
    "function vaultDepositAllToStrategy()",
  ];
  const iface = new ethers.utils.Interface(abi);
  const codes = [];

  const cvxBalance = await cvxInstance.balanceOf(opWETHgrowProxyAddress);
  const crvBalance = await crvInstance.balanceOf(opWETHgrowProxyAddress);
  const ldoBalance = await ldoInstance.balanceOf(opWETHgrowProxyAddress);

  // const [_u0cvx, cvxToUsdcExpectedU] = await uniswapRouterInstance.getAmountsOut(cvxBalance, [CVX, WETH]);
  const [_s0cvx, cvxToUsdcExpectedS] = await sushiswapRouterInstance.getAmountsOut(cvxBalance, [CVX, WETH]);
  const [_u0crv, crvToWETHExpectedU] = await uniswapRouterInstance.getAmountsOut(crvBalance, [CRV, WETH]);
  // const [_s0crv, crvToWETHExpectedS] = await sushiswapRouterInstance.getAmountsOut(crvBalance, [CRV, WETH]);
  // const [_u0snx, ldoToUsdcExpectedU] = await uniswapRouterInstance.getAmountsOut(ldoBalance, [LDO, WETH]);
  const [_s0snx, ldoToUsdcExpectedS] = await sushiswapRouterInstance.getAmountsOut(ldoBalance, [LDO, WETH]);

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
          cvxToUsdcExpectedS,
          [CVX, WETH],
          opWETHgrowProxyAddress,
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
          crvToWETHExpectedU,
          [CRV, WETH],
          opWETHgrowProxyAddress,
          timestamp * 2,
        ]),
      ],
    ),
  );
  // approve LDO to be spend by sushiswap
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [LDO, iface.encodeFunctionData("approve", [sushiswapRouterAddress, ldoBalance])],
    ),
  );
  // swap on uniswap
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [
        sushiswapRouterAddress,
        iface.encodeFunctionData("swapExactTokensForTokens", [
          ldoBalance,
          ldoToUsdcExpectedS,
          [LDO, WETH],
          opWETHgrowProxyAddress,
          timestamp * 2,
        ]),
      ],
    ),
  );
  // vault deposit all to strategy
  codes.push(
    ethers.utils.defaultAbiCoder.encode(
      ["address", "bytes"],
      [opWETHgrowProxyAddress, iface.encodeFunctionData("vaultDepositAllToStrategy", [])],
    ),
  );
  const wethBalanceBefore = await wethInstance.balanceOf(opWETHgrowProxyAddress);
  console.log("WETH balance before ", wethBalanceBefore.toString());
  const tx = await vaultInstance
    .connect(governanceSigner)
    .adminCall(codes, { maxFeePerGas: BigNumber.from("60318936159") });
  const rcpt = await tx.wait(1);
  console.log(await rcpt.events);
  const WETHBalanceAfter = await wethInstance.balanceOf(opWETHgrowProxyAddress);
  console.log("WETH balance after ", WETHBalanceAfter.toString());
}

main().then(console.log).catch(console.error);
