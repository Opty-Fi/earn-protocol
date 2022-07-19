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
  const registryProxyAddress = (await deployments.get("RegistryProxy")).address;
  const strategyManager = await deployments.get("StrategyManager");
  const claimAndHarvest = await deployments.get("ClaimAndHarvest");
  const registryInstance = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const operatorAddress = await registryInstance.getOperator();
  const operator = await hre.ethers.getSigner(operatorAddress);

  const onlySetTokensHash = [];
  const approveTokenAndMapHash = [];
  const usdcApproved = await registryInstance.isApprovedToken(MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.address);
  const tokenHashes: string[] = await registryInstance.getTokenHashes();
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

  const result = await deploy("opUSDCgrow", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress, "USD Coin", "USDC", "Growth", "grow"],
    log: true,
    skipIfAlreadyDeployed: true,
    libraries: {
      "contracts/protocol/lib/StrategyManager.sol:StrategyManager": strategyManager.address,
      "contracts/protocol/lib/ClaimAndHarvest.sol:ClaimAndHarvest": claimAndHarvest.address,
    },
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
            MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.hash,
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            "USD Coin",
            "USDC",
            "1",
            "0",
            "0",
            "0",
            "0",
          ],
        },
      },
    },
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const vault = await deployments.get("opUSDCgrow");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "opUSDCgrow",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "USD Coin", "USDC", "Growth", "grow"],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "opUSDCgrow",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "USD Coin", "USDC", "Growth", "grow"],
        });
      }
    }
  }
};
export default func;
func.tags = ["opUSDCgrow"];
func.dependencies = ["Registry"];
