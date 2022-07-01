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
  const artifact = await deployments.getArtifact(ESSENTIAL_CONTRACTS.CLAIM_AND_HARVEST);
  const chainId = await getChainId();
  const networkName = network.name;

  const feeData = await ethers.provider.getFeeData();

  const result = await deploy("ClaimAndHarvest", {
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
      const claimAndHarvest = await deployments.get("ClaimAndHarvest");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "ClaimAndHarvest",
          address: claimAndHarvest.address,
          constructorArguments: [],
          contract: "contracts/protocol/lib/ClaimAndHarvest.sol:ClaimAndHarvest",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "ClaimAndHarvest",
          address: claimAndHarvest.address,
          constructorArguments: [],
          contract: "contracts/protocol/lib/ClaimAndHarvest.sol:ClaimAndHarvest",
        });
      }
    }
  }
};
export default func;
func.tags = ["ClaimAndHarvest"];
