import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { waitforme } from "../helpers/utils";
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
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const registryInstance = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const operatorAddress = await registryInstance.getOperator();
  const operator = await hre.ethers.getSigner(operatorAddress);

  const onlySetTokensHash = [];
  const approveTokenAndMapHash = [];
  const aaveApproved = await registryInstance.isApprovedToken(MULTI_CHAIN_VAULT_TOKENS[chainId].AAVE.address);
  const tokenHashes: string[] = await registryInstance.getTokenHashes();
  if (aaveApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].AAVE.hash)) {
    console.log("only set AAVE hash");
    console.log("\n");
    onlySetTokensHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].AAVE.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].AAVE.address],
    ]);
  }
  if (!aaveApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].AAVE.hash)) {
    console.log("approve AAVE and set hash");
    console.log("\n");
    approveTokenAndMapHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].AAVE.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].AAVE.address],
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

  const result = await deploy("opAAVEaggr", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress, "Aave Token", "AAVE", "Aggressive", "aggr"],
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
          args: [registryProxyAddress, MULTI_CHAIN_VAULT_TOKENS[chainId].AAVE.hash, "Aave Token", "AAVE", "2"],
        },
      },
    },
  });
  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const vault = await deployments.get("opAAVEaggr");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "opAAVEaggr",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "Aave Token", "AAVE", "Aggressive", "aggr"],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "opAAVEaggr",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "Aave Token", "AAVE", "Aggressive", "aggr"],
        });
      }
    }
  }
};
export default func;
func.tags = ["opAAVEaggr"];
func.dependencies = ["RegistryProxy"];