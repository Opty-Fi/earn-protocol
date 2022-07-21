import hre from 'hardhat';
import { describeBehaviorOfOptyFiSwapper } from '../spec/swap/OptyFiSwapper.behavior';
import {
  ISwapper,
  ISwapper__factory,
  OptyFiSwapper,
  OptyFiSwapper__factory,
  SwapView__factory,
  Swap__factory,
} from '../typechain-types';

describe('::OptyFiSwapper Contracts', () => {
  const ethers = hre.ethers;

  let deployer: any;
  let instance: ISwapper;
  let snapshotId: number;

  let OptyFiSwapper: OptyFiSwapper;

  before(async () => {
    [deployer] = await ethers.getSigners();

    OptyFiSwapper = await new OptyFiSwapper__factory(deployer).deploy();
    const swapperSelectors = new Set();
    const swapperFacetCuts = [
      await new Swap__factory(deployer).deploy(),
      await new SwapView__factory(deployer).deploy(),
    ].map(function (f) {
      return {
        target: f.address,
        action: 0,
        selectors: Object.keys(f.interface.functions)
          .filter((fn) => !swapperSelectors.has(fn) && swapperSelectors.add(fn))
          .map((fn) => f.interface.getSighash(fn)),
      };
    });

    await OptyFiSwapper.diamondCut(
      swapperFacetCuts,
      ethers.constants.AddressZero,
      '0x',
    );

    instance = ISwapper__factory.connect(OptyFiSwapper.address, deployer);
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot', []);
  });

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId]);
  });

  describeBehaviorOfOptyFiSwapper(async () => instance);
});
