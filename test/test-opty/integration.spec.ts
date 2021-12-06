import hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import chai, { expect, assert } from "chai";
import { solidity } from "ethereum-waffle";
import { Signers, to_10powNumber_BN } from "../../helpers/utils";
import { deployRegistry, deployVault } from "../../helpers/contracts-deployments";
import {
  AaveV1Adapter,
  AaveV1ETHGateway,
  AaveV2Adapter,
  APROracle,
  CompoundAdapter,
  CompoundETHGateway,
  CurveDepositPoolAdapter,
  CurveSwapETHGateway,
  CurveSwapPoolAdapter,
  ERC20,
  HarvestCodeProvider,
  InvestStrategyRegistry,
  Registry,
  RegistryProxy,
  RiskManager,
  RiskManagerProxy,
  StrategyManager,
  StrategyProvider,
  Vault,
} from "../../typechain";
import { ADDRESS_ZERO, ZERO_BYTES32 } from "../../helpers/constants/utils";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { TypedDefiPools, TypedTokens } from "../../helpers/data";
import { deployContract, generateStrategyHash, generateTokenHash } from "../../helpers/helpers";
import { fundWalletToken, getBlockTimestamp } from "../../helpers/contracts-actions";

chai.use(solidity);

const USDC_LIQUIDITY_POOLS = [
  TypedDefiPools.CompoundAdapter.usdc.pool,
  TypedDefiPools.AaveV1Adapter.usdc.pool,
  TypedDefiPools.AaveV2Adapter.usdc.pool,
  TypedDefiPools.CurveDepositPoolAdapter["usdc_dai+usdc+usdt+gusd"].pool,
  TypedDefiPools.CurveSwapPoolAdapter["usdc_3crv"].pool,
];

const USDC_TOKEN_HASH = generateTokenHash([TypedTokens.USDC]);

const USDC_COMPOUND_HASH = generateStrategyHash(
  [
    {
      contract: TypedDefiPools.CompoundAdapter.usdc.pool,
      outputToken: TypedDefiPools.CompoundAdapter.usdc.lpToken,
      isBorrow: false,
    },
  ],
  TypedTokens.USDC,
);

const USDC_AAVEV1_HASH = generateStrategyHash(
  [
    {
      contract: TypedDefiPools.AaveV1Adapter.usdc.pool,
      outputToken: TypedDefiPools.AaveV1Adapter.usdc.lpToken,
      isBorrow: false,
    },
  ],
  TypedTokens.USDC,
);

const USDC_AAVEV2_HASH = generateStrategyHash(
  [
    {
      contract: TypedDefiPools.AaveV2Adapter.usdc.pool,
      outputToken: TypedDefiPools.AaveV2Adapter.usdc.lpToken,
      isBorrow: false,
    },
  ],
  TypedTokens.USDC,
);

const USDC_CURVE_DEPOSIT_HASH = generateStrategyHash(
  [
    {
      contract: TypedDefiPools.CurveDepositPoolAdapter["usdc_dai+usdc+usdt+gusd"].pool,
      outputToken: TypedDefiPools.CurveDepositPoolAdapter["usdc_dai+usdc+usdt+gusd"].lpToken,
      isBorrow: false,
    },
  ],
  TypedTokens.USDC,
);

const USDC_CURVE_SWAP_HASH = generateStrategyHash(
  [
    {
      contract: TypedDefiPools.CurveSwapPoolAdapter["usdc_3crv"].pool,
      outputToken: TypedDefiPools.CurveSwapPoolAdapter["usdc_3crv"].lpToken,
      isBorrow: false,
    },
  ],
  TypedTokens.USDC,
);

