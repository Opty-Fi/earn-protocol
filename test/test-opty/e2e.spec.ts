import hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import chai, { expect, assert } from "chai";
import { solidity } from "ethereum-waffle";
import { Signers } from "../../helpers/utils";
import { deployRegistry } from "../../helpers/contracts-deployments";
import {
  AaveV1Adapter,
  AaveV1ETHGateway,
  AaveV2Adapter,
  CompoundAdapter,
  CompoundETHGateway,
  CurveDepositPoolAdapter,
  CurveSwapETHGateway,
  CurveSwapPoolAdapter,
  HarvestCodeProvider,
  InvestStrategyRegistry,
  Registry,
  RegistryProxy,
} from "../../typechain";
import { ADDRESS_ZERO } from "../../helpers/constants/utils";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { TypedDefiPools, TypedTokens } from "../../helpers/data";
import { deployContract, generateTokenHash } from "../../helpers/helpers";

chai.use(solidity);

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
  describe("Deployment, config and actions", function () {
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

    it("1.11 Deployer deploys HarvestCodeProvider and operator can register", async function () {
      this.harvestCodeProvider = <HarvestCodeProvider>(
        await deployContract(hre, "HarvestCodeProvider", false, this.signers.deployer, [this.registry.address])
      );
      assert.isDefined(this.harvestCodeProvider, "!HarvestCodeProvider");
      await this.registry.connect(this.signers.operator).setHarvestCodeProvider(this.harvestCodeProvider.address);
      expect(await this.registry.harvestCodeProvider()).to.equal(this.harvestCodeProvider.address);
    });

    it("1.12 Risk operator deploys Compound Adapter", async function () {
      this.compoundAdapter = <CompoundAdapter>(
        await deployContract(hre, "CompoundAdapter", false, this.signers.riskOperator, [this.registry.address])
      );
      assert.isDefined(this.compoundAdapter, "!CompoundAdapter");
      expect(await this.compoundAdapter.maxDepositProtocolPct()).to.equal("10000");
      expect(await this.compoundAdapter.maxDepositProtocolMode()).to.equal(BigNumber.from("1"));
      this.compoundEthGateway = <CompoundETHGateway>(
        await hre.ethers.getContractAt("CompoundETHGateway", await this.compoundAdapter.compoundETHGatewayContract())
      );
      assert.isDefined(this.compoundEthGateway, "!CompoundETHGateway");
      expect(await this.compoundEthGateway.registryContract()).to.equal(this.registry.address);
      expect(await this.compoundAdapter.CETH()).to.equal(await this.compoundEthGateway.CETH());
    });

    it("1.13 Risk operator deploys AaveV1 Adapter", async function () {
      this.aavev1Adapter = <AaveV1Adapter>(
        await deployContract(hre, "AaveV1Adapter", false, this.signers.riskOperator, [this.registry.address])
      );
      assert.isDefined(this.aavev1Adapter, "!AaveV1Adapter");
      expect(await this.aavev1Adapter.maxDepositProtocolPct()).to.equal("10000");
      expect(await this.aavev1Adapter.maxDepositProtocolMode()).to.equal(BigNumber.from("1"));
      this.aaveV1EthGateway = <AaveV1ETHGateway>(
        await hre.ethers.getContractAt("AaveV1ETHGateway", await this.aavev1Adapter.aaveV1ETHGatewayContract())
      );
      assert.isDefined(this.aaveV1EthGateway, "!AaveV1ETHGateway");
      expect(await this.aaveV1EthGateway.registryContract()).to.equal(this.registry.address);
      expect(await this.aavev1Adapter.AETH()).to.equal(await this.aaveV1EthGateway.AETH());
    });

    it("1.14 Risk operator deploys AaveV2 Adapter", async function () {
      this.aaveV2Adapter = <AaveV2Adapter>(
        await deployContract(hre, "AaveV2Adapter", false, this.signers.riskOperator, [this.registry.address])
      );
      assert.isDefined(this.aaveV2Adapter, "!AaveV2Adapter");
      expect(await this.aaveV2Adapter.maxDepositProtocolPct()).to.equal("10000");
      expect(await this.aaveV2Adapter.maxDepositProtocolMode()).to.equal(BigNumber.from("1"));
    });

    it("1.15 Risk operator/operator deploys CurveDepositPool Adapter", async function () {
      // Note : For deploying CurveDepositPool, operator and risk operator should have same address
      await this.registry.connect(this.signers.governance).setOperator(this.signers.riskOperator.address);
      expect(await this.registry.operator()).to.equal(this.signers.riskOperator.address);
      this.curveDepositPoolAdapter = <CurveDepositPoolAdapter>(
        await deployContract(hre, "CurveDepositPoolAdapter", false, this.signers.riskOperator, [this.registry.address])
      );
      assert.isDefined(this.curveDepositPoolAdapter, "!CurveDepositPoolAdapter");
      expect(await this.curveDepositPoolAdapter.maxDepositProtocolPct()).to.equal("10000");
      expect(await this.curveDepositPoolAdapter.maxDepositProtocolMode()).to.equal(BigNumber.from("1"));
    });

    it("1.16 Risk operator deploys CurveSwapPool Adapter", async function () {
      // Note : For deploying CurveDepositPool, operator and risk operator should have same address
      this.curveSwapPoolAdapter = <CurveSwapPoolAdapter>(
        await deployContract(hre, "CurveSwapPoolAdapter", false, this.signers.riskOperator, [this.registry.address])
      );
      assert.isDefined(this.curveDepositPoolAdapter, "!CurveSwapPoolAdapter");
      expect(await this.curveDepositPoolAdapter.maxDepositProtocolPct()).to.equal("10000");
      expect(await this.curveDepositPoolAdapter.maxDepositProtocolMode()).to.equal(BigNumber.from("1"));
      this.curveSwapEthGateway = <CurveSwapETHGateway>(
        await hre.ethers.getContractAt(
          "CurveSwapETHGateway",
          await this.curveSwapPoolAdapter.curveSwapETHGatewayContract(),
        )
      );
      assert.isDefined(this.curveSwapEthGateway, "!CurveSwapETHGateway");
      expect(await this.curveSwapEthGateway.registryContract()).to.equal(this.registry.address);
      const ETH_stETH_STABLESWAP = await this.curveSwapPoolAdapter.ETH_sETH_STABLESWAP();
      expect(await this.curveSwapEthGateway.ethPools(ETH_stETH_STABLESWAP)).to.be.true;
      // give operator back its control
      await this.registry.connect(this.signers.governance).setOperator(this.signers.operator.address);
      expect(await this.registry.operator()).to.equal(this.signers.operator.address);
    });

    it("1.17 Operator can register adapter to approved liquidity pools", async function () {
      const registryContractInstance = await hre.ethers.getContractAt(
        ESSENTIAL_CONTRACTS.REGISTRY,
        this.registry.address,
      );
      await expect(
        registryContractInstance.connect(this.signers.operator)["setLiquidityPoolToAdapter((address,address)[])"]([
          {
            pool: TypedDefiPools.CompoundAdapter.usdc.pool,
            adapter: this.compoundAdapter.address,
          },
          {
            pool: TypedDefiPools.AaveV1Adapter.usdc.pool,
            adapter: this.aavev1Adapter.address,
          },
          {
            pool: TypedDefiPools.AaveV2Adapter.usdc.pool,
            adapter: this.aaveV2Adapter.address,
          },
          {
            pool: TypedDefiPools.CurveDepositPoolAdapter["usdc_dai+usdc+usdt+gusd"].pool,
            adapter: this.curveDepositPoolAdapter.address,
          },
          {
            pool: TypedDefiPools.CurveSwapPoolAdapter["usdc_3crv"].pool,
            adapter: this.curveSwapPoolAdapter.address,
          },
        ]),
      )
        .to.emit(this.registry, "LogLiquidityPoolToAdapter")
        .withArgs(
          TypedDefiPools.CurveSwapPoolAdapter["usdc_3crv"].pool,
          this.curveSwapPoolAdapter.address,
          this.signers.operator.address,
        );
      expect(await this.registry.getLiquidityPoolToAdapter(TypedDefiPools.CompoundAdapter.usdc.pool)).to.equal(
        this.compoundAdapter.address,
      );
      expect(await this.registry.getLiquidityPoolToAdapter(TypedDefiPools.AaveV1Adapter.usdc.pool)).to.equal(
        this.aavev1Adapter.address,
      );
      expect(await this.registry.getLiquidityPoolToAdapter(TypedDefiPools.AaveV2Adapter.usdc.pool)).to.equal(
        this.aaveV2Adapter.address,
      );
      expect(
        await this.registry.getLiquidityPoolToAdapter(
          TypedDefiPools.CurveDepositPoolAdapter["usdc_dai+usdc+usdt+gusd"].pool,
        ),
      ).to.equal(this.curveDepositPoolAdapter.address);
      expect(
        await this.registry.getLiquidityPoolToAdapter(TypedDefiPools.CurveSwapPoolAdapter["usdc_3crv"].pool),
      ).to.equal(this.curveSwapPoolAdapter.address);
    });

    it("1.18 Deployer can deploy InvestStrategyRegistry and Operator can register", async function () {
      this.investStrategyRegistry = <InvestStrategyRegistry>(
        await deployContract(hre, ESSENTIAL_CONTRACTS.INVEST_STRATEGY_REGISTRY, false, this.signers.deployer, [
          this.registry.address,
        ])
      );
      assert.isDefined(this.investStrategyRegistry, "!InvestStrategyRegistry");
      expect(await this.investStrategyRegistry.registryContract()).to.equal(this.registry.address);
      await this.registry.connect(this.signers.operator).setInvestStrategyRegistry(this.investStrategyRegistry.address);
      expect(await this.registry.getInvestStrategyRegistry()).to.equal(this.investStrategyRegistry.address);
    });
  });
});
