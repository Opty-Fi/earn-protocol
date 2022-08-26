import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { waitforme } from "../helpers/utils";

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
  const artifact = await deployments.getArtifact("Vault");
  const artifactVaultProxyV2 = await deployments.getArtifact("AdminUpgradeabilityProxy");
  const registryProxyAddress = (await deployments.get("RegistryProxy")).address;
  const strategyManager = await deployments.get("StrategyManager");
  const claimAndHarvest = await deployments.get("ClaimAndHarvest");
  const chainId = await getChainId();
  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("opWMATICgrow", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress, "Wrapped Matic", "WMATIC", "Growth", "grow"],
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
            registryProxyAddress, //address _registry
            MULTI_CHAIN_VAULT_TOKENS[chainId].WMATIC.hash, //bytes32 _underlyingTokensHash
            "0x0000000000000000000000000000000000000000000000000000000000000000", //bytes32 _whitelistedCodesRoot
            "0x0000000000000000000000000000000000000000000000000000000000000000", //bytes32 _whitelistedAccountsRoot
            "Wrapped Matic", //string memory _name
            "WMATIC", //string memory _symbol
            "1", //uint256 _riskProfileCode
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
      const vault = await deployments.get("opWMATICgrow");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "opWMATICgrow",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "Wrapped Matic", "WMATIC", "Growth", "grow"],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "opWMATICgrow",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "Wrapped Matic", "WMATIC", "Growth", "grow"],
        });
      }
    }
  }
};
export default func;
func.tags = ["PolygonopWMATICgrow"];
func.dependencies = ["PolygonApproveTokensAndMapTokensHash"];
