import { task, types } from "hardhat/config";
import { insertContractIntoDB } from "../../helpers/db";
import { deployContract } from "../../helpers/helpers";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants";
import { isAddress } from "../../helpers/helpers";

task("deploy-opty", "Deploy Opty")
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

    const opty = await deployContract(hre, ESSENTIAL_CONTRACTS.OPTY, deployedonce, owner, [registry, 100000000000000]);

    const optyMinter = await deployContract(hre, ESSENTIAL_CONTRACTS.OPTY_MINTER, deployedonce, owner, [
      registry,
      opty.address,
    ]);

    console.log(`Contract opty : ${opty.address}`);
    console.log(`Contract optyMinter : ${optyMinter.address}`);

    if (insertindb) {
      let err = await insertContractIntoDB(`opty`, opty.address);
      err = await insertContractIntoDB(`optyMinter`, optyMinter.address);
      if (err !== "") {
        console.log(err);
      }
    }
  });
