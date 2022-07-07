import hre from 'hardhat';
import { ILimitOrder } from '../../typechain-types';

export function describeBehaviorOfLimitOrderActions(
  deploy: () => Promise<ILimitOrder>,
  skips?: string[],
) {}
