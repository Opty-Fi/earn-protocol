import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({ deployments, getNamedAccounts, getChainId }: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact("CurveMetapoolDepositAdapter");
  const registryProxy = await deployments.get("RegistryProxy");

  const chainId = await getChainId();
  const networkName = hre.network.name;

  const result = await deploy("CurveMetapoolDepositAdapter", {
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

  if (typeof CONTRACTS_VERIFY == "boolean" && CONTRACTS_VERIFY) {
    if (result.newlyDeployed) {
      const curveMetaPoolDepositAdapter = await deployments.get("CurveMetapoolDepositAdapter");
      if (networkName === "tenderly") {
        await hre.tenderly.verify({
          name: "CurveMetapoolDepositAdapter",
          address: curveMetaPoolDepositAdapter.address,
          constructorArguments: [registryProxy.address],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await hre.run("verify:verify", {
          name: "CurveMetapoolDepositAdapter",
          address: curveMetaPoolDepositAdapter.address,
          constructorArguments: [registryProxy.address],
        });
      }
    }
  }
};
export default func;
func.tags = ["CurveMetapoolDepositAdapter"];
