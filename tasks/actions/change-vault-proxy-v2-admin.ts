import { BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils";
import { task, types } from "hardhat/config";
import { AdminUpgradeabilityProxy, AdminUpgradeabilityProxy__factory } from "../../typechain";
import TASKS from "../task-names";

task(TASKS.ACTION_TASKS.CHANGE_VAULT_PROXY_V2_ADMIN.NAME, TASKS.ACTION_TASKS.CHANGE_VAULT_PROXY_V2_ADMIN.DESCRIPTION)
  .addParam("vaultSymbol", "symbol of vault", "", types.string)
  .addParam("newAdmin", "new admin address", "", types.string)
  .setAction(async ({ vaultSymbol, newAdmin }, { deployments, ethers }) => {
    try {
      const vaultProxyAddress = await (await deployments.get(`${vaultSymbol}_Proxy`)).address;
      const vaultProxyInstance = <AdminUpgradeabilityProxy>(
        await ethers.getContractAt(AdminUpgradeabilityProxy__factory.abi, vaultProxyAddress)
      );
      const storage = await ethers.provider.getStorageAt(
        vaultProxyAddress,
        BigNumber.from("0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103"),
      );
      const currentAdmin = getAddress(`0x${storage.slice(-40)}`);
      console.log("currentAdmin ", currentAdmin);
      if (getAddress(newAdmin) != getAddress(currentAdmin)) {
        const feeData = await ethers.provider.getFeeData();
        const tx = await vaultProxyInstance.changeAdmin(newAdmin, {
          type: 2,
          maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
          maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
        });
        await tx.wait(1);
      } else {
        console.log("current admin is upto date");
      }
    } catch (error: any) {
      console.error(`${TASKS.ACTION_TASKS.CHANGE_VAULT_PROXY_V2_ADMIN.NAME}: `, error);
      throw error;
    }
  });
