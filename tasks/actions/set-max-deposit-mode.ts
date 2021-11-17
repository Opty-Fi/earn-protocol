import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { MAX_DEPOSIT_MODE } from "../../helpers/constants/utils";
import { SET_MAX_DEPOSIT_MODE } from "../task-names";

task(SET_MAX_DEPOSIT_MODE, "Set max deposit mode for adapter")
  .addParam("adapter", "the address of defi adapter", "", types.string)
  .addParam("mode", "the mode of max deposit", "", types.string)
  .setAction(async ({ adapter, mode }, hre) => {
    if (adapter === "") {
      throw new Error("adapter cannot be empty");
    }

    if (!isAddress(adapter)) {
      throw new Error("adapter address is invalid");
    }

    if (mode === "") {
      throw new Error("type cannot be empty");
    }

    if (MAX_DEPOSIT_MODE[mode.toLowerCase()] === undefined) {
      throw new Error("type is invalid");
    }

    try {
      console.log(`Adapter: ${adapter}`);
      console.log(`Mode: ${mode}`);
      const contract = await hre.ethers.getContractAt("IAdapterFull", adapter);
      await contract.setMaxDepositProtocolMode(MAX_DEPOSIT_MODE[mode.toLowerCase()]);
      console.log(`Finished setting max deposit mode`);
    } catch (error) {
      console.error(`${SET_MAX_DEPOSIT_MODE}:`, error);
      throw error;
    }
  });
