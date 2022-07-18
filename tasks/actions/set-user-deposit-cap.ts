import { task, types } from "hardhat/config";
import TASKS from "../task-names";
import { Vault } from "../../typechain";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { isAddress } from "../../helpers/helpers";

task(TASKS.ACTION_TASKS.SET_USER_DEPOSIT_CAP.NAME, TASKS.ACTION_TASKS.SET_USER_DEPOSIT_CAP.DESCRIPTION)
  .addParam("vault", "the address of vault", "", types.string)
  .addParam("userDepositCap", "maximum amount in underlying token allowed to be deposited by user", "", types.string)
  .setAction(async ({ vault, userDepositCap }, { deployments, ethers }) => {
    if (vault === "") {
      throw new Error("vault address cannot be empty");
    }

    if (!isAddress(vault)) {
      throw new Error("vault address is invalid");
    }

    try {
      const vaultInstance = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vault);
      const currentUserDepositCapUT = await vaultInstance.userDepositCapUT();
      console.log("current:", currentUserDepositCapUT);
      console.log("vault.setUserDepositCapUT()");
      if (currentUserDepositCapUT.toString() == userDepositCap) {
        console.log("userDepositCapUT is upto date on vault");
        console.log("\n");
      } else {
        console.log("Updating userDepositCapUT on vault...");
        console.log("\n");
        const registryInstance = await ethers.getContractAt(
          ESSENTIAL_CONTRACTS.REGISTRY,
          (
            await deployments.get("RegistryProxy")
          ).address,
        );
        const financeOperatorSigner = await ethers.getSigner(await registryInstance.financeOperator());
        const tx = await vaultInstance.connect(financeOperatorSigner).setUserDepositCapUT(userDepositCap);
        await tx.wait(1);
        console.log("userDepositCapUT updated!");
      }
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.SET_USER_DEPOSIT_CAP.NAME}: `, error);
      throw error;
    }
  });
