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
  const registryProxyAddress = (await deployments.get("RegistryProxy")).address;
  const registryInstance = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const operatorAddress = await registryInstance.getOperator();
  const operator = await hre.ethers.getSigner(operatorAddress);

  const onlySetTokensHash = [];
  const approveTokenAndMapHash = [];
  const usdtApproved = await registryInstance.isApprovedToken(MULTI_CHAIN_VAULT_TOKENS[chainId].USDT.address);
  const tokenHashes: string[] = await registryInstance.getTokenHashes();
  if (usdtApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].USDT.hash)) {
    console.log("only set USDT hash");
    console.log("\n");
    onlySetTokensHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].USDT.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].USDT.address],
    ]);
  }
  if (!usdtApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].USDT.hash)) {
    console.log("approve USDT and set hash");
    console.log("\n");
    approveTokenAndMapHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].USDT.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].USDT.address],
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
  const result = await deploy("opUSDTsave", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress, "Tether USD", "USDT", "Save", "save"],
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: admin,
      upgradeIndex: 0,
      proxyContract: "AdminUpgradeabilityProxy",
      implementationName: "opAAVEinvst_Implementation",
      execute: {
        init: {
          methodName: "initialize",
          args: [registryProxyAddress, MULTI_CHAIN_VAULT_TOKENS[chainId].USDT.hash, "Tether USD", "USDT", "0"],
        },
      },
    },
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });
  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const vault = await deployments.get("opUSDTsave");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "opUSDTsave",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "Tether USD", "USDT", "Save", "save"],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "opUSDTsave",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "Tether USD", "USDT", "Save", "save"],
        });
      }
    }
  }
};
export default func;
func.tags = ["opUSDTsave"];
func.dependencies = ["Registry"];
