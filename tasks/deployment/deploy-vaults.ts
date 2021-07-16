import { task, types } from "hardhat/config";
import { RISK_PROFILES, TOKENS } from "../../helpers/constants";
import { isAddress } from "../../helpers/helpers";

task("deploy-vaults", "Deploy Core Vaults")
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("riskmanager", "the address of riskManager", "", types.string)
  .addParam("strategymanager", "the address of strategyManager", "", types.string)
  .addParam("optydistributor", "the address of opty Distributor", "", types.string)
  .addParam("unpause", "unpause vault", false, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ registry, riskmanager, strategymanager, optydistributor, insertindb, unpause }, hre) => {
    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (riskmanager === "") {
      throw new Error("riskmanager cannot be empty");
    }

    if (!isAddress(riskmanager)) {
      throw new Error("riskmanager address is invalid");
    }

    if (strategymanager === "") {
      throw new Error("strategymanager cannot be empty");
    }

    if (!isAddress(strategymanager)) {
      throw new Error("strategymanager address is invalid");
    }

    if (optydistributor === "") {
      throw new Error("optydistributor cannot be empty");
    }

    if (!isAddress(optydistributor)) {
      throw new Error("optydistributor address is invalid");
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
          riskmanager: riskmanager,
          strategymanager: strategymanager,
          optydistributor: optydistributor,
          unpause: unpause,
          insertindb: insertindb,
        });
      }
    }
  });
