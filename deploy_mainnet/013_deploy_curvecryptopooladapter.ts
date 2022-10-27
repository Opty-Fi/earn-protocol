import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { default as CurveExports } from "@optyfi/defi-legos/ethereum/curve/contracts";
import { waitforme } from "../helpers/utils";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({
  deployments,
  getChainId,
  ethers,
  network,
  tenderly,
  run,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const artifact = await deployments.getArtifact("CurveCryptoPoolAdapter");
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const deployer = (await ethers.getSigners())[0].address;
  const chainId = await getChainId();
  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("CurveCryptoPoolAdapter", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress, CurveExports.CurveFactory.address, CurveExports.CurveMetaRegistry.address],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const curveCryptoPoolAdapter = await deployments.get("CurveCryptoPoolAdapter");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "CurveCryptoPoolAdapter",
          address: curveCryptoPoolAdapter.address,
          constructorArguments: [
            registryProxyAddress,
            CurveExports.CurveFactory.address,
            CurveExports.CurveMetaRegistry.address,
          ],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "CurveCryptoPoolAdapter",
          address: curveCryptoPoolAdapter.address,
          constructorArguments: [
            registryProxyAddress,
            CurveExports.CurveFactory.address,
            CurveExports.CurveMetaRegistry.address,
          ],
        });
      }
    }
  }
};
export default func;
func.tags = ["CurveCryptoPoolAdapter"];
func.dependencies = ["Registry"];
