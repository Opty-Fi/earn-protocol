import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import { deployments, ethers } from "hardhat";
import Safe from "@gnosis.pm/safe-core-sdk";
import { MetaTransactionData, EthAdapter } from "@gnosis.pm/safe-core-sdk-types";
import { VaultV3, VaultV3__factory } from "../../helpers/types/vaultv3";
import {
  AdminUpgradeabilityProxy,
  AdminUpgradeabilityProxy__factory,
  ERC20,
  ERC20__factory,
  Vault,
  Vault__factory,
} from "../../typechain";
import { getRiskProfileCode } from "../../helpers/utils";

async function main() {
  const implementation = "";
  const vaults: { [name: string]: string } = {
    // "opAAVE-Invst": (await deployments.get("opAAVE-Invst")).address,
    "opAPE-Invst": (await deployments.get("opAPE-Invst")).address,
    "opDAI-Save": (await deployments.get("opDAI-Save")).address,
    "opLINK-Invst": (await deployments.get("opLINK-Invst")).address,
    "opMANA-Invst": (await deployments.get("opMANA-Invst")).address,
    // "opNEWO-Invst": (await deployments.get("opNEWO-Invst")).address,
    "opSUSHI-Invst": (await deployments.get("opSUSHI-Invst")).address,
    "opUSD3-Earn": (await deployments.get("opUSD3-Earn")).address,
    "opUSDC-Invst": (await deployments.get("opUSDC-Invst")).address,
    // "opUSDC-Save": (await deployments.get("opUSDC-Save")).address,
    "opUSDT-Save": (await deployments.get("opUSDT-Save")).address,
    "opWBTC-Earn": (await deployments.get("opWBTC-Earn")).address,
    "opWBTC-Save": (await deployments.get("opWBTC-Save")).address,
    // "opWETH-Earn": (await deployments.get("opWETH-Earn")).address,
    "opWETH-Invst": (await deployments.get("opWETH-Invst")).address,
    // "opWETH-Save": (await deployments.get("opWETH-Save")).address
  };

  const transactions: MetaTransactionData[] = [];
  for (const vault of Object.keys(vaults)) {
    const proxyInstance = <AdminUpgradeabilityProxy>(
      await ethers.getContractAt(AdminUpgradeabilityProxy__factory.abi, vaults[vault])
    );
    const oldVaultProxyInstance = <VaultV3>await ethers.getContractAt(VaultV3__factory.abi, vaults[vault]);
    const newVaultInstance = <Vault>await ethers.getContractAt(Vault__factory.abi, oldVaultProxyInstance.address);
    const _underlyingToken = await oldVaultProxyInstance.underlyingToken();
    const _underlyingTokenInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, _underlyingToken);
    const _registry = await oldVaultProxyInstance.registryContract();
    const _underlyingTokensHash = await oldVaultProxyInstance.underlyingTokensHash();
    const _whitelistedAccountsRoot = await oldVaultProxyInstance.whitelistedAccountsRoot();
    let _symbol = await _underlyingTokenInstance.symbol(); //3Crv == USD3
    _symbol = _symbol === "3Crv" ? "USD3" : _symbol;
    const _vaultConfiguration = await oldVaultProxyInstance.vaultConfiguration();
    const _riskProfileCode = getRiskProfileCode(_vaultConfiguration);
    const _userDepositCapUT = await oldVaultProxyInstance.userDepositCapUT();
    const _minimumDepositValueUT = await oldVaultProxyInstance.minimumDepositValueUT();
    const _totalValueLockedLimitUT = await oldVaultProxyInstance.totalValueLockedLimitUT();
    transactions.push({
      to: oldVaultProxyInstance.address,
      value: "0",
      data: proxyInstance.interface.encodeFunctionData("upgradeToAndCall", [
        implementation,
        newVaultInstance.interface.encodeFunctionData("initialize", [
          _registry,
          _underlyingTokensHash,
          _whitelistedAccountsRoot,
          _symbol,
          _riskProfileCode,
          _vaultConfiguration,
          _userDepositCapUT,
          _minimumDepositValueUT,
          _totalValueLockedLimitUT,
        ]),
      ]),
    });
  }

  const safeOwner = ethers.provider.getSigner(0);
  const safeAddress = "0xAE27743Fa2862976CF9aa0754Fb191F7E8a246d4";
  const ethAdapter = <EthAdapter>new EthersAdapter({
    ethers,
    signer: safeOwner,
  });
  const safeSdk: Safe = await Safe.create({ ethAdapter, safeAddress });

  const safeTransaction = await safeSdk.createTransaction(transactions);

  console.log("safeTransaction ", safeTransaction.data);
  const tx = await safeSdk.executeTransaction(safeTransaction);
  const txR = await tx.transactionResponse?.wait(1);
  console.log(txR);
}

main().then(console.log).catch(console.error);
