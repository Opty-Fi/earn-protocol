import { task, types } from "hardhat/config";
import { getContractInstance, isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { unpauseVault } from "../../helpers/contracts-actions";

task("unpause-vault", "Unpause Vault")
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("vault", "the address of vault", "", types.string)
  .setAction(async ({ registry, vault }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (vault === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(vault)) {
      throw new Error("registry address is invalid");
    }

    const registryContract = await getContractInstance(hre, ESSENTIAL_CONTRACTS.REGISTRY, registry);

    await unpauseVault(owner, registryContract, vault, true);
  });
