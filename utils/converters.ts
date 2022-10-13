import { BigNumber } from "ethers";
import { Order, OrderParams } from "./types";

export function convertOrderParamsToOrder(_orderParams: OrderParams, _maker: string, _taskId: string): Order {
  const order: Order = <Order>{};

  order.liquidationAmountVT = _orderParams.liquidationAmountVT;
  order.expectedOutputUT = _orderParams.expectedOutputUT;
  order.expiration = _orderParams.expiration;
  order.lowerBound = BigNumber.from(_orderParams.lowerBound);
  order.upperBound = BigNumber.from(_orderParams.upperBound);
  order.returnLimitUT = BigNumber.from(_orderParams.returnLimitUT);
  order.stablecoinVault = _orderParams.stablecoinVault;
  order.maker = _maker;
  order.vault = _orderParams.vault;
  order.direction = _orderParams.direction.toNumber();
  order.dexRouter = _orderParams.dexRouter;
  order.swapOnUniV3 = _orderParams.swapOnUniV3;
  order.uniV2Path = _orderParams.uniV2Path;
  order.uniV3Path = _orderParams.uniV3Path.toString();
  order.permitParams = _orderParams.permitParams as string;
  order.expectedOutputVT = _orderParams.expectedOutputVT;
  order.taskId = _taskId;

  return order;
}
