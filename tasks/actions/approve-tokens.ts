import { task, types } from "hardhat/config";
import { getContractInstance } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { approveTokens } from "../../helpers/contracts-actions";

task("approve-tokens", "Approve Tokens")
  .addParam("registry", "the address of registry", "", types.string)
  .setAction(async ({ registry }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    const registryContract = await getContractInstance(hre, ESSENTIAL_CONTRACTS.REGISTRY, registry);

    await approveTokens(owner, registryContract);
  });
