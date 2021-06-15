import { task, types } from "hardhat/config";
import { getContractInstance, isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { executeFunc } from "../../helpers/helpers";

task("set-vault-step-registry", "Set vaultStepInvestStrategyDefinitionRegistry")
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("vaultstepregistry", "the address of vaultStepInvestStrategyDefinitionRegistry", "", types.string)
  .setAction(async ({ registry, vaultstepregistry }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (vaultstepregistry === "") {
      throw new Error("vaultStepInvestStrategyDefinitionRegistry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (!isAddress(vaultstepregistry)) {
      throw new Error("vaultStepInvestStrategyDefinitionRegistry address is invalid");
    }

    try {
      const registryContract = await getContractInstance(hre, ESSENTIAL_CONTRACTS.REGISTRY, registry);
      await executeFunc(registryContract, owner, "setVaultStepInvestStrategyDefinitionRegistry(address)", [
        vaultstepregistry,
      ]);
      console.log("Set VaultStepInvestStrategyDefinitionRegistry successfully");
    } catch (error) {
      console.log("Got error", error);
    }
  });
