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
  const registryProxyAddress = (await deployments.get("RegistryProxy")).address;
  const strategyManager = await deployments.get("StrategyManager");
  const claimAndHarvest = await deployments.get("ClaimAndHarvest");
  const registryInstance = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const operatorAddress = await registryInstance.getOperator();
  const operator = await hre.ethers.getSigner(operatorAddress);

  const onlySetTokensHash = [];
  const approveTokenAndMapHash = [];
  const sushiApproved = await registryInstance.isApprovedToken(MULTI_CHAIN_VAULT_TOKENS[chainId].SUSHI.address);
  const tokenHashes: string[] = await registryInstance.getTokenHashes();
  if (sushiApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].SUSHI.hash)) {
    console.log("only set SUSHI hash");
    console.log("\n");
    onlySetTokensHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].SUSHI.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].SUSHI.address],
    ]);
  }
  if (!sushiApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].SUSHI.hash)) {
    console.log("approve SUSHI and set hash");
    console.log("\n");
    approveTokenAndMapHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].SUSHI.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].SUSHI.address],
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
  const result = await deploy("opSUSHIaggr", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress, "SushiToken", "SUSHI", "Aggressive", "aggr"],
    log: true,
    skipIfAlreadyDeployed: true,
    libraries: {
      "contracts/protocol/lib/StrategyManager.sol:StrategyManager": strategyManager.address,
      "contracts/protocol/lib/ClaimAndHarvest.sol:ClaimAndHarvest": claimAndHarvest.address,
    },
    proxy: {
      owner: admin,
      upgradeIndex: 0,
      proxyContract: "AdminUpgradeabilityProxy",
      execute: {
        init: {
          methodName: "initialize",
          args: [
            registryProxyAddress, //address _registry
            MULTI_CHAIN_VAULT_TOKENS[chainId].SUSHI.hash, //bytes32 _underlyingTokensHash
            "0x0000000000000000000000000000000000000000000000000000000000000000", //bytes32 _whitelistedCodesRoot
            "0x0000000000000000000000000000000000000000000000000000000000000000", //bytes32 _whitelistedAccountsRoot
            "SushiToken", //string memory _name
            "SUSHI", //string memory _symbol
            "2", //uint256 _riskProfileCode
            "0", //uint256 _vaultConfiguration
            "0", //uint256 _userDepositCapUT
            "0", //uint256 _minimumDepositValueUT
            "0", //uint256 _totalValueLockedLimitUT
          ],
        },
      },
    },
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });
  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const vault = await deployments.get("opSUSHIaggr");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "opSUSHIaggr",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "SushiToken", "SUSHI", "Aggressive", "aggr"],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "opSUSHIaggr",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "SushiToken", "SUSHI", "Aggressive", "aggr"],
        });
      }
    }
  }
};
export default func;
func.tags = ["opSUSHIaggr"];
func.dependencies = ["Registry"];
