import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { RegistryProxy } from "../typechain";
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

  const registryV2 = await deployments.get("Registry");
  let registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryV2.address);
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
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
  console.log("registryV2.address ", registryV2.address);
  console.log("\n");
  if (getAddress(registryImplementation) != getAddress(registryV2.address)) {
    const pendingImplementation = await registryProxyInstance.pendingRegistryImplementation();
    if (getAddress(pendingImplementation) != getAddress(registryV2.address)) {
      console.log("\n");
      console.log("operator setting pending implementation...");
      console.log("\n");
      feeData = await ethers.provider.getFeeData();
      const setPendingImplementationTx = await registryProxyInstance
        .connect(operatorSigner)
        .setPendingImplementation(registryV2.address, {
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
    const becomeTx = await registryV2Instance.connect(governanceSigner).become(registryProxyAddress, {
      maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
      maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      type: 2,
    });
    await becomeTx.wait(1);
    console.log("Registry implementation after ", await registryProxyInstance.registryImplementation());
    console.log("\n");
  }

  registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);

  // approve tokens and map to tokens hash
  const onlySetTokensHash = [];
  const approveTokenAndMapHash = [];
  const tokenHashes: string[] = await registryV2Instance.getTokenHashes();
  if (!["80001", "137", "43114"].includes(chainId)) {
    const usdcApproved = await registryV2Instance.isApprovedToken(MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.address);

    if (usdcApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.hash)) {
      console.log("only set USDC hash");
      console.log("\n");
      onlySetTokensHash.push([
        MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.hash,
        [MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.address],
      ]);
    }

    if (!usdcApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.hash)) {
      console.log("approve USDC and set hash");
      console.log("\n");
      approveTokenAndMapHash.push([
        MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.hash,
        [MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.address],
      ]);
    }
  }

  if (!["42", "80001", "137", "43114"].includes(chainId)) {
    const wethApproved = await registryV2Instance.isApprovedToken(MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.address);

    if (wethApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.hash)) {
      console.log("only set WETH hash");
      console.log("\n");
      onlySetTokensHash.push([
        MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.hash,
        [MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.address],
      ]);
    }

    if (!wethApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.hash)) {
      console.log("approve WETH and set hash");
      console.log("\n");
      approveTokenAndMapHash.push([
        MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.hash,
        [MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.address],
      ]);
    }
  }

  if (approveTokenAndMapHash.length > 0) {
    console.log("approve token and map hash");
    console.log("\n");
    feeData = await ethers.provider.getFeeData();
    const approveTokenAndMapToTokensHashTx = await registryV2Instance
      .connect(operatorSigner)
      ["approveTokenAndMapToTokensHash((bytes32,address[])[])"](approveTokenAndMapHash, {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await approveTokenAndMapToTokensHashTx.wait(1);
  }

  if (onlySetTokensHash.length > 0) {
    console.log("operator mapping only tokenshash to tokens..", onlySetTokensHash);
    console.log("\n");
    feeData = await ethers.provider.getFeeData();
    const onlyMapToTokensHashTx = await registryV2Instance
      .connect(operatorSigner)
      ["setTokensHashToTokens((bytes32,address[])[])"](onlySetTokensHash, {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await onlyMapToTokensHashTx.wait(1);
  }

  // add risk profile Save
  console.log("==Risk Profile config : Grow==");
  console.log("\n");
  const saveRiskProfileExists = (await registryV2Instance.getRiskProfile("0")).exists;
  if (!saveRiskProfileExists) {
    console.log("risk operator adding save risk profile...");
    console.log("\n");
    feeData = await ethers.provider.getFeeData();
    const addRiskProfileTx = await registryV2Instance
      .connect(riskOperatorSigner)
      ["addRiskProfile(uint256,string,string,bool,(uint8,uint8))"]("0", "Save", "save", false, [90, 99], {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      }); // code,name,symbol,canBorrow,pool rating range
    await addRiskProfileTx.wait(1);
  } else {
    console.log("Already configured risk profile");
    console.log("\n");
  }

  // add risk profile Grow
  console.log("==Risk Profile config : Grow==");
  console.log("\n");
  const growRiskProfileExists = (await registryV2Instance.getRiskProfile("1")).exists;
  if (!growRiskProfileExists) {
    console.log("risk operator adding grow risk profile...");
    console.log("\n");
    feeData = await ethers.provider.getFeeData();
    const addRiskProfileTx = await registryV2Instance
      .connect(riskOperatorSigner)
      ["addRiskProfile(uint256,string,string,bool,(uint8,uint8))"]("1", "Growth", "grow", false, [0, 100], {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      }); // code,name,symbol,canBorrow,pool rating range
    await addRiskProfileTx.wait(1);
  } else {
    console.log("Already configured risk profile");
    console.log("\n");
  }

  // add risk profile Aggressive
  console.log("==Risk Profile config : Aggressive==");
  console.log("\n");
  const aggressiveRiskProfileExists = (await registryV2Instance.getRiskProfile("2")).exists;
  if (!aggressiveRiskProfileExists) {
    console.log("risk operator adding aggressive risk profile...");
    console.log("\n");
    feeData = await ethers.provider.getFeeData();
    const addRiskProfileTx = await registryV2Instance
      .connect(riskOperatorSigner)
      ["addRiskProfile(uint256,string,string,bool,(uint8,uint8))"]("2", "Aggressive", "aggr", false, [50, 99], {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      }); // code,name,symbol,canBorrow,pool rating range
    await addRiskProfileTx.wait(1);
  } else {
    console.log("Already configured risk profile");
    console.log("\n");
  }
  const aggrRiskProfilExists = (await registryV2Instance.getRiskProfile("2")).exists;
  if (!aggrRiskProfilExists) {
    console.log("risk operator adding aggresive risk profile...");
    console.log("\n");
    const addRiskProfileTx = await registryV2Instance
      .connect(riskOperatorSigner)
      ["addRiskProfile(uint256,string,string,bool,(uint8,uint8))"]("2", "Aggresive", "aggr", false, [50, 100], {
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
          address: registryV2.address,
          constructorArguments: [],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/Registry.sol:Registry",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "RegistryProxy",
          address: registryV2.address,
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
