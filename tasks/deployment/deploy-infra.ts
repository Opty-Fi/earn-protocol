import { task } from "hardhat/config";
import { CONTRACTS } from "../../helpers/type";
import {
    deployEssentialContracts,
    deployAdapters,
    approveLiquidityPoolAndMapAdapters,
    approveTokens,
} from "../../helpers/contracts-deployments";
task("deploy-infra", "Deploy infrastructure contracts").setAction(async (_, hre) => {
    await hre.run("set-DRE");
    console.log(`\tDeploying Infrastructure contracts ...`);
    const essentialContracts: CONTRACTS = await deployEssentialContracts();
    const essentialContractNames = Object.keys(essentialContracts);
    for (let i = 0; i < essentialContractNames.length; i++) {
        console.log(
            `${essentialContractNames[i].toUpperCase()} address : ${
                essentialContracts[essentialContractNames[i]].address
            }`
        );
    }
    console.log(`\tDeploying Adapter contracts ...`);
    const adaptersContracts: CONTRACTS = await deployAdapters(
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
    }
    await approveTokens();
    await approveLiquidityPoolAndMapAdapters(
        essentialContracts["registry"],
        adaptersContracts
    );
});
