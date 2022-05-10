import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;
const IS_NEWO = process.env.IS_NEWO;

const func: DeployFunction = async ({
  deployments,
  getNamedAccounts,
  getChainId,
  network,
  tenderly,
  run,
}: HardhatRuntimeEnvironment) => {
  if (!IS_NEWO) {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const artifact = await deployments.getArtifact("CurveMetapoolSwapAdapter");
    const registryProxyAddress = "0x99fa011e33a8c6196869dec7bc407e896ba67fe3";

    const chainId = await getChainId();
    const networkName = network.name;

    const result = await deploy("CurveMetapoolSwapAdapter", {
      from: deployer,
      contract: {
        abi: artifact.abi,
        bytecode: artifact.bytecode,
        deployedBytecode: artifact.deployedBytecode,
      },
      args: [registryProxyAddress],
      log: true,
      skipIfAlreadyDeployed: true,
    });

    if (CONTRACTS_VERIFY == "true") {
      if (result.newlyDeployed) {
        const curveMetaPoolSwapAdapter = await deployments.get("CurveMetapoolSwapAdapter");
        if (networkName === "tenderly") {
          await tenderly.verify({
            name: "CurveMetapoolSwapAdapter",
            address: curveMetaPoolSwapAdapter.address,
            constructorArguments: [registryProxyAddress],
          });
        } else if (!["31337"].includes(chainId)) {
          await waitforme(20000);

          await run("verify:verify", {
            name: "CurveMetaPoolSwapAdapter",
            address: curveMetaPoolSwapAdapter.address,
            constructorArguments: [registryProxyAddress],
          });
        }
      }
    }
  } else {
    console.log("Testing NEWO vault only, hence skipping deploying curve metapool swap adapter");
    console.log("\n");
  }
};
export default func;
func.tags = ["CurveMetapoolSwapAdapter"];
