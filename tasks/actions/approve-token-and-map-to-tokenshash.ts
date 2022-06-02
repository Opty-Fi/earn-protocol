import { task, types } from "hardhat/config";
import { generateTokenHashV2, isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { TypedTokens } from "../../helpers/data";
import { getAddress } from "ethers/lib/utils";
import TASKS from "../task-names";
import { Registry } from "../../typechain";
import { NETWORKS_CHAIN_ID_TO_HEX } from "../../helper-hardhat-config";

task(
  TASKS.ACTION_TASKS.APPROVE_TOKEN_AND_MAP_TO_TOKENSHASH.NAME,
  TASKS.ACTION_TASKS.APPROVE_TOKEN_AND_MAP_TO_TOKENSHASH.DESCRIPTION,
)
  .addParam("token", "the address of token", "", types.string)
  .setAction(async ({ token }, hre) => {
    if (token === "") {
      throw new Error("token cannot be empty");
    }

    if (!isAddress(token)) {
      throw new Error("token address is invalid");
    }
    if (getAddress(token) === getAddress(TypedTokens.ETH)) {
      throw new Error(`cannot approve ${token}`);
    }

    try {
      const registryInstance = <Registry>(
        await hre.ethers.getContractAt(
          ESSENTIAL_CONTRACTS.REGISTRY,
          await (
            await hre.deployments.get("RegistryProxy")
          ).address,
        )
      );
      const operatorSigner = await hre.ethers.getSigner(await registryInstance.getOperator());
      const isApproved = await registryInstance.isApprovedToken(getAddress(token));
      const existingTokenHashes: string[] = await registryInstance.getTokenHashes();
      const tokensHash = generateTokenHashV2([getAddress(token)], NETWORKS_CHAIN_ID_TO_HEX[await hre.getChainId()]);
      if (isApproved && !existingTokenHashes.includes(tokensHash)) {
        console.log("only set token hash");
        console.log("\n");
        const onlyMapToTokensHashTx = await registryInstance
          .connect(operatorSigner)
          ["setTokensHashToTokens(bytes32,address[])"](tokensHash, [getAddress(token)]);
        await onlyMapToTokensHashTx.wait(1);
      }
      if (!isApproved && !existingTokenHashes.includes(tokensHash)) {
        console.log("approve token and set hash");
        console.log("\n");
        const approveTokenAndMapToTokensHashTx = await registryInstance
          .connect(operatorSigner)
          ["approveTokenAndMapToTokensHash(bytes32,address[])"](tokensHash, [token]);
        await approveTokenAndMapToTokensHashTx.wait(1);
      }
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.APPROVE_TOKEN_AND_MAP_TO_TOKENSHASH.NAME}:`, error);
      throw error;
    }
  });
