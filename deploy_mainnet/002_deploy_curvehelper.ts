import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({
  deployments,
  getNamedAccounts,
  getChainId,
  ethers,
  network,
  tenderly,
  run,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact("CurveHelper");
  const chainId = await getChainId();
  const networkName = network.name;

  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("CurveHelper", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const curvehelper = await deployments.get("CurveHelper");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "CurveHelper",
          address: curvehelper.address,
          constructorArguments: [],
          contract: "CurveHelper",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "CurveHelper",
          address: curvehelper.address,
          constructorArguments: [],
          contract: "CurveHelper",
        });
      }
    }
  }
};
export default func;
func.tags = ["CurveHelper"];
func.dependencies = ["Registry"];
