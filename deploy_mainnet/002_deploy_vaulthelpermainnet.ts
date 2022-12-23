import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { waitforme } from "../helpers/utils";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const uniswapV3Router = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

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
  const artifact = await deployments.getArtifact("VaultHelperMainnet");
  const chainId = await getChainId();
  const networkName = network.name;

  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("VaultHelperMainnet", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [EthereumTokens.WRAPPED_TOKENS.WETH, uniswapV3Router],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const vaultHelperMainnet = await deployments.get("VaultHelperMainnet");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "VaultHelperMainnet",
          address: vaultHelperMainnet.address,
          constructorArguments: [EthereumTokens.WRAPPED_TOKENS.WETH, uniswapV3Router],
          contract: "VaultHelperMainnet",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "VaultHelperMainnet",
          address: vaultHelperMainnet.address,
          constructorArguments: [EthereumTokens.WRAPPED_TOKENS.WETH, uniswapV3Router],
          contract: "VaultHelperMainnet",
        });
      }
    }
  }
};
export default func;
func.tags = ["VaultHelperMainnet"];
func.dependencies = ["Registry"];
