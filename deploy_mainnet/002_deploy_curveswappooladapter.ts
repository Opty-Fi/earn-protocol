import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { waitforme } from "../helpers/utils";
import { RegistryV2 } from "../typechain";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({ deployments, getChainId, ethers }: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const artifact = await deployments.getArtifact("CurveSwapPoolAdapter");
  const registryProxy = await deployments.get("RegistryProxy");
  const registryV2Instance = <RegistryV2>(
    await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryProxy.address)
  );
  const operatorAddress = await registryV2Instance.getOperator();
  const chainId = await getChainId();
  const networkName = hre.network.name;

  const result = await deploy("CurveSwapPoolAdapter", {
    from: operatorAddress,
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
      const curveSwapPoolAdapter = await deployments.get("CurveSwapPoolAdapter");
      if (networkName === "tenderly") {
        await hre.tenderly.verify({
          name: "CurveSwapPoolAdapter",
          address: curveSwapPoolAdapter.address,
          constructorArguments: [registryProxy.address],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await hre.run("verify:verify", {
          name: "CurveSwapPoolAdapter",
          address: curveSwapPoolAdapter.address,
          constructorArguments: [registryProxy.address],
        });
      }
    }
  }
};
export default func;
func.tags = ["CurveSwapPoolAdapter"];
