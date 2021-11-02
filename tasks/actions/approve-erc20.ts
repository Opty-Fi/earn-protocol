import { task, types } from "hardhat/config";
import { isAddress, executeFunc } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { APPROVE_ERC20 } from "../task-names";

task(APPROVE_ERC20, "Approve erc20 Token")
  .addParam("token", "the address of token", "", types.string)
  .addParam("spender", "the address of spender", "", types.string)
  .addParam("amount", "the allowance amount", "0", types.string)
  .setAction(async ({ token, spender, amount }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    if (spender === "") {
      throw new Error("spender cannot be empty");
    }

    if (!isAddress(spender)) {
      throw new Error("spender address is invalid");
    }

    if (token === "") {
      throw new Error("token cannot be empty");
    }

    if (!isAddress(token)) {
      throw new Error("token address is invalid");
    }

    if (+amount <= 0) {
      throw new Error("amount is invalid");
    }

    try {
      const erc20Instance = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, token);
      await executeFunc(erc20Instance, owner, "approve(address,uint256)", [spender, amount]);
      const allowance = await erc20Instance.allowance(await owner.getAddress(), spender);
      console.log("Finish approve erc20");
      console.log(`Spender : ${spender}`);
      console.log(`Allowance : ${allowance}`);
    } catch (error) {
      console.error(`${APPROVE_ERC20}: `, error);
      throw error;
    }
  });
