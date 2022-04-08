import { task, types } from "hardhat/config";
import { isAddress } from "../../helpers/helpers";
import TASKS from "../task-names";

task(TASKS.ACTION_TASKS.TRANSFER_OPERATION_OWNERSHIP.NAME, TASKS.ACTION_TASKS.TRANSFER_OPERATION_OWNERSHIP.DESCRIPTION)
  .addParam("registry", "the address of registry", "", types.string)
  .addParam("newOperator", "address of the new operator", "", types.string)
  .setAction(async ({ registry, newOperator }, hre) => {
    if (!isAddress(registry)) {
      throw new Error("registry address is invalid");
    }

    if (!isAddress(newOperator)) {
      throw new Error("new operator address is invalid");
    }

    await hre.run(TASKS.ACTION_TASKS.TRANSFER_OPERATOR.NAME, {
      registry: registry,
      newOperator: newOperator,
    });

    await hre.run(TASKS.ACTION_TASKS.TRANSFER_FINANCE_OPERATOR.NAME, {
      registry: registry,
      newFinanceOperator: newOperator,
    });

    await hre.run(TASKS.ACTION_TASKS.TRANSFER_RISK_OPERATOR.NAME, {
      registry: registry,
      newRiskOperator: newOperator,
    });

    await hre.run(TASKS.ACTION_TASKS.TRANSFER_STRATEGY_OPERATOR.NAME, {
      registry: registry,
      newStrategyOperator: newOperator,
    });
  });
