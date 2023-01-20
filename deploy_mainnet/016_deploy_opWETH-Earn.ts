import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getAddress, parseEther, parseUnits } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import EthereumUniswapV2 from "@optyfi/defi-legos/ethereum/uniswapV2/index";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { waitforme } from "../helpers/utils";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { ERC20, ERC20__factory, Vault, Vault__factory } from "../typechain";

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
  // const artifact = await deployments.getArtifact("Vault");
  const artifact = await deployments.getArtifact("VaultMigrator");
  const artifactVaultProxyV2 = await deployments.getArtifact("AdminUpgradeabilityProxy");
  const registryProxyAddress = (await deployments.get("RegistryProxy")).address;
  // const strategyManager = await deployments.get("StrategyManager");
  const registryInstance = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const operatorAddress = await registryInstance.getOperator();
  const operator = await hre.ethers.getSigner(operatorAddress);

  const onlySetTokensHash = [];
  const approveTokenAndMapHash = [];
  const wethApproved = await registryInstance.isApprovedToken(MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.address);
  const tokenHashes: string[] = await registryInstance.getTokenHashes();
  if (wethApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.hash)) {
    console.log("only set WETH hash");
    console.log("\n");
    onlySetTokensHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.address],
    ]);
  }
  if (!wethApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.hash)) {
    console.log("approve WETH and set hash");
    console.log("\n");
    approveTokenAndMapHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.address],
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
  const proxyArgs: { methodName: string; args: any[] } = {
    methodName: "initialize",
    args: [
      registryProxyAddress, //address _registry
      MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.hash, //bytes32 _underlyingTokensHash
      "0x62689e8751ba85bee0855c30d61d17345faa5b23e82626a83f8d63db50d67694", //bytes32 _whitelistedAccountsRoot
      "WETH", //string memory _symbol
      "1", //uint256 _riskProfileCode
      "907526671970000184333670559907166992856131736632788760499285483235496165376", //uint256 _vaultConfiguration
      "60000000000000000000", //uint256 _userDepositCapUT
      "0", //uint256 _minimumDepositValueUT
      "6000000000000000000000", //uint256 _totalValueLockedLimitUT
    ],
  };
  const result = await deploy("opWETH-Earn", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress],
    // libraries: {
    //   "contracts/protocol/lib/StrategyManager.sol:StrategyManager": strategyManager.address,
    // },
    log: true,
    skipIfAlreadyDeployed: true,
    proxy: {
      owner: admin,
      upgradeIndex: networkName == "hardhat" ? 0 : 0,
      // proxyContract: "AdminUpgradeabilityProxy",
      proxyContract: {
        abi: artifactVaultProxyV2.abi,
        bytecode: artifactVaultProxyV2.bytecode,
        deployedBytecode: artifactVaultProxyV2.deployedBytecode,
      },
      // implementationName: "opWETH-Save_Implementation",
      execute: {
        init: proxyArgs,
        onUpgrade: proxyArgs,
      },
    },
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });
  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const vault = await deployments.get("opWETH-Earn");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "opWETH-Earn",
          address: vault.address,
          constructorArguments: [registryProxyAddress],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "opWETH-Earn",
          address: vault.address,
          constructorArguments: [registryProxyAddress],
        });
      }
    }
  }

  const vaultInstance = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opWETH-Earn_Proxy")).address)
  );

  const approvalTokens = [];
  const approvalSpender = [];

  const wethInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.WRAPPED_TOKENS.WETH);
  const usdcInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.PLAIN_TOKENS.USDC);

  const wethSushiswapAllowance = await wethInstance.allowance(
    vaultInstance.address,
    EthereumUniswapV2.router02.address,
  );
  const usdcSushiswapAllowance = await usdcInstance.allowance(
    vaultInstance.address,
    EthereumUniswapV2.router02.address,
  );

  if (!wethSushiswapAllowance.gt(parseEther("1000000"))) {
    approvalTokens.push(wethInstance.address);
    approvalSpender.push(EthereumUniswapV2.router02.address);
  }

  if (!usdcSushiswapAllowance.gt(parseUnits("1000000", "6"))) {
    approvalTokens.push(usdcInstance.address);
    approvalSpender.push(EthereumUniswapV2.router02.address);
  }

  if (approvalTokens.length > 0) {
    console.log(`${approvalTokens.length} tokens to approve ...`, approvalTokens);
    console.log(`${approvalSpender.length} spender to spend ...`, approvalSpender);
    const governanceSigner = await hre.ethers.getSigner(await registryInstance.getGovernance());
    if (getAddress(governanceSigner.address) === getAddress(deployer)) {
      const tx = await vaultInstance.connect(governanceSigner).giveAllowances(approvalTokens, approvalSpender, {
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
      await tx.wait(1);
    } else {
      console.log("cannot approve pools as signer is not the governance");
    }
  }
};
export default func;
func.tags = ["opWETH-Earn"];
func.dependencies = ["Registry"];
