import hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signers } from "../../helpers/utils";
import { deployRegistry } from "../../helpers/contracts-deployments";
import { expect, assert } from "chai";
import { HarvestCodeProvider, Registry, RegistryProxy } from "../../typechain";
import { ADDRESS_ZERO } from "../../helpers/constants/utils";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { TypedDefiPools, TypedTokens } from "../../helpers/data";
import { deployContract, generateTokenHash } from "../../helpers/helpers";
import { BigNumber } from "ethers";

const USDC_LIQUIDITY_POOLS = [
  TypedDefiPools.CompoundAdapter.usdc.pool,
  TypedDefiPools.AaveV1Adapter.usdc.pool,
  TypedDefiPools.AaveV2Adapter.usdc.pool,
  TypedDefiPools.CurveDepositPoolAdapter["usdc_dai+usdc+usdt+gusd"].pool,
  TypedDefiPools.CurveSwapPoolAdapter["usdc_3crv"].pool,
];
const USDC_TOKEN_HASH = generateTokenHash([TypedTokens.USDC]);

describe("E2E Integration tests", function () {
  before(async function () {
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await hre.ethers.getSigners();
    this.signers.admin = signers[0];
    this.signers.owner = signers[1];
    this.signers.deployer = signers[2];
    this.signers.alice = signers[3];
    this.signers.bob = signers[4];
    this.signers.financeOperator = signers[5];
    this.signers.riskOperator = signers[6];
    this.signers.strategyOperator = signers[7];
    this.signers.operator = signers[8];
    this.signers.governance = signers[9];
  });
  describe("1. Registry setup", function () {
    it("1.0 Registry and Registry proxy deployment and connecting", async function () {
      this.registry = <Registry>await deployRegistry(hre, this.signers.admin, false);
      this.registryProxy = <RegistryProxy>(
        await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, this.registry.address)
      );
      assert.isDefined(this.registry, "!Registry and/pr !RegistryProxy");
      assert.isDefined(this.registryProxy, "!RegistryProxy");
    });
    it("1.0 Should have defaults role addresses on deployment as expected", async function () {
      expect(await this.registry.governance()).to.equal(this.signers.admin.address);
      expect(await this.registry.financeOperator()).to.equal(this.signers.admin.address);
      expect(await this.registry.riskOperator()).to.equal(this.signers.admin.address);
      expect(await this.registry.strategyOperator()).to.equal(this.signers.admin.address);
      expect(await this.registry.operator()).to.equal(this.signers.admin.address);
    });
    it("1.1 Should be to able to change the governance", async function () {
      await expect(this.registryProxy.setPendingGovernance(this.signers.governance.address))
        .to.emit(this.registryProxy, "NewPendingGovernance")
        .withArgs(ADDRESS_ZERO, this.signers.governance.address);
      await expect(this.registryProxy.connect(this.signers.governance).acceptGovernance())
        .to.emit(this.registryProxy, "NewGovernance")
        .withArgs(this.signers.admin.address, this.signers.governance.address);
      expect(await this.registry.governance()).to.equal(this.signers.governance.address);
    });
    it("1.2 New governance should be to able to change the finance operator", async function () {
      await expect(
        this.registry.connect(this.signers.governance).setFinanceOperator(this.signers.financeOperator.address),
      )
        .to.emit(this.registry, "TransferFinanceOperator")
        .withArgs(this.signers.financeOperator.address, this.signers.governance.address);
      expect(await this.registry.financeOperator()).to.equal(this.signers.financeOperator.address);
    });
    it("1.3 New governance should be to able to change the risk operator", async function () {
      await expect(this.registry.connect(this.signers.governance).setRiskOperator(this.signers.riskOperator.address))
        .to.emit(this.registry, "TransferRiskOperator")
        .withArgs(this.signers.riskOperator.address, this.signers.governance.address);
      expect(await this.registry.riskOperator()).to.equal(this.signers.riskOperator.address);
    });
    it("1.4 New governance should be to able to change the strategy operator", async function () {
      await expect(
        this.registry.connect(this.signers.governance).setStrategyOperator(this.signers.strategyOperator.address),
      )
        .to.emit(this.registry, "TransferStrategyOperator")
        .withArgs(this.signers.strategyOperator.address, this.signers.governance.address);
      expect(await this.registry.strategyOperator()).to.equal(this.signers.strategyOperator.address);
    });

    it("1.5 New governance should be to able to change the operator", async function () {
      await expect(this.registry.connect(this.signers.governance).setOperator(this.signers.operator.address))
        .to.emit(this.registry, "TransferOperator")
        .withArgs(this.signers.operator.address, this.signers.governance.address);
      expect(await this.registry.operator()).to.equal(this.signers.operator.address);
    });

    it("1.6 Operator should be able to approve USDC", async function () {
      await expect(this.registry.connect(this.signers.operator)["approveToken(address)"](TypedTokens.USDC))
        .to.emit(this.registry, "LogToken")
        .withArgs(TypedTokens.USDC, true, this.signers.operator.address);
      expect(await this.registry.tokens(TypedTokens.USDC)).to.be.true;
    });

    it("1.7 Operator should be able to set tokens hash to tokens", async function () {
      await expect(this.registry.connect(this.signers.operator)["setTokensHashToTokens(address[])"]([TypedTokens.USDC]))
        .to.emit(this.registry, "LogTokensToTokensHash")
        .withArgs(USDC_TOKEN_HASH, this.signers.operator.address);
      expect(await this.registry.getTokensHashToTokenList(USDC_TOKEN_HASH)).to.include(TypedTokens.USDC);
      expect(await this.registry.getTokensHashIndexByHash(USDC_TOKEN_HASH)).to.equal(BigNumber.from("0"));
      expect(await this.registry.getTokenHashes()).to.include(USDC_TOKEN_HASH);
      expect(await this.registry.getTokensHashByIndex(0)).to.include(USDC_TOKEN_HASH);
    });

    it("1.8 Operator should be able to approve USDC liquidity pools", async function () {
      await expect(
        this.registry.connect(this.signers.operator)["approveLiquidityPool(address[])"](USDC_LIQUIDITY_POOLS),
      )
        .to.emit(this.registry, "LogLiquidityPool")
        .withArgs(USDC_LIQUIDITY_POOLS[0], true, this.signers.operator.address);
      expect((await this.registry.liquidityPools(USDC_LIQUIDITY_POOLS[0])).isLiquidityPool).to.be.true;
      expect((await this.registry.liquidityPools(USDC_LIQUIDITY_POOLS[1])).isLiquidityPool).to.be.true;
      expect((await this.registry.liquidityPools(USDC_LIQUIDITY_POOLS[2])).isLiquidityPool).to.be.true;
      expect((await this.registry.liquidityPools(USDC_LIQUIDITY_POOLS[3])).isLiquidityPool).to.be.true;
      expect((await this.registry.liquidityPools(USDC_LIQUIDITY_POOLS[4])).isLiquidityPool).to.be.true;
    });

    it("1.9 Risk Operator should be able to rate approved liquidity pools", async function () {
      const registryContractInstance = await hre.ethers.getContractAt(
        ESSENTIAL_CONTRACTS.REGISTRY,
        this.registry.address,
      );
      await expect(
        registryContractInstance.connect(this.signers.riskOperator)["rateLiquidityPool((address,uint8)[])"]([
          { pool: USDC_LIQUIDITY_POOLS[0], rate: 1 },
          { pool: USDC_LIQUIDITY_POOLS[1], rate: 2 },
          { pool: USDC_LIQUIDITY_POOLS[2], rate: 3 },
          { pool: USDC_LIQUIDITY_POOLS[3], rate: 4 },
          { pool: USDC_LIQUIDITY_POOLS[4], rate: 5 },
        ]),
      )
        .to.emit(this.registry, "LogRateLiquidityPool")
        .withArgs(USDC_LIQUIDITY_POOLS[0], 1, this.signers.riskOperator.address);
      expect((await this.registry.liquidityPools(USDC_LIQUIDITY_POOLS[0])).rating).to.be.equal(1);
      expect((await this.registry.liquidityPools(USDC_LIQUIDITY_POOLS[1])).rating).to.be.equal(2);
      expect((await this.registry.liquidityPools(USDC_LIQUIDITY_POOLS[2])).rating).to.be.equal(3);
      expect((await this.registry.liquidityPools(USDC_LIQUIDITY_POOLS[3])).rating).to.be.equal(4);
      expect((await this.registry.liquidityPools(USDC_LIQUIDITY_POOLS[4])).rating).to.be.equal(5);
    });

    it("1.10 Risk operator should be able to add the risk profile", async function () {
      await expect(
        this.registry
          .connect(this.signers.riskOperator)
          ["addRiskProfile(uint256,string,string,bool,(uint8,uint8))"]("2", "INTERMEDIATE", "INT", false, {
            lowerLimit: "1",
            upperLimit: "10",
          }),
      )
        .to.emit(this.registry, "LogRiskProfile")
        .withArgs("0", true, false, this.signers.riskOperator.address);
      const riskProfile = await this.registry.getRiskProfile("2");
      expect(riskProfile.index).to.be.equal("0");
      expect(riskProfile.canBorrow).to.be.false;
      expect(riskProfile.poolRatingsRange.lowerLimit).to.be.equal(BigNumber.from("1"));
      expect(riskProfile.poolRatingsRange.upperLimit).to.be.equal(BigNumber.from("10"));
      expect(riskProfile.exists).to.be.true;
      expect(riskProfile.name).to.be.equal("INTERMEDIATE");
      expect(riskProfile.symbol).to.be.equal("INT");
      expect((await this.registry.getRiskProfileList())[0]).to.equal("2");
    });

    it("1.11 Operator should be able to deploy HarvestCodeProvider", async function () {
      this.harvestCodeProvider = <HarvestCodeProvider>(
        await deployContract(hre, "HarvestCodeProvider", false, this.signers.operator, [this.registry.address])
      );
      assert.isDefined(this.harvestCodeProvider, "!HarvestCodeProvider");
    });
  });

  // describe("2. ", function () {
  //   it("2.1", async function () {
  //     console.log("2.1");
  //     expect(await this.registry.operator()).to.equal(this.signers.operator.address);
  //   });
  //   it("2.2", async function () {
  //     console.log("2.3");
  //     expect(await this.registry.operator()).to.equal(this.signers.operator.address);
  //   });
  // });
});
