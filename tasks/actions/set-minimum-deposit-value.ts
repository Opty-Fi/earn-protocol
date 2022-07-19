import { task, types } from "hardhat/config";
import TASKS from "../task-names";
import { Vault } from "../../typechain";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { isAddress } from "../../helpers/helpers";
import { BigNumber } from "ethers";

task(TASKS.ACTION_TASKS.SET_MINIMUM_DEPOSIT_VALUE.NAME, TASKS.ACTION_TASKS.SET_MINIMUM_DEPOSIT_VALUE.DESCRIPTION)
  .addParam("vault", "the address of vault", "", types.string)
  .addParam("minimumDepositValue", "minimum deposit value in underlying token required", "", types.string)
  .setAction(async ({ vault, minimumDepositValue }, { deployments, ethers }) => {
    if (vault === "") {
      throw new Error("vault address cannot be empty");
    }

    if (!isAddress(vault)) {
      throw new Error("vault address is invalid");
    }

    try {
      const vaultInstance = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vault);
      const currMinimumDepositValueUT = await vaultInstance.minimumDepositValueUT();
      console.log("current:", currMinimumDepositValueUT);
      console.log("vault.setMinimumDepositValueUT()");
      if (currMinimumDepositValueUT == BigNumber.from(minimumDepositValue)) {
        console.log("minimumDepositValueUT is upto date on vault");
        console.log("\n");
      } else {
        console.log("Updating minimumDepositValueUT on vault...");
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
          .setMinimumDepositValueUT(BigNumber.from(minimumDepositValue));
        await tx.wait(1);
        console.log("minimumDepositValueUT updated!");
      }
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.SET_MINIMUM_DEPOSIT_VALUE.NAME}: `, error);
      throw error;
    }
  });
