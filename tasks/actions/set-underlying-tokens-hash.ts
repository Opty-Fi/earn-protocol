import { task, types } from "hardhat/config";
import TASKS from "../task-names";
import { Vault } from "../../typechain";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { isAddress } from "../../helpers/helpers";

task(TASKS.ACTION_TASKS.SET_UNDERLYING_TOKENS_HASH.NAME, TASKS.ACTION_TASKS.SET_UNDERLYING_TOKENS_HASH.DESCRIPTION)
  .addParam("vault", "the address of vault", "", types.string)
  .addParam("underlyingTokensHash", "keccak256 hash of underlying token address and chain id", "", types.string)
  .setAction(async ({ vault, underlyingTokensHash }, { deployments, ethers }) => {
    if (vault === "") {
      throw new Error("vault address cannot be empty");
    }

    if (!isAddress(vault)) {
      throw new Error("vault address is invalid");
    }

    try {
      const vaultInstance = <Vault>await ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vault);
      const currentTokensHash = await vaultInstance.underlyingTokensHash();
      console.log("current:", currentTokensHash);
      console.log("vault.setUnderlyingTokensHash()");
      if (currentTokensHash == underlyingTokensHash) {
        console.log("underlyingTokensHash is upto date on vault");
        console.log("\n");
      } else {
        console.log("Updating underlyingTokensHash on vault...");
        console.log("\n");
        const registryInstance = await ethers.getContractAt(
          ESSENTIAL_CONTRACTS.REGISTRY,
          (
            await deployments.get("RegistryProxy")
          ).address,
        );
        const operatorSigner = await ethers.getSigner(await registryInstance.operator());
        const tx = await vaultInstance.connect(operatorSigner).setUnderlyingTokensHash(underlyingTokensHash);
        await tx.wait(1);
        console.log("underlyingTokensHash updated!");
      }
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.SET_UNDERLYING_TOKENS_HASH.NAME}: `, error);
      throw error;
    }
  });
