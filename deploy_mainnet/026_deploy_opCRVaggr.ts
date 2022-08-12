import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { waitforme } from "../helpers/utils";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { BigNumber } from "ethers";

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
  const crvApproved = await registryInstance.isApprovedToken(MULTI_CHAIN_VAULT_TOKENS[chainId].CRV.address);
  const tokenHashes: string[] = await registryInstance.getTokenHashes();
  if (crvApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].CRV.hash)) {
    console.log("only set CRV hash");
    console.log("\n");
    onlySetTokensHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].CRV.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].CRV.address],
    ]);
  }
  if (!crvApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].CRV.hash)) {
    console.log("approve CRV and set hash");
    console.log("\n");
    approveTokenAndMapHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].CRV.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].CRV.address],
    ]);
  }
  if (approveTokenAndMapHash.length > 0) {
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
  }

  if (onlySetTokensHash.length > 0) {
    console.log("operator mapping only tokenshash to tokens..", onlySetTokensHash);
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
  }

  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("opCRVaggr", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress, "Curve DAO Token", "CRV", "Aggressive", "aggr"],
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: admin,
      upgradeIndex: 0,
      proxyContract: "AdminUpgradeabilityProxy",
      execute: {
        init: {
          methodName: "initialize",
          args: [registryProxyAddress, MULTI_CHAIN_VAULT_TOKENS[chainId].CRV.hash, "ENSToken", "CRV", "2"],
        },
      },
    },
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });
  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const vault = await deployments.get("opCRVaggr");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "opCRVaggr",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "Curve DAO Token", "CRV", "Aggressive", "aggr"],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "opCRVaggr",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "Curve DAO Token", "CRV", "Aggressive", "aggr"],
        });
      }
    }
  }
};
export default func;
func.tags = ["opCRVaggr"];
func.dependencies = ["Registry"];
