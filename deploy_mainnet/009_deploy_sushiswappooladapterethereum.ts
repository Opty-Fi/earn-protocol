import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import ethereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import sushiswap from "@optyfi/defi-legos/ethereum/sushiswap/index";
import { getAddress } from "ethers/lib/utils";
import { waitforme } from "../helpers/utils";
import { Registry, Registry__factory, UniswapV2PoolAdapter, UniswapV2PoolAdapter__factory } from "../typechain";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({
  deployments,
  getNamedAccounts,
  getChainId,
  network,
  tenderly,
  run,
  ethers,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact("UniswapV2PoolAdapter");
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const optyfiOracleAddress = await (await deployments.get("OptyFiOracle")).address;

  const chainId = await getChainId();
  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("SushiswapPoolAdapterEthereum", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [
      registryProxyAddress,
      optyfiOracleAddress,
      sushiswap.SushiswapRouter.address,
      sushiswap.SushiswapFactory.address,
      sushiswap.rootKFactor,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const sushiswapPoolAdapterEthereum = await deployments.get("SushiswapPoolAdapterEthereum");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "SushiswapPoolAdapterEthereum",
          address: sushiswapPoolAdapterEthereum.address,
          constructorArguments: [
            registryProxyAddress,
            optyfiOracleAddress,
            sushiswap.SushiswapRouter.address,
            sushiswap.SushiswapFactory.address,
            sushiswap.rootKFactor,
          ],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "SushiswapPoolAdapterEthereum",
          address: sushiswapPoolAdapterEthereum.address,
          constructorArguments: [
            registryProxyAddress,
            optyfiOracleAddress,
            sushiswap.SushiswapRouter.address,
            sushiswap.SushiswapFactory.address,
            sushiswap.rootKFactor,
          ],
        });
      }
    }
  }
  const sushiswapPoolAdapterEthereumAddress = await (await deployments.get("SushiswapPoolAdapterEthereum")).address;
  const sushiswapPoolAdapterEthereumInstance = <UniswapV2PoolAdapter>(
    await ethers.getContractAt(UniswapV2PoolAdapter__factory.abi, sushiswapPoolAdapterEthereumAddress)
  );
  const registryProxyInstance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
  const riskOperator = await registryProxyInstance.riskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperator);

  const USDC_WETH_LP = "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0";
  const WBTC_WETH_LP = "0xCEfF51756c56CeFFCA006cD410B03FFC46dd3a58";

  const liquidityPoolToTolerances = [
    { liquidityPool: USDC_WETH_LP, tolerance: "100" },
    { liquidityPool: WBTC_WETH_LP, tolerance: "50" },
  ];
  const pendingLiquidityPoolToTolerances = [];
  for (const liquidityPoolToTolerance of liquidityPoolToTolerances) {
    const tolerance = await sushiswapPoolAdapterEthereumInstance.liquidityPoolToTolerance(
      liquidityPoolToTolerance.liquidityPool,
    );
    if (!BigNumber.from(tolerance).eq(BigNumber.from(liquidityPoolToTolerance.tolerance))) {
      pendingLiquidityPoolToTolerances.push(liquidityPoolToTolerance);
    }
  }

  if (pendingLiquidityPoolToTolerances.length > 0) {
    console.log(JSON.stringify(pendingLiquidityPoolToTolerances, null, 4));
    if (getAddress(riskOperatorSigner.address) === getAddress(deployer)) {
      console.log("updating pending LiquidityPool To Tolerances");
      const tx = await sushiswapPoolAdapterEthereumInstance
        .connect(riskOperatorSigner)
        .setLiquidityPoolToTolerance(pendingLiquidityPoolToTolerances);
      await tx.wait(1);
    } else {
      console.log("cannot update pending LiquidityPool To Tolerances because the signer is not the risk operator");
    }
  } else {
    console.log("liquidityPoolToTolerances are up to date");
  }

  const liquidityPoolToWantTokenToSlippages = [
    { liquidityPool: USDC_WETH_LP, wantToken: ethereumTokens.WRAPPED_TOKENS.WETH, slippage: "90" },
    { liquidityPool: USDC_WETH_LP, wantToken: ethereumTokens.PLAIN_TOKENS.USDC, slippage: "70" },
    { liquidityPool: WBTC_WETH_LP, wantToken: ethereumTokens.WRAPPED_TOKENS.WETH, slippage: "70" },
    { liquidityPool: WBTC_WETH_LP, wantToken: ethereumTokens.BTC_TOKENS.WBTC, slippage: "70" },
  ];
  const pendingLiquidityPoolToWantTokenToSlippages = [];
  for (const liquidityPoolToWantTokenToSlippage of liquidityPoolToWantTokenToSlippages) {
    const slippage = await sushiswapPoolAdapterEthereumInstance.liquidityPoolToWantTokenToSlippage(
      liquidityPoolToWantTokenToSlippage.liquidityPool,
      liquidityPoolToWantTokenToSlippage.wantToken,
    );
    if (!BigNumber.from(slippage).eq(BigNumber.from(liquidityPoolToWantTokenToSlippage.slippage))) {
      pendingLiquidityPoolToWantTokenToSlippages.push(liquidityPoolToWantTokenToSlippage);
    }
  }

  if (pendingLiquidityPoolToWantTokenToSlippages.length > 0) {
    console.log(JSON.stringify(pendingLiquidityPoolToWantTokenToSlippages, null, 4));
    if (getAddress(riskOperatorSigner.address) === getAddress(deployer)) {
      console.log("updating pending LiquidityPool To Want Token To Slippages");
      const tx = await sushiswapPoolAdapterEthereumInstance
        .connect(riskOperatorSigner)
        .setLiquidityPoolToWantTokenToSlippage(pendingLiquidityPoolToWantTokenToSlippages);
      await tx.wait(1);
    } else {
      console.log(
        "cannot update pending LiquidityPool To Want Token To Slippages because the signer is not the risk operator",
      );
    }
  } else {
    console.log("pendingLiquidityPoolToWantTokenToSlippages are up to date");
  }
};
export default func;
func.tags = ["SushiswapPoolAdapterEthereum"];
func.dependencies = ["Registry", "OptyFiOracle"];
