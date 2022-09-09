import { BigNumber, ethers } from 'ethers';
import { Order, OrderParams } from './types';

const BASIS = ethers.utils.parseEther('1.0');

export function convertOrderParamsToOrder(
  _orderParams: OrderParams,
  _maker: string,
  _underlying: string,
): Order {
  let order: Order = <Order>{};

  order.expiration = _orderParams.expiration;
  order.liquidationAmount = _orderParams.liquidationAmount;
  order.maker = _maker;
  order.upperBound = _orderParams.upperBound;
  order.lowerBound = _orderParams.lowerBound;
  order.returnLimitBP = _orderParams.returnLimitBP;
  order.vault = _orderParams.vault;
  order.direction = _orderParams.direction;
  order.destination = _orderParams.destination;
  order.underlying = _underlying;

  return order;
}
