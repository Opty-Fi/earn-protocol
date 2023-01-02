import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
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
  const artifact = await deployments.getArtifact("AaveV1Helper");
  const chainId = await getChainId();
  const networkName = network.name;

  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("AaveV1Helper", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [EthereumTokens.WRAPPED_TOKENS.WETH],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const aavev1helper = await deployments.get("AaveV1Helper");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "AaveV1Helper",
          address: aavev1helper.address,
          constructorArguments: [EthereumTokens.WRAPPED_TOKENS.WETH],
          contract: "AaveV1Helper",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "AaveV1Helper",
          address: aavev1helper.address,
          constructorArguments: [EthereumTokens.WRAPPED_TOKENS.WETH],
          contract: "AaveV1Helper",
        });
      }
    }
  }
};
export default func;
func.tags = ["AaveV1Helper"];
func.dependencies = ["Registry"];
