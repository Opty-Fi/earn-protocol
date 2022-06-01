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
  const artifact = await deployments.getArtifact(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER);
  const chainId = await getChainId();
  const networkName = network.name;
  const { getAddress } = ethers.utils;

  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  let feeData = await ethers.provider.getFeeData();
  const result = await deploy("StrategyProvider", {
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

  const oldStrategyProvider = await registryV2Instance.getStrategyProvider();
  const strategyProviderV2 = await deployments.get("StrategyProvider");

  console.log("==StrategyProvider registration==");
  console.log("\n");
  if (getAddress(oldStrategyProvider) !== getAddress(strategyProviderV2.address)) {
    console.log("operator registering StrategyProvider..");
    feeData = await ethers.provider.getFeeData();
    const setStrategyProviderTx = await registryV2Instance
      .connect(operatorSigner)
      .setStrategyProvider(strategyProviderV2.address, {
        type: 1,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await setStrategyProviderTx.wait(1);
  } else {
    console.log("StrategyProvider already registered");
    console.log("\n");
  }

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const strategyProviderV2 = await deployments.get("StrategyProvider");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "StrategyProvider",
          address: strategyProviderV2.address,
          constructorArguments: [registryProxyAddress],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/StrategyProvider.sol:StrategyProvider",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "StrategyProvider",
          address: strategyProviderV2.address,
          constructorArguments: [registryProxyAddress],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/StrategyProvider.sol:StrategyProvider",
        });
      }
    }
  }
};
export default func;
func.tags = ["StrategyProvider"];
func.dependencies = ["Registry"];
