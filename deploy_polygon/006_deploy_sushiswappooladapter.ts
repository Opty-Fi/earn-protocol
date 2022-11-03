import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { default as SushiswapPolygon } from "@optyfi/defi-legos/polygon/sushiswap";
import polygonTokens from "@optyfi/defi-legos/polygon/tokens/index";
import { getAddress } from "ethers/lib/utils";
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
  const registryV2Instance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
  const operatorAddress = await registryV2Instance.getOperator();
  const chainId = await getChainId();
  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("SushiswapPoolAdapter", {
    from: operatorAddress,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [
      registryProxyAddress,
      optyfiOracleAddress,
      SushiswapPolygon.SushiswapRouter.address,
      SushiswapPolygon.SushiswapFactory.address,
      SushiswapPolygon.rootKFactor,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const sushiswapPoolAdapter = await deployments.get("SushiswapPoolAdapter");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "sushiswapPoolAdapter",
          address: sushiswapPoolAdapter.address,
          constructorArguments: [
            registryProxyAddress,
            optyfiOracleAddress,
            SushiswapPolygon.SushiswapRouter.address,
            SushiswapPolygon.SushiswapFactory.address,
            SushiswapPolygon.rootKFactor,
          ],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "SushiswapPoolAdapter",
          address: sushiswapPoolAdapter.address,
          constructorArguments: [
            registryProxyAddress,
            optyfiOracleAddress,
            SushiswapPolygon.SushiswapRouter.address,
            SushiswapPolygon.SushiswapFactory.address,
            SushiswapPolygon.rootKFactor,
          ],
        });
      }
    }
  }

  const sushiswapPoolAdapterAddress = await (await deployments.get("SushiswapPoolAdapter")).address;
  const sushiswapPoolAdapterInstance = <UniswapV2PoolAdapter>(
    await ethers.getContractAt(UniswapV2PoolAdapter__factory.abi, sushiswapPoolAdapterAddress)
  );
  const registryProxyInstance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
  const riskOperator = await registryProxyInstance.riskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperator);

  const USDC_USDT_LP = "0x4B1F1e2435A9C96f7330FAea190Ef6A7C8D70001";
  const USDC_DAI_LP = "0xCD578F016888B57F1b1e3f887f392F0159E26747";

  const liquidityPoolToTolerances = [
    { liquidityPool: USDC_USDT_LP, tolerance: "100" },
    { liquidityPool: USDC_DAI_LP, tolerance: "150" },
  ];
  const pendingLiquidityPoolToTolerances = [];
  for (const liquidityPoolToTolerance of liquidityPoolToTolerances) {
    const tolerance = await sushiswapPoolAdapterInstance.liquidityPoolToTolerance(
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
      const tx = await sushiswapPoolAdapterInstance
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
  ];
  const pendingLiquidityPoolToWantTokenToSlippages = [];
  for (const liquidityPoolToWantTokenToSlippage of liquidityPoolToWantTokenToSlippages) {
    const slippage = await sushiswapPoolAdapterInstance.liquidityPoolToWantTokenToSlippage(
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
      const tx = await sushiswapPoolAdapterInstance
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
func.tags = ["PolygonSushiswapPoolAdapter"];
func.dependencies = ["Registry"];
