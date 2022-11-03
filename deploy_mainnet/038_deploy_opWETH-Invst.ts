import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils";
import ethereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import sushiswap from "@optyfi/defi-legos/ethereum/sushiswap/index";
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
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const strategyManager = await deployments.get("StrategyManager");
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
      registryProxyAddress,
      MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.hash,
      "0x1f241a0f2460742481da49475eb1683fb84eb69cf3da43519a8b701f3309f783",
      "WETH",
      "2",
      "2718155043500073612906634403139041842518004532954031278126931986324444413952",
      "115792089237316195423570985008687907853269984665640564039457584007913129639935",
      "0",
      "6666000000000000000000",
    ],
  };
  const result = await deploy("opWETH-Invst", {
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
      upgradeIndex: networkName == "hardhat" ? 0 : 2,
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
      const vault = await deployments.get("opWETH-Invst");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "opWETH-Invst",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "Wrapped Ether", "WETH", "Invest", "invst"],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "opWETH-Invst",
          address: vault.address,
          constructorArguments: [registryProxyAddress, "Wrapped Ether", "WETH", "Invest", "invst"],
        });
      }
    }
  }
  const vaultInstance = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opWETH-Invst")).address)
  );
  const approvalTokens: string[] = [];
  const approvalSpender: string[] = [];

  const usdc = <ERC20>await ethers.getContractAt(ERC20__factory.abi, ethereumTokens.PLAIN_TOKENS.USDC);
  const usdcAllowance = await usdc.allowance(vaultInstance.address, sushiswap.SushiswapRouter.address);
  if (!usdcAllowance.gt("0")) {
    approvalTokens.push(usdc.address);
    approvalSpender.push(sushiswap.SushiswapRouter.address);
  }

  const weth = <ERC20>await ethers.getContractAt(ERC20__factory.abi, ethereumTokens.WRAPPED_TOKENS.WETH);
  const wethAllowance = await weth.allowance(vaultInstance.address, sushiswap.SushiswapRouter.address);
  if (!wethAllowance.gt("0")) {
    approvalTokens.push(weth.address);
    approvalSpender.push(sushiswap.SushiswapRouter.address);
  }

  const wbtc = <ERC20>await ethers.getContractAt(ERC20__factory.abi, ethereumTokens.BTC_TOKENS.WBTC);
  const wbtcAllowance = await wbtc.allowance(vaultInstance.address, sushiswap.SushiswapRouter.address);
  if (!wbtcAllowance.gt("0")) {
    approvalTokens.push(wbtc.address);
    approvalSpender.push(sushiswap.SushiswapRouter.address);
  }

  const usdcWethSLP = <ERC20>(
    await ethers.getContractAt(ERC20__factory.abi, "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0")
  );
  const wbtcWethSLP = <ERC20>(
    await ethers.getContractAt(ERC20__factory.abi, "0xCEfF51756c56CeFFCA006cD410B03FFC46dd3a58")
  );

  const usdcWethSLPAllowance = await usdcWethSLP.allowance(vaultInstance.address, sushiswap.SushiswapRouter.address);
  const wbtcWethSLPAllowance = await wbtcWethSLP.allowance(vaultInstance.address, sushiswap.SushiswapRouter.address);

  if (!usdcWethSLPAllowance.gt("0")) {
    approvalTokens.push(usdcWethSLP.address);
    approvalSpender.push(sushiswap.SushiswapRouter.address);
  }
  if (!wbtcWethSLPAllowance.gt("0")) {
    approvalTokens.push(wbtcWethSLP.address);
    approvalSpender.push(sushiswap.SushiswapRouter.address);
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
func.tags = ["opWETH-Invst"];
func.dependencies = ["Registry"];
