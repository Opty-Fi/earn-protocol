import { task, types } from "hardhat/config";

import { CONTRACTS } from "../helpers/type";
import { deployEssentialContracts, deployAdapters } from "../helpers/contracts-deployments";
import { insertContractIntoDB } from "../helpers/db";
import { TESTING_CONTRACTS } from "../helpers/constants/test-contracts-name";
import { deployContract } from "../helpers/helpers";
import TASKS from "./task-names";

task(TASKS.SETUP.NAME, TASKS.SETUP.DESCRIPTION)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", false, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ deployedonce, insertindb }, hre) => {
    console.log(`\tDeploying Infrastructure contracts ...`);
    const [owner] = await hre.ethers.getSigners();
    let essentialContracts: CONTRACTS;
    const { APPROVE_TOKEN, APPROVE_TOKENS, MAP_LIQUIDITYPOOLS_ADAPTER, SET_STRATEGIES } = TASKS.ACTION_TASKS;
    const { DEPLOY_VAULT, DEPLOY_VAULTS } = TASKS.DEPLOYMENT_TASKS;
    try {
      essentialContracts = await deployEssentialContracts(hre, owner, deployedonce);
      const essentialContractNames = Object.keys(essentialContracts);
      for (let i = 0; i < essentialContractNames.length; i++) {
        console.log(
          `${essentialContractNames[i].toUpperCase()} address : ${
            essentialContracts[essentialContractNames[i]].address
          }`,
        );
        if (insertindb) {
          const err = await insertContractIntoDB(
            essentialContractNames[i],
            essentialContracts[essentialContractNames[i]].address,
          );
          if (err !== "") {
            console.log(err);
          }
        }
      }
      console.log("********************");
    } catch (error) {
      console.error(`deployEssentialContracts: `, error);
      throw error;
    }
    console.log(`\tDeploying Adapter contracts ...`);
    const adaptersContracts: CONTRACTS = await deployAdapters(
      hre,
      owner,
      essentialContracts["registry"].address,
      deployedonce,
    );
    const adapterContractNames = Object.keys(adaptersContracts);
    for (let i = 0; i < adapterContractNames.length; i++) {
      console.log(
        `${adapterContractNames[i].toUpperCase()} address : ${adaptersContracts[adapterContractNames[i]].address}`,
      );
      if (insertindb) {
        const err = await insertContractIntoDB(
          adapterContractNames[i],
          adaptersContracts[adapterContractNames[i]].address,
        );
        if (err !== "") {
          console.log(err);
        }
      }
    }
    console.log("********************");
    console.log(`\tApproving Tokens...`);

    await hre.run(APPROVE_TOKENS.NAME, {
      registry: essentialContracts["registry"].address,
    });
    console.log("********************");
    console.log(`\tMapping Liquidity Pools to Adapters ...`);

    for (const adapterName in adaptersContracts) {
      await hre.run(MAP_LIQUIDITYPOOLS_ADAPTER.NAME, {
        adapter: adaptersContracts[adapterName].address,
        adaptername: adapterName,
        registry: essentialContracts["registry"].address,
      });
    }

    console.log("********************");
    console.log(`\t Setting strategies ...`);
    await hre.run(SET_STRATEGIES.NAME, {
      investstrategyregistry: essentialContracts["investStrategyRegistry"].address,
    });

    console.log("********************");
    console.log(`\tDeploying Core Vault contracts ...`);
    await hre.run(DEPLOY_VAULTS.NAME, {
      registry: essentialContracts["registry"].address,
      riskmanager: essentialContracts["riskManager"].address,
      strategymanager: essentialContracts["strategyManager"].address,
      optydistributor: essentialContracts["optyDistributor"].address,
      unpause: true,
      insertindb: insertindb,
    });

    console.log("********************");
    const balOdefiUSDCInstance = await deployContract(hre, TESTING_CONTRACTS.TEST_DUMMY_TOKEN, deployedonce, owner, [
      "BAL-ODEFI-USDC",
      "BAL-ODEFI-USDC",
      18,
      0,
    ]);
    console.log(`BAL-ODEFI-USDC address : ${balOdefiUSDCInstance.address}`);
    await hre.run(APPROVE_TOKEN.NAME, {
      registry: essentialContracts["registry"].address,
      token: balOdefiUSDCInstance.address,
    });

    await hre.run(DEPLOY_VAULT.NAME, {
      token: balOdefiUSDCInstance.address,
      riskprofilecode: 0,
      registry: essentialContracts["registry"].address,
      riskmanager: essentialContracts["riskManager"].address,
      strategymanager: essentialContracts["strategyManager"].address,
      optydistributor: essentialContracts["optyDistributor"].address,
      unpause: true,
      insertindb: insertindb,
    });

    console.log("Finished setup task");
  });
