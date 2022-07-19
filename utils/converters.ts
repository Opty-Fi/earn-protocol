import { Order, OrderParams } from './types';

export function convertOrderParamsToOrder(
  _orderParams: OrderParams,
  _maker: string,
): Order {
  let order: Order = <Order>{};

  order.depositUSDC = _orderParams.depositUSDC;
  order.expiration = _orderParams.expiration;
  order.liquidationShare = _orderParams.liquidationShare;
  order.maker = _maker;
  order.upperBound = _orderParams.upperBound;
  order.lowerBound = _orderParams.lowerBound;
  order.vault = _orderParams.vault;
  order.priceTarget = _orderParams.priceTarget;

  return order;
}
