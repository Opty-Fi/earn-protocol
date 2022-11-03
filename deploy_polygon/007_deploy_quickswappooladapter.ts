import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { default as QuickswapPolygon } from "@optyfi/defi-legos/polygon/quickswap";
import polygonTokens from "@optyfi/defi-legos/polygon/tokens/index";
import { waitforme } from "../helpers/utils";
import { Registry, Registry__factory, UniswapV2PoolAdapter, UniswapV2PoolAdapter__factory } from "../typechain";
import { getAddress } from "ethers/lib/utils";
import { getNamedAccounts } from "hardhat";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({
  deployments,
  getChainId,
  ethers,
  network,
  tenderly,
  run,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact("UniswapV2PoolAdapter");
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const optyfiOracleAddress = await (await deployments.get("OptyFiOracle")).address;
  const registryV2Instance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
  const operatorAddress = await registryV2Instance.getOperator();
  const chainId = await getChainId();
  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("QuickSwapPoolAdapter", {
    from: operatorAddress,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [
      registryProxyAddress,
      optyfiOracleAddress,
      QuickswapPolygon.QuickswapRouter.address,
      QuickswapPolygon.QuickswapFactory.address,
      QuickswapPolygon.rootKFactor,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const quickSwapPoolAdapter = await deployments.get("QuickSwapPoolAdapter");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "QuickSwapPoolAdapter",
          address: quickSwapPoolAdapter.address,
          constructorArguments: [
            registryProxyAddress,
            optyfiOracleAddress,
            QuickswapPolygon.QuickswapRouter.address,
            QuickswapPolygon.QuickswapFactory.address,
            QuickswapPolygon.rootKFactor,
          ],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "QuickSwapPoolAdapter",
          address: quickSwapPoolAdapter.address,
          constructorArguments: [
            registryProxyAddress,
            optyfiOracleAddress,
            QuickswapPolygon.QuickswapRouter.address,
            QuickswapPolygon.QuickswapFactory.address,
            QuickswapPolygon.rootKFactor,
          ],
        });
      }
    }
  }

  const quickswapPoolAdapterAddress = await (await deployments.get("QuickSwapPoolAdapter")).address;
  const quickswapPoolAdapterInstance = <UniswapV2PoolAdapter>(
    await ethers.getContractAt(UniswapV2PoolAdapter__factory.abi, quickswapPoolAdapterAddress)
  );
  const registryProxyInstance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
  const riskOperator = await registryProxyInstance.riskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperator);

  const USDC_USDT_LP = "0x2cF7252e74036d1Da831d11089D326296e64a728";
  const USDC_DAI_LP = "0xf04adBF75cDFc5eD26eeA4bbbb991DB002036Bdd";
  const USDC_MAI_LP = "0x160532D2536175d65C03B97b0630A9802c274daD";

  const liquidityPoolToTolerances = [
    { liquidityPool: USDC_USDT_LP, tolerance: "70" },
    { liquidityPool: USDC_DAI_LP, tolerance: "70" },
    { liquidityPool: USDC_MAI_LP, tolerance: "70" },
  ];
  const pendingLiquidityPoolToTolerances = [];
  for (const liquidityPoolToTolerance of liquidityPoolToTolerances) {
    const tolerance = await quickswapPoolAdapterInstance.liquidityPoolToTolerance(
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
      const tx = await quickswapPoolAdapterInstance
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
    { liquidityPool: USDC_USDT_LP, wantToken: polygonTokens.USDT, slippage: "100" },
    { liquidityPool: USDC_USDT_LP, wantToken: polygonTokens.USDC, slippage: "100" },
    { liquidityPool: USDC_DAI_LP, wantToken: polygonTokens.USDC, slippage: "100" },
    { liquidityPool: USDC_DAI_LP, wantToken: polygonTokens.DAI, slippage: "100" },
    { liquidityPool: USDC_MAI_LP, wantToken: polygonTokens.USDC, slippage: "100" },
    { liquidityPool: USDC_MAI_LP, wantToken: polygonTokens.MIMATIC, slippage: "100" },
  ];
  const pendingLiquidityPoolToWantTokenToSlippages = [];
  for (const liquidityPoolToWantTokenToSlippage of liquidityPoolToWantTokenToSlippages) {
    const slippage = await quickswapPoolAdapterInstance.liquidityPoolToWantTokenToSlippage(
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
      const tx = await quickswapPoolAdapterInstance
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
func.tags = ["PolygonQuickSwapPoolAdapter"];
func.dependencies = ["Registry"];
