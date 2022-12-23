import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { Registry } from "../typechain";

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
  const artifact = await deployments.getArtifact(ESSENTIAL_CONTRACTS.STRATEGY_REGISTRY);
  const chainId = await getChainId();
  const networkName = network.name;
  const { getAddress } = ethers.utils;

  const registryProxyAddress = (await deployments.get("RegistryProxy")).address;
  let feeData = await ethers.provider.getFeeData();
  const result = await deploy("StrategyRegistry", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  const registryV2Instance = <Registry>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const operatorAddress = await registryV2Instance.operator();
  const operatorSigner = await ethers.getSigner(operatorAddress);

  const oldStrategyRegistry = await registryV2Instance.getStrategyRegistry();
  const strategyRegistry = await deployments.get("StrategyRegistry");

  console.log("==StrategyRegistry registration==");
  console.log("\n");
  if (getAddress(oldStrategyRegistry) !== getAddress(strategyRegistry.address)) {
    console.log("operator registering StrategyRegistry..");
    feeData = await ethers.provider.getFeeData();
    const setStrategyRegistryTx = await registryV2Instance
      .connect(operatorSigner)
      .setStrategyRegistry(strategyRegistry.address, {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await setStrategyRegistryTx.wait(1);
  } else {
    console.log("StrategyRegistry already registered");
    console.log("\n");
  }

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const strategyRegistry = await deployments.get("StrategyRegistry");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "StrategyRegistry",
          address: strategyRegistry.address,
          constructorArguments: [registryProxyAddress],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/StrategyRegistry.sol:StrategyRegistry",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "StrategyRegistry",
          address: strategyRegistry.address,
          constructorArguments: [registryProxyAddress],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/StrategyRegistry.sol:StrategyRegistry",
        });
      }
    }
  }
};
export default func;
func.tags = ["StrategyRegistry"];
func.dependencies = ["Registry"];
