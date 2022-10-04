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
  const chainId = await getChainId();
  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("opUSDC-Earn", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress],
    log: true,
    skipIfAlreadyDeployed: true,
    libraries: {
      "contracts/protocol/lib/StrategyManager.sol:StrategyManager": strategyManager.address,
    },
    proxy: {
      owner: admin,
      upgradeIndex: networkName == "hardhat" ? 0 : 1,
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
            MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.hash, //bytes32 _underlyingTokensHash
            "0x4a7e14b2b81abccd2dfd58372f0cbd5b5512749fbafee2e2cda5c56ac0fc947a", //bytes32 _whitelistedAccountsRoot
            "USDC", //string memory _symbol
            "1", //uint256 _riskProfileCode
            "907136802102229675083754464877550363794833538656521846974622833684986724352", //uint256 _vaultConfiguration
            "100000000000", //uint256 _userDepositCapUT
            "0", //uint256 _minimumDepositValueUT
            "10000000000000", //uint256 _totalValueLockedLimitUT
          ],
        },
      },
    },
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const vault = await deployments.get("opUSDC-Earn");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "opUSDC-Earn",
          address: vault.address,
          constructorArguments: [registryProxyAddress],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "opUSDC-Earn",
          address: vault.address,
          constructorArguments: [registryProxyAddress],
        });
      }
    }
  }
};
export default func;
func.tags = ["PolygonopUSDC-Earn"];
func.dependencies = ["PolygonApproveTokensAndMapTokensHash"];
