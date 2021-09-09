import { task, types } from "hardhat/config";
import { insertContractIntoDB } from "../../helpers/db";
import { deployContract, getContractInstance, executeFunc } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { DEPLOY_VAULT_STEP_REGISTRY } from "../task-names";

task(DEPLOY_VAULT_STEP_REGISTRY, "Deploy VaultStepInvestStrategyDefinitionRegistry")
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ registry, deployedonce, insertindb }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    const vaultStepInvestStrategyDefinitionRegistry = await deployContract(
      hre,
      ESSENTIAL_CONTRACTS.VAULT_STEP_INVEST_STRATEGY_DEFINITION_REGISTRY,
      deployedonce,
      owner,
      [registry],
    );

    console.log(
      `Contract vaultStepInvestStrategyDefinitionRegistry: ${vaultStepInvestStrategyDefinitionRegistry.address}`,
    );

    const registryContract = await getContractInstance(hre, ESSENTIAL_CONTRACTS.REGISTRY, registry);

    await executeFunc(registryContract, owner, "setVaultStepInvestStrategyDefinitionRegistry(address)", [
      vaultStepInvestStrategyDefinitionRegistry.address,
    ]);

    if (insertindb) {
      const err = await insertContractIntoDB(
        `vaultStepInvestStrategyDefinitionRegistry`,
        vaultStepInvestStrategyDefinitionRegistry.address,
      );
      if (err !== "") {
        console.log(err);
      }
    }
  });
