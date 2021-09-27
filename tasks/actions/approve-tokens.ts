import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { TypedTokens } from "../../helpers/data";
import { approveAndSetTokenHashToTokens } from "../../helpers/contracts-actions";
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

    const tokensAddresses = Object.values(TypedTokens).filter(addr => addr !== TypedTokens.ETH);

    console.log(`Start approving tokens....`);

    await approveAndSetTokenHashToTokens(owner, registryContract, tokensAddresses, true);

    console.log(`Finished approving tokens`);
  });
