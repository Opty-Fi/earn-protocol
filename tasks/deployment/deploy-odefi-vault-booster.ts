import { task, types } from "hardhat/config";
import { insertContractIntoDB } from "../../helpers/db";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { isAddress, deployContract, executeFunc } from "../../helpers/helpers";
import { DEPLOY_ODEFI_VAULT_BOOSTER } from "../task-names";

task(DEPLOY_ODEFI_VAULT_BOOSTER, "Deploy Odefi Vault Booster")
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("odefi", "the address of odefi", "", types.string)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ deployedonce, insertindb, registry, odefi }, hre) => {
    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (odefi === "") {
      throw new Error("odefi cannot be empty");
    }

    if (!isAddress(odefi)) {
      throw new Error("odefi address is invalid");
    }

    try {
      const [owner] = await hre.ethers.getSigners();
      console.log("Deploying ODEFIVaultBooster...");
      const odefiVaultBooster = await deployContract(
        hre,
        ESSENTIAL_CONTRACTS.ODEFI_VAULT_BOOSTER,
        deployedonce,
        owner,
        [registry, odefi],
      );
      console.log("Finished deploying ODEFIVaultBooster");
      console.log(`Contract ODEFIVaultBooster : ${odefiVaultBooster.address}`);
      console.log("Registering ODEFIVaultBooster...");
      const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      await executeFunc(registryContract, owner, "setODEFIVaultBooster(address)", [odefiVaultBooster.address]);
      console.log("Registered ODEFIVaultBooster.");
      if (insertindb) {
        const err = await insertContractIntoDB(`odefiVaultBooster`, odefiVaultBooster.address);
        if (err !== "") {
          throw err;
        }
      }
    } catch (error) {
      console.error(`${DEPLOY_ODEFI_VAULT_BOOSTER}: `, error);
      throw error;
    }
  });
