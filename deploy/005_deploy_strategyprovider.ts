import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { Registry } from "../typechain";
import { getAddress } from "ethers/lib/utils";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;
const FORK = process.env.FORK;

const func: DeployFunction = async ({
  deployments,
  getNamedAccounts,
  getChainId,
  ethers,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER);
  const chainId = await getChainId();
  const networkName = hre.network.name;

  let registryProxyAddress: string = "";
  if (chainId == "1" || FORK == "mainnet" || networkName == "mainnet") {
    registryProxyAddress = "0x99fa011e33a8c6196869dec7bc407e896ba67fe3";
  } else if (chainId == "42" || FORK == "kovan" || networkName == "kovan") {
    registryProxyAddress = "0xf710F75418353B36F2624784c290B80e7a5C892A";
  } else {
    registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  }

  const result = await deploy("StrategyProvider", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress],
    log: true,
    skipIfAlreadyDeployed: false,
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
    const setStrategyProviderTx = await registryV2Instance
      .connect(operatorSigner)
      .setStrategyProvider(strategyProviderV2.address);
    await setStrategyProviderTx.wait(1);
  } else {
    console.log("StrategyProvider already registered");
    console.log("\n");
  }

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const strategyProviderV2 = await deployments.get("StrategyProvider");
      if (networkName === "tenderly") {
        await hre.tenderly.verify({
          name: "StrategyProvider",
          address: strategyProviderV2.address,
          constructorArguments: [registryProxyAddress],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/StrategyProvider.sol:StrategyProvider",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await hre.run("verify:verify", {
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
func.dependencies = ["RegistryProxy", "Registry"];
