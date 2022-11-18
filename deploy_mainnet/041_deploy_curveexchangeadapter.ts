import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import CurveExports from "@optyfi/defi-legos/ethereum/curve/index";
import { waitforme } from "../helpers/utils";

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
  const artifact = await deployments.getArtifact("CurveExchangeAdapter");
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;

  const chainId = await getChainId();
  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("CurveExchangeAdapterEthereum", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [
      registryProxyAddress,
      CurveExports.CurveRegistryExchange.address,
      CurveExports.CurveMetaRegistry.address,
      EthereumTokens.WRAPPED_TOKENS.WETH,
      EthereumTokens.PLAIN_TOKENS.ETH,
      CurveExports.CurveSwapPool["seth_eth+seth"].pool,
      CurveExports.CurveSwapPool["aethc_eth+aethc"].pool,
      CurveExports.CurveSwapPool["reth_eth+reth"].pool,
      CurveExports.CurveSwapPool["steth_eth+steth"].pool,
    ],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const curveExchangeAdapter = await deployments.get("CurveExchangeAdapter");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "CurveExchangeAdapter",
          address: curveExchangeAdapter.address,
          constructorArguments: [
            registryProxyAddress,
            CurveExports.CurveRegistryExchange.address,
            CurveExports.CurveMetaRegistry.address,
            EthereumTokens.WRAPPED_TOKENS.WETH,
            EthereumTokens.PLAIN_TOKENS.ETH,
            CurveExports.CurveSwapPool["seth_eth+seth"].pool,
            CurveExports.CurveSwapPool["aethc_eth+aethc"].pool,
            CurveExports.CurveSwapPool["reth_eth+reth"].pool,
            CurveExports.CurveSwapPool["steth_eth+steth"].pool,
          ],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "CurveExchangeAdapter",
          address: curveExchangeAdapter.address,
          constructorArguments: [
            registryProxyAddress,
            CurveExports.CurveRegistryExchange.address,
            CurveExports.CurveMetaRegistry.address,
            EthereumTokens.WRAPPED_TOKENS.WETH,
            EthereumTokens.PLAIN_TOKENS.ETH,
            CurveExports.CurveSwapPool["seth_eth+seth"].pool,
            CurveExports.CurveSwapPool["aethc_eth+aethc"].pool,
            CurveExports.CurveSwapPool["reth_eth+reth"].pool,
            CurveExports.CurveSwapPool["steth_eth+steth"].pool,
          ],
        });
      }
    }
  }
};
export default func;
func.tags = ["CurveExchangeAdapterEthereum"];
func.dependencies = ["Registry"];
