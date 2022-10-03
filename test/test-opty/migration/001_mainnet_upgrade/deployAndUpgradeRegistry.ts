import { getAddress } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { eEVMNetwork } from "../../../../helper-hardhat-config";
import { ESSENTIAL_CONTRACTS } from "../../../../helpers/constants/essential-contracts-name";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../../../helpers/constants/tokens";
import { RegistryProxy } from "../../../../typechain";
import { RegistryProxy as registryProxyAddress } from "../../_deployments/mainnet.json";

export async function deployAndUpgradeRegistry(fork: eEVMNetwork): Promise<void> {
  const registryFactory = await ethers.getContractFactory(ESSENTIAL_CONTRACTS.REGISTRY);
  const registryV2 = await registryFactory.deploy();
  let registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryV2.address);
  let registryProxyInstance = <RegistryProxy>(
    await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, registryProxyAddress)
  );
  const operatorAddress = await registryProxyInstance.operator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const governanceAddress = await registryProxyInstance.governance();
  const governanceSigner = await ethers.getSigner(governanceAddress);
  registryProxyInstance = <RegistryProxy>(
    await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, registryProxyAddress)
  );
  // upgrade registry
  const registryImplementation = await registryProxyInstance.registryImplementation();
  if (getAddress(registryImplementation) != getAddress(registryV2.address)) {
    const pendingImplementation = await registryProxyInstance.pendingRegistryImplementation();
    if (getAddress(pendingImplementation) != getAddress(registryV2.address)) {
      const setPendingImplementationTx = await registryProxyInstance
        .connect(operatorSigner)
        .setPendingImplementation(registryV2.address);
      await setPendingImplementationTx.wait(1);
    }
    const becomeTx = await registryV2Instance.connect(governanceSigner).become(registryProxyAddress);
    await becomeTx.wait(1);
  }

  registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);

  // approve tokens and map to tokens hash
  const onlySetTokensHash = [];
  const approveTokenAndMapHash = [];
  const tokenHashes: string[] = await registryV2Instance.getTokenHashes();
  const usdcApproved = await registryV2Instance.isApprovedToken(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address);

  if (usdcApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash)) {
    onlySetTokensHash.push([MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash, [MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address]]);
  }

  if (!usdcApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash)) {
    approveTokenAndMapHash.push([
      MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash,
      [MULTI_CHAIN_VAULT_TOKENS[fork].USDC.address],
    ]);
  }

  const wethApproved = await registryV2Instance.isApprovedToken(MULTI_CHAIN_VAULT_TOKENS[fork].WETH.address);

  if (wethApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash)) {
    onlySetTokensHash.push([MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash, [MULTI_CHAIN_VAULT_TOKENS[fork].WETH.address]]);
  }

  if (!wethApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash)) {
    approveTokenAndMapHash.push([
      MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash,
      [MULTI_CHAIN_VAULT_TOKENS[fork].WETH.address],
    ]);
  }

  if (approveTokenAndMapHash.length > 0) {
    const approveTokenAndMapToTokensHashTx = await registryV2Instance
      .connect(operatorSigner)
      ["approveTokenAndMapToTokensHash((bytes32,address[])[])"](approveTokenAndMapHash);
    await approveTokenAndMapToTokensHashTx.wait(1);
  }

  if (onlySetTokensHash.length > 0) {
    const onlyMapToTokensHashTx = await registryV2Instance
      .connect(operatorSigner)
      ["setTokensHashToTokens((bytes32,address[])[])"](onlySetTokensHash);
    await onlyMapToTokensHashTx.wait(1);
  }
}
