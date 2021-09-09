import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { approveTokens } from "../../helpers/contracts-actions";
import { APPROVE_TOKENS } from "../task-names";

task(APPROVE_TOKENS, "Approve Tokens")
  .addParam("registry", "the address of registry", "", types.string)
  .setAction(async ({ registry }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);

    await approveTokens(owner, registryContract);

    console.log(`Finished approving tokens`);
  });
