import { task, types } from "hardhat/config";
import { getContractInstance, isAddress, executeFunc } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { approveToken } from "../../helpers/contracts-actions";

task("approve-token", "Approve Token")
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

    const registryContract = await getContractInstance(hre, ESSENTIAL_CONTRACTS.REGISTRY, registry);

    await approveToken(owner, registryContract, [token]);
    await executeFunc(registryContract, owner, "setTokensHashToTokens(address[])", [[token]]);
  });
