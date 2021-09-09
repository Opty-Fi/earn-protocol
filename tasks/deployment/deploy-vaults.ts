import { task, types } from "hardhat/config";
import { RISK_PROFILES, TOKENS } from "../../helpers/constants";
import { isAddress } from "../../helpers/helpers";
import { DEPLOY_VAULTS } from "../task-names";

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

    for (const token in TOKENS) {
      if (token === "CHI") {
        continue;
      }
      for (const riskProfile of Object.keys(RISK_PROFILES)) {
        await hre.run("deploy-vault", {
          token: TOKENS[token],
          riskprofile: riskProfile,
          registry: registry,
          unpause: unpause,
          insertindb: insertindb,
        });
      }
    }

    console.log("Finished deploying vaults");
  });
