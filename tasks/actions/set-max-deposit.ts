import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import { MAX_DEPOSIT_MODE } from "../../helpers/constants/utils";
import TASKS from "../task-names";

task(TASKS.ACTION_TASKS.SET_MAX_DEPOSIT.NAME, TASKS.ACTION_TASKS.SET_MAX_DEPOSIT.DESCRIPTION)
  .addParam("adapter", "the address of defi adapter", "", types.string)
  .addParam("amount", "the max deposit amount", "0", types.string)
  .addParam("liquidityPool", "the address of liquidityPool", "", types.string)
  .addParam("underlyingToken", "the address of underlyingToken", "", types.string)
  .addParam("mode", "the mode of max deposit", "", types.string)
  .addOptionalParam("setProtocol", "set amount for Protocol or not", false, types.boolean)
  .setAction(async ({ adapter, mode, amount, liquidityPool, underlyingToken, setProtocol }, hre) => {
    if (adapter === "") {
      throw new Error("adapter cannot be empty");
    }

    if (!isAddress(adapter)) {
      throw new Error("adapter address is invalid");
    }

    if (+amount <= 0) {
      throw new Error("amount is invalid");
    }

    if (!setProtocol) {
      if (liquidityPool === "") {
        throw new Error("liquidityPool cannot be empty");
      }

      if (!isAddress(liquidityPool)) {
        throw new Error("liquidityPool address is invalid");
      }

      if (mode === "") {
        throw new Error("mode cannot be empty");
      }

      if (MAX_DEPOSIT_MODE[mode.toLowerCase()] === undefined) {
        throw new Error("mode is invalid");
      }

      if (underlyingToken === "" && mode === "number") {
        throw new Error("underlyingToken cannot be empty");
      }

      if (underlyingToken !== "" && !isAddress(underlyingToken)) {
        throw new Error("underlyingToken address is invalid");
      }
    }

    if (liquidityPool !== "") {
      console.log(`Liquidity pool: ${liquidityPool}`);
    }

    if (underlyingToken !== "") {
      console.log(`UnderlyingToken: ${underlyingToken}`);
    }

    if (mode !== "") {
      console.log(`Mode: ${mode}`);
    }

    try {
      console.log(`Adapter: ${adapter}`);
      console.log(`Max Deposit: ${amount}`);

      const contract = await hre.ethers.getContractAt("IAdapterFull", adapter);
      if (setProtocol) {
        await contract.setMaxDepositProtocolPct(amount);
      } else {
        switch (mode.toLowerCase()) {
          case "number": {
            await contract.setMaxDepositAmount(
              liquidityPool,
              underlyingToken ? underlyingToken : hre.ethers.constants.AddressZero,
              amount,
            );
            break;
          }
          case "pct": {
            await contract.setMaxDepositPoolPct(liquidityPool, amount);
            break;
          }
        }
      }
      console.log(`Finished setting max deposit`);
    } catch (error) {
      console.error(`${TASKS.ACTION_TASKS.SET_MAX_DEPOSIT.NAME}: `, error);
      throw error;
    }
  });
