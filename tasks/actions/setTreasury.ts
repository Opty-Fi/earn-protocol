import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { task, types } from "hardhat/config";
import { ILimitOrder } from "../../typechain";

task("setTreasury", "sets the treasury for the LimitOrder contract")
  .addParam("limitorder", "the address of the LimitOrder", "", types.string)
  .addParam("treasury", "the address of the new treasury", "", types.string)
  .setAction(async ({ limitorder, treasury }, hre) => {
    const ethers = hre.ethers;
    if (limitorder == "") {
      throw new Error("limit order diamond address required");
    }

    if (treasury == "") {
      throw new Error("treasury address required");
    }

    const instance = await ethers.getContractAt("LimitOrder", ethers.utils.getAddress(limitorder));

    const owner: SignerWithAddress = await ethers.getSigner(await instance.owner());
    const settings: ILimitOrder = await ethers.getContractAt("ILimitOrder", ethers.utils.getAddress(limitorder));

    console.log(`Setting the treasury to ${treasury} for contract ${limitorder}...`);

    try {
      const tx = await settings.connect(owner).setTreasury(ethers.utils.getAddress(treasury));

      await tx.wait();
    } catch (err) {
      console.log("Failed to set new oracle address!");
      console.log(`Failed with error: ${err}`);
    }

    console.log(`Successfully set the treasury address to ${treasury}`);
  });
