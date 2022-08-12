import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
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
  const artifact = await deployments.getArtifact("AaveV1Adapter");
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;

  const chainId = await getChainId();
  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("AaveV1Adapter", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress, "0x68d2BA9fc2009c39384F5a0e28a4f1E72E6AB1fA"],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const aavev1Adapter = await deployments.get("AaveV1Adapter");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "AaveV1Adapter",
          address: aavev1Adapter.address,
          constructorArguments: [registryProxyAddress, "0x68d2BA9fc2009c39384F5a0e28a4f1E72E6AB1fA"],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "AaveV1Adapter",
          address: aavev1Adapter.address,
          constructorArguments: [registryProxyAddress, "0x68d2BA9fc2009c39384F5a0e28a4f1E72E6AB1fA"],
        });
      }
    }
  }
};
export default func;
func.tags = ["AaveV1Adapter"];
func.dependencies = ["Registry"];
