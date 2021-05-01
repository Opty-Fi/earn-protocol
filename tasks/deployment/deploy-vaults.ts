import { task, types } from "hardhat/config";
import { CONTRACTS } from "../../helpers/type";
import { deployVaults } from "../../helpers/contracts-deployments";
import { insertContractIntoDB } from "../../helpers/db";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { getExistingContractAddress } from "../../helpers/helpers";
task("deploy-vaults", "Deploy Core Vaults")
    .addParam("registry", "the address of registry", "", types.string)
    .addParam("riskmanager", "the address of riskManager", "", types.string)
    .addParam("strategymanager", "the address of strategyManager", "", types.string)
    .addParam("optyminter", "the address of opty Minter", "", types.string)
    .setAction(async ({ registry, riskmanager, strategymanager, optyminter }, hre) => {
        const [owner, admin] = await hre.ethers.getSigners();
        registry =
            registry === ""
                ? await getExistingContractAddress(
                      hre,
                      ESSENTIAL_CONTRACTS.REGISTRY_PROXY
                  )
                : registry;
        riskmanager =
            riskmanager === ""
                ? await getExistingContractAddress(
                      hre,
                      ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY
                  )
                : riskmanager;
        strategymanager =
            strategymanager === ""
                ? await getExistingContractAddress(
                      hre,
                      ESSENTIAL_CONTRACTS.STRATEGY_MANAGER
                  )
                : strategymanager;
        optyminter =
            optyminter === ""
                ? await getExistingContractAddress(hre, ESSENTIAL_CONTRACTS.OPTY_MINTER)
                : optyminter;
        if (
            registry === "" ||
            riskmanager === "" ||
            strategymanager === "" ||
            optyminter === ""
        ) {
            throw new Error("Contracts were not deployed or set up properly");
        }
        const vaults: CONTRACTS = await deployVaults(
            hre,
            registry,
            riskmanager,
            strategymanager,
            optyminter,
            owner,
            admin,
            false
        );
        const vaultNames = Object.keys(vaults);
        for (let i = 0; i < vaultNames.length; i++) {
            console.log(
                `${vaultNames[i].toUpperCase()} address : ${
                    vaults[vaultNames[i]].address
                }`
            );
            const err = await insertContractIntoDB(
                vaultNames[i],
                vaults[vaultNames[i]].address
            );
            if (err !== "") {
                console.log(err);
            }
        }
    });
