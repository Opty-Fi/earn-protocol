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

// NEWO
// 0xDd704A44866AE9C387CfC687fa642a222b84f0D3
// 0x5fAd091BBa2731937087aa471d0BaCCFaD4157c4
// 0x65786B3dEe53D4C61E2fd0bd0F7049C2613b376a
// 0x46bB1A2549F36423227158c7AC7aE6BeaE1bFfb4
// 0x6e6976bB88285b4Ca5E928e1c1720550D570Ac69
// 0xD26Ec7401C198ADAc340d3A4Cb8B52b845F3A542
