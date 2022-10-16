import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { task, types } from "hardhat/config";
import { ILimitOrder } from "../../typechain";

task("setOracle", "sets the address of the OptyFiOracle contract")
  .addParam("limitorder", "the address of the LimitOrder", "", types.string)
  .addParam("oracle", "the address of the new OptyFiOracle", "", types.string)
  .setAction(async ({ oracle, limitorder }, hre) => {
    const ethers = hre.ethers;

    if (limitorder == "") {
      throw new Error("limit order diamond address required");
    }

    if (oracle == "") {
      throw new Error("oracle address required");
    }

    const instance = await ethers.getContractAt("LimitOrder", ethers.utils.getAddress(limitorder));

    const owner: SignerWithAddress = await ethers.getSigner(await instance.owner());
    const settings: ILimitOrder = await ethers.getContractAt("ILimitOrder", ethers.utils.getAddress(limitorder));

    console.log(`Setting the oracle to ${oracle} for contract ${limitorder}...`);

    try {
      const tx = await settings.connect(owner).setOracle(ethers.utils.getAddress(oracle));

      await tx.wait();
    } catch (err) {
      console.log("Failed to set new oracle address!");
      console.log(`Failed with error: ${err}`);
    }

    console.log(`Successfully set the oracle address to ${oracle}`);
  });
