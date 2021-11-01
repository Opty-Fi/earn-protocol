import { task, types } from "hardhat/config";
import { deployVaultWithHash } from "../../helpers/contracts-deployments";
import { getTokenInforWithAddress, unpauseVault } from "../../helpers/contracts-actions";
import { insertContractIntoDB } from "../../helpers/db";
import { isAddress } from "../../helpers/helpers";
import { RISK_PROFILES } from "../../helpers/constants/contracts-data";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { DEPLOY_VAULT } from "../task-names";

task(DEPLOY_VAULT, "Deploy Vault")
  .addParam("token", "the address of underlying token", "", types.string)
  .addParam("riskprofile", "the address of underlying token", "", types.string)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("unpause", "unpause vault", false, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ token, riskprofile, registry, insertindb, unpause }, hre) => {
    const [owner, admin] = await hre.ethers.getSigners();

    if (token === "") {
      throw new Error("token cannot be empty");
    }

    if (!isAddress(token)) {
      throw new Error("token address is invalid");
    }

    if (riskprofile === "") {
      throw new Error("riskProfile cannot be empty");
    }

    if (!Object.keys(RISK_PROFILES).includes(riskprofile)) {
      throw new Error("riskProfile is invalid");
    }

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    try {
      console.log("----------------");
      const { name, symbol } = await getTokenInforWithAddress(hre, token);
      console.log(`Deploying ${symbol}-${riskprofile}-Vault...`);
      const vault = await deployVaultWithHash(hre, registry, token, owner, admin, name, symbol, riskprofile);
      console.log(`Deployed ${await vault["vaultProxy"].contract.symbol()}.`);
      console.log(`Vault Address : ${vault["vault"].contract.address}`);
      console.log(`Vault Tx Hash : ${vault["vault"].hash}`);
      console.log(`VaultProxy Address : ${vault["vaultProxy"].contract.address}`);
      console.log(`VaultProxy Tx Hash : ${vault["vaultProxy"].hash}`);
      const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      if (unpause) {
        console.log(`Unpausing Vault...`);
        await unpauseVault(owner, registryContract, vault["vaultProxy"].contract.address, true);
        console.log(`Unpaused Vault.`);
      }
      console.log("----------------");
      if (insertindb) {
        const err = await insertContractIntoDB(`${symbol}-${riskprofile}`, vault["vaultProxy"].contract.address);
        if (err !== "") {
          console.log(err);
        }
      }
    } catch (error) {
      console.error(`${DEPLOY_VAULT} : `, error);
      throw error;
    }
  });
