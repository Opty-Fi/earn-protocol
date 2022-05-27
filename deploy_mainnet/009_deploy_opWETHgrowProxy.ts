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
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact("Vault");
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const chainId = await getChainId();
  const networkName = network.name;

  const result = await deploy("opWETHgrow", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress, "Wrapped Ether", "WETH", "Growth", "grow"],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const vault = await deployments.get("opWETHgrow");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "opWETHgrow",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "Wrapped Ether", "WETH", "Growth", "grow"],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "opWETHgrow",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "Wrapped Ether", "WETH", "Growth", "grow"],
        });
      }
    }
  }
};
export default func;
func.tags = ["opWETHgrow"];
