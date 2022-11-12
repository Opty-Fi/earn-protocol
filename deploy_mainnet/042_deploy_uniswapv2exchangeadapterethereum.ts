import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import EthereumUniswapV2 from "@optyfi/defi-legos/ethereum/uniswapV2/index";
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
  const result = await deploy("UniswapV2ExchangeAdapterEthereum", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress, EthereumUniswapV2.router02.address, optyfiOracleAddress],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const uniswapV2ExchangeAdapterEthereum = await deployments.get("UniswapV2ExchangeAdapterEthereum");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "UniswapV2ExchangeAdapterEthereum",
          address: uniswapV2ExchangeAdapterEthereum.address,
          constructorArguments: [registryProxyAddress, EthereumUniswapV2.router02.address, optyfiOracleAddress],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "UniswapV2ExchangeAdapterEthereum",
          address: uniswapV2ExchangeAdapterEthereum.address,
          constructorArguments: [registryProxyAddress, EthereumUniswapV2.router02.address, optyfiOracleAddress],
        });
      }
    }
  }

  const uniswapV2PoolAdapterEthereumAddress = await (await deployments.get("UniswapV2ExchangeAdapterEthereum")).address;
  const uniswapV2PoolAdapterEthereumInstance = <UniswapV2ExchangeAdapter>(
    await ethers.getContractAt(UniswapV2ExchangeAdapter__factory.abi, uniswapV2PoolAdapterEthereumAddress)
  );
  const registryProxyInstance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
  const riskOperator = await registryProxyInstance.riskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperator);

  const USDC_WETH_LP = "0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc";

  const liquidityPoolToWantTokenToSlippages = [
    { liquidityPool: USDC_WETH_LP, wantToken: EthereumTokens.WRAPPED_TOKENS.WETH, slippage: "70" },
    { liquidityPool: USDC_WETH_LP, wantToken: EthereumTokens.PLAIN_TOKENS.USDC, slippage: "70" },
  ];
  const pendingLiquidityPoolToWantTokenToSlippages = [];
  for (const liquidityPoolToWantTokenToSlippage of liquidityPoolToWantTokenToSlippages) {
    const slippage = await uniswapV2PoolAdapterEthereumInstance.liquidityPoolToWantTokenToSlippage(
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
      const tx = await uniswapV2PoolAdapterEthereumInstance
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
func.tags = ["UniswapV2ExchangeAdapterEthereum"];
func.dependencies = ["Registry", "OptyFiOracle"];
