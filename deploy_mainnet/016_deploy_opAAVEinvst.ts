import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils";
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
  ethers,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer, admin } = await getNamedAccounts();
  const chainId = await getChainId();
  const artifact = await deployments.getArtifact("Vault");
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
    console.log("approveTokenAndMapHash ", JSON.stringify(approveTokenAndMapHash, null, 4));
    if (getAddress(deployer) === getAddress(operatorAddress)) {
      console.log("approve token and map hash");
      console.log("\n");
      const feeData = await ethers.provider.getFeeData();
      const approveTokenAndMapToTokensHashTx = await registryInstance
        .connect(operator)
        ["approveTokenAndMapToTokensHash((bytes32,address[])[])"](approveTokenAndMapHash, {
          type: 2,
          maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
          maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
        });
      await approveTokenAndMapToTokensHashTx.wait(1);
    } else {
      console.log("cannot approve token and map hash as signer is not the operator");
    }
  }

  if (onlySetTokensHash.length > 0) {
    console.log("onlySetTokensHash ", JSON.stringify(onlySetTokensHash, null, 4));
    if (getAddress(deployer) === getAddress(operatorAddress)) {
      console.log("operator mapping only tokenshash to tokens..");
      console.log("\n");
      const feeData = await ethers.provider.getFeeData();
      const onlyMapToTokensHashTx = await registryInstance
        .connect(operator)
        ["setTokensHashToTokens((bytes32,address[])[])"](onlySetTokensHash, {
          type: 2,
          maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
          maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
        });
      await onlyMapToTokensHashTx.wait(1);
    } else {
      console.log("cannot map tokenshash to tokens as signer is not the operator");
    }
  }

  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("opAAVEinvst", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress, "Aave Token", "AAVE", "Invest", "invst"],
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: admin,
      upgradeIndex: 0,
      proxyContract: "AdminUpgradeabilityProxy",
      execute: {
        init: {
          methodName: "initialize",
          args: [registryProxyAddress, MULTI_CHAIN_VAULT_TOKENS[chainId].AAVE.hash, "Aave Token", "AAVE", "2"],
        },
      },
    },
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });
  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const vault = await deployments.get("opAAVEinvst");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "opAAVEinvst",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "Aave Token", "AAVE", "Invest", "invst"],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "opAAVEinvst",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "Aave Token", "AAVE", "Invest", "invst"],
        });
      }
    }
  }
};
export default func;
func.tags = ["opAAVEinvst"];
func.dependencies = ["Registry"];
