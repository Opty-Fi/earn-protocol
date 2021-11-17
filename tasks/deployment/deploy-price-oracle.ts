import { task, types } from "hardhat/config";
import { insertContractIntoDB } from "../../helpers/db";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { isAddress, deployContract, executeFunc } from "../../helpers/helpers";
import { DEPLOY_PRICE_ORACLE } from "../task-names";

task(DEPLOY_PRICE_ORACLE, "Deploy Price Oracle")
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ deployedonce, insertindb, registry }, hre) => {
    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    try {
      const [owner] = await hre.ethers.getSigners();
      console.log("Deploying PriceOracle...");
      const priceOracle = await deployContract(hre, ESSENTIAL_CONTRACTS.PRICE_ORACLE, deployedonce, owner, [registry]);
      console.log("Finished deploying PriceOracle.");
      console.log(`Contract PriceOracle : ${priceOracle.address}`);
      console.log("Registering PriceOracle...");
      const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registry);
      await executeFunc(registryContract, owner, "setPriceOracle(address)", [priceOracle.address]);
      console.log("Registered PriceOracle.");
      if (insertindb) {
        const err = await insertContractIntoDB(`priceOracle`, priceOracle.address);
        if (err !== "") {
          throw err;
        }
      }
    } catch (error) {
      console.error(`${DEPLOY_PRICE_ORACLE}: `, error);
      throw error;
    }
  });
