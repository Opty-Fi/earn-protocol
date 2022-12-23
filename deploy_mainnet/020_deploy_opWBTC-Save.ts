import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BigNumber } from "ethers";
import { getAddress, parseUnits } from "ethers/lib/utils";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import AaveV2 from "@optyfi/defi-legos/ethereum/aavev2/index";
import Compound from "@optyfi/defi-legos/ethereum/compound/index";
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
  const commandBuilder = await deployments.get("CommandBuilder");
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
  const proxyArgs: { methodName: string; args: any[] } = {
    methodName: "initialize",
    args: [
      registryProxyAddress, //address _registry
      MULTI_CHAIN_VAULT_TOKENS[chainId].WBTC.hash, //bytes32 _underlyingTokensHash
      "0x1f241a0f2460742481da49475eb1683fb84eb69cf3da43519a8b701f3309f783", //bytes32 _whitelistedAccountsRoot
      "WBTC", //string memory _symbol
      "0", //uint256 _riskProfileCode
      "905369955037451290754171167376807445279006054759646227094164023798216523776", //uint256 _vaultConfiguration
      "115792089237316195423570985008687907853269984665640564039457584007913129639935", //uint256 _userDepositCapUT
      "0", //uint256 _minimumDepositValueUT
      "50000000000", //uint256 _totalValueLockedLimitUT
    ],
  };
  const result = await deploy("opWBTC-Save", {
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
      "contracts/protocol/lib/CommandBuilder.sol:CommandBuilder": commandBuilder.address,
    },
    proxy: {
      owner: admin,
      upgradeIndex: networkName == "hardhat" ? 0 : 3,
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
      const vault = await deployments.get("opWBTC-Save");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "opWBTC-Save",
          address: vault.address,
          constructorArguments: [registryProxyAddress],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "opWBTC-Save",
          address: vault.address,
          constructorArguments: [registryProxyAddress],
        });
      }
    }
  }

  const vaultInstance = <Vault>(
    await ethers.getContractAt(Vault__factory.abi, (await deployments.get("opWBTC-Save_Proxy")).address)
  );
  const approvalTokens = [];
  const approvalSpender = [];

  const wbtcInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, EthereumTokens.BTC_TOKENS.WBTC);
  const awbtcInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, AaveV2.pools.wbtc.lpToken);
  const cwbtcInstance = <ERC20>await ethers.getContractAt(Compound.cToken.abi, Compound.pools.wbtc.pool);

  const wbtcAaveV2Allowance = await wbtcInstance.allowance(vaultInstance.address, AaveV2.LendingPool.address);
  const awbtcAaveV2Allowance = await awbtcInstance.allowance(vaultInstance.address, AaveV2.LendingPool.address);

  const wbtcCompoundAllowance = await wbtcInstance.allowance(vaultInstance.address, cwbtcInstance.address);

  if (!wbtcAaveV2Allowance.gt(parseUnits("1000000", "8"))) {
    approvalTokens.push(wbtcInstance.address);
    approvalSpender.push(AaveV2.LendingPool.address);
  }

  if (!awbtcAaveV2Allowance.gt(parseUnits("1000000", "8"))) {
    approvalTokens.push(awbtcInstance.address);
    approvalSpender.push(AaveV2.LendingPool.address);
  }

  if (!wbtcCompoundAllowance.gt(parseUnits("1000000", "8"))) {
    approvalTokens.push(wbtcInstance.address);
    approvalSpender.push(Compound.pools.wbtc.pool);
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
func.tags = ["opWBTC-Save"];
func.dependencies = ["Registry", "CommandBuilder"];