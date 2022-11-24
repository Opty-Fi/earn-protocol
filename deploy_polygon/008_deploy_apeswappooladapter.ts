import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { default as ApeswapPolygon } from "@optyfi/defi-legos/polygon/apeswap";
import { getAddress } from "ethers/lib/utils";
import polygonTokens from "@optyfi/defi-legos/polygon/tokens/index";
import { getNamedAccounts } from "hardhat";
import { waitforme } from "../helpers/utils";
import { Registry, Registry__factory, UniswapV2PoolAdapter, UniswapV2PoolAdapter__factory } from "../typechain";

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
  const chainId = await getChainId();
  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("ApeSwapPoolAdapter", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [
      registryProxyAddress,
      optyfiOracleAddress,
      ApeswapPolygon.ApeswapRouter.address,
      ApeswapPolygon.ApeswapFactory.address,
      ApeswapPolygon.rootKFactor,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const apeSwapPoolAdapter = await deployments.get("ApeSwapPoolAdapter");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "ApeSwapPoolAdapter",
          address: apeSwapPoolAdapter.address,
          constructorArguments: [
            registryProxyAddress,
            optyfiOracleAddress,
            ApeswapPolygon.ApeswapRouter.address,
            ApeswapPolygon.ApeswapFactory.address,
            ApeswapPolygon.rootKFactor,
          ],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "ApeSwapPoolAdapter",
          address: apeSwapPoolAdapter.address,
          constructorArguments: [
            registryProxyAddress,
            optyfiOracleAddress,
            ApeswapPolygon.ApeswapRouter.address,
            ApeswapPolygon.ApeswapFactory.address,
            ApeswapPolygon.rootKFactor,
          ],
        });
      }
    }
  }

  const apeswapPoolAdapterAddress = await (await deployments.get("ApeSwapPoolAdapter")).address;
  const apeswapPoolAdapterInstance = <UniswapV2PoolAdapter>(
    await ethers.getContractAt(UniswapV2PoolAdapter__factory.abi, apeswapPoolAdapterAddress)
  );
  const registryProxyInstance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
  const riskOperator = await registryProxyInstance.riskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperator);

  const USDC_DAI_LP = "0x5b13B583D4317aB15186Ed660A1E4C65C10da659";

  const liquidityPoolToTolerances = [{ liquidityPool: USDC_DAI_LP, tolerance: "300" }];
  const pendingLiquidityPoolToTolerances = [];
  for (const liquidityPoolToTolerance of liquidityPoolToTolerances) {
    const tolerance = await apeswapPoolAdapterInstance.liquidityPoolToTolerance(liquidityPoolToTolerance.liquidityPool);
    if (!BigNumber.from(tolerance).eq(BigNumber.from(liquidityPoolToTolerance.tolerance))) {
      pendingLiquidityPoolToTolerances.push(liquidityPoolToTolerance);
    }
  }

  if (pendingLiquidityPoolToTolerances.length > 0) {
    console.log(JSON.stringify(pendingLiquidityPoolToTolerances, null, 4));
    if (getAddress(riskOperatorSigner.address) === getAddress(deployer)) {
      console.log("updating pending LiquidityPool To Tolerances");
      const tx = await apeswapPoolAdapterInstance
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
    { liquidityPool: USDC_DAI_LP, wantToken: polygonTokens.USDC, slippage: "300" },
    { liquidityPool: USDC_DAI_LP, wantToken: polygonTokens.DAI, slippage: "300" },
  ];
  const pendingLiquidityPoolToWantTokenToSlippages = [];
  for (const liquidityPoolToWantTokenToSlippage of liquidityPoolToWantTokenToSlippages) {
    const slippage = await apeswapPoolAdapterInstance.liquidityPoolToWantTokenToSlippage(
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
      const tx = await apeswapPoolAdapterInstance
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
func.tags = ["PolygonApeSwapPoolAdapter"];
func.dependencies = ["Registry"];
