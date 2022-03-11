import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({ deployments, getNamedAccounts, getChainId }: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact("AaveV2Adapter");
  const registryProxy = await deployments.get("RegistryProxy");

  const chainId = await getChainId();
  const networkName = hre.network.name;

  const result = await deploy("AaveV2Adapter", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxy.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const aaveV2Adapter = await deployments.get("AaveV2Adapter");
      if (networkName === "tenderly") {
        await hre.tenderly.verify({
          name: "AaveV2Adapter",
          address: aaveV2Adapter.address,
          constructorArguments: [registryProxy.address],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await hre.run("verify:verify", {
          name: "AaveV2Adapter",
          address: aaveV2Adapter.address,
          constructorArguments: [registryProxy.address],
        });
      }
    }
  }
};
export default func;
func.tags = ["AaveV2Adapter"];
