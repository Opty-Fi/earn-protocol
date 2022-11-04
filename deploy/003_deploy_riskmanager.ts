import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { Registry, Registry__factory, RiskManager, RiskManager__factory } from "../typechain";
import { getAddress } from "ethers/lib/utils";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({
  deployments,
  getNamedAccounts,
  getChainId,
  network,
  tenderly,
  run,
  ethers,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact(ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY);
  const registryProxy = await deployments.get("RegistryProxy");
  const chainId = await getChainId();
  const networkName = network.name;
  let feeData = await ethers.provider.getFeeData();
  const result = await deploy("RiskManager", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxy.address],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const riskManagerProxy = await deployments.get("RiskManagerProxy");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "RiskManager",
          address: riskManagerProxy.address,
          constructorArguments: [registryProxy.address],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/RiskManager.sol:RiskManager",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "RiskManager",
          address: riskManagerProxy.address,
          constructorArguments: [registryProxy.address],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/RiskManager.sol:RiskManager",
        });
      }
    }
  }

  const riskManagerInstance = <RiskManager>(
    await ethers.getContractAt(RiskManager__factory.abi, (await deployments.get("RiskManager")).address)
  );
  const registryInstance = <Registry>(
    await ethers.getContractAt(Registry__factory.abi, await (await deployments.get("RegistryProxy")).address)
  );
  const operatorAddress = await registryInstance.operator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const riskManagerRegisteredInRegistry = await registryInstance.riskManager();
  if (getAddress(riskManagerRegisteredInRegistry) != getAddress(riskManagerInstance.address)) {
    console.log("operator registering RiskManager ...");
    console.log("\n");
    if (getAddress(operatorSigner.address) === getAddress(deployer)) {
      feeData = await ethers.provider.getFeeData();
      const setRiskManagerTx = await registryInstance
        .connect(operatorSigner)
        .setRiskManager(riskManagerInstance.address, {
          type: 2,
          maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
          maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
        });
      await setRiskManagerTx.wait();
    } else {
      console.log("Signer is not the operator");
    }
  } else {
    console.log("Risk manager is already registered.");
    console.log("\n");
  }
};
export default func;
func.tags = ["RiskManager"];
func.dependencies = ["Registry"];
