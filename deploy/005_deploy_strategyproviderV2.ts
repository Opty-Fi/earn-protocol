import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { RegistryV2 } from "../typechain";
import { getAddress } from "ethers/lib/utils";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({
  deployments,
  getNamedAccounts,
  getChainId,
  ethers,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER_V2);
  const registryProxy = await deployments.get("RegistryProxy");
  const chainId = await getChainId();
  const networkName = hre.network.name;

  const result = await deploy("StrategyProviderV2", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxy.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const registryV2Instance = <RegistryV2>(
    await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryProxy.address)
  );
  const operatorAddress = await registryV2Instance.operator();
  const operatorSigner = await ethers.getSigner(operatorAddress);

  const oldStrategyProvider = await registryV2Instance.getStrategyOperator();
  const strategyProviderV2 = await deployments.get("StrategyProviderV2");

  console.log("==StrategyProvider registration==");
  if (getAddress(oldStrategyProvider) !== getAddress(strategyProviderV2.address)) {
    console.log("operator registering StrategyProvider..");
    const setStrategyProviderTx = await registryV2Instance
      .connect(operatorSigner)
      .setStrategyProvider(strategyProviderV2.address);
    await setStrategyProviderTx.wait();
  } else {
    console.log("StrategyProvider already registered");
  }

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const strategyProviderV2 = await deployments.get("StrategyProviderV2");
      if (networkName === "tenderly") {
        await hre.tenderly.verify({
          name: "StrategyProviderV2",
          address: strategyProviderV2.address,
          constructorArguments: [registryProxy.address],
          contract:
            "contracts/protocol/earn-protocol-configuration/contracts/StrategyProviderV2.sol:StrategyProviderV2",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await hre.run("verify:verify", {
          name: "StrategyProviderV2",
          address: strategyProviderV2.address,
          constructorArguments: [registryProxy.address],
          contract:
            "contracts/protocol/earn-protocol-configuration/contracts/StrategyProviderV2.sol:StrategyProviderV2",
        });
      }
    }
  }
};
export default func;
func.tags = ["StrategyProviderV2"];
