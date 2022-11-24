import { BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils";
import { task, types } from "hardhat/config";
import { VaultV5__factory } from "../../helpers/types/vaultv5";
import { VaultV5 } from "../../helpers/types/vaultv5/VaultV5";
import { getRiskProfileCode } from "../../helpers/utils";
import {
  AdminUpgradeabilityProxy,
  AdminUpgradeabilityProxy__factory,
  ERC20,
  ERC20__factory,
  InitializableImmutableAdminUpgradeabilityProxy,
  InitializableImmutableAdminUpgradeabilityProxy__factory,
  Vault,
  Vault__factory,
} from "../../typechain";
import TASKS from "../task-names";

task(TASKS.ACTION_TASKS.UPGRADE_TO_AND_CALL.NAME, TASKS.ACTION_TASKS.UPGRADE_TO_AND_CALL.DESCRIPTION)
  .addParam("vaultSymbol", "symbol of vault", "", types.string)
  .addParam("newImplementation", "new implementation address", "", types.string)
  .setAction(async ({ vaultSymbol, newImplementation }, { deployments, ethers }) => {
    try {
      const vaultProxyAddress = (await deployments.get(`${vaultSymbol}_Proxy`)).address;
      const vaultInstance = <Vault>await ethers.getContractAt(Vault__factory.abi, newImplementation);
      const storage = await ethers.provider.getStorageAt(
        vaultProxyAddress,
        BigNumber.from("0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103"),
      );
      const oldVaultProxyInstance = <VaultV5>(
        await ethers.getContractAt(
          VaultV5__factory.abi,
          vaultProxyAddress,
          await ethers.getSigner("0xDa1d30af457b8386083C66c9Df7A86269bEbFDF8"),
        )
      );
      const _underlyingToken = await oldVaultProxyInstance.underlyingToken();
      const _underlyingTokenInstance = <ERC20>await ethers.getContractAt(ERC20__factory.abi, _underlyingToken);
      const _registry = await oldVaultProxyInstance.registryContract();
      const _underlyingTokensHash = await oldVaultProxyInstance.underlyingTokensHash();
      const _whitelistedAccountsRoot = await oldVaultProxyInstance.whitelistedAccountsRoot();
      let _symbol = await _underlyingTokenInstance.symbol(); //3Crv == USD3
      _symbol = _symbol === "3Crv" ? "USD3" : _symbol;
      console.log(_symbol);
      const _vaultConfiguration = await oldVaultProxyInstance.vaultConfiguration();
      const _riskProfileCode = getRiskProfileCode(_vaultConfiguration);
      console.log(_riskProfileCode.toString());
      const _userDepositCapUT = await oldVaultProxyInstance.userDepositCapUT();
      const _minimumDepositValueUT = await oldVaultProxyInstance.minimumDepositValueUT();
      const _totalValueLockedLimitUT = await oldVaultProxyInstance.totalValueLockedLimitUT();
      let vaultProxyInstance;
      if (storage === ethers.constants.HashZero) {
        console.log("Identified as VaultProxy");
        vaultProxyInstance = <InitializableImmutableAdminUpgradeabilityProxy>(
          await ethers.getContractAt(InitializableImmutableAdminUpgradeabilityProxy__factory.abi, vaultProxyAddress)
        );
        const proxyAdmin = await vaultProxyInstance.admin();
        console.log("Current proxy admin ", proxyAdmin);
        const signer = await ethers.getSigner(proxyAdmin);
        console.log("upgradeToAndCall");
        const tx = await vaultProxyInstance
          .connect(signer)
          .upgradeToAndCall(
            newImplementation,
            vaultInstance.interface.encodeFunctionData("initialize", [
              _registry,
              _underlyingTokensHash,
              _whitelistedAccountsRoot,
              _symbol === "3Crv" ? "USD3" : _symbol,
              _riskProfileCode,
              _vaultConfiguration,
              _userDepositCapUT,
              _minimumDepositValueUT,
              _totalValueLockedLimitUT,
            ]),
          );
        await tx.wait(1);
        console.log("upgradeToAndCall is done");
      } else {
        console.log("Identified as VaultProxyV2");
        vaultProxyInstance = <AdminUpgradeabilityProxy>(
          await ethers.getContractAt(AdminUpgradeabilityProxy__factory.abi, vaultProxyAddress)
        );
        const proxyAdmin = getAddress(`0x${storage.slice(-40)}`);
        console.log("current proxy admin ", proxyAdmin);
        const signer = await ethers.getSigner(proxyAdmin);
        console.log("upgradeToAndCall");
        const tx = await vaultProxyInstance
          .connect(signer)
          .upgradeToAndCall(
            newImplementation,
            vaultInstance.interface.encodeFunctionData("initialize", [
              _registry,
              _underlyingTokensHash,
              _whitelistedAccountsRoot,
              _symbol === "3Crv" ? "USD3" : _symbol,
              _riskProfileCode,
              _vaultConfiguration,
              _userDepositCapUT,
              _minimumDepositValueUT,
              _totalValueLockedLimitUT,
            ]),
          );
        await tx.wait(1);
        console.log("upgradeToAndCall is done");
      }
    } catch (error: any) {
      console.error(`${TASKS.ACTION_TASKS.UPGRADE_TO_AND_CALL.NAME}: `, error);
      throw error;
    }
  });
