import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import PolygonSushiswapExports from "@optyfi/defi-legos/polygon/sushiswap/index";
import PolygonTokens from "@optyfi/defi-legos/polygon/tokens/index";
import { waitforme } from "../helpers/utils";
import { Registry, Registry__factory, UniswapV2ExchangeAdapter, UniswapV2ExchangeAdapter__factory } from "../typechain";
import { getAddress } from "ethers/lib/utils";

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
  const artifact = await deployments.getArtifact("UniswapV2ExchangeAdapter");
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const optyfiOracleAddress = await (await deployments.get("OptyFiOracle")).address;

  const chainId = await getChainId();
  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("SushiswapExchangeAdapterPolygon", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress, PolygonSushiswapExports.SushiswapRouter.address, optyfiOracleAddress],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const sushiswapExchangeAdapterPolygon = await deployments.get("SushiswapExchangeAdapterPolygon");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "SushiswapExchangeAdapterPolygon",
          address: sushiswapExchangeAdapterPolygon.address,
          constructorArguments: [
            registryProxyAddress,
            PolygonSushiswapExports.SushiswapRouter.address,
            optyfiOracleAddress,
          ],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "SushiswapExchangeAdapterPolygon",
          address: sushiswapExchangeAdapterPolygon.address,
          constructorArguments: [
            registryProxyAddress,
            PolygonSushiswapExports.SushiswapRouter.address,
            optyfiOracleAddress,
          ],
        });
      }
    }
  }

  const sushiswapExchangeAdapterPolygonAddress = await (
    await deployments.get("SushiswapExchangeAdapterPolygon")
  ).address;
  const sushiswapExchangeAdapterPolygonInstance = <UniswapV2ExchangeAdapter>(
    await ethers.getContractAt(UniswapV2ExchangeAdapter__factory.abi, sushiswapExchangeAdapterPolygonAddress)
  );
  const registryProxyInstance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
  const riskOperator = await registryProxyInstance.riskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperator);

  const USDC_DAI_LP = "0xcd578f016888b57f1b1e3f887f392f0159e26747";

  const liquidityPoolToWantTokenToSlippages = [
    { liquidityPool: USDC_DAI_LP, wantToken: PolygonTokens.USDC, slippage: "2000" },
    { liquidityPool: USDC_DAI_LP, wantToken: PolygonTokens.DAI, slippage: "2000" },
  ];
  const pendingLiquidityPoolToWantTokenToSlippages = [];
  for (const liquidityPoolToWantTokenToSlippage of liquidityPoolToWantTokenToSlippages) {
    const slippage = await sushiswapExchangeAdapterPolygonInstance.liquidityPoolToWantTokenToSlippage(
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
      const tx = await sushiswapExchangeAdapterPolygonInstance
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
func.tags = ["SushiswapExchangeAdapterPolygon"];
func.dependencies = ["Registry", "OptyFiOracle"];
