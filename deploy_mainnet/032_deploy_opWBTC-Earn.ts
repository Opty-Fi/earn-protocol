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
  const strategyManager = await deployments.get("StrategyManager");
  const registryInstance = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const operatorAddress = await registryInstance.getOperator();
  const operator = await hre.ethers.getSigner(operatorAddress);

  const onlySetTokensHash = [];
  const approveTokenAndMapHash = [];
  const wbtcApproved = await registryInstance.isApprovedToken(MULTI_CHAIN_VAULT_TOKENS[chainId].WBTC.address);
  const tokenHashes: string[] = await registryInstance.getTokenHashes();
  if (wbtcApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].WBTC.hash)) {
    console.log("only set WBTC hash");
    console.log("\n");
    onlySetTokensHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].WBTC.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].WBTC.address],
    ]);
  }
  if (!wbtcApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].WBTC.hash)) {
    console.log("approve WBTC and set hash");
    console.log("\n");
    approveTokenAndMapHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].WBTC.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].WBTC.address],
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
  const result = await deploy("opWBTC-Earn", {
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
      proxyContract: "AdminUpgradeabilityProxy",
      implementationName: "opWETH-Earn_Implementation",
      execute: {
        init: {
          methodName: "initialize",
          args: [
            registryProxyAddress, //address _registry
            MULTI_CHAIN_VAULT_TOKENS[chainId].WBTC.hash, //bytes32 _underlyingTokensHash
            "0x1f241a0f2460742481da49475eb1683fb84eb69cf3da43519a8b701f3309f783", //bytes32 _whitelistedAccountsRoot
            "WBTC", //string memory _symbol
            "1", //uint256 _riskProfileCode
            "907136802102229675083754464877550363794833538656521846052285629999509143552", //uint256 _vaultConfiguration
            "115792089237316195423570985008687907853269984665640564039457584007913129639935", //uint256 _userDepositCapUT
            "0", //uint256 _minimumDepositValueUT
            "50000000000", //uint256 _totalValueLockedLimitUT
          ],
        },
      },
    },
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const vault = await deployments.get("opWBTC-Earn");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "opWBTC-Earn",
          address: vault.address,
          constructorArguments: [registryProxyAddress],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "opWBTC-Earn",
          address: vault.address,
          constructorArguments: [registryProxyAddress],
        });
      }
    }
  }
};
export default func;
func.tags = ["opWBTC-Earn"];
func.dependencies = ["Registry"];
