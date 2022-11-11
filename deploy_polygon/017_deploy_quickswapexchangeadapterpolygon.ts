import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import PolygonQuickswapExports from "@optyfi/defi-legos/polygon/quickswap/index";
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
  const artifact = await deployments.getArtifact("UniswapV2ExchangeAdapter");
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const optyfiOracleAddress = await (await deployments.get("OptyFiOracle")).address;

  const chainId = await getChainId();
  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("QuickswapExchangeAdapterPolygon", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress, PolygonQuickswapExports.QuickswapRouter.address, optyfiOracleAddress],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const quickswapExchangeAdapterPolygon = await deployments.get("QuickswapExchangeAdapterPolygon");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "QuickswapExchangeAdapterPolygon",
          address: quickswapExchangeAdapterPolygon.address,
          constructorArguments: [
            registryProxyAddress,
            PolygonQuickswapExports.QuickswapRouter.address,
            optyfiOracleAddress,
          ],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "QuickswapExchangeAdapterPolygon",
          address: quickswapExchangeAdapterPolygon.address,
          constructorArguments: [
            registryProxyAddress,
            PolygonQuickswapExports.QuickswapRouter.address,
            optyfiOracleAddress,
          ],
        });
      }
    }
  }
};
export default func;
func.tags = ["QuickswapExchangeAdapterPolygon"];
func.dependencies = ["Registry", "OptyFiOracle"];
