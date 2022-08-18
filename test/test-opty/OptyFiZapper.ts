import hre, { deployments } from "hardhat";
import { describeBehaviorOfOptyFiZapper } from "../../spec/OptyFiZapper.behaviour";
import {
  OptyFiSwapper,
  OptyFiSwapper__factory,
  SwapView__factory,
  Swap__factory,
  IOptyFiZapper,
  OptyFiZapper__factory,
} from "../../typechain";

describe("::OptyFiZapper Contracts", () => {
  const ethers = hre.ethers;
  const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

  let deployer: any;
  let instance: IOptyFiZapper;
  let snapshotId: number;

  let OptyFiSwapper: OptyFiSwapper;

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

    instance = await new OptyFiZapper__factory(deployer).deploy(OptyFiSwapper.address);
  });

  beforeEach(async () => {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describeBehaviorOfOptyFiZapper(async () => instance);
});
