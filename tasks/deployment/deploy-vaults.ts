import { task, types } from "hardhat/config";
import { RISK_PROFILES, TOKENS } from "../../helpers/constants";
import { isAddress } from "../../helpers/helpers";

task("deploy-vaults", "Deploy Core Vaults")
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("riskmanager", "the address of riskManager", "", types.string)
  .addParam("strategymanager", "the address of strategyManager", "", types.string)
  .addParam("optyminter", "the address of opty Minter", "", types.string)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ registry, riskmanager, strategymanager, optyminter, insertindb }, hre) => {
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

    if (optyminter === "") {
      throw new Error("optyminter cannot be empty");
    }

    if (!isAddress(optyminter)) {
      throw new Error("optyminter address is invalid");
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
          optyminter: optyminter,
          insertindb: insertindb,
        });
      }
    }
  });
