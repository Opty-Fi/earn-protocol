import { Order, OrderParams } from './types';

export function convertOrderParamsToOrder(
  _orderParams: OrderParams,
  _maker: string,
): Order {
  let order: Order = <Order>{};

  order.expiration = _orderParams.expiration;
  order.liquidationShareBP = _orderParams.liquidationShareBP;
  order.maker = _maker;
  order.upperBound = _orderParams.upperBound;
  order.lowerBound = _orderParams.lowerBound;
  order.returnLimitBP = _orderParams.returnLimitBP;
  order.vault = _orderParams.vault;
  order.direction = _orderParams.direction;

  return order;
}
