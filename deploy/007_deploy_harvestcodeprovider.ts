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
  const artifact = await deployments.getArtifact(ESSENTIAL_CONTRACTS.HARVEST_CODE_PROVIDER);
  const chainId = await getChainId();
  const networkName = network.name;
  const { getAddress } = ethers.utils;

  const registryProxyAddress = (await deployments.get("RegistryProxy")).address;
  let feeData = await ethers.provider.getFeeData();
  const result = await deploy("HarvestCodeProvider", {
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

  const oldHarvestCodeProvider = await registryV2Instance.getHarvestCodeProvider();
  const harvestCodeProvider = await deployments.get("HarvestCodeProvider");

  console.log("==HarvestCodeProvider registration==");
  console.log("\n");
  if (getAddress(oldHarvestCodeProvider) !== getAddress(harvestCodeProvider.address)) {
    console.log("operator registering HarvestCodeProvider..");
    feeData = await ethers.provider.getFeeData();
    const setHarvestCodeProviderTx = await registryV2Instance
      .connect(operatorSigner)
      .setHarvestCodeProvider(harvestCodeProvider.address, {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await setHarvestCodeProviderTx.wait(1);
  } else {
    console.log("HarvestCodeProvider already registered");
    console.log("\n");
  }

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const harvestCodeProvider = await deployments.get("HarvestCodeProvider");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "HarvestCodeProvider",
          address: harvestCodeProvider.address,
          constructorArguments: [registryProxyAddress],
          contract:
            "contracts/protocol/adapters/ethereum/team-defi-adapters/contracts/1_ethereum/HarvestCodeProvider.sol:HarvestCodeProvider",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "HarvestCodeProvider",
          address: harvestCodeProvider.address,
          constructorArguments: [registryProxyAddress],
          contract:
            "contracts/protocol/adapters/ethereum/team-defi-adapters/contracts/1_ethereum/HarvestCodeProvider.sol:HarvestCodeProvider",
        });
      }
    }
  }
};
export default func;
func.tags = ["HarvestCodeProvider"];
func.dependencies = ["Registry"];
