import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { RegistryProxy } from "../typechain";
import { getAddress } from "ethers/lib/utils";
import { eEVMNetwork, NETWORKS_CHAIN_ID } from "../helper-hardhat-config";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;
const FORK = process.env.FORK || "";

const func: DeployFunction = async ({
  deployments,
  getNamedAccounts,
  getChainId,
  ethers,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact(ESSENTIAL_CONTRACTS.REGISTRY);
  let chainId = await getChainId();
  const networkName = hre.network.name;
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
  });

  const registryV2 = await deployments.get("Registry");
  let registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryV2.address);
  let registryProxyAddress: string = "";
  if (chainId == "1" || FORK == "mainnet" || networkName == "mainnet") {
    registryProxyAddress = "0x99fa011e33a8c6196869dec7bc407e896ba67fe3";
  } else if (chainId == "42" || FORK == "kovan" || networkName == "kovan") {
    registryProxyAddress = "0xf710F75418353B36F2624784c290B80e7a5C892A";
  } else {
    registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  }
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
    console.log("\n");
    console.log("operator setting pending implementation...");
    console.log("\n");
    const setPendingImplementationTx = await registryProxyInstance
      .connect(operatorSigner)
      .setPendingImplementation(registryV2.address);
    await setPendingImplementationTx.wait();
    console.log("governance upgrading Registry...");
    console.log("\n");
    const becomeTx = await registryV2Instance.connect(governanceSigner).become(registryProxyAddress);
    await becomeTx.wait();
    console.log("Registry implementation after ", await registryProxyInstance.registryImplementation());
    console.log("\n");
  }

  registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);

  // approve tokens and map to tokens hash
  const onlySetTokensHash = [];
  const approveTokenAndMapHash = [];
  const tokenHashes: string[] = await registryV2Instance.getTokenHashes();
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

  if (chainId != "42") {
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

  if (chainId == "137") {
    const wmaticApproved = await registryV2Instance.isApprovedToken(MULTI_CHAIN_VAULT_TOKENS[chainId].WMATIC.address);

    if (wmaticApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].WMATIC.hash)) {
      console.log("only set WMATIC hash");
      console.log("\n");
      onlySetTokensHash.push([
        MULTI_CHAIN_VAULT_TOKENS[chainId].WMATIC.hash,
        [MULTI_CHAIN_VAULT_TOKENS[chainId].WMATIC.address],
      ]);
    }

    if (!wmaticApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].WMATIC.hash)) {
      console.log("approve WMATIC and set hash");
      console.log("\n");
      approveTokenAndMapHash.push([
        MULTI_CHAIN_VAULT_TOKENS[chainId].WMATIC.hash,
        [MULTI_CHAIN_VAULT_TOKENS[chainId].WMATIC.address],
      ]);
    }
  }

  if (approveTokenAndMapHash.length > 0) {
    console.log("approve token and map hash");
    console.log("\n");
    const approveTokenAndMapToTokensHashTx = await registryV2Instance
      .connect(operatorSigner)
      ["approveTokenAndMapToTokensHash((bytes32,address[])[])"](approveTokenAndMapHash);
    await approveTokenAndMapToTokensHashTx.wait();
  }

  if (onlySetTokensHash.length > 0) {
    console.log("operator mapping only tokenshash to tokens..", onlySetTokensHash);
    console.log("\n");
    const onlyMapToTokensHashTx = await registryV2Instance
      .connect(operatorSigner)
      ["setTokensHashToTokens((bytes32,address[])[])"](onlySetTokensHash);
    await onlyMapToTokensHashTx.wait();
  }

  // add risk profile
  console.log("==Risk Profile config==");
  console.log("\n");
  const growRiskProfilExists = (await registryV2Instance.getRiskProfile("1")).exists;
  if (!growRiskProfilExists) {
    console.log("risk operator adding grow risk profile...");
    console.log("\n");
    const addRiskProfileTx = await registryV2Instance
      .connect(riskOperatorSigner)
      ["addRiskProfile(uint256,string,string,bool,(uint8,uint8))"]("1", "Growth", "grow", false, [0, 100]); // code,name,symbol,canBorrow,pool rating range
    await addRiskProfileTx.wait();
  } else {
    console.log("Already configured risk profile");
    console.log("\n");
  }

  if (CONTRACTS_VERIFY === "true") {
    if (result.newlyDeployed) {
      if (networkName === "tenderly") {
        await hre.tenderly.verify({
          name: "Registry",
          address: registryV2.address,
          constructorArguments: [],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/Registry.sol:Registry",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await hre.run("verify:verify", {
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
