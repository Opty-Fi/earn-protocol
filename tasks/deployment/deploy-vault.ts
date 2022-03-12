import { task, types } from "hardhat/config";
import { deployVaultWithHash } from "../../helpers/contracts-deployments";
import { getTokenInforWithAddress, unpauseVault } from "../../helpers/contracts-actions";
import { isAddress } from "../../helpers/helpers";
import { RISK_PROFILES } from "../../helpers/constants/contracts-data";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import TASKS from "../task-names";

task(TASKS.DEPLOYMENT_TASKS.DEPLOY_VAULT.NAME, TASKS.DEPLOYMENT_TASKS.DEPLOY_VAULT.DESCRIPTION)
  .addParam("token", "the address of underlying token", "", types.string)
  .addParam("riskprofilecode", "the code of risk profile", 0, types.int)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("unpause", "unpause vault", false, types.boolean)
  .setAction(async ({ token, riskprofilecode, registry, unpause }, hre) => {
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
    } catch (error) {
      console.error(`${TASKS.DEPLOYMENT_TASKS.DEPLOY_VAULT.NAME} : `, error);
      throw error;
    }
  });
