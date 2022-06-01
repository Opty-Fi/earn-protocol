import { task, types } from "hardhat/config";
import { isAddress } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import TASKS from "../task-names";
import { Registry, Vault } from "../../typechain";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";

task(TASKS.ACTION_TASKS.SET_VAULT_CONFIGURATION.NAME, TASKS.ACTION_TASKS.SET_VAULT_CONFIGURATION.DESCRIPTION)
  .addParam("vault", "vault address", "", types.string)
  .addParam("vaultConfiguration", "vault configuration", "", types.string)
  .setAction(async ({ vault, vaultConfiguration }, hre) => {
    if (vault === "") {
      throw new Error("vault cannot be empty");
    }
    if (!isAddress(vault)) {
      throw new Error("vault address is invalid");
    }
    try {
      const vaultInstance = <Vault>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vault);
      const actualVaultConfiguration = await vaultInstance.vaultConfiguration();
      if (BigNumber.from(actualVaultConfiguration).eq(BigNumber.from(vaultConfiguration))) {
        console.log("Vault configuration is as expected");
      } else {
        const registryInstance = <Registry>(
          await hre.ethers.getContractAt(
            ESSENTIAL_CONTRACTS.REGISTRY,
            await (
              await hre.deployments.get("RegistryProxy")
            ).address,
          )
        );
        const governanceSigner = await hre.ethers.getSigner(await registryInstance.getGovernance());
        const tx = await vaultInstance.connect(governanceSigner).setVaultConfiguration(vaultConfiguration);
        await tx.wait(1);
      }
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.SET_VAULT_CONFIGURATION.NAME}: `, error);
      throw error;
    }
  });

// NEWO vault configuration
// (0-15) Deposit fee UT = 0 UT = 0000
// (16-31) Deposit fee % = 0% = 0000
// (32-47) Withdrawal fee UT = 0 UT = 0000
// (48-63) Withdrawal fee % = 0% = 0000
// (64-79) Max vault value jump % = 0.5% = 0032
// (80-239) vault fee address = 6bd60f089B6E8BA75c409a54CDea34AA511277f6
// (240-247) risk profile code = 2 = 02
// (248) emergency shutdown = false = 0
// (249) unpause = true = 1
// (250) allow whitelisted state = true = 1
// (251) - 0
// (252) - 0
// (253) - 0
// (254) - 0
// (255) - 0
// 0x06026bd60f089B6E8BA75c409a54CDea34AA511277f600320000000000000000
// 2718155043500073612906634403139041842518004532954031278126931986324444413952
