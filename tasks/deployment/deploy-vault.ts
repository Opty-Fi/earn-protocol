import { task, types } from "hardhat/config";
import { deployVault } from "../../helpers/contracts-deployments";
import { getTokenInforWithAddress } from "../../helpers/contracts-actions";
import { insertContractIntoDB } from "../../helpers/db";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { getExistingContractAddress } from "../../helpers/helpers";
task("deploy-vault", "Deploy Vault")
    .addParam("token", "the address of underlying token", "", types.string)
    .addParam("riskprofile", "the address of underlying token", "", types.string)
    .addParam("registry", "the address of registry", "", types.string)
    .addParam("riskmanager", "the address of riskManager", "", types.string)
    .addParam("strategymanager", "the address of strategyManager", "", types.string)
    .addParam("optyminter", "the address of opty Minter", "", types.string)
    .setAction(
        async (
            { token, riskprofile, registry, riskmanager, strategymanager, optyminter },
            hre
        ) => {
            const [owner, admin] = await hre.ethers.getSigners();
            if (token === "") {
                throw new Error("token cannot be empty");
            }

            if (riskprofile === "") {
                throw new Error("riskProfile cannot be empty");
            }
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
                    ? await getExistingContractAddress(
                          hre,
                          ESSENTIAL_CONTRACTS.OPTY_MINTER
                      )
                    : optyminter;
            if (
                registry === "" ||
                riskmanager === "" ||
                strategymanager === "" ||
                optyminter === ""
            ) {
                throw new Error("Contracts were not deployed or set up properly");
            }
            const { name, symbol } = await getTokenInforWithAddress(hre, token);
            const vault = await deployVault(
                hre,
                registry,
                riskmanager,
                strategymanager,
                optyminter,
                token,
                owner,
                admin,
                name,
                symbol,
                riskprofile,
                false
            );
            console.log(`Contract ${symbol}-${riskprofile}: ${vault.address}`);
            const err = await insertContractIntoDB(
                `${symbol}-${riskprofile}`,
                vault.address
            );
            if (err !== "") {
                console.log(err);
            }
        }
    );
