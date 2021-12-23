import { task, types } from "hardhat/config";
import { deployContract } from "../../helpers/helpers";
import { insertContractIntoDB } from "../../helpers/db";
import { TESTING_CONTRACTS } from "../../helpers/constants/test-contracts-name";
import TASKS from "../task-names";

task(TASKS.DEPLOYMENT_TASKS.DEPLOY_ERC20.NAME, TASKS.DEPLOYMENT_TASKS.DEPLOY_ERC20.DESCRIPTION)
  .addParam("name", "the name of token", "", types.string)
  .addParam("symbol", "the symbol of token", "", types.string)
  .addOptionalParam("total", "the totalSupply of token", "0", types.string)
  .addOptionalParam("decimal", "the decimal of token", 18, types.int)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", false, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ name, symbol, total, decimal, deployedonce, insertindb }, hre) => {
    if (name === "") {
      throw new Error("name cannot be empty");
    }

    if (symbol === "") {
      throw new Error("symbol cannot be empty");
    }

    try {
      const [owner] = await hre.ethers.getSigners();
      console.log("Deploying erc20...");
      const erc20Contract = await deployContract(hre, TESTING_CONTRACTS.TEST_DUMMY_TOKEN, deployedonce, owner, [
        name,
        symbol,
        decimal,
        total,
      ]);
      console.log("Finished deploying erc20");

      console.log(`Contract ${name} token : ${erc20Contract.address}`);

      if (insertindb) {
        const err = await insertContractIntoDB(`symbol`, erc20Contract.address);
        if (err !== "") {
          throw err;
        }
      }
    } catch (error) {
      console.error(`${TASKS.DEPLOYMENT_TASKS.DEPLOY_ERC20.NAME}: `, error);
      throw error;
    }
  });
