import { task, types } from "hardhat/config";
import TASKS from "../task-names";
import { Vault } from "../../typechain";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { isAddress } from "../../helpers/helpers";

task(TASKS.ACTION_TASKS.SET_TOTAL_VALUE_LOCKED_LIMIT.NAME, TASKS.ACTION_TASKS.SET_TOTAL_VALUE_LOCKED_LIMIT.DESCRIPTION)
  .addParam("vault", "the address of vault", "", types.string)
  .addParam("totalValueLockedLimitUT", "maximum TVL in underlying token allowed for the vault", "", types.string)
  .setAction(async ({ vault, totalValueLockedLimitUT }, { deployments, ethers }) => {
    if (vault === "") {
      throw new Error("vault address cannot be empty");
    }

    if (!isAddress(vault)) {
      throw new Error("vault address is invalid");
    }

    try {
      const vaultInstance = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vault);
      const currtotalValueLockedLimitUT = await vaultInstance.totalValueLockedLimitUT();
      console.log("current:", currtotalValueLockedLimitUT);
      console.log("vault.setMinimumDepositValueUT()");
      if (currtotalValueLockedLimitUT.toString() == totalValueLockedLimitUT) {
        console.log("totalValueLockedLimitUT is upto date on vault");
        console.log("\n");
      } else {
        console.log("Updating totalValueLockedLimitUT on vault...");
        console.log("\n");
        const registryInstance = await ethers.getContractAt(
          ESSENTIAL_CONTRACTS.REGISTRY,
          (
            await deployments.get("RegistryProxy")
          ).address,
        );
        const financeOperatorSigner = await ethers.getSigner(await registryInstance.financeOperator());
        const tx = await vaultInstance
          .connect(financeOperatorSigner)
          .setTotalValueLockedLimitUT(totalValueLockedLimitUT);
        await tx.wait(1);
        console.log("totalValueLockedLimitUT updated!");
      }
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.SET_TOTAL_VALUE_LOCKED_LIMIT.NAME}: `, error);
      throw error;
    }
  });
