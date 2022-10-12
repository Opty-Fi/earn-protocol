import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ethers } from "hardhat";
import { describeBehaviorOfLimitOrder } from "./spec/LimitOrder.behavior";

chai.use(solidity);

describe("::LimitOrder Contracts", () => {
  let snapshotId: number;

  beforeEach(async () => {
    snapshotId = await ethers.provider.send("evm_snapshot", []);
  });

  afterEach(async () => {
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describeBehaviorOfLimitOrder();
});
