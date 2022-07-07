import hre from 'hardhat';
import { describeBehaviorOfLimitOrder } from '../spec/limit_order/LimitOrder.behavior';
import {
  LimitOrderDiamond,
  LimitOrderDiamond__factory,
  LimitOrderActions__factory,
  LimitOrderSettings__factory,
  LimitOrderView__factory,
  OptyFiSwapper,
  OptyFiSwapper__factory,
  Swap__factory,
  ILimitOrder,
  ISwapper,
  ILimitOrder__factory,
  ISwapper__factory,
  OptyFiOracle,
  OptyFiOracle__factory,
} from '../typechain-types';

describe('::LimitOrder Contracts', () => {
  const ethers = hre.ethers;

  let snapshotId: number;

  let deployer: any;
  let treasury: any;

  let LimitOrderDiamond: LimitOrderDiamond;
  let OptyFiSwapper: OptyFiSwapper;
  let Oracle: OptyFiOracle;

  let limitOrderInstance: ILimitOrder;
  let swapperInstance: ISwapper;

  const AaveVaultProxy = '0xd610c0CcE9792321BfEd3c2f31dceA6784c84F19';

  before(async () => {
    [deployer, treasury] = await ethers.getSigners();

    const day = ethers.BigNumber.from('86400');
    Oracle = await new OptyFiOracle__factory(deployer).deploy(
      ethers.utils.getAddress('0x99fa011e33a8c6196869dec7bc407e896ba67fe3'),
      day,
      day,
    );

    LimitOrderDiamond = await new LimitOrderDiamond__factory(deployer).deploy(
      treasury.address,
      Oracle.address,
    );

    const limitOrderSelectors = new Set();

    const limitOrderFacetCuts = [
      await new LimitOrderActions__factory(deployer).deploy(),
      await new LimitOrderSettings__factory(deployer).deploy(),
      await new LimitOrderView__factory(deployer).deploy(),
    ].map(function (f) {
      return {
        target: f.address,
        action: 0,
        selectors: Object.keys(f.interface.functions)
          .filter(
            (fn) => !limitOrderSelectors.has(fn) && limitOrderSelectors.add(fn),
          )
          .map((fn) => f.interface.getSighash(fn)),
      };
    });

    OptyFiSwapper = await new OptyFiSwapper__factory(deployer).deploy();

    const swapperSelectors = new Set();

    const swapperFacetCuts = [await new Swap__factory(deployer).deploy()].map(
      function (f) {
        return {
          target: f.address,
          action: 0,
          selectors: Object.keys(f.interface.functions)
            .filter(
              (fn) => !swapperSelectors.has(fn) && swapperSelectors.add(fn),
            )
            .map((fn) => f.interface.getSighash(fn)),
        };
      },
    );

    await LimitOrderDiamond.diamondCut(
      limitOrderFacetCuts,
      ethers.constants.AddressZero,
      '0x',
    );

    await OptyFiSwapper.diamondCut(
      swapperFacetCuts,
      ethers.constants.AddressZero,
      '0x',
    );

    limitOrderInstance = ILimitOrder__factory.connect(
      LimitOrderDiamond.address,
      deployer,
    );
    swapperInstance = ISwapper__factory.connect(
      OptyFiSwapper.address,
      deployer,
    );
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send('evm_snapshot', []);
  });

  afterEach(async () => {
    await ethers.provider.send('evm_revert', [snapshotId]);
  });

  describeBehaviorOfLimitOrder(async () => limitOrderInstance, {
    AaveVaultAddress: AaveVaultProxy,
  });
});
