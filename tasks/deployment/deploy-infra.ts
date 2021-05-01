import { task, types } from "hardhat/config";

import { CONTRACTS } from "../../helpers/type";
import {
    deployEssentialContracts,
    deployAdapters,
} from "../../helpers/contracts-deployments";
import {
    approveLiquidityPoolAndMapAdapters,
    approveTokens,
} from "../../helpers/contracts-actions";
import { insertContractIntoDB } from "../../helpers/db";
task("deploy-infra", "Deploy infrastructure contracts")
    .addParam(
        "deployedOnce",
        "allow checking whether contracts were deployed previously",
        true,
        types.boolean
    )
    .setAction(async ({ deployedOnce }, hre) => {
        console.log(`\tDeploying Infrastructure contracts ...`);
        const [owner] = await hre.ethers.getSigners();
        const essentialContracts: CONTRACTS = await deployEssentialContracts(
            hre,
            owner,
            deployedOnce
        );
        const essentialContractNames = Object.keys(essentialContracts);
        for (let i = 0; i < essentialContractNames.length; i++) {
            console.log(
                `${essentialContractNames[i].toUpperCase()} address : ${
                    essentialContracts[essentialContractNames[i]].address
                }`
            );
            const err = await insertContractIntoDB(
                essentialContractNames[i],
                essentialContracts[essentialContractNames[i]].address
            );
            if (err !== "") {
                console.log(err);
            }
        }
        console.log(`\tDeploying Adapter contracts ...`);
        const adaptersContracts: CONTRACTS = await deployAdapters(
            hre,
            owner,
            essentialContracts["registry"].address,
            essentialContracts["harvestCodeProvider"].address,
            deployedOnce
        );
        const adapterContractNames = Object.keys(adaptersContracts);
        for (let i = 0; i < adapterContractNames.length; i++) {
            console.log(
                `${adapterContractNames[i].toUpperCase()} address : ${
                    adaptersContracts[adapterContractNames[i]].address
                }`
            );
            const err = await insertContractIntoDB(
                adapterContractNames[i],
                adaptersContracts[adapterContractNames[i]].address
            );
            if (err !== "") {
                console.log(err);
            }
        }
        await approveTokens(owner, essentialContracts["registry"]);
        await approveLiquidityPoolAndMapAdapters(
            owner,
            essentialContracts["registry"],
            adaptersContracts
        );

        console.log(`\tDeploying Core Vault contracts ...`);
        await hre.run("deploy-vaults", {
            registry: essentialContracts["registry"].address,
            riskmanager: essentialContracts["riskManager"].address,
            strategymanager: essentialContracts["strategyManager"].address,
            optyminter: essentialContracts["optyMinter"].address,
        });
    });
