import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { TypedTokens } from "../../helpers/data";
import { approveAndSetTokenHashToToken } from "../../helpers/contracts-actions";
import { getAddress } from "ethers/lib/utils";
import TASKS from "../task-names";

task(TASKS.ACTION_TASKS.APPROVE_TOKEN.NAME, TASKS.ACTION_TASKS.APPROVE_TOKEN.DESCRIPTION)
  .addParam("token", "the address of token", "", types.string)
  .addParam("registry", "the address of registry", "", types.string)
  .setAction(async ({ token, registry }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (token === "") {
      throw new Error("token cannot be empty");
    }

    if (!isAddress(token)) {
      throw new Error("token address is invalid");
    }

    if (getAddress(token) !== getAddress(TypedTokens.ETH)) {
      const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      try {
        await approveAndSetTokenHashToToken(owner, registryContract, token);
        console.log(`Finished approving token: ${token}`);
      } catch (error) {
        console.error(`${TASKS.ACTION_TASKS.APPROVE_TOKEN.NAME}:`, error);
        throw error;
      }
    }
  });
