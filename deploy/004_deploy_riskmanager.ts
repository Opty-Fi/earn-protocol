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
  const artifact = await deployments.getArtifact(ESSENTIAL_CONTRACTS.RISK_MANAGER_V2);
  const registryProxy = await deployments.get("RegistryProxy");
  const chainId = await getChainId();
  const networkName = hre.network.name;

  const result = await deploy("RiskManagerV2", {
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

  const riskManagerV2 = await deployments.get("RiskManagerV2");
  const riskManagerV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER_V2, riskManagerV2.address);
  const riskManagerProxy = await deployments.get("RiskManagerProxy");
  const riskManagerInstance = await ethers.getContractAt(
    ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY,
    riskManagerProxy.address,
  );
  const setPendingImplementationTx = await riskManagerInstance.setPendingImplementation(riskManagerV2.address);
  await setPendingImplementationTx.wait();
  const becomeTx = await riskManagerV2Instance.become(riskManagerProxy.address);
  await becomeTx.wait();
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryProxy.address);
  const setRiskManagerTx = await registryV2Instance.setRiskManager(riskManagerProxy.address);
  await setRiskManagerTx.wait();

  if (typeof CONTRACTS_VERIFY == "boolean" && CONTRACTS_VERIFY) {
    if (result.newlyDeployed) {
      if (networkName === "tenderly") {
        await hre.tenderly.verify({
          name: "RiskManagerV2",
          address: riskManagerV2.address,
          constructorArguments: [registryProxy.address],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/RiskManagerV2.sol:RiskManagerV2",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await hre.run("verify:verify", {
          name: "RiskManagerV2",
          address: riskManagerV2.address,
          constructorArguments: [registryProxy.address],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/RiskManagerV2.sol:RiskManagerV2",
        });
      }
    }
  }
};
export default func;
func.tags = ["RiskManager"];
