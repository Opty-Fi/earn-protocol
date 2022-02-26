import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({
  deployments,
  getNamedAccounts,
  getChainId,
  ethers,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact(ESSENTIAL_CONTRACTS.REGISTRY_V2);
  const chainId = await getChainId();
  const networkName = hre.network.name;

  const result = await deploy("RegistryV2", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const registryV2 = await deployments.get("RegistryV2");
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryV2.address);
  const registryProxy = await deployments.get("RegistryProxy");
  const registryProxyInstance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, registryProxy.address);
  const setPendingImplementationTx = await registryProxyInstance.setPendingImplementation(registryV2.address);
  await setPendingImplementationTx.wait();
  const becomeTx = await registryV2Instance.become(registryProxy.address);
  await becomeTx.wait();

  if (typeof CONTRACTS_VERIFY == "boolean" && CONTRACTS_VERIFY) {
    if (result.newlyDeployed) {
      if (networkName === "tenderly") {
        await hre.tenderly.verify({
          name: "RegistryV2",
          address: registryV2.address,
          constructorArguments: [],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/RegistryV2.sol:RegistryV2",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await hre.run("verify:verify", {
          name: "RegistryProxy",
          address: registryV2.address,
          constructorArguments: [],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/RegistryV2.sol:RegistryV2",
        });
      }
    }
  }
};
export default func;
func.tags = ["Registry"];
