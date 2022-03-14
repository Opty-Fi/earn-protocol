import { task, types } from "hardhat/config";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { isAddress, deployContract, executeFunc } from "../../helpers/helpers";
import TASKS from "../task-names";

task(
  TASKS.DEPLOYMENT_TASKS.DEPLOY_ODEFI_VAULT_BOOSTER.NAME,
  TASKS.DEPLOYMENT_TASKS.DEPLOY_ODEFI_VAULT_BOOSTER.DESCRIPTION,
)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("odefi", "the address of odefi", "", types.string)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .setAction(async ({ deployedonce, registry, odefi }, hre) => {
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
    } catch (error) {
      console.error(`${TASKS.DEPLOYMENT_TASKS.DEPLOY_ODEFI_VAULT_BOOSTER.NAME}: `, error);
      throw error;
    }
  });
