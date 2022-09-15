import { BigNumber, ethers } from 'ethers';
import { Order, OrderParams } from './types';

const BASIS = ethers.utils.parseEther('1.0');

export function convertOrderParamsToOrder(
  _orderParams: OrderParams,
  _maker: string,
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
  order.stablecoinVault = _orderParams.stablecoinVault;
  order.dexRouter = _orderParams.dexRouter;
  order.uniV2Path = _orderParams.uniV2Path;
  order.uniV3Path = _orderParams.uniV3Path;
  order.swapOnUniV3 = _orderParams.swapOnUniV3;

  return order;
}