describe("Integration tests", function () {
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
    this.signers.eve = signers[10];
  });
  describe("Deployment, config and actions", function () {
    it("0. Registry and Registry proxy deployment and connecting", async function () {
      this.registry = <Registry>await deployRegistry(hre, this.signers.admin, false);
      this.registryProxy = <RegistryProxy>(
        await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, this.registry.address)
      );
      assert.isDefined(this.registry, "!Registry and/pr !RegistryProxy");
      assert.isDefined(this.registryProxy, "!RegistryProxy");
    });
    it("1. Should have defaults role addresses on deployment as expected", async function () {
      expect(await this.registry.governance()).to.equal(this.signers.admin.address);
      expect(await this.registry.financeOperator()).to.equal(this.signers.admin.address);
      expect(await this.registry.riskOperator()).to.equal(this.signers.admin.address);
      expect(await this.registry.strategyOperator()).to.equal(this.signers.admin.address);
      expect(await this.registry.operator()).to.equal(this.signers.admin.address);
    });
    it("2. Should be to able to change the governance", async function () {
      await expect(this.registryProxy.setPendingGovernance(this.signers.governance.address))
        .to.emit(this.registryProxy, "NewPendingGovernance")
        .withArgs(ADDRESS_ZERO, this.signers.governance.address);
      await expect(this.registryProxy.connect(this.signers.governance).acceptGovernance())
        .to.emit(this.registryProxy, "NewGovernance")
        .withArgs(this.signers.admin.address, this.signers.governance.address);
      expect(await this.registry.governance()).to.equal(this.signers.governance.address);
    });
    it("3. New governance should be to able to change the finance operator", async function () {
      await expect(
        this.registry.connect(this.signers.governance).setFinanceOperator(this.signers.financeOperator.address),
      )
        .to.emit(this.registry, "TransferFinanceOperator")
        .withArgs(this.signers.financeOperator.address, this.signers.governance.address);
      expect(await this.registry.financeOperator()).to.equal(this.signers.financeOperator.address);
    });
    it("4. New governance should be to able to change the risk operator", async function () {
      await expect(this.registry.connect(this.signers.governance).setRiskOperator(this.signers.riskOperator.address))
        .to.emit(this.registry, "TransferRiskOperator")
        .withArgs(this.signers.riskOperator.address, this.signers.governance.address);
      expect(await this.registry.riskOperator()).to.equal(this.signers.riskOperator.address);
    });
    it("5. New governance should be to able to change the strategy operator", async function () {
      await expect(
        this.registry.connect(this.signers.governance).setStrategyOperator(this.signers.strategyOperator.address),
      )
        .to.emit(this.registry, "TransferStrategyOperator")
        .withArgs(this.signers.strategyOperator.address, this.signers.governance.address);
      expect(await this.registry.strategyOperator()).to.equal(this.signers.strategyOperator.address);
    });

    it("6. New governance should be to able to change the operator", async function () {
      await expect(this.registry.connect(this.signers.governance).setOperator(this.signers.operator.address))
        .to.emit(this.registry, "TransferOperator")
        .withArgs(this.signers.operator.address, this.signers.governance.address);
      expect(await this.registry.operator()).to.equal(this.signers.operator.address);
    });

    it("7. Operator should be able to approve USDC", async function () {
      await expect(this.registry.connect(this.signers.operator)["approveToken(address)"](TypedTokens.USDC))
        .to.emit(this.registry, "LogToken")
        .withArgs(TypedTokens.USDC, true, this.signers.operator.address);
      expect(await this.registry.tokens(TypedTokens.USDC)).to.be.true;
    });

    it("8. Operator should be able to set tokens hash to tokens", async function () {
      await expect(this.registry.connect(this.signers.operator)["setTokensHashToTokens(address[])"]([TypedTokens.USDC]))
        .to.emit(this.registry, "LogTokensToTokensHash")
        .withArgs(USDC_TOKEN_HASH, this.signers.operator.address);
      expect(await this.registry.getTokensHashToTokenList(USDC_TOKEN_HASH)).to.include(TypedTokens.USDC);
      expect(await this.registry.getTokensHashIndexByHash(USDC_TOKEN_HASH)).to.equal(BigNumber.from("0"));
      expect(await this.registry.getTokenHashes()).to.include(USDC_TOKEN_HASH);
      expect(await this.registry.getTokensHashByIndex(0)).to.include(USDC_TOKEN_HASH);
    });

    it("9. Operator should be able to approve USDC liquidity pools", async function () {
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

    it("10. Risk Operator should be able to rate approved liquidity pools", async function () {
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

    it("11. Risk operator should be able to add the risk profile", async function () {
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

    it("12. Deployer deploys HarvestCodeProvider and operator can register", async function () {
      this.harvestCodeProvider = <HarvestCodeProvider>(
        await deployContract(hre, "HarvestCodeProvider", false, this.signers.deployer, [this.registry.address])
      );
      assert.isDefined(this.harvestCodeProvider, "!HarvestCodeProvider");
      await this.registry.connect(this.signers.operator).setHarvestCodeProvider(this.harvestCodeProvider.address);
      expect(await this.registry.harvestCodeProvider()).to.equal(this.harvestCodeProvider.address);
    });

    it("13. Risk operator deploys Compound Adapter", async function () {
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

    it("14. Risk operator deploys AaveV1 Adapter", async function () {
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

    it("15. Risk operator deploys AaveV2 Adapter", async function () {
      this.aaveV2Adapter = <AaveV2Adapter>(
        await deployContract(hre, "AaveV2Adapter", false, this.signers.riskOperator, [this.registry.address])
      );
      assert.isDefined(this.aaveV2Adapter, "!AaveV2Adapter");
      expect(await this.aaveV2Adapter.maxDepositProtocolPct()).to.equal("10000");
      expect(await this.aaveV2Adapter.maxDepositProtocolMode()).to.equal(BigNumber.from("1"));
    });

    it("16. Risk operator/operator deploys CurveDepositPool Adapter", async function () {
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

    it("17. Risk operator deploys CurveSwapPool Adapter", async function () {
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

    it("18. Operator can register adapter to approved liquidity pools", async function () {
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

    it("19. Deployer can deploy InvestStrategyRegistry and Operator can register", async function () {
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
    it("20. Operator can set set USDC strategies for AaveV1, AaveV2, Compound and Curve", async function () {
      const investStrategyRegistryContractInstance = await hre.ethers.getContractAt(
        ESSENTIAL_CONTRACTS.INVEST_STRATEGY_REGISTRY,
        this.investStrategyRegistry.address,
      );
      await expect(
        investStrategyRegistryContractInstance
          .connect(this.signers.operator)
          ["setStrategy(bytes32,(address,address,bool)[][])"](USDC_TOKEN_HASH, [
            [
              {
                pool: TypedDefiPools.CompoundAdapter.usdc.pool,
                outputToken: TypedDefiPools.CompoundAdapter.usdc.lpToken,
                isBorrow: false,
              },
            ],

            [
              {
                pool: TypedDefiPools.AaveV1Adapter.usdc.pool,
                outputToken: TypedDefiPools.AaveV1Adapter.usdc.lpToken,
                isBorrow: false,
              },
            ],
            [
              {
                pool: TypedDefiPools.AaveV2Adapter.usdc.pool,
                outputToken: TypedDefiPools.AaveV2Adapter.usdc.lpToken,
                isBorrow: false,
              },
            ],

            [
              {
                pool: TypedDefiPools.CurveDepositPoolAdapter["usdc_dai+usdc+usdt+gusd"].pool,
                outputToken: TypedDefiPools.CurveDepositPoolAdapter["usdc_dai+usdc+usdt+gusd"].lpToken,
                isBorrow: false,
              },
            ],
            [
              {
                pool: TypedDefiPools.CurveSwapPoolAdapter["usdc_3crv"].pool,
                outputToken: TypedDefiPools.CurveSwapPoolAdapter["usdc_3crv"].lpToken,
                isBorrow: false,
              },
            ],
          ]),
      )
        .to.emit(this.investStrategyRegistry, "LogSetVaultInvestStrategy")
        .withArgs(
          USDC_TOKEN_HASH,
          generateStrategyHash(
            [
              {
                contract: TypedDefiPools.CurveSwapPoolAdapter["usdc_3crv"].pool,
                outputToken: TypedDefiPools.CurveSwapPoolAdapter["usdc_3crv"].lpToken,
                isBorrow: false,
              },
            ],
            TypedTokens.USDC,
          ),
          this.signers.operator.address,
        );
      expect(await this.investStrategyRegistry.getTokenToStrategies(USDC_TOKEN_HASH)).to.have.members([
        USDC_COMPOUND_HASH,
        USDC_AAVEV1_HASH,
        USDC_AAVEV2_HASH,
        USDC_CURVE_DEPOSIT_HASH,
        USDC_CURVE_SWAP_HASH,
      ]);
      const usdcComp = await this.investStrategyRegistry.getStrategy(USDC_COMPOUND_HASH);
      const usdcAaveV1 = await this.investStrategyRegistry.getStrategy(USDC_AAVEV1_HASH);
      const usdcAaveV2 = await this.investStrategyRegistry.getStrategy(USDC_AAVEV2_HASH);
      const usdcCurveDeposit = await this.investStrategyRegistry.getStrategy(USDC_CURVE_DEPOSIT_HASH);
      const usdcCurveSwap = await this.investStrategyRegistry.getStrategy(USDC_CURVE_SWAP_HASH);
      expect(usdcComp._index).to.equal("0");
      expect(usdcComp._strategySteps[0]).to.have.members([
        TypedDefiPools.CompoundAdapter.usdc.pool,
        TypedDefiPools.CompoundAdapter.usdc.lpToken,
        false,
      ]);
      expect(usdcAaveV1._index).to.equal("1");
      expect(usdcAaveV1._strategySteps[0]).to.have.members([
        TypedDefiPools.AaveV1Adapter.usdc.pool,
        TypedDefiPools.AaveV1Adapter.usdc.lpToken,
        false,
      ]);
      expect(usdcAaveV2._index).to.equal("2");
      expect(usdcAaveV2._strategySteps[0]).to.have.members([
        TypedDefiPools.AaveV2Adapter.usdc.pool,
        TypedDefiPools.AaveV2Adapter.usdc.lpToken,
        false,
      ]);

      expect(usdcCurveDeposit._index).to.equal("3");
      expect(usdcCurveDeposit._strategySteps[0]).to.have.members([
        TypedDefiPools.CurveDepositPoolAdapter["usdc_dai+usdc+usdt+gusd"].pool,
        TypedDefiPools.CurveDepositPoolAdapter["usdc_dai+usdc+usdt+gusd"].lpToken,
        false,
      ]);
      expect(usdcCurveSwap._index).to.equal("4");
      expect(usdcCurveSwap._strategySteps[0]).to.have.members([
        TypedDefiPools.CurveSwapPoolAdapter["usdc_3crv"].pool,
        TypedDefiPools.CurveSwapPoolAdapter["usdc_3crv"].lpToken,
        false,
      ]);
    });
    it("21. Strategy operator can deploy StrategyProvider and operator can register", async function () {
      this.strategyProvider = <StrategyProvider>(
        await deployContract(hre, ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, false, this.signers.strategyOperator, [
          this.registry.address,
        ])
      );
      assert.isDefined(this.strategyProvider, "!StrategyProvider");
      expect(await this.strategyProvider.registryContract()).to.equal(this.registry.address);
      expect(await this.strategyProvider.defaultStrategyState()).to.equal(BigNumber.from("1"));
      await this.registry.connect(this.signers.operator).setStrategyProvider(this.strategyProvider.address);
      expect(await this.registry.getStrategyProvider()).to.equal(this.strategyProvider.address);
    });
    it("22. Deployer can deploy RiskManager and operator can register it", async function () {
      this.riskManager = <RiskManager>(
        await deployContract(hre, ESSENTIAL_CONTRACTS.RISK_MANAGER, false, this.signers.deployer, [
          this.registry.address,
        ])
      );
      assert.isDefined(this.riskManager, "!RiskManager");
      this.riskManagerProxy = <RiskManagerProxy>(
        await deployContract(hre, ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY, false, this.signers.deployer, [
          this.registry.address,
        ])
      );
      assert.isDefined(this.riskManagerProxy, "!RiskManagerProxy");
      await this.riskManagerProxy.connect(this.signers.operator).setPendingImplementation(this.riskManager.address);
      await this.riskManager.connect(this.signers.governance).become(this.riskManagerProxy.address);
      this.riskManager = <RiskManager>(
        await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER, this.riskManagerProxy.address)
      );
      expect(await this.riskManager.registryContract()).to.equal(this.registry.address);
      await this.registry.connect(this.signers.operator).setRiskManager(this.riskManager.address);
      expect(await this.registry.getRiskManager()).to.equal(this.riskManager.address);
    });
    it("23. Deployer can deploy StrategyManager and operator can register it", async function () {
      this.strategyManager = <StrategyManager>(
        await deployContract(hre, ESSENTIAL_CONTRACTS.STRATEGY_MANAGER, false, this.signers.deployer, [
          this.registry.address,
        ])
      );
      assert(this.strategyManager, "!StrategyManager");
      await this.registry.connect(this.signers.operator).setStrategyManager(this.strategyManager.address);
      expect(await this.registry.getStrategyManager()).to.equal(this.strategyManager.address);
    });

    it("24. Operator can deploy and register APROracle", async function () {
      this.aprOracle = <APROracle>(
        await deployContract(hre, ESSENTIAL_CONTRACTS.APR_ORACLE, false, this.signers.operator, [this.registry.address])
      );
      assert.isDefined(this.aprOracle, "!APROracle");
      expect(await this.aprOracle.registryContract()).to.equal(this.registry.address);
      await this.registry.connect(this.signers.operator).setAPROracle(this.aprOracle.address);
      expect(await this.registry.getAprOracle()).to.equal(this.aprOracle.address);
    });

    it("25. Operator can deploy vault and admin can upgrade", async function () {
      this.vault = <Vault>(
        await deployVault(
          hre,
          this.registry.address,
          TypedTokens.USDC,
          this.signers.operator,
          this.signers.admin,
          "USD Coin",
          "USDC",
          2,
          false,
        )
      );
      expect(await this.vault.name()).to.equal("op USD Coin INTERMEDIATE");
      expect(await this.vault.symbol()).to.equal("opUSDCINT");
      expect(await this.vault.decimals()).to.equal(BigNumber.from("6"));
      expect(await this.vault.riskProfileCode()).to.equal("2");
    });

    it("26. Alice deposit*, withdraw*, rebalance and harvest transactions should fail", async function () {
      this.erc20 = <ERC20>await hre.ethers.getContractAt("ERC20", TypedTokens.USDC);
      const deadline = (await getBlockTimestamp(hre)) * 2;
      await fundWalletToken(
        hre,
        TypedTokens.USDC,
        this.signers.alice,
        BigNumber.from("1000000000"), // 1000 USDC
        deadline,
        this.signers.alice.address,
      );
      expect(await this.erc20.balanceOf(this.signers.alice.address)).to.equal(BigNumber.from("1000000000")); // 1000 USDC
      await this.erc20.connect(this.signers.alice).approve(this.vault.address, BigNumber.from("1000000000")); // 1000 USDC
      expect(await this.erc20.allowance(this.signers.alice.address, this.vault.address)).to.equal(
        BigNumber.from("1000000000"),
      ); // USDC
      await expect(this.vault.connect(this.signers.alice).userDepositAll()).to.revertedWith("paused or discontinued");
      await expect(this.vault.connect(this.signers.alice).userDepositAllRebalance()).to.revertedWith(
        "paused or discontinued",
      );
      await expect(this.vault.connect(this.signers.alice).userWithdrawAllRebalance()).to.revertedWith("e18");
      await expect(this.vault.connect(this.signers.alice).rebalance()).to.revertedWith("paused or discontinued");
      await expect(
        this.vault
          .connect(this.signers.alice)
          .harvest("0x0000000000000000000000000000000000000000000000000000000000000000"),
      ).to.revertedWith("caller is not the operator");
    });

    it("27. Governance can set maxVaultValueJump=1%", async function () {
      await this.vault.connect(this.signers.governance).setMaxVaultValueJump("100");
      expect(await this.vault.maxVaultValueJump()).to.equal(BigNumber.from("100"));
    });
    it("28. Operator can whitelist Alice,Bob for USDC vault", async function () {
      await this.registry
        .connect(this.signers.operator)
        .setWhitelistedUsers(this.vault.address, [this.signers.alice.address, this.signers.bob.address], true);
      expect(await this.registry.isUserWhitelisted(this.vault.address, this.signers.alice.address)).to.be.true;
      expect(await this.registry.isUserWhitelisted(this.vault.address, this.signers.bob.address)).to.be.true;
    });
    it("29. Finance Operator can set USDC vault configuration", async function () {
      await this.registry.connect(this.signers.financeOperator).setVaultConfiguration(
        this.vault.address,
        true,
        true,
        [],
        0,
        "10000000000", // 10,000 USDC
        "1000000000", //1000 USDC
        "1000000000000", //1,000,000 USDC
      );
      const vaultConfiguration = await this.registry.getVaultConfiguration(this.vault.address);
      expect(vaultConfiguration.discontinued).to.be.false;
      expect(vaultConfiguration.unpaused).to.be.false;
      expect(vaultConfiguration.isLimitedState).to.be.true;
      expect(vaultConfiguration.allowWhitelistedState).to.be.true;
      expect(vaultConfiguration.treasuryShares.length).to.be.equal(BigNumber.from("0"));
      expect(vaultConfiguration.withdrawalFee).to.be.equal(BigNumber.from("0"));
      expect(vaultConfiguration.userDepositCap).to.equal(BigNumber.from("10000000000"));
      expect(vaultConfiguration.minimumDepositAmount).to.equal(BigNumber.from("1000000000"));
      expect(vaultConfiguration.totalValueLockedLimitInUnderlying).to.equal(BigNumber.from("1000000000000"));
      expect(vaultConfiguration.queueCap).to.equal(BigNumber.from("0"));
    });
    it("30. Operator can set the queueCap for the USDC vault for userDeposit without rebalance", async function () {
      await this.registry.connect(this.signers.operator).setQueueCap(this.vault.address, "3");
      expect((await this.registry.getVaultConfiguration(this.vault.address)).queueCap).to.equal(BigNumber.from("3"));
    });
    it("31. Operator can unpause the vault", async function () {
      await this.registry.connect(this.signers.operator).unpauseVaultContract(this.vault.address, true);
      expect((await this.registry.getVaultConfiguration(this.vault.address)).unpaused).to.be.true;
    });
    it("32. Alice has to deposit atleast 1000 USDC without rebalance", async function () {
      await expect(this.vault.connect(this.signers.alice).userDeposit(BigNumber.from("1000000000")))
        .to.emit(this.vault, "DepositQueue")
        .withArgs(this.signers.alice.address, "1", BigNumber.from("1000000000"));
      expect((await this.vault.getDepositQueue()).length).to.equal(BigNumber.from("1"));
      expect(await this.erc20.balanceOf(this.vault.address)).to.equal(BigNumber.from("1000000000"));
      expect(await this.vault.balance()).to.equal(BigNumber.from("1000000000"));
      expect(await this.vault.pendingDeposits(this.signers.alice.address)).to.equal(BigNumber.from("1000000000"));
      expect(await this.vault.totalDeposits(this.signers.alice.address)).to.equal(BigNumber.from("1000000000"));
      expect(await this.vault.depositQueue()).to.equal(BigNumber.from("1000000000"));
      const userDepositOperation = await this.vault.queue("0");
      expect(userDepositOperation.account).to.equal(this.signers.alice.address);
      expect(userDepositOperation.value).to.equal(BigNumber.from("1000000000"));
      expect(await this.vault.totalSupply()).to.equal(BigNumber.from("0"));
      expect(await this.vault.balanceOf(this.signers.alice.address)).to.equal(BigNumber.from("0"));
    });
    it("33. Eve cannot do deposit*/withdraw* transaction", async function () {
      await expect(this.vault.connect(this.signers.eve).userDeposit(BigNumber.from("1000000000"))).to.revertedWith(
        "e12",
      );
      await expect(
        this.vault.connect(this.signers.eve).userDepositRebalance(BigNumber.from("1000000000")),
      ).to.revertedWith("e12");
      await expect(
        this.vault.connect(this.signers.eve).userWithdrawRebalance(BigNumber.from("1000000000")),
      ).to.revertedWith("e20");
    });
    it("34. Bob cannot deposit less than 1000 USDC without rebalance", async function () {
      await expect(this.vault.connect(this.signers.bob).userDeposit(BigNumber.from("900000000"))).revertedWith("e15");
    });
    it("35. Bob has to deposit atleast 1000 USDC without rebalance", async function () {
      const deadline = (await getBlockTimestamp(hre)) * 2;
      await fundWalletToken(
        hre,
        TypedTokens.USDC,
        this.signers.bob,
        BigNumber.from("1000000000"), // 1000 USDC
        deadline,
        this.signers.bob.address,
      );
      expect(await this.erc20.balanceOf(this.signers.bob.address)).to.equal(BigNumber.from("1000000000")); // 1000 USDC
      await this.erc20.connect(this.signers.bob).approve(this.vault.address, BigNumber.from("1000000000")); // 1000 USDC
      expect(await this.erc20.allowance(this.signers.bob.address, this.vault.address)).to.equal(
        BigNumber.from("1000000000"),
      ); // USDC

      await expect(this.vault.connect(this.signers.bob).userDeposit(BigNumber.from("1000000000")))
        .to.emit(this.vault, "DepositQueue")
        .withArgs(this.signers.bob.address, "2", BigNumber.from("1000000000"));
      expect((await this.vault.getDepositQueue()).length).to.equal(BigNumber.from("2"));
      expect(await this.erc20.balanceOf(this.vault.address)).to.equal(BigNumber.from("2000000000"));
      expect(await this.vault.balance()).to.equal(BigNumber.from("2000000000"));
      expect(await this.vault.pendingDeposits(this.signers.bob.address)).to.equal(BigNumber.from("1000000000"));
      expect(await this.vault.totalDeposits(this.signers.bob.address)).to.equal(BigNumber.from("1000000000"));
      expect(await this.vault.depositQueue()).to.equal(BigNumber.from("2000000000"));
      const userDepositOperation = await this.vault.queue("1");
      expect(userDepositOperation.account).to.equal(this.signers.bob.address);
      expect(userDepositOperation.value).to.equal(BigNumber.from("1000000000"));
      expect(await this.vault.totalSupply()).to.equal(BigNumber.from("0"));
      expect(await this.vault.balanceOf(this.signers.bob.address)).to.equal(BigNumber.from("0"));
    });
    it("36. Operator can rebalance and Alice,Bob should receive there shares. DefaultStrategyState is CompoundOrAave", async function () {
      const expectedCurrentStrategy = await this.riskManager.getBestStrategy("2", [TypedTokens.USDC]);
      await expect(this.vault.connect(this.signers.operator).rebalance())
        .to.emit(this.vault, "Transfer")
        .withArgs(ADDRESS_ZERO, this.signers.bob.address, BigNumber.from("1000000000"));
      expect(await this.vault.investStrategyHash()).to.equal(expectedCurrentStrategy);
      expect(await this.vault.balanceOf(this.signers.alice.address)).to.equal(BigNumber.from("1000000000"));
      expect(await this.vault.balanceOf(this.signers.bob.address)).to.equal(BigNumber.from("1000000000"));
      expect(await this.vault.totalSupply()).to.equal(BigNumber.from("2000000000"));
      expect(await this.erc20.balanceOf(this.vault.address)).to.equal(BigNumber.from("0"));
      expect(await this.vault.pendingDeposits(this.signers.alice.address)).to.equal(BigNumber.from("0"));
      expect(await this.vault.pendingDeposits(this.signers.bob.address)).to.equal(BigNumber.from("0"));
      expect(await this.vault.totalDeposits(this.signers.alice.address)).to.equal(BigNumber.from("1000000000"));
      expect(await this.vault.totalDeposits(this.signers.bob.address)).to.equal(BigNumber.from("1000000000"));
      expect((await this.vault.getDepositQueue()).length).to.equal(BigNumber.from("0"));
      expect(await this.vault.depositQueue()).to.equal(BigNumber.from("0"));
    });
    it("37. Bob tries a failed attempt to deposit beyond maxDepositCap of 10k", async function () {
      const deadline = (await getBlockTimestamp(hre)) * 2;
      await fundWalletToken(
        hre,
        TypedTokens.USDC,
        this.signers.bob,
        BigNumber.from("10000000000"), // 10000 USDC
        deadline,
        this.signers.bob.address,
      );
      expect(await this.erc20.balanceOf(this.signers.bob.address)).to.equal(BigNumber.from("10000000000")); // 10000 USDC
      await this.erc20.connect(this.signers.bob).approve(this.vault.address, BigNumber.from("10000000000")); // 10000 USDC
      expect(await this.erc20.allowance(this.signers.bob.address, this.vault.address)).to.equal(
        BigNumber.from("10000000000"),
      ); // USDC

      await expect(this.vault.connect(this.signers.bob).userDeposit(BigNumber.from("10000000000"))).revertedWith("e13");
    });
    it("38. Finance operator increases the userDepositCap", async function () {
      await expect(
        this.registry
          .connect(this.signers.financeOperator)
          .setUserDepositCap(this.vault.address, BigNumber.from("550000000000")),
      )
        .to.emit(this.registry, "LogUserDepositCapVault")
        .withArgs(this.vault.address, BigNumber.from("550000000000"), this.signers.financeOperator.address);
      expect((await this.registry.getVaultConfiguration(this.vault.address)).userDepositCap).to.equal(
        BigNumber.from("550000000000"),
      );
    });
    it("39. Big fish Bob can now successfully deposit 499K", async function () {
      const deadline = (await getBlockTimestamp(hre)) * 2;
      await fundWalletToken(
        hre,
        TypedTokens.USDC,
        this.signers.bob,
        BigNumber.from("489000000000"), // 489k USDC
        deadline,
        this.signers.bob.address,
      );
      expect(await this.erc20.balanceOf(this.signers.bob.address)).to.equal(BigNumber.from("499000000000")); // 499k USDC
      await this.erc20.connect(this.signers.bob).approve(this.vault.address, BigNumber.from("499000000000")); // 499k USDC
      expect(await this.erc20.allowance(this.signers.bob.address, this.vault.address)).to.equal(
        BigNumber.from("499000000000"),
      ); // USDC
      await expect(this.vault.connect(this.signers.bob).userDeposit(BigNumber.from("499000000000")))
        .to.emit(this.vault, "DepositQueue")
        .withArgs(this.signers.bob.address, "1", BigNumber.from("499000000000"));

      expect((await this.vault.getDepositQueue()).length).to.equal(BigNumber.from("1"));
      expect(await this.erc20.balanceOf(this.vault.address)).to.equal(BigNumber.from("499000000000"));
      expect(await this.vault.balance()).to.equal(BigNumber.from("499000000000"));
      expect(await this.vault.pendingDeposits(this.signers.bob.address)).to.equal(BigNumber.from("499000000000"));
      expect(await this.vault.totalDeposits(this.signers.bob.address)).to.equal(BigNumber.from("500000000000"));
      expect(await this.vault.depositQueue()).to.equal(BigNumber.from("499000000000"));
      const userDepositOperation = await this.vault.queue("0");
      expect(userDepositOperation.account).to.equal(this.signers.bob.address);
      expect(userDepositOperation.value).to.equal(BigNumber.from("499000000000"));
      expect(await this.vault.totalSupply()).to.equal(BigNumber.from("2000000000"));
      expect(await this.vault.balanceOf(this.signers.bob.address)).to.equal(BigNumber.from("1000000000"));
    });
    it("40. Another Big fish Alice does failed attempt to go beyond TVL cap of vault", async function () {
      const deadline = (await getBlockTimestamp(hre)) * 2;
      await fundWalletToken(
        hre,
        TypedTokens.USDC,
        this.signers.alice,
        BigNumber.from("510000000000"), // 510k USDC
        deadline,
        this.signers.alice.address,
      );
      expect(await this.erc20.balanceOf(this.signers.alice.address)).to.equal(BigNumber.from("510000000000")); // 510k USDC
      await this.erc20.connect(this.signers.alice).approve(this.vault.address, BigNumber.from("510000000000")); // 510k USDC
      expect(await this.erc20.allowance(this.signers.alice.address, this.vault.address)).to.equal(
        BigNumber.from("510000000000"),
      ); // USDC
      await expect(this.vault.connect(this.signers.alice).userDeposit(BigNumber.from("510000000000"))).to.revertedWith(
        "e22",
      );
      expect((await this.vault.getDepositQueue()).length).to.equal(BigNumber.from("1"));
      expect(await this.erc20.balanceOf(this.vault.address)).to.equal(BigNumber.from("499000000000"));
      expect(await this.vault.balance()).to.equal(BigNumber.from("499000000000"));
      expect(await this.vault.pendingDeposits(this.signers.bob.address)).to.equal(BigNumber.from("499000000000"));
      expect(await this.vault.totalDeposits(this.signers.bob.address)).to.equal(BigNumber.from("500000000000"));
      expect(await this.vault.depositQueue()).to.equal(BigNumber.from("499000000000"));
      const userDepositOperation = await this.vault.queue("0");
      expect(userDepositOperation.account).to.equal(this.signers.bob.address);
      expect(userDepositOperation.value).to.equal(BigNumber.from("499000000000"));
      expect(await this.vault.totalSupply()).to.equal(BigNumber.from("2000000000"));
      expect(await this.vault.balanceOf(this.signers.bob.address)).to.equal(BigNumber.from("1000000000"));
    });

    it("41. The strategy operator can set the best strategy to be 3crv", async function () {
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy(BigNumber.from("2"), USDC_TOKEN_HASH, USDC_CURVE_SWAP_HASH);
      expect(await this.strategyProvider.rpToTokenToBestStrategy(BigNumber.from("2"), USDC_TOKEN_HASH)).to.equal(
        USDC_CURVE_SWAP_HASH,
      );
    });

    it("42. The Big fish Alice can successfully withdraw 500 shares", async function () {
      await expect(this.vault.connect(this.signers.alice).userWithdrawRebalance(BigNumber.from("500000000")))
        .to.emit(this.vault, "Transfer")
        .withArgs(this.signers.alice.address, ADDRESS_ZERO, BigNumber.from("500000000"));
      expect(await this.vault.investStrategyHash()).to.equal(USDC_CURVE_SWAP_HASH);
      expect(await this.vault.balanceOf(this.signers.alice.address)).to.equal(BigNumber.from("500000000"));
      expect(await this.vault.balance()).to.equal(BigNumber.from("0"));
      expect(await this.vault.pendingDeposits(this.signers.bob.address)).to.equal(BigNumber.from("0"));
      expect(await this.vault.depositQueue()).to.equal(BigNumber.from("0"));
      expect(await this.vault.balanceOf(this.signers.bob.address)).to.closeTo(BigNumber.from("499999985030"), 1000000);
      expect(await this.vault.totalSupply()).to.closeTo(BigNumber.from("500499985030"), 1000000);
    });

    it("43. The big fish Bob can successfully withdraw 100K shares", async function () {
      await expect(this.vault.connect(this.signers.bob).userWithdrawRebalance(BigNumber.from("100000000000")))
        .to.emit(this.vault, "Transfer")
        .withArgs(this.signers.bob.address, ADDRESS_ZERO, BigNumber.from("100000000000"));
      expect(await this.vault.balanceOf(this.signers.bob.address)).to.closeTo(BigNumber.from("399999985030"), 1000000);
      expect(await this.vault.totalDeposits(this.signers.alice.address)).to.equal(BigNumber.from("1000000000"));
      expect(await this.vault.totalDeposits(this.signers.bob.address)).to.equal(BigNumber.from("500000000000"));
      expect(await this.vault.totalSupply()).to.closeTo(BigNumber.from("400499985030"), 1000000);
    });

    it("44. The strategy operator can set the best strategy to be Compound USDC", async function () {
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy(BigNumber.from("2"), USDC_TOKEN_HASH, USDC_COMPOUND_HASH);
      expect(await this.strategyProvider.rpToTokenToBestStrategy(BigNumber.from("2"), USDC_TOKEN_HASH)).to.equal(
        USDC_COMPOUND_HASH,
      );
    });

    it("45. Big whale Bob does a failed attempt to deposit 60000 USDC with rebalance", async function () {
      await this.erc20.connect(this.signers.bob).approve(this.vault.address, BigNumber.from("60000000000")); // 1000 USDC
      expect(await this.erc20.allowance(this.signers.bob.address, this.vault.address)).to.equal(
        BigNumber.from("60000000000"),
      );
      await expect(
        this.vault.connect(this.signers.bob).userDepositRebalance(BigNumber.from("60000000000")),
      ).revertedWith("e13");
    });

    it("46. Big whale Bob can deposit 30000 USDC with rebalance", async function () {
      const sharesBefore: BigNumber = await this.vault.balanceOf(this.signers.bob.address);
      await expect(this.vault.connect(this.signers.bob).userDepositRebalance(BigNumber.from("30000000000")))
        .to.emit(this.erc20, "Transfer")
        .withArgs(this.signers.bob.address, this.vault.address, BigNumber.from("30000000000"));
      const sharesAfter: BigNumber = await this.vault.balanceOf(this.signers.bob.address);
      expect(sharesAfter).to.gt(sharesBefore);
      expect(await this.vault.investStrategyHash()).to.equal(USDC_COMPOUND_HASH);
      expect(await this.vault.totalDeposits(this.signers.bob.address)).to.equal(BigNumber.from("530000000000"));
    });
    it("47. Strategy operator can set default strategy to Aave v2 USDC strategy, defaultStrategyState to zero", async function () {
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy(BigNumber.from("2"), USDC_TOKEN_HASH, ZERO_BYTES32);
      expect(await this.strategyProvider.rpToTokenToBestStrategy(BigNumber.from("2"), USDC_TOKEN_HASH)).to.equal(
        ZERO_BYTES32,
      );
      await this.strategyProvider.connect(this.signers.strategyOperator).setDefaultStrategyState(BigNumber.from("0"));
      expect(await this.strategyProvider.getDefaultStrategyState()).to.equal(BigNumber.from("0"));
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestDefaultStrategy(BigNumber.from("2"), USDC_TOKEN_HASH, USDC_AAVEV2_HASH);
      expect(await this.strategyProvider.rpToTokenToDefaultStrategy(BigNumber.from("2"), USDC_TOKEN_HASH)).to.equal(
        USDC_AAVEV2_HASH,
      );
      expect(await this.riskManager.getBestStrategy(BigNumber.from("2"), [TypedTokens.USDC])).to.equal(
        USDC_AAVEV2_HASH,
      );
    });
    it("48. Deposit :Alice - 4K and Bob - 2K USDC each, verify queuecap", async function () {
      await this.vault.connect(this.signers.alice).userDeposit(BigNumber.from("2000000000"));
      await this.vault.connect(this.signers.bob).userDeposit(BigNumber.from("2000000000"));
      await this.vault.connect(this.signers.alice).userDeposit(BigNumber.from("2000000000"));
      expect((await this.vault.getDepositQueue()).length).to.equal(BigNumber.from("3"));
      await expect(this.vault.connect(this.signers.bob).userDeposit(BigNumber.from("2000000000"))).revertedWith("e14");
      expect(await this.vault.balance()).to.equal(BigNumber.from("6000000000"));
    });
    it("49. Operator rebalances, strategy should be USDC Aavev2", async function () {
      await this.vault.connect(this.signers.operator).rebalance();
      expect(await this.vault.investStrategyHash()).to.equal(USDC_AAVEV2_HASH);
      expect((await this.vault.getDepositQueue()).length).to.equal(BigNumber.from("0"));
      expect(await this.vault.balance()).to.equal(BigNumber.from("0"));
    });
    it("50. Strategy operator sets zero strategy", async function () {
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestDefaultStrategy(BigNumber.from("2"), USDC_TOKEN_HASH, ZERO_BYTES32);
      expect(await this.strategyProvider.rpToTokenToDefaultStrategy(BigNumber.from("2"), USDC_TOKEN_HASH)).to.equal(
        ZERO_BYTES32,
      );
      expect(await this.strategyProvider.rpToTokenToDefaultStrategy(BigNumber.from("2"), USDC_TOKEN_HASH)).to.equal(
        ZERO_BYTES32,
      );
      expect(await this.riskManager.getBestStrategy(BigNumber.from("2"), [TypedTokens.USDC])).to.equal(ZERO_BYTES32);
    });
    it("51. Deposit : Alice - 2K Bob - 4K USDC each, operator rebalance to zero", async function () {
      await this.vault.connect(this.signers.bob).userDeposit(BigNumber.from("2000000000"));
      await this.vault.connect(this.signers.alice).userDeposit(BigNumber.from("2000000000"));
      await this.vault.connect(this.signers.bob).userDeposit(BigNumber.from("2000000000"));
      expect((await this.vault.getDepositQueue()).length).to.equal(BigNumber.from("3"));
      const balanceBefore: BigNumber = await this.vault.balance();
      await this.vault.connect(this.signers.operator).rebalance();
      expect((await this.vault.getDepositQueue()).length).to.equal(BigNumber.from("0"));
      expect(await this.vault.investStrategyHash()).to.equal(ZERO_BYTES32);
      const balanceAfter: BigNumber = await this.vault.balance();
      expect(balanceAfter).to.gt(balanceBefore);
      console.log(
        `Alice shares : ${BigNumber.from(await this.vault.balanceOf(this.signers.alice.address))
          .div(to_10powNumber_BN(BigNumber.from("6")))
          .toString()} opINTUSDC`,
      );
      console.log(
        `Bob shares : ${BigNumber.from(await this.vault.balanceOf(this.signers.bob.address))
          .div(to_10powNumber_BN(BigNumber.from("6")))
          .toString()} opINTUSDC`,
      );
    });
    it("52. Strategy operator changes best strategy to USDC Curve gusd", async function () {
      await this.strategyProvider
        .connect(this.signers.strategyOperator)
        .setBestStrategy(BigNumber.from("2"), USDC_TOKEN_HASH, USDC_CURVE_DEPOSIT_HASH);
      expect(await this.riskManager.getBestStrategy(BigNumber.from("2"), [TypedTokens.USDC])).to.equal(
        USDC_CURVE_DEPOSIT_HASH,
      );
    });
    it("53. The operator rebalances", async function () {
      await this.vault.connect(this.signers.operator).rebalance();
      expect(await this.vault.investStrategyHash()).to.equal(USDC_CURVE_DEPOSIT_HASH);
      expect(await this.vault.balance()).to.equal(BigNumber.from("0"));
    });
  });
});
