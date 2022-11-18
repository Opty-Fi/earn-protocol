import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { RegistryProxy, Registry__factory } from "../typechain";
import { eEVMNetwork, NETWORKS_CHAIN_ID } from "../helper-hardhat-config";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;
const FORK = process.env.FORK || "";

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
  const { getAddress } = ethers.utils;
  const artifact = await deployments.getArtifact(ESSENTIAL_CONTRACTS.REGISTRY);
  let chainId = await getChainId();
  const networkName = network.name;
  let feeData = await ethers.provider.getFeeData();
  const result = await deploy("Registry", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  const registry = await deployments.get("Registry");
  let registryInstance = await ethers.getContractAt(Registry__factory.abi, registry.address);
  const registryProxyAddress = (await deployments.get("RegistryProxy")).address;
  chainId =
    ["31337", "1337"].includes(chainId) && FORK != "" ? NETWORKS_CHAIN_ID[FORK as eEVMNetwork].toString() : chainId;
  let registryProxyInstance = <RegistryProxy>(
    await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, registryProxyAddress)
  );
  const operatorAddress = await registryProxyInstance.operator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const governanceAddress = await registryProxyInstance.governance();
  const governanceSigner = await ethers.getSigner(governanceAddress);
  const riskOperatorAddress = await registryProxyInstance.riskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperatorAddress);
  registryProxyInstance = <RegistryProxy>(
    await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, registryProxyAddress)
  );
  // upgrade registry
  const registryImplementation = await registryProxyInstance.registryImplementation();
  console.log("Registry implementation Before ", registryImplementation);
  console.log("registry.address ", registry.address);
  console.log("\n");
  if (getAddress(registryImplementation) != getAddress(registry.address)) {
    const pendingImplementation = await registryProxyInstance.pendingRegistryImplementation();
    if (getAddress(pendingImplementation) != getAddress(registry.address)) {
      console.log("\n");
      console.log("operator setting pending implementation...");
      console.log("\n");
      feeData = await ethers.provider.getFeeData();
      const setPendingImplementationTx = await registryProxyInstance
        .connect(operatorSigner)
        .setPendingImplementation(registry.address, {
          type: 2,
          maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
          maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
        });
      await setPendingImplementationTx.wait(1);
    } else {
      console.log("Pending implementation is already set");
      console.log("\n");
    }
    console.log("governance upgrading Registry...");
    console.log("\n");
    feeData = await ethers.provider.getFeeData();
    const becomeTx = await registryInstance.connect(governanceSigner).become(registryProxyAddress, {
      maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
      maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      type: 2,
    });
    await becomeTx.wait(1);
    console.log("Registry implementation after ", await registryProxyInstance.registryImplementation());
    console.log("\n");
  }

  registryInstance = await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);

  // add risk profile Save
  console.log("==Risk Profile config : Save==");
  console.log("\n");
  const saveRiskProfileExists = (await registryInstance.getRiskProfile("0")).exists;
  if (!saveRiskProfileExists) {
    console.log("risk operator adding save risk profile...");
    console.log("\n");
    feeData = await ethers.provider.getFeeData();
    const addRiskProfileTx = await registryInstance
      .connect(riskOperatorSigner)
      ["addRiskProfile(uint256,string,string,(uint8,uint8))"]("0", "Save", "Save", [90, 99], {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      }); // code,name,symbol,canBorrow,pool rating range
    await addRiskProfileTx.wait(1);
  } else {
    console.log("Already configured risk profile");
    console.log("\n");
  }

  // add risk profile Earn
  console.log("==Risk Profile config : Earn==");
  console.log("\n");
  const earnRiskProfileExists = (await registryInstance.getRiskProfile("1")).exists;
  if (!earnRiskProfileExists) {
    console.log("risk operator adding earn risk profile...");
    console.log("\n");
    feeData = await ethers.provider.getFeeData();
    const addRiskProfileTx = await registryInstance
      .connect(riskOperatorSigner)
      ["addRiskProfile(uint256,string,string,(uint8,uint8))"]("1", "Earn", "Earn", [80, 99], {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      }); // code,name,symbol,canBorrow,pool rating range
    await addRiskProfileTx.wait(1);
  } else {
    console.log("Already configured risk profile");
    console.log("\n");
  }

  // add risk profile Invest
  console.log("==Risk Profile config : Invest==");
  console.log("\n");
  const investRiskProfileExists = (await registryInstance.getRiskProfile("2")).exists;
  if (!investRiskProfileExists) {
    console.log("risk operator adding invest risk profile...");
    console.log("\n");
    feeData = await ethers.provider.getFeeData();
    const addRiskProfileTx = await registryInstance
      .connect(riskOperatorSigner)
      ["addRiskProfile(uint256,string,string,(uint8,uint8))"]("2", "Invest", "Invst", [50, 99], {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      }); // code,name,symbol,canBorrow,pool rating range
    await addRiskProfileTx.wait(1);
  } else {
    console.log("Already configured risk profile");
    console.log("\n");
  }

  if (CONTRACTS_VERIFY === "true") {
    if (result.newlyDeployed) {
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "Registry",
          address: registry.address,
          constructorArguments: [],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/Registry.sol:Registry",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "RegistryProxy",
          address: registry.address,
          constructorArguments: [],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/Registry.sol:Registry",
        });
      }
    }
  }
};
export default func;
func.tags = ["Registry"];
func.dependencies = ["RegistryProxy"];
