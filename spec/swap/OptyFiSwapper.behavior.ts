import { ISwapper } from '../../typechain-types';
import { describeBehaviorOfSwap } from './Swap.behavior';

export function describeBehaviorOfOptyFiSwapper(
  deploy: () => Promise<ISwapper>,
  skips?: string[],
) {
  describeBehaviorOfSwap(deploy, skips);
}
