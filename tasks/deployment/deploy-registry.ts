import { task, types } from "hardhat/config";
import { deployRegistry } from "../../helpers/contracts-deployments";
import { insertContractIntoDB } from "../../helpers/db";
import { deployContract, executeFunc } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";

task("deploy-registry", "Deploy Registry")
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ deployedonce, insertindb }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    const registry = await deployRegistry(hre, owner, deployedonce);

    const vaultStepInvestStrategyDefinitionRegistry = await deployContract(
      hre,
      ESSENTIAL_CONTRACTS.VAULT_STEP_INVEST_STRATEGY_DEFINITION_REGISTRY,
      deployedonce,
      owner,
      [registry.address],
    );

    await executeFunc(registry, owner, "setVaultStepInvestStrategyDefinitionRegistry(address)", [
      vaultStepInvestStrategyDefinitionRegistry.address,
    ]);

    console.log(`Contract registry : ${registry.address}`);

    console.log(
      `Contract vaultStepInvestStrategyDefinitionRegistry: ${vaultStepInvestStrategyDefinitionRegistry.address}`,
    );

    if (insertindb) {
      let err = await insertContractIntoDB(`registry`, registry.address);
      if (err !== "") {
        console.log(err);
      }
      err = await insertContractIntoDB(
        `vaultStepInvestStrategyDefinitionRegistry`,
        vaultStepInvestStrategyDefinitionRegistry.address,
      );
    }
  });
