import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { task, types } from "hardhat/config";
//@ts-ignore
import { ILimitOrder } from "../../typechain-types";

task("setOracle", "sets the address of the OptyFiOracle contract")
  .addParam("limitorderdiamond", "the address of the LimitOrderDiamond", "", types.string)
  .addParam("oracle", "the address of the new OptyFiOracle", "", types.string)
  .setAction(async ({ oracle, limitorderdiamond }, hre) => {
    const ethers = hre.ethers;

    if (limitorderdiamond == "") {
      throw new Error("limit order diamond address required");
    }

    if (oracle == "") {
      throw new Error("oracle address required");
    }

    const instance = await ethers.getContractAt("LimitOrderDiamond", ethers.utils.getAddress(limitorderdiamond));

    const owner: SignerWithAddress = await ethers.getSigner(await instance.owner());
    const settings: ILimitOrder = await ethers.getContractAt("ILimitOrder", ethers.utils.getAddress(limitorderdiamond));

    console.log(`Setting the oracle to ${oracle} for contract ${limitorderdiamond}...`);

    try {
      //@ts-ignore
      let tx = await settings.connect(owner)["setOracle(address)"](ethers.utils.getAddress(oracle));

      await tx.wait();
    } catch (err) {
      console.log("Failed to set new oracle address!");
      console.log(`Failed with error: ${err}`);
    }

    console.log(`Successfully set the oracle address to ${oracle}`);
  });
