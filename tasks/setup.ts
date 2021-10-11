import { task, types } from "hardhat/config";

import { CONTRACTS } from "../helpers/type";
import { deployEssentialContracts, deployAdapters } from "../helpers/contracts-deployments";
import { insertContractIntoDB } from "../helpers/db";
import { TESTING_CONTRACTS, HARVEST_ADAPTER_NAME } from "../helpers/constants";
import { deployContract } from "../helpers/helpers";
import { SETUP } from "./task-names";

task(SETUP, "Deploy infrastructure, adapter and vault contracts and setup all necessary actions")
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", false, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ deployedonce, insertindb }, hre) => {
    console.log(`\tDeploying Infrastructure contracts ...`);
    const [owner] = await hre.ethers.getSigners();
    const essentialContracts: CONTRACTS = await deployEssentialContracts(hre, owner, deployedonce);
    const essentialContractNames = Object.keys(essentialContracts);
    for (let i = 0; i < essentialContractNames.length; i++) {
      console.log(
        `${essentialContractNames[i].toUpperCase()} address : ${essentialContracts[essentialContractNames[i]].address}`,
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
    console.log(`\tApproving Tokens ...`);

    await hre.run("approve-tokens", {
      registry: essentialContracts["registry"].address,
    });
    console.log("********************");
    console.log(`\tMapping Liquidity Pools to Adapters ...`);

    for (const adapterName in adaptersContracts) {
      await hre.run("map-liquiditypools-adapter", {
        adapter: adaptersContracts[adapterName].address,
        adaptername: adapterName,
        registry: essentialContracts["registry"].address,
      });
    }

    console.log("********************");
    console.log(`\t Setting strategies ...`);
    await hre.run("set-strategies", {
      investstrategyregistry: essentialContracts["investStrategyRegistry"].address,
    });

    console.log("********************");
    console.log(`\tDeploying Core Vault contracts ...`);
    await hre.run("deploy-vaults", {
      registry: essentialContracts["registry"].address,
      riskmanager: essentialContracts["riskManager"].address,
      strategymanager: essentialContracts["strategyManager"].address,
      optydistributor: essentialContracts["optyDistributor"].address,
      unpause: true,
      insertindb: insertindb,
    });

    console.log("********************");
    const erc20Contract = await deployContract(hre, TESTING_CONTRACTS.TEST_DUMMY_TOKEN, deployedonce, owner, [
      "BAL-ODEFI-USDC",
      "BAL-ODEFI-USDC",
      18,
      0,
    ]);
    console.log(`BAL-ODEFI-USDC address : ${erc20Contract.address}`);
    await hre.run("approve-token", {
      registry: essentialContracts["registry"].address,
      token: erc20Contract.address,
    });

    await hre.run("deploy-vault", {
      token: erc20Contract.address,
      riskprofile: "RP0",
      registry: essentialContracts["registry"].address,
      riskmanager: essentialContracts["riskManager"].address,
      strategymanager: essentialContracts["strategyManager"].address,
      optydistributor: essentialContracts["optyDistributor"].address,
      unpause: true,
      insertindb: insertindb,
    });

    console.log("Finished setup task");
  });
