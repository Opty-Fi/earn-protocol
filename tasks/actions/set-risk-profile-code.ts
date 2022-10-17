import { task, types } from "hardhat/config";
import TASKS from "../task-names";
import { Vault } from "../../typechain";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { isAddress } from "../../helpers/helpers";

task(TASKS.ACTION_TASKS.SET_RISK_PROFILE_CODE.NAME, TASKS.ACTION_TASKS.SET_RISK_PROFILE_CODE.DESCRIPTION)
  .addParam("vault", "the address of vault", "", types.string)
  .addParam("riskProfileCode", "code of the risk profile", "0", types.string)
  .setAction(async ({ vault, riskProfileCode }, { deployments, ethers }) => {
    if (vault === "") {
      throw new Error("vault address cannot be empty");
    }

    if (!isAddress(vault)) {
      throw new Error("vault address is invalid");
    }

    try {
      const vaultInstance = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vault);
      console.log("vault.setRiskProfileCode()");

      console.log("Setting riskProfileCode on vault...");
      console.log("\n");
      const registryInstance = await ethers.getContractAt(
        ESSENTIAL_CONTRACTS.REGISTRY,
        (
          await deployments.get("RegistryProxy")
        ).address,
      );
      const governanceSigner = await ethers.getSigner(await registryInstance.governance());
      const tx = await vaultInstance.connect(governanceSigner).setRiskProfileCode(riskProfileCode);
      await tx.wait(1);
      console.log("riskProfileCode set!");
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.SET_RISK_PROFILE_CODE.NAME}: `, error);
      throw error;
    }
  });
