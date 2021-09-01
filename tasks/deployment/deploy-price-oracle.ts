import { task, types } from "hardhat/config";
import { insertContractIntoDB } from "../../helpers/db";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { isAddress, deployContract, getContractInstance, executeFunc } from "../../helpers/helpers";

task("deploy-price-oracle", "Deploy Price Oracle")
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("deployedonce", "allow checking whether contracts were deployed previously", true, types.boolean)
  .addParam("insertindb", "allow inserting to database", false, types.boolean)
  .setAction(async ({ deployedonce, insertindb, registry }, hre) => {
    const [owner] = await hre.ethers.getSigners();

    if (registry === "") {
      throw new Error("registry cannot be empty");
    }

    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    const priceOracle = await deployContract(hre, ESSENTIAL_CONTRACTS.PRICE_ORACLE, deployedonce, owner, [registry]);
    const registryContract = await getContractInstance(hre, ESSENTIAL_CONTRACTS.REGISTRY, registry);

    await executeFunc(registryContract, owner, "setPriceOracle(address)", [priceOracle.address]);

    console.log("Finished deploying PriceOracle");

    console.log(`Contract PriceOracle : ${priceOracle.address}`);

    if (insertindb) {
      const err = await insertContractIntoDB(`priceOracle`, priceOracle.address);
      if (err !== "") {
        console.log(err);
      }
    }
  });
