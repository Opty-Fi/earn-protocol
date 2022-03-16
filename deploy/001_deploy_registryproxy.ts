import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({ deployments, getNamedAccounts, getChainId }: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact(ESSENTIAL_CONTRACTS.REGISTRY_PROXY);
  const chainId = await getChainId();
  const networkName = hre.network.name;

  const result = await deploy("RegistryProxy", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  if (CONTRACTS_VERIFY === "true") {
    if (result.newlyDeployed) {
      const registryProxy = await deployments.get("RegistryProxy");
      if (networkName === "tenderly") {
        await hre.tenderly.verify({
          name: "RegistryProxy",
          address: registryProxy.address,
          constructorArguments: [],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/RegistryProxy.sol:RegistryProxy",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await hre.run("verify:verify", {
          name: "RegistryProxy",
          address: registryProxy.address,
          constructorArguments: [],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/RegistryProxy.sol:RegistryProxy",
        });
      }
    }
  }
};
export default func;
func.tags = ["RegistryProxy"];
