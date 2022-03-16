import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({ deployments, getNamedAccounts, getChainId }: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact(ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY);
  const registryProxy = await deployments.get("RegistryProxy");
  const chainId = await getChainId();
  const networkName = hre.network.name;

  const result = await deploy("RiskManagerProxy", {
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
      const riskManagerProxy = await deployments.get("RiskManagerProxy");
      if (networkName === "tenderly") {
        await hre.tenderly.verify({
          name: "RiskManagerProxy",
          address: riskManagerProxy.address,
          constructorArguments: [registryProxy.address],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/RiskManagerProxy.sol:RiskManagerProxy",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await hre.run("verify:verify", {
          name: "RiskManagerProxy",
          address: riskManagerProxy.address,
          constructorArguments: [registryProxy.address],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/RiskManagerProxy.sol:RiskManagerProxy",
        });
      }
    }
  }
};
export default func;
func.tags = ["RiskManagerProxy"];
func.dependencies = ["RegistryProxy"];
