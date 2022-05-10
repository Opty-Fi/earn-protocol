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
  const registryProxyAddress = "0x99fa011E33A8c6196869DeC7Bc407E896BA67fE3";

  const chainId = await getChainId();
  const networkName = network.name;

  const result = await deploy("opNEWOgrow", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress, "Newo", "NEWO", "Growth", "grow"],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const vault = await deployments.get("opNEWOgrow");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "opNEWOgrow",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "Newo", "NEWO", "Growth", "grow"],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "opNEWOgrow",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "Newo", "NEWO", "Growth", "grow"],
        });
      }
    }
  }
};
export default func;
func.tags = ["opNEWOgrow"];
