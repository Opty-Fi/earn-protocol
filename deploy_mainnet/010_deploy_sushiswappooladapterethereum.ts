import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import {
  Registry,
  Registry__factory,
  SushiswapPoolAdapterEthereum,
  SushiswapPoolAdapterEthereum__factory,
} from "../typechain";
import ethereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";

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
  const artifact = await deployments.getArtifact("SushiswapPoolAdapterEthereum");
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
    args: [registryProxyAddress, optyfiOracleAddress],
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
          constructorArguments: [registryProxyAddress, optyfiOracleAddress],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "SushiswapPoolAdapterEthereum",
          address: sushiswapPoolAdapterEthereum.address,
          constructorArguments: [registryProxyAddress, optyfiOracleAddress],
        });
      }
    }
  }
  const sushiswapPoolAdapterEthereumAddress = await (await deployments.get("SushiswapPoolAdapterEthereum")).address;
  const sushiswapPoolAdapterEthereumInstance = <SushiswapPoolAdapterEthereum>(
    await ethers.getContractAt(SushiswapPoolAdapterEthereum__factory.abi, sushiswapPoolAdapterEthereumAddress)
  );
  const registryProxyInstance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
  const riskOperator = await registryProxyInstance.riskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperator);

  const APE = "0x4d224452801ACEd8B2F0aebE155379bb5D594381";
  const AAVE_WETH_LP = "0xD75EA151a61d06868E31F8988D28DFE5E9df57B4";
  const APE_USDT_LP = "0xB27C7b131Cf4915BeC6c4Bc1ce2F33f9EE434b9f";
  const SUSHI_WETH_LP = "0x795065dCc9f64b5614C407a6EFDC400DA6221FB0";
  const MANA_WETH_LP = "0x1bEC4db6c3Bc499F3DbF289F5499C30d541FEc97";
  const LINK_WETH_LP = "0xC40D16476380e4037e6b1A2594cAF6a6cc8Da967";

  const liquidityPoolToTolerances = [
    { liquidityPool: AAVE_WETH_LP, tolerance: "150" },
    { liquidityPool: APE_USDT_LP, tolerance: "150" },
    { liquidityPool: SUSHI_WETH_LP, tolerance: "150" },
    { liquidityPool: MANA_WETH_LP, tolerance: "150" },
    { liquidityPool: LINK_WETH_LP, tolerance: "150" },
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
    console.log("updating pending LiquidityPool To Tolerances");
    console.log(JSON.stringify(pendingLiquidityPoolToTolerances, {}, 4));
    const tx = await sushiswapPoolAdapterEthereumInstance
      .connect(riskOperatorSigner)
      .setLiquidityPoolToTolerance(pendingLiquidityPoolToTolerances);
    await tx.wait(1);
  } else {
    console.log("liquidityPoolToTolerances are up to date");
  }

  const liquidityPoolToWantTokenToSlippages = [
    { liquidityPool: APE_USDT_LP, wantToken: APE, slippage: "150" },
    { liquidityPool: LINK_WETH_LP, wantToken: ethereumTokens.WRAPPED_TOKENS.WETH, slippage: "150" },
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
    console.log("updating pending LiquidityPool To Want Token To Slippages ");
    const tx = await sushiswapPoolAdapterEthereumInstance
      .connect(riskOperatorSigner)
      .setLiquidityPoolToWantTokenToSlippage(pendingLiquidityPoolToWantTokenToSlippages);
    await tx.wait(1);
  } else {
    console.log("pendingLiquidityPoolToWantTokenToSlippages are up to date");
  }
};
export default func;
func.tags = ["SushiswapPoolAdapterEthereum"];
func.dependencies = ["Registry", "OptyFiOracle"];
