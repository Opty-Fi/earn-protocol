import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { Registry, RiskManagerProxy } from "../typechain";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;
const FORK = process.env.FORK;

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
  const artifact = await deployments.getArtifact(ESSENTIAL_CONTRACTS.RISK_MANAGER);
  const chainId = await getChainId();
  const networkName = network.name;
  const { getAddress } = ethers.utils;

  let registryProxyAddress: string = "";
  if (chainId == "1" || FORK == "mainnet" || networkName == "mainnet") {
    registryProxyAddress = "0x99fa011e33a8c6196869dec7bc407e896ba67fe3";
  } else if (chainId == "42" || FORK == "kovan" || networkName == "kovan") {
    registryProxyAddress = "0xf710F75418353B36F2624784c290B80e7a5C892A";
  } else {
    registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  }

  const result = await deploy("RiskManager", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const riskManagerV2 = await deployments.get("RiskManager");
  const riskManagerV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER, riskManagerV2.address);
  let riskManagerProxyAddress: string = "";
  if (chainId == "1" || FORK == "mainnet" || networkName == "mainnet") {
    riskManagerProxyAddress = "0x4379031f3191d89693bc8b6dac4d3d06466ea952";
  } else if (chainId == "42" || FORK == "kovan" || networkName == "kovan") {
    riskManagerProxyAddress = "0xe61ec00d34a93330775e8a8af0b16b03799b377d";
  } else {
    riskManagerProxyAddress = await (await deployments.get("RiskManagerProxy")).address;
  }
  const riskManagerInstance = <RiskManagerProxy>(
    await ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY, riskManagerProxyAddress)
  );

  const registryV2Instance = <Registry>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const operatorAddress = await registryV2Instance.operator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const governanceAddress = await registryV2Instance.governance();
  const governanceSigner = await ethers.getSigner(governanceAddress);

  const riskManagerImplementation = await riskManagerInstance.riskManagerImplementation();

  console.log("==RiskManager implementation==");
  console.log("\n");
  if (getAddress(riskManagerV2.address) != getAddress(riskManagerImplementation)) {
    const pendingImplementation = await riskManagerInstance.pendingRiskManagerImplementation();
    if (getAddress(pendingImplementation) != getAddress(riskManagerV2Instance.address)) {
      console.log("operator setting pending implementation...");
      console.log("\n");
      const setPendingImplementationTx = await riskManagerInstance
        .connect(operatorSigner)
        .setPendingImplementation(riskManagerV2.address);
      await setPendingImplementationTx.wait(1);
    } else {
      console.log("Pending implementation for risk manager is already set.");
      console.log("\n");
    }
    console.log("governance upgrading risk manager...");
    console.log("\n");
    const becomeTx = await riskManagerV2Instance.connect(governanceSigner).become(riskManagerProxyAddress);
    await becomeTx.wait(1);
    const riskManagerRegisteredInRegistry = await registryV2Instance.riskManager();
    if (getAddress(riskManagerRegisteredInRegistry) != getAddress(riskManagerInstance.address)) {
      console.log("operator registering upgraded RiskManager ...");
      console.log("\n");
      const setRiskManagerTx = await registryV2Instance.connect(operatorSigner).setRiskManager(riskManagerProxyAddress);
      await setRiskManagerTx.wait();
    } else {
      console.log("Risk manager is already registered.");
      console.log("\n");
    }
  } else {
    console.log("RiskManager is already upgraded");
    console.log("\n");
  }

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "RiskManager",
          address: riskManagerV2.address,
          constructorArguments: [registryProxyAddress],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/RiskManager.sol:RiskManager",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "RiskManager",
          address: riskManagerV2.address,
          constructorArguments: [registryProxyAddress],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/RiskManager.sol:RiskManager",
        });
      }
    }
  }
};
export default func;
func.tags = ["RiskManager"];
func.dependencies = ["RiskManagerProxy"];
