import { task, types } from "hardhat/config";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { RISK_PROFILES } from "../../helpers/constants/contracts-data";
import { addRiskProfile } from "../../helpers/contracts-actions";
import TASKS from "../task-names";
import { Registry } from "../../typechain";

task(TASKS.ACTION_TASKS.ADD_RISK_PROFILE.NAME, TASKS.ACTION_TASKS.ADD_RISK_PROFILE.DESCRIPTION)
  .addParam("riskProfileCode", "the code of risk profile", 0, types.int)
  .addParam("name", "the name of risk profile", "", types.string)
  .addParam("symbol", "the symbol of risk profile", "", types.string)
  .addParam("canBorrow", "whether risk profile can borrow or not", false, types.boolean)
  .addParam("lowestRating", "the lowest rating", 0, types.int)
  .addParam("highestRating", "the highest rating", 0, types.int)
  .setAction(async ({ riskProfileCode, name, symbol, canBorrow, lowestRating, highestRating }, hre) => {
    if (name === "") {
      throw new Error("name cannot be empty");
    }

    if (symbol === "") {
      throw new Error("symbol cannot be empty");
    }

    if (highestRating < lowestRating) {
      throw new Error("rating range is invalid");
    }

    if (RISK_PROFILES.filter(item => item.code === riskProfileCode).length === 0) {
      throw new Error("risk profile is not available");
    }

    try {
      const registryInstance = <Registry>(
        await hre.ethers.getContractAt(
          ESSENTIAL_CONTRACTS.REGISTRY,
          (
            await hre.deployments.get("RegistryProxy")
          ).address,
        )
      );
      const riskOperator = await hre.ethers.getSigner(await registryInstance.getRiskOperator());
      await addRiskProfile(registryInstance, riskOperator, riskProfileCode, name, symbol, canBorrow, [
        lowestRating,
        highestRating,
      ]);
      console.log("Finished adding risk profile : ", name);
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.ADD_RISK_PROFILE.NAME}: `, error);
      throw error;
    }
  });
