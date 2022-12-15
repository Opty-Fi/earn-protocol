import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({
  deployments,
  getNamedAccounts,
  getChainId,
  network,
  tenderly,
  run,
  ethers,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact(ESSENTIAL_CONTRACTS.COMMAND_BUILDER);
  const chainId = await getChainId();
  const networkName = network.name;

  const feeData = await ethers.provider.getFeeData();

  const result = await deploy("CommandBuilder", {
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

  if (CONTRACTS_VERIFY === "true") {
    if (result.newlyDeployed) {
      const commandBuilder = await deployments.get("CommandBuilder");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "CommandBuilder",
          address: commandBuilder.address,
          constructorArguments: [],
          contract: "contracts/protocol/lib/CommandBuilder.sol:CommandBuilder",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "CommandBuilder",
          address: commandBuilder.address,
          constructorArguments: [],
          contract: "contracts/protocol/lib/CommandBuilder.sol:CommandBuilder",
        });
      }
    }
  }
};
export default func;
func.tags = ["CommandBuilder"];
