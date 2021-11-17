import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { RISK_PROFILES } from "../../helpers/constants/contracts-data";
import { addRiskProfile } from "../../helpers/contracts-actions";
import { ADD_RISK_PROFILE } from "../task-names";

task(ADD_RISK_PROFILE, "Add Risk Profile")
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("riskprofilecode", "the code of risk profile", 0, types.int)
  .addParam("name", "the name of risk profile", "", types.string)
  .addParam("symbol", "the symbol of risk profile", "", types.string)
  .addParam("canborrow", "whether risk profile can borrow or not", false, types.boolean)
  .addParam("lowestrating", "the lowest rating", 0, types.int)
  .addParam("highestrating", "the highest rating", 0, types.int)
  .setAction(async ({ riskprofilecode, name, symbol, canborrow, lowestrating, highestrating, registry }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (name === "") {
      throw new Error("name cannot be empty");
    }

    if (symbol === "") {
      throw new Error("symbol cannot be empty");
    }

    if (highestrating < lowestrating) {
      throw new Error("rating range is invalid");
    }

    if (RISK_PROFILES.filter(item => item.code === riskprofilecode).length === 0) {
      throw new Error("risk profile is not available");
    }

    try {
      const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      await addRiskProfile(registryContract, owner, riskprofilecode, name, symbol, canborrow, [
        lowestrating,
        highestrating,
      ]);
      console.log("Finished adding risk profile : ", name);
    } catch (error) {
      console.error(`${ADD_RISK_PROFILE}: `, error);
      throw error;
    }
  });
