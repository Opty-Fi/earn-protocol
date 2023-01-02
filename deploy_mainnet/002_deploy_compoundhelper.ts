import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import Compound from "@optyfi/defi-legos/ethereum/compound/index";
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
  const artifact = await deployments.getArtifact("CompoundHelper");
  const chainId = await getChainId();
  const networkName = network.name;

  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("CompoundHelper", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [EthereumTokens.WRAPPED_TOKENS.WETH, Compound.pools.eth.lpToken],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const compoundhelper = await deployments.get("CompoundHelper");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "CompoundHelper",
          address: compoundhelper.address,
          constructorArguments: [EthereumTokens.WRAPPED_TOKENS.WETH, Compound.pools.eth.lpToken],
          contract: "CompoundHelper",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "CompoundHelper",
          address: compoundhelper.address,
          constructorArguments: [EthereumTokens.WRAPPED_TOKENS.WETH, Compound.pools.eth.lpToken],
          contract: "CompoundHelper",
        });
      }
    }
  }
};
export default func;
func.tags = ["CompoundHelper"];
func.dependencies = ["Registry"];
