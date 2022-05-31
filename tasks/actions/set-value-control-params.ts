import { task, types } from "hardhat/config";
import { isAddress } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import TASKS from "../task-names";
import { Vault } from "../../typechain";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";

task(TASKS.ACTION_TASKS.SET_VALUE_CONTROL_PARAMS.NAME, TASKS.ACTION_TASKS.SET_VALUE_CONTROL_PARAMS.DESCRIPTION)
  .addParam("vault", "vault address", "", types.string)
  .addParam("userDepositCapUt", "user deposit cap in underlying token", "", types.string)
  .addParam("minimumDepositValueUt", "minimum deposit value in underlying token", "", types.string)
  .addParam("totalValueLockedLimitUt", "TVL in underlying token", "", types.string)
  .setAction(async ({ vault, userDepositCapUt, minimumDepositValueUt, totalValueLockedLimitUt }, hre) => {
    if (vault === "") {
      throw new Error("vault cannot be empty");
    }
    if (!isAddress(vault)) {
      throw new Error("vault address is invalid");
    }
    try {
      const vaultInstance = <Vault>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vault);
      const actualUserDepositCapUT = await vaultInstance.userDepositCapUT();
      const actualMinimumDepositValueUT = await vaultInstance.minimumDepositValueUT();
      const actualTotalValueLockedLimitUT = await vaultInstance.totalValueLockedLimitUT();
      const expectedUserDepositCapUT = BigNumber.from(userDepositCapUt);
      const expectedMinimumDepositValueUT = BigNumber.from(minimumDepositValueUt);
      const expectedTotalValueLockedLimitUT = BigNumber.from(totalValueLockedLimitUt); // 10,000,000
      console.log("vault.setValueControlParams()");
      console.log("\n");
      if (
        expectedUserDepositCapUT.eq(actualUserDepositCapUT) &&
        expectedMinimumDepositValueUT.eq(actualMinimumDepositValueUT) &&
        expectedTotalValueLockedLimitUT.eq(actualTotalValueLockedLimitUT)
      ) {
        console.log("userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT is upto date on vault");
        console.log("\n");
      } else {
        console.log("Updating userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT on vault...");
        console.log("\n");
        const registryInstance = await hre.ethers.getContractAt(
          ESSENTIAL_CONTRACTS.REGISTRY,
          await (
            await hre.deployments.get("RegistryProxy")
          ).address,
        );
        const financeOperatorSigner = await hre.ethers.getSigner(await registryInstance.financeOperator());
        const tx = await vaultInstance
          .connect(financeOperatorSigner)
          .setValueControlParams(
            expectedUserDepositCapUT,
            expectedMinimumDepositValueUT,
            expectedTotalValueLockedLimitUT,
          );
        await tx.wait(1);
      }
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.SET_VALUE_CONTROL_PARAMS.NAME}: `, error);
      throw error;
    }
  });

// NEWO vault params
//  _userDepositCapUT : 115792089237316195423570985008687907853269984665640564039457584007913129639935
//  _minimumDepositValueUT : 0
//  _totalValueLockedLimitUT : 3000000000000000000000000
