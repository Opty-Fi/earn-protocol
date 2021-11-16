import { task, types } from "hardhat/config";
import { RISK_PROFILES } from "../../helpers/constants/contracts-data";
import { VAULT_TOKENS } from "../../helpers/constants/tokens";
import { isAddress } from "../../helpers/helpers";
import { DEPLOY_VAULT, DEPLOY_VAULTS } from "../task-names";

task(DEPLOY_VAULTS, "Deploy Core Vaults")
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("unpause", "unpause vault", false, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ registry, insertindb, unpause }, hre) => {
    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    try {
      console.log("Deploying Vaults...");
      for (const token in VAULT_TOKENS) {
        if (token === "CHI") {
          continue;
        }
        for (const riskProfile of RISK_PROFILES) {
          await hre.run(DEPLOY_VAULT, {
            token: VAULT_TOKENS[token],
            riskprofilecode: riskProfile.code,
            registry: registry,
            unpause: unpause,
            insertindb: insertindb,
          });
        }
      }
      console.log("Finished deploying vaults");
    } catch (error) {
      console.error(`${DEPLOY_VAULTS}: `, error);
      throw error;
    }
  });
