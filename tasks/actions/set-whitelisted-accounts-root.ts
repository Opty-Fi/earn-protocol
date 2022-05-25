import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import TASKS from "../task-names";
import { Vault } from "../../typechain";

task(
  TASKS.ACTION_TASKS.SET_WHITELISTED_ACCOUNTS_ROOT.NAME,
  TASKS.ACTION_TASKS.SET_WHITELISTED_ACCOUNTS_ROOT.DESCRIPTION,
)
  .addParam("vault", "the address of vault", "", types.string)
  .addOptionalParam("merkleRootHash", "merkle root hash", undefined, types.string)
  .setAction(async ({ vault, merkleRootHash }, { ethers, deployments }) => {
    if (vault === "") {
      throw new Error("vault address cannot be empty");
    }

    if (!isAddress(vault)) {
      throw new Error("vault address is invalid");
    }

    try {
      const vaultInstance = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vault);
      const actualAccountsRoot = await vaultInstance.whitelistedAccountsRoot();
      console.log(`existing whitelisted accounts merkle root hash : ${actualAccountsRoot}`);
      if (actualAccountsRoot != merkleRootHash) {
        const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
        const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
        const governanceSigner = await ethers.getSigner(await registryV2Instance.governance());
        const tx6 = await vaultInstance.connect(governanceSigner).setWhitelistedAccountsRoot(merkleRootHash);
        await tx6.wait(1);
        const newAccountsRootHash = await vaultInstance.whitelistedAccountsRoot();
        console.log(`new whitelisted accounts merkle root hash : ${newAccountsRootHash}`);
      } else {
        console.log("whitelisted accounts root is as expected");
        console.log("\n");
      }
    } catch (error: any) {
      console.error(`${TASKS.ACTION_TASKS.SET_WHITELISTED_ACCOUNTS_ROOT.NAME}: `, error);
      throw error;
    }
  });
