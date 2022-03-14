import chai from "chai";
import { deployments, ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { Signers } from "../../helpers/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { eEVMNetwork } from "../../helper-hardhat-config";

import { RegistryV2, RiskManagerV2, StrategyProviderV2 } from "../../typechain";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;

describe("VaultV2", () => {
  before(async function () {
    await deployments.fixture();
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.deployer = signers[0];
    this.signers.admin = signers[1];
    this.signers.alice = signers[3];
    this.signers.bob = signers[4];
    this.signers.eve = signers[10];
    this.signers.operator = signers[8];
    this.signers.financeOperator = signers[5];
    this.signers.governance = signers[9];
    this.signers.strategyOperator = signers[7];
    const registryProxy = await deployments.get("RegistryProxy");
    const riskManagerProxy = await deployments.get("RiskManagerProxy");
    const strategyProviderV2 = await deployments.get("StrategyProviderV2");
    this.registryV2 = <RegistryV2>await ethers.getContractAt("RegistryV2", registryProxy.address);
    this.riskManagerV2 = <RiskManagerV2>await ethers.getContractAt("RiskManagerV2", riskManagerProxy.address);
    this.strategyProviderV2 = <StrategyProviderV2>(
      await ethers.getContractAt("StrategyProviderV2", strategyProviderV2.address)
    );
  });
  describe.only("VaultV2 strategies", () => {
    // before(async function () {
    //   console.log("rmv2 ", this.riskManagerV2.address);
    // });
    // for (let i = 0; i < 1; i++) {
    //   it(`strategy${i}`, async function () {
    //     console.log("fn1");
    //   });
    // }
    for (const token of Object.keys(StrategiesByTokenByChain[fork])) {
      for (const strategy of Object.keys(StrategiesByTokenByChain[fork][token])) {
        describe(`${strategy}`, () => {
          it("should deposit withdraw", async function () {
            console.log("-");
          });
        });
      }
    }
  });
});
