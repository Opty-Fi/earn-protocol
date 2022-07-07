import hre from 'hardhat';
import { ILimitOrder } from '../../typechain-types';

export function describeBehaviorOfLimitOrderView(
  deploy: () => Promise<ILimitOrder>,
  skips?: string[],
) {}
