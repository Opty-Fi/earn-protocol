import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getAddress, parseEther, parseUnits } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import EthereumSushiswap from "@optyfi/defi-legos/ethereum/sushiswap/index";
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
  const artifact = await deployments.getArtifact("Vault");
  const registryProxyAddress = (await deployments.get("RegistryProxy")).address;
  const strategyManager = await deployments.get("StrategyManager");
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
      MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.hash, //bytes32 _underlyingTokensHash
      "0x62689e8751ba85bee0855c30d61d17345faa5b23e82626a83f8d63db50d67694", //bytes32 _whitelistedAccountsRoot
      "USDC", //string memory _symbol
      "1", //uint256 _riskProfileCode
      "907526671970000184333670559907166992856131736632788761421622686920973746176", //uint256 _vaultConfiguration
      "100000000000", //uint256 _userDepositCapUT
      "0", //uint256 _minimumDepositValueUT
      "10000000000000", //uint256 _totalValueLockedLimitUT
    ],
  };
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
      proxyContract: "AdminUpgradeabilityProxy",
      implementationName: "opWETH-Save_Implementation",
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
  const vaultInstance = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opUSDC-Earn_Proxy")).address)
  );
  const approvalTokens = [];
  const approvalSpender = [];

  const wethInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.WRAPPED_TOKENS.WETH);
  const usdcInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.PLAIN_TOKENS.USDC);

  const wethSushiswapAllowance = await wethInstance.allowance(
    vaultInstance.address,
    EthereumSushiswap.SushiswapRouter.address,
  );
  const usdcSushiswapAllowance = await usdcInstance.allowance(
    vaultInstance.address,
    EthereumSushiswap.SushiswapRouter.address,
  );

  if (!wethSushiswapAllowance.gt(parseEther("1000000"))) {
    approvalTokens.push(wethInstance.address);
    approvalSpender.push(EthereumSushiswap.SushiswapRouter.address);
  }

  if (!usdcSushiswapAllowance.gt(parseUnits("1000000", "6"))) {
    approvalTokens.push(usdcInstance.address);
    approvalSpender.push(EthereumSushiswap.SushiswapRouter.address);
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
func.tags = ["opUSDC-Earn"];
func.dependencies = ["Registry"];
