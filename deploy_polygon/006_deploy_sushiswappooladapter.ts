import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { default as SushiswapPolygon } from "@optyfi/defi-legos/polygon/sushiswap";
import { waitforme } from "../helpers/utils";
import { Registry, Registry__factory } from "../typechain";

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
  const artifact = await deployments.getArtifact("UniswapV2PoolAdapter");
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const optyfiOracleAddress = await (await deployments.get("OptyFiOracle")).address;
  const registryV2Instance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
  const operatorAddress = await registryV2Instance.getOperator();
  const chainId = await getChainId();
  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("UniswapV2PoolAdapter", {
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
};
export default func;
func.tags = ["PolygonSushiswapPoolAdapter"];
func.dependencies = ["Registry"];
