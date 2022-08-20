import hre, { deployments } from "hardhat";
import { describeBehaviorOfOptyFiZapper } from "../../spec/OptyFiZapper.behaviour";
import {
  OptyFiSwapper,
  OptyFiSwapper__factory,
  SwapView__factory,
  Swap__factory,
  OptyFiZapper__factory,
  OptyFiZapper,
  Zap__factory,
  ZapView__factory,
  IZap,
} from "../../typechain";

describe("::OptyFiZapper Contracts", () => {
  const ethers = hre.ethers;

  let deployer: any;
  let snapshotId: number;

  let OptyFiSwapper: OptyFiSwapper;
  let OptyFiZapper: OptyFiZapper;
  let instance: IZap;

  before(async () => {
    await deployments.fixture();
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
          .filter(fn => !swapperSelectors.has(fn) && swapperSelectors.add(fn))
          .map(fn => f.interface.getSighash(fn)),
      };
    });

    await OptyFiSwapper.diamondCut(swapperFacetCuts, ethers.constants.AddressZero, "0x");

    OptyFiZapper = await new OptyFiZapper__factory(deployer).deploy(OptyFiSwapper.address);
    const zapperSelectors = new Set();
    const zapperFacetCuts = [
      await new Zap__factory(deployer).deploy(),
      await new ZapView__factory(deployer).deploy(),
    ].map(function (f) {
      return {
        target: f.address,
        action: 0,
        selectors: Object.keys(f.interface.functions)
          .filter(fn => !zapperSelectors.has(fn) && zapperSelectors.add(fn))
          .map(fn => f.interface.getSighash(fn)),
      };
    });

    await OptyFiZapper.diamondCut(zapperFacetCuts, ethers.constants.AddressZero, "0x");
    instance = Zap__factory.connect(OptyFiZapper.address, deployer);
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describeBehaviorOfOptyFiZapper(async () => instance);
});
