import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { RegistryV2, RiskManagerProxy } from "../typechain";
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
  const riskManagerInstance = <RiskManagerProxy>(
    await ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY, riskManagerProxy.address)
  );

  const registryV2Instance = <RegistryV2>(
    await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryProxy.address)
  );
  const operatorAddress = await registryV2Instance.operator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const governanceAddress = await registryV2Instance.governance();
  const governanceSigner = await ethers.getSigner(governanceAddress);

  const riskManagerImplementation = await riskManagerInstance.riskManagerImplementation();

  console.log("==RiskManager implementation==");
  if (getAddress(riskManagerV2.address) != getAddress(riskManagerImplementation)) {
    console.log("upgrading RiskManager...");
    const setPendingImplementationTx = await riskManagerInstance
      .connect(operatorSigner)
      .setPendingImplementation(riskManagerV2.address);
    await setPendingImplementationTx.wait();
    const becomeTx = await riskManagerV2Instance.connect(governanceSigner).become(riskManagerProxy.address);
    await becomeTx.wait();
    console.log("Registering upgraded RiskManager ...");
    const setRiskManagerTx = await registryV2Instance.connect(operatorSigner).setRiskManager(riskManagerProxy.address);
    await setRiskManagerTx.wait();
  } else {
    console.log("RiskManager is already upgraded");
  }

  if (CONTRACTS_VERIFY == "true") {
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
func.tags = ["RiskManagerV2"];
