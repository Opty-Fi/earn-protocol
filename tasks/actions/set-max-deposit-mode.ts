import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { MAX_DEPOSIT_MODE } from "../../helpers/constants/utils";
import TASKS from "../task-names";

task(TASKS.ACTION_TASKS.SET_MAX_DEPOSIT_MODE.NAME, TASKS.ACTION_TASKS.SET_MAX_DEPOSIT_MODE.DESCRIPTION)
  .addParam("adapter", "the address of defi adapter", "", types.string)
  .addParam(
    "mode",
    "the mode of max deposit: 'pct'- Percentage of pool value 'number'- Amount in underlying token",
    "",
    types.string,
  )
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
      console.error(`${TASKS.ACTION_TASKS.SET_MAX_DEPOSIT_MODE.NAME}:`, error);
      throw error;
    }
  });
