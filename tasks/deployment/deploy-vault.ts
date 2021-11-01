import { task, types } from "hardhat/config";
import { deployVaultWithHash } from "../../helpers/contracts-deployments";
import { getTokenInforWithAddress, unpauseVault } from "../../helpers/contracts-actions";
import { insertContractIntoDB } from "../../helpers/db";
import { isAddress } from "../../helpers/helpers";
import { RISK_PROFILES, ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { DEPLOY_VAULT } from "../task-names";

task(DEPLOY_VAULT, "Deploy Vault")
  .addParam("token", "the address of underlying token", "", types.string)
  .addParam("riskprofilecode", "the code of risk profile", 0, types.int)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("unpause", "unpause vault", false, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ token, riskprofilecode, registry, insertindb, unpause }, hre) => {
    const [owner, admin] = await hre.ethers.getSigners();

    if (token === "") {
      throw new Error("token cannot be empty");
    }

    if (!isAddress(token)) {
      throw new Error("token address is invalid");
    }

    if (RISK_PROFILES.filter(item => item.code === riskprofilecode).length === 0) {
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
      const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      const riskProfile = await registryContract.getRiskProfile(riskprofilecode);
      if (!riskProfile.exists) {
        throw new Error("risk profile does not exist");
      }
      const { name, symbol } = await getTokenInforWithAddress(hre, token);
      console.log(`Deploying ${symbol}-${riskProfile.symbol}-Vault...`);
      const vault = await deployVaultWithHash(hre, registry, token, owner, admin, name, symbol, riskprofilecode);
      console.log(`Deployed ${await vault["vaultProxy"].contract.symbol()}.`);
      console.log(`Vault Address : ${vault["vault"].contract.address}`);
      console.log(`Vault Tx Hash : ${vault["vault"].hash}`);
      console.log(`VaultProxy Address : ${vault["vaultProxy"].contract.address}`);
      console.log(`VaultProxy Tx Hash : ${vault["vaultProxy"].hash}`);
      if (unpause) {
        console.log(`Unpausing Vault...`);
        await unpauseVault(owner, registryContract, vault["vaultProxy"].contract.address, true);
        console.log(`Unpaused Vault.`);
      }
      console.log("----------------");
      if (insertindb) {
        const err = await insertContractIntoDB(`${symbol}-${riskprofilecode}`, vault["vaultProxy"].contract.address);
        if (err !== "") {
          console.log(err);
        }
      }
    } catch (error) {
      console.error(`${DEPLOY_VAULT} : `, error);
      throw error;
    }
  });
