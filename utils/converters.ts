import { Order, OrderParams } from "./types";

export function convertOrderParamsToOrder(_orderParams: OrderParams, _maker: string): Order {
  const order: Order = <Order>{};

  order.expiration = _orderParams.expiration;
  order.liquidationAmountVT = _orderParams.liquidationAmountVT;
  order.expectedOutputUT = _orderParams.expectedOutputUT;
  order.maker = _maker;
  order.upperBound = _orderParams.upperBound;
  order.lowerBound = _orderParams.lowerBound;
  order.returnLimitUT = _orderParams.returnLimitUT;
  order.expectedOutputVT = _orderParams.expectedOutputVT;
  order.vault = _orderParams.vault;
  order.direction = _orderParams.direction.toNumber();
  order.stablecoinVault = _orderParams.stablecoinVault;
  order.dexRouter = _orderParams.dexRouter;
  order.uniV2Path = _orderParams.uniV2Path;
  order.uniV3Path = _orderParams.uniV3Path.toString();
  order.swapOnUniV3 = _orderParams.swapOnUniV3;

  return order;
}
