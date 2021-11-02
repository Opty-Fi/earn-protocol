import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
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

    try {
      const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      const tokensAddresses = [
        TypedTokens.DAI,
        TypedTokens.USDC,
        TypedTokens.USDT,
        TypedTokens.WBTC,
        TypedTokens.WETH,
        TypedTokens.SLP_WETH_USDC,
      ];
      console.log(`Start approving tokens....`, tokensAddresses);
      await approveAndSetTokenHashToTokens(owner, registryContract, tokensAddresses, true);
      console.log(`Finished approving tokens`);
    } catch (error) {
      console.error(`${APPROVE_TOKENS} : `, error);
      throw error;
    }
  });
