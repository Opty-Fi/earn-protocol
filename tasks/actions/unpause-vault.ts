import { task, types } from "hardhat/config";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { Registry, Registry__factory, Vault, Vault__factory } from "../../typechain";
import TASKS from "../task-names";

task(TASKS.ACTION_TASKS.UNPAUSE_VAULT.NAME, TASKS.ACTION_TASKS.UNPAUSE_VAULT.DESCRIPTION)
  .addParam("vaultSymbol", "the vault symbol", "", types.string)
  .addParam("state", "true or false", "", types.boolean)
  .setAction(async ({ vaultSymbol, state }, { deployments, ethers }) => {
    try {
      const vaultAddress = await (await deployments.get(vaultSymbol)).address;
      const vaultInstance = <Vault>await ethers.getContractAt(Vault__factory.abi, vaultAddress);
      const registryContract = <Registry>(
        await ethers.getContractAt(Registry__factory.abi, await vaultInstance.registryContract())
      );
      const governanceSigner = await ethers.getSigner(await registryContract.getGovernance());
      const tx = await vaultInstance.connect(governanceSigner).setUnpaused(state);
      await tx.wait(1);
      console.log("Finished unpausing Vault");
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.UNPAUSE_VAULT.NAME}: `, error);
      throw error;
    }
  });
