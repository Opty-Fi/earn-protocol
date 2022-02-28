import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { waitforme } from "../helpers/utils";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({ deployments, getChainId, ethers }: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const artifact = await deployments.getArtifact("CurveDepositPoolAdapter");
  const registryProxy = await deployments.get("RegistryProxy");
  const chainId = await getChainId();
  const networkName = hre.network.name;

  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryProxy.address);
  const operatorAddress = await registryV2Instance.operator();

  const result = await deploy("CurveDepositPoolAdapter", {
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
      const curveDepositPoolAdapter = await deployments.get("CurveDepositPoolAdapter");
      if (networkName === "tenderly") {
        await hre.tenderly.verify({
          name: "CurveDepositPoolAdapter",
          address: curveDepositPoolAdapter.address,
          constructorArguments: [registryProxy.address],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await hre.run("verify:verify", {
          name: "CurveDepositPoolAdapter",
          address: curveDepositPoolAdapter.address,
          constructorArguments: [registryProxy.address],
        });
      }
    }
  }
};
export default func;
func.tags = ["CurveDepositPoolAdapter"];
