import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { waitforme } from "../helpers/utils";
import RegistryProxy from "../deployments/mainnet/RegistryProxy.json";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({
  deployments,
  getNamedAccounts,
  getChainId,
  network,
  tenderly,
  run,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer, admin } = await getNamedAccounts();
  const chainId = await getChainId();
  const artifact = await deployments.getArtifact("Vault");
  const artifactVaultProxyV2 = await deployments.getArtifact("AdminUpgradeabilityProxy");
  const registryProxyAddress = RegistryProxy.address;
  const registryInstance = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const operatorAddress = await registryInstance.getOperator();
  const operator = await hre.ethers.getSigner(operatorAddress);

  const onlySetTokensHash = [];
  const approveTokenAndMapHash = [];
  const newoApproved = await registryInstance.isApprovedToken(MULTI_CHAIN_VAULT_TOKENS[chainId].NEWO.address);
  const tokenHashes: string[] = await registryInstance.getTokenHashes();
  if (newoApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].NEWO.hash)) {
    console.log("only set NEWO hash");
    console.log("\n");
    onlySetTokensHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].NEWO.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].NEWO.address],
    ]);
  }
  if (!newoApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].NEWO.hash)) {
    console.log("approve NEWO and set hash");
    console.log("\n");
    approveTokenAndMapHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].NEWO.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].NEWO.address],
    ]);
  }
  if (approveTokenAndMapHash.length > 0) {
    console.log("approve token and map hash");
    console.log("\n");
    const approveTokenAndMapToTokensHashTx = await registryInstance
      .connect(operator)
      ["approveTokenAndMapToTokensHash((bytes32,address[])[])"](approveTokenAndMapHash);
    await approveTokenAndMapToTokensHashTx.wait(1);
  }

  if (onlySetTokensHash.length > 0) {
    console.log("operator mapping only tokenshash to tokens..", onlySetTokensHash);
    console.log("\n");
    const onlyMapToTokensHashTx = await registryInstance
      .connect(operator)
      ["setTokensHashToTokens((bytes32,address[])[])"](onlySetTokensHash);
    await onlyMapToTokensHashTx.wait(1);
  }

  const networkName = network.name;

  const result = await deploy("opNEWOgrow", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress, "Newo", "NEWO", "Growth", "grow"],
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: admin,
      upgradeIndex: 0,
      proxyContract: {
        abi: artifactVaultProxyV2.abi,
        bytecode: artifactVaultProxyV2.bytecode,
        deployedBytecode: artifactVaultProxyV2.deployedBytecode,
      },
      execute: {
        init: {
          methodName: "initialize",
          args: [registryProxyAddress, MULTI_CHAIN_VAULT_TOKENS[chainId].NEWO.hash, "Newo", "NEWO", "1"],
        },
      },
    },
  });
  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const vault = await deployments.get("opNEWOgrow");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "opNEWOgrow",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "Newo", "NEWO", "Growth", "grow"],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "opNEWOgrow",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "Newo", "NEWO", "Growth", "grow"],
        });
      }
    }
  }
};
export default func;
func.tags = ["opNEWOgrow"];
