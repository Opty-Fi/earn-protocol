import { task, types } from "hardhat/config";
import { insertContractIntoDB } from "../../helpers/db";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { deployAndSetupOptyStakingVaults } from "../../helpers/contracts-deployments";
import { isAddress } from "../../helpers/helpers";
import { DEPLOY_OPTY_STAKING_VAULTS } from "../task-names";

task(DEPLOY_OPTY_STAKING_VAULTS, "Deploy Opty Staking Vault")
  .addParam("opty", "the address of opty", "", types.string)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("optydistributor", "the address of optyDistributor", "", types.string)
  .addParam("optystakingratebalancer", "the address of optyStakingRateBalancer", "", types.string)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ deployedonce, insertindb, registry, opty, optydistributor, optystakingratebalancer }, hre) => {
    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (opty === "") {
      throw new Error("opty cannot be empty");
    }

    if (!isAddress(opty)) {
      throw new Error("opty address is invalid");
    }

    if (optydistributor === "") {
      throw new Error("optyDistributor cannot be empty");
    }

    if (!isAddress(optydistributor)) {
      throw new Error("optyDistributor address is invalid");
    }

    if (optystakingratebalancer === "") {
      throw new Error("optyStakingRateBalancer cannot be empty");
    }

    if (!isAddress(optystakingratebalancer)) {
      throw new Error("optyStakingRateBalancer address is invalid");
    }

    try {
      const [owner] = await hre.ethers.getSigners();
      console.log("Deploying OPTYStakingRateBalancer...");
      const optyDistributorInstance = await hre.ethers.getContractAt(
        ESSENTIAL_CONTRACTS.OPTY_DISTRIBUTOR,
        optydistributor,
      );
      const optyStakingRateBalancerInstance = await hre.ethers.getContractAt(
        ESSENTIAL_CONTRACTS.OPTY_STAKING_RATE_BALANCER,
        optydistributor,
      );
      console.log("Deployed OPTYStakingRateBalancer");
      console.log("Deploying and configuring OPTYStakingVaults...");
      const optyStakingVaults = await deployAndSetupOptyStakingVaults(
        hre,
        owner,
        deployedonce,
        registry,
        opty,
        optyStakingRateBalancerInstance,
        optyDistributorInstance,
      );
      console.log("Finished deploying and configuring OPTYStakingVaults");
      console.log(`OPTYStakingVault1D: ${optyStakingVaults["optyStakingVault1D"].address}`);
      console.log(`OPTYStakingVault30D: ${optyStakingVaults["optyStakingVault30D"].address}`);
      console.log(`OPTYStakingVault60D: ${optyStakingVaults["optyStakingVault60D"].address}`);
      console.log(`OPTYStakingVault180D: ${optyStakingVaults["optyStakingVault180D"].address}`);

      if (insertindb) {
        let err = await insertContractIntoDB(`OPTYStakingVault1D`, optyStakingVaults["optyStakingVault1D"].address);
        err = await insertContractIntoDB(`OPTYStakingVault30D`, optyStakingVaults["optyStakingVault30D"].address);
        err = await insertContractIntoDB(`OPTYStakingVault60D`, optyStakingVaults["optyStakingVault60D"].address);
        err = await insertContractIntoDB(`OPTYStakingVault180D`, optyStakingVaults["optyStakingVault180D"].address);
        if (err !== "") {
          throw err;
        }
      }
    } catch (error) {
      console.error(`${DEPLOY_OPTY_STAKING_VAULTS}: `, error);
      throw error;
    }
  });
