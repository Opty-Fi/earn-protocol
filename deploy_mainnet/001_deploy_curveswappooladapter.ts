import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { waitforme } from "../helpers/utils";
import { Registry } from "../typechain";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;
const IS_NEWO = process.env.IS_NEWO;

const func: DeployFunction = async ({
  deployments,
  getChainId,
  ethers,
  network,
  tenderly,
  run,
}: HardhatRuntimeEnvironment) => {
  if (!IS_NEWO) {
    const { deploy } = deployments;
    const artifact = await deployments.getArtifact("CurveSwapPoolAdapter");
    const registryProxyAddress = "0x99fa011e33a8c6196869dec7bc407e896ba67fe3";
    const registryV2Instance = <Registry>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
    const operatorAddress = await registryV2Instance.getOperator();
    const chainId = await getChainId();
    const networkName = network.name;

    const result = await deploy("CurveSwapPoolAdapter", {
      from: operatorAddress,
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
        const curveSwapPoolAdapter = await deployments.get("CurveSwapPoolAdapter");
        if (networkName === "tenderly") {
          await tenderly.verify({
            name: "CurveSwapPoolAdapter",
            address: curveSwapPoolAdapter.address,
            constructorArguments: [registryProxyAddress],
          });
        } else if (!["31337"].includes(chainId)) {
          await waitforme(20000);

          await run("verify:verify", {
            name: "CurveSwapPoolAdapter",
            address: curveSwapPoolAdapter.address,
            constructorArguments: [registryProxyAddress],
          });
        }
      }
    }
  } else {
    console.log("Testing NEWO vault only, hence skipping deploying curve swap pool adapter");
    console.log("\n");
  }
};
export default func;
func.tags = ["CurveSwapPoolAdapter"];
