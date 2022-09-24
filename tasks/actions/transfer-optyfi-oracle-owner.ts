import { task, types } from "hardhat/config";
import TASKS from "../task-names";
import { getAddress } from "ethers/lib/utils";
import { OptyFiOracle, OptyFiOracle__factory } from "../../typechain";

task(TASKS.ACTION_TASKS.TRANSFER_OPTYFI_ORACLE_OWNER.NAME, TASKS.ACTION_TASKS.TRANSFER_OPTYFI_ORACLE_OWNER.DESCRIPTION)
  .addParam("newOwner", "address of the new owner", "", types.string)
  .setAction(async ({ newOwner }, hre) => {
    try {
      const optyfiOracleInstance = <OptyFiOracle>(
        await hre.ethers.getContractAt(OptyFiOracle__factory.abi, (await hre.deployments.get("OptyFiOracle")).address)
      );
      const currentOwner = await optyfiOracleInstance.owner();
      console.log("current owner ", currentOwner);
      if (getAddress(newOwner) != getAddress(currentOwner)) {
        const currentOwnerSigner = await hre.ethers.getSigner(currentOwner);
        const tx = await optyfiOracleInstance.connect(currentOwnerSigner).transferOwnership(newOwner);
        await tx.wait(1);
        const actualNewOwner = await optyfiOracleInstance.owner();
        console.log("The actual owner is ", actualNewOwner);
      } else {
        console.log("current owner is upto date");
      }
    } catch (error: any) {
      console.error(`${TASKS.ACTION_TASKS.TRANSFER_OPTYFI_ORACLE_OWNER.NAME}: `, error);
    }
  });
