import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import TASKS from "../task-names";
import { Vault } from "../../typechain";

task(TASKS.ACTION_TASKS.SET_WHITELISTED_CODES_ROOT.NAME, TASKS.ACTION_TASKS.SET_WHITELISTED_CODES_ROOT.DESCRIPTION)
  .addParam("vault", "the address of vault", "", types.string)
  .addOptionalParam("whitelistedCodesRoot", "whitelisted codes root hash", undefined, types.string)
  .setAction(async ({ vault, whitelistedCodesRoot }, { ethers, deployments }) => {
    if (vault === "") {
      throw new Error("vault address cannot be empty");
    }

    if (!isAddress(vault)) {
      throw new Error("vault address is invalid");
    }

    try {
      const vaultInstance = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vault);
      const actualCodesRoot = await vaultInstance.whitelistedCodesRoot();
      console.log(`existing whitelisted codes merkle root hash : ${actualCodesRoot}`);
      if (actualCodesRoot != whitelistedCodesRoot) {
        const registryProxyAddress = (await deployments.get("RegistryProxy")).address;
        const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
        const governanceSigner = await ethers.getSigner(await registryV2Instance.governance());
        const tx6 = await vaultInstance.connect(governanceSigner).setWhitelistedCodesRoot(whitelistedCodesRoot);
        await tx6.wait(1);
        const newCodesRootHash = await vaultInstance.whitelistedCodesRoot();
        console.log(`new whitelisted codes merkle root hash : ${newCodesRootHash}`);
      } else {
        console.log("whitelisted codes root is as expected");
        console.log("\n");
      }
    } catch (error: any) {
      console.error(`${TASKS.ACTION_TASKS.SET_WHITELISTED_CODES_ROOT.NAME}: `, error);
      throw error;
    }
  });
