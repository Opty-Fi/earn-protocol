import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { BALANCE_OF } from "../task-names";

task(BALANCE_OF, "Check token balance of address")
  .addParam("token", "the address of token", "", types.string)
  .addParam("user", "the address of user", "", types.string)
  .setAction(async ({ token, user }, hre) => {
    if (user === "") {
      throw new Error("user cannot be empty");
    }

    if (!isAddress(user)) {
      throw new Error("user address is invalid");
    }

    if (token === "") {
      throw new Error("token cannot be empty");
    }

    if (!isAddress(token)) {
      throw new Error("token address is invalid");
    }

    try {
      const erc20Contract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, token);
      const balance = await erc20Contract.balanceOf(user);
      console.log(`Token: ${token}`);
      console.log(`User: ${user}`);
      console.log(`Balance : ${+balance}`);
    } catch (error) {
      console.error(`${BALANCE_OF}: `, error);
      throw error;
    }
  });
