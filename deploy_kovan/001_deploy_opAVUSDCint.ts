import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({ deployments, getNamedAccounts, getChainId }: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact("Vault");
  const registryProxyAddress = "0xf710F75418353B36F2624784c290B80e7a5C892A";

  const chainId = await getChainId();
  const networkName = hre.network.name;

  const result = await deploy("opAVUSDCint", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress, "USD Coin", "USDC", "Intermediate", "int"],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const vault = await deployments.get("opAVUSDCint");
      if (networkName === "tenderly") {
        await hre.tenderly.verify({
          name: "opAVUSDCint",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "USD Coin", "USDC", "Intermediate", "int"],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await hre.run("verify:verify", {
          name: "opAVUSDCint",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "USD Coin", "USDC", "Intermediate", "int"],
        });
      }
    }
  }
};
export default func;
func.tags = ["opAVUSDCint"];
