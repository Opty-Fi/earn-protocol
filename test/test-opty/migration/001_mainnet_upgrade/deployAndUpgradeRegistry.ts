import { getAddress } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { eEVMNetwork } from "../../../../helper-hardhat-config";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../../../helpers/constants/tokens";
import { RegistryProxyV1, RegistryProxyV1__factory, RegistryV1__factory } from "../../../../helpers/types/registryV1";
import { RegistryProxy as registryProxyAddress } from "../../_deployments/mainnet.json";

export async function deployAndUpgradeRegistry(fork: eEVMNetwork): Promise<void> {
  const registryFactory = await ethers.getContractFactory(RegistryV1__factory.abi, RegistryV1__factory.bytecode);
  const registryV2 = await registryFactory.deploy();
  let registryV2Instance = await ethers.getContractAt(RegistryV1__factory.abi, registryV2.address);
  let registryProxyInstance = <RegistryProxyV1>(
    await ethers.getContractAt(RegistryProxyV1__factory.abi, registryProxyAddress)
  );
  const operatorAddress = await registryProxyInstance.operator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const governanceAddress = await registryProxyInstance.governance();
  const governanceSigner = await ethers.getSigner(governanceAddress);
  registryProxyInstance = <RegistryProxyV1>(
    await ethers.getContractAt(RegistryProxyV1__factory.abi, registryProxyAddress)
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

  registryV2Instance = await ethers.getContractAt(RegistryV1__factory.abi, registryProxyAddress);

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
