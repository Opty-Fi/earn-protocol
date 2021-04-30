import { task } from "hardhat/config";
import { CONTRACTS, CONTRACTS_WITH_HASH } from "../../helpers/type";
import {
    deployEssentialContracts,
    deployAdapters,
    deployVaultsWithHash,
} from "../../helpers/contracts-deployments";
import {
    approveLiquidityPoolAndMapAdapters,
    approveTokens,
} from "../../helpers/contracts-actions";
import { insertVaultIntoDB, insertContractIntoDB } from "../../helpers/db";
task("deploy-infra", "Deploy infrastructure contracts").setAction(async (_, hre) => {
    console.log(`\tDeploying Infrastructure contracts ...`);
    const [owner, admin] = await hre.ethers.getSigners();
    const essentialContracts: CONTRACTS = await deployEssentialContracts(hre, owner);
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
        essentialContracts["harvestCodeProvider"].address
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
    const vaults: CONTRACTS_WITH_HASH = await deployVaultsWithHash(
        hre,
        essentialContracts["registry"].address,
        essentialContracts["riskManager"].address,
        essentialContracts["strategyManager"].address,
        essentialContracts["optyMinter"].address,
        owner,
        admin
    );
    const vaultNames = Object.keys(vaults);
    for (let i = 0; i < vaultNames.length; i++) {
        console.log(
            `${vaultNames[i].toUpperCase()} address : ${
                vaults[vaultNames[i]].contract.address
            }`
        );
        const err = await insertVaultIntoDB(vaults[vaultNames[i]].hash);
        if (err !== "") {
            console.log(err);
        }
    }
});
