import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getAddress } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { waitforme } from "../helpers/utils";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { eEVMNetwork, NETWORKS_CHAIN_ID } from "../helper-hardhat-config";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;
const FORK = process.env.FORK || "";

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
  let chainId = await getChainId();
  const artifact = await deployments.getArtifact("Vault");
  const artifactVaultProxyV2 = await deployments.getArtifact("AdminUpgradeabilityProxy");
  const registryProxyAddress = (await deployments.get("RegistryProxy")).address;
  const strategyManager = await deployments.get("StrategyManager");
  const registryInstance = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const operatorAddress = await registryInstance.getOperator();
  const operator = await hre.ethers.getSigner(operatorAddress);
  chainId =
    ["31337", "1337"].includes(chainId) && FORK != "" ? NETWORKS_CHAIN_ID[FORK as eEVMNetwork].toString() : chainId;
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
  const result = await deploy("opNEWO-Invst", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress],
    libraries: {
      "contracts/protocol/lib/StrategyManager.sol:StrategyManager": strategyManager.address,
    },
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
          args: [
            registryProxyAddress,
            MULTI_CHAIN_VAULT_TOKENS[chainId].NEWO.hash,
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "NEWO",
            "2",
            "0",
            "0",
            "0",
            "0",
          ],
        },
      },
    },
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });
  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const vault = await deployments.get("opNEWOinvst");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "opNEWO-Invst",
          address: vault.address,
          constructorArguments: [registryProxyAddress],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "opNEWO-Invst",
          address: vault.address,
          constructorArguments: [registryProxyAddress],
        });
      }
    }
  }
};
export default func;
func.tags = ["opNEWO-Invst"];
func.dependencies = ["Registry"];
