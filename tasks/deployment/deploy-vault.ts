import { task, types } from "hardhat/config";
import { deployVaultWithHash } from "../../helpers/contracts-deployments";
import { getTokenInforWithAddress, unpauseVault } from "../../helpers/contracts-actions";
import { isAddress } from "../../helpers/helpers";
import { RISK_PROFILES } from "../../helpers/constants/contracts-data";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import TASKS from "../task-names";

task(TASKS.DEPLOYMENT_TASKS.DEPLOY_VAULT.NAME, TASKS.DEPLOYMENT_TASKS.DEPLOY_VAULT.DESCRIPTION)
  .addParam("vaultName", "the vault's name", "", types.string)
  .addParam("token", "the address of underlying token", "", types.string)
  .addParam("riskProfileCode", "the code of risk profile", 0, types.int)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("strategyManager", "the address of StrategyManager library", "", types.string)
  .addParam("claimAndHarvest", "the address of ClaimAndHarvest library", "", types.string)
  .addParam("whitelistedCodesRoot", "whitelisted contracts root hash", "", types.string)
  .addParam("whitelistedAccountsRoot", "whitelisted accounts root hash", "", types.string)
  .addParam("vaultConfiguration", "bit banging value for vault config", "", types.string)
  .addParam("userDepositCapUt", "the maximum amount in underlying token allowed to be deposited by user", "", types.int)
  .addParam("minimumDepositValueUt", "the minimum deposit value in underlying token required", "", types.int)
  .addParam("totalValueLockedLimitUt", "the maximum TVL in underlying token allowed for the vault", "", types.int)
  .addParam("unpause", "unpause vault", false, types.boolean)
  .setAction(
    async (
      {
        vaultName,
        token,
        riskProfileCode,
        registry,
        strategyManager,
        claimAndHarvest,
        unpause,
        whitelistedCodesRoot,
        whitelistedAccountsRoot,
        vaultConfiguration,
        userDepositCapUt,
        minimumDepositValueUt,
        totalValueLockedLimitUt,
      },
      hre,
    ) => {
      const [owner, admin] = await hre.ethers.getSigners();

      if (vaultName === "") {
        throw new Error("vaultName cannot be empty");
      }

      if (token === "") {
        throw new Error("token cannot be empty");
      }

      if (!isAddress(token)) {
        throw new Error("token address is invalid");
      }

      if (RISK_PROFILES.filter(item => item.code === riskProfileCode).length === 0) {
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
        const riskProfile = await registryContract.getRiskProfile(riskProfileCode);
        if (!riskProfile.exists) {
          throw new Error("risk profile does not exist");
        }
        const { name, symbol } = await getTokenInforWithAddress(hre, token);

        console.log(`Deploying Vault: ${vaultName}...`);
        const vault = await deployVaultWithHash(
          hre,
          vaultName,
          registry,
          strategyManager,
          claimAndHarvest,
          token,
          whitelistedCodesRoot,
          whitelistedAccountsRoot,
          vaultConfiguration,
          userDepositCapUt,
          minimumDepositValueUt,
          totalValueLockedLimitUt,
          owner,
          admin,
          name,
          symbol,
          riskProfileCode,
        );
        console.log(`Deployed ${vaultName}.`);
        console.log(`VaultProxy Address : ${vault.contract.address}`);
        console.log(`VaultProxy Tx Hash : ${vault.hash}`);
        if (unpause) {
          console.log(`Unpausing Vault...`);
          await unpauseVault(owner, registryContract, vault.contract.address, true);
          console.log(`Unpaused Vault.`);
        }
        console.log("----------------");
      } catch (error) {
        console.error(`${TASKS.DEPLOYMENT_TASKS.DEPLOY_VAULT.NAME} : `, error);
        throw error;
      }
    },
  );
