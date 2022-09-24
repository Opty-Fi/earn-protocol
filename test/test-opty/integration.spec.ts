import hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { BigNumber } from "ethers";
import chai, { expect, assert } from "chai";
import { solidity } from "ethereum-waffle";
import {
  assertVaultConfiguration,
  getAccountsMerkleProof,
  getAccountsMerkleRoot,
  getRiskProfileCode,
  Signers,
} from "../../helpers/utils";
import { deployRegistry, deployVault } from "../../helpers/contracts-deployments";
import {
  AaveV1Adapter,
  AaveV1ETHGateway,
  AaveV2Adapter,
  CompoundAdapter,
  CompoundETHGateway,
  ConvexFinanceAdapter,
  CurveDepositPoolAdapter,
  CurveMetapoolSwapAdapter,
  CurveSwapETHGateway,
  CurveSwapPoolAdapter,
  ERC20,
  HarvestCodeProvider,
  Registry,
  RegistryProxy,
  RiskManager,
  RiskManagerProxy,
  StrategyManager,
  StrategyProvider,
  Vault,
} from "../../typechain";
import { ESSENTIAL_CONTRACTS } from "../../helpers/constants/essential-contracts-name";
import { TypedTokens } from "../../helpers/data";
import { deployContract, generateStrategyHashV2, generateTokenHashV2 } from "../../helpers/helpers";
import { fundWalletToken, getBlockTimestamp } from "../../helpers/contracts-actions";
import { StrategiesByTokenByChain } from "../../helpers/data/adapter-with-strategies";
import { eEVMNetwork, NETWORKS_CHAIN_ID_HEX } from "../../helper-hardhat-config";
import { PoolRate } from "../../helpers/type";

chai.use(solidity);

const fork = process.env.FORK as eEVMNetwork;

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
        .withArgs(hre.ethers.constants.AddressZero, this.signers.governance.address);
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

    it("7. Operator should be able to approve tokens", async function () {
      for (const token of Object.keys(StrategiesByTokenByChain[fork]["Earn"])) {
        await expect(this.registry.connect(this.signers.operator)["approveToken(address)"](TypedTokens[token]))
          .to.emit(this.registry, "LogToken")
          .withArgs(TypedTokens[token], true, this.signers.operator.address);
        expect(await this.registry.tokens(TypedTokens[token])).to.be.true;
      }
    });

    it("8. Operator should be able to set tokens hash to tokens", async function () {
      let tokenIndex = 0;
      for (const token of Object.keys(StrategiesByTokenByChain[fork]["Earn"])) {
        const tokenHash = generateTokenHashV2([TypedTokens[token]], NETWORKS_CHAIN_ID_HEX[fork]);
        await expect(
          this.registry
            .connect(this.signers.operator)
            ["setTokensHashToTokens(bytes32,address[])"](tokenHash, [TypedTokens[token]]),
        )
          .to.emit(this.registry, "LogTokensToTokensHash")
          .withArgs(tokenHash, this.signers.operator.address);
        expect(await this.registry.getTokensHashToTokenList(tokenHash)).to.include(TypedTokens[token]);
        expect(await this.registry.getTokensHashIndexByHash(tokenHash)).to.equal(BigNumber.from(tokenIndex));
        expect(await this.registry.getTokenHashes()).to.include(tokenHash);
        expect(await this.registry.getTokensHashByIndex(tokenIndex)).to.include(tokenHash);
        tokenIndex++;
      }
    });

    it("9. Operator should be able to approve USDC liquidity pools", async function () {
      for (const riskProfile of Object.keys(StrategiesByTokenByChain[fork])) {
        for (const token of Object.keys(StrategiesByTokenByChain[fork][riskProfile])) {
          const tokenPools: string[] = [];
          for (const strategy of Object.keys(StrategiesByTokenByChain[fork][riskProfile][token])) {
            const strategyDetail = StrategiesByTokenByChain[fork][riskProfile][token][strategy];
            strategyDetail.strategy.map(step => {
              !tokenPools.includes(step.contract) ? tokenPools.push(step.contract) : null;
            });
          }
          await expect(this.registry.connect(this.signers.operator)["approveLiquidityPool(address[])"](tokenPools))
            .to.emit(this.registry, "LogLiquidityPool")
            .withArgs(tokenPools[0], true, this.signers.operator.address);
          for (const pool of tokenPools) {
            expect((await this.registry.liquidityPools(pool)).isLiquidityPool).to.be.true;
          }
        }
      }
    });

    it("10. Risk Operator should be able to rate approved liquidity pools", async function () {
      const registryContractInstance = await hre.ethers.getContractAt(
        ESSENTIAL_CONTRACTS.REGISTRY,
        this.registry.address,
      );
      for (const riskProfile of Object.keys(StrategiesByTokenByChain[fork])) {
        for (const token of Object.keys(StrategiesByTokenByChain[fork][riskProfile])) {
          const poolRates: PoolRate[] = [];
          const tokenPools: string[] = [];
          let rate = 1;
          for (const strategy of Object.keys(StrategiesByTokenByChain[fork][riskProfile][token])) {
            const strategyDetail = StrategiesByTokenByChain[fork][riskProfile][token][strategy];
            strategyDetail.strategy.map(step => {
              if (!tokenPools.includes(step.contract)) {
                tokenPools.push(step.contract);
                poolRates.push({ pool: step.contract, rate: rate });
                rate++;
              }
            });
          }
          await expect(
            registryContractInstance
              .connect(this.signers.riskOperator)
              ["rateLiquidityPool((address,uint8)[])"](poolRates),
          )
            .to.emit(this.registry, "LogRateLiquidityPool")
            .withArgs(poolRates[0].pool, 1, this.signers.riskOperator.address);
          let checkRate = 1;
          for (const poolRate of poolRates) {
            expect((await this.registry.liquidityPools(poolRate.pool)).rating).to.be.equal(checkRate);
            checkRate++;
          }
        }
      }
    });

    it("11. Risk operator should be able to add the risk profile", async function () {
      await expect(
        this.registry
          .connect(this.signers.riskOperator)
          ["addRiskProfile(uint256,string,string,bool,(uint8,uint8))"]("2", "Aggressive", "aggr", false, {
            lowerLimit: "1",
            upperLimit: "20",
          }),
      )
        .to.emit(this.registry, "LogRiskProfile")
        .withArgs("0", true, false, this.signers.riskOperator.address);
      const riskProfile = await this.registry.getRiskProfile("2");
      expect(riskProfile.index).to.be.equal("0");
      expect(riskProfile.canBorrow).to.be.false;
      expect(riskProfile.poolRatingsRange.lowerLimit).to.be.equal(BigNumber.from("1"));
      expect(riskProfile.poolRatingsRange.upperLimit).to.be.equal(BigNumber.from("20"));
      expect(riskProfile.exists).to.be.true;
      expect(riskProfile.name).to.be.equal("Aggressive");
      expect(riskProfile.symbol).to.be.equal("aggr");
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
      this.aaveV1EthGateway = <AaveV1ETHGateway>(
        await deployContract(hre, "AaveV1ETHGateway", false, this.signers.riskOperator, [
          TypedTokens.WETH,
          this.registry.address,
          TypedTokens.AETH,
        ])
      );
      this.aavev1Adapter = <AaveV1Adapter>(
        await deployContract(hre, "AaveV1Adapter", false, this.signers.riskOperator, [
          this.registry.address,
          this.aaveV1EthGateway.address,
        ])
      );
      assert.isDefined(this.aavev1Adapter, "!AaveV1Adapter");
      expect(await this.aavev1Adapter.maxDepositProtocolPct()).to.equal("10000");
      expect(await this.aavev1Adapter.maxDepositProtocolMode()).to.equal(BigNumber.from("1"));
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

    it("16. Risk operator deploys Convex Adapter", async function () {
      this.convexAdapter = <ConvexFinanceAdapter>(
        await deployContract(hre, "ConvexFinanceAdapter", false, this.signers.riskOperator, [this.registry.address])
      );
      assert.isDefined(this.convexAdapter, "!ConvexFinanceAdapter");
    });

    it("17. Risk operator/operator deploys CurveDepositPool Adapter", async function () {
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

    it("18. Risk operator/operator deploys CurveMetapoolSwapAdapter Adapter", async function () {
      // Note : For deploying CurveMetapoolSwapAdapter, operator and risk operator should have same address
      await this.registry.connect(this.signers.governance).setOperator(this.signers.riskOperator.address);
      expect(await this.registry.operator()).to.equal(this.signers.riskOperator.address);
      this.curveMetapoolSwapAdapter = <CurveMetapoolSwapAdapter>(
        await deployContract(hre, "CurveMetapoolSwapAdapter", false, this.signers.riskOperator, [this.registry.address])
      );
      assert.isDefined(this.curveMetapoolSwapAdapter, "!CurveMetapoolSwapAdapter");
      expect(await this.curveMetapoolSwapAdapter.maxDepositProtocolPct()).to.equal("10000");
      expect(await this.curveMetapoolSwapAdapter.maxDepositProtocolMode()).to.equal(BigNumber.from("1"));
    });

    it("19. Risk operator deploys CurveSwapPool Adapter", async function () {
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

    it("20. Operator can register adapter to approved liquidity pools", async function () {
      const adapterNameToAddress = new Map<string, string>([
        ["AaveV1Adapter", this.aavev1Adapter.address],
        ["AaveV2Adapter", this.aaveV2Adapter.address],
        ["CompoundAdapter", this.compoundAdapter.address],
        ["CurveSwapPoolAdapter", this.curveSwapPoolAdapter.address],
        ["CurveMetapoolSwapAdapter", this.curveMetapoolSwapAdapter.address],
        ["CurveDepositPoolAdapter", this.curveDepositPoolAdapter.address],
        ["ConvexFinanceAdapter", this.convexAdapter.address],
      ]);

      const registryContractInstance = await hre.ethers.getContractAt(
        ESSENTIAL_CONTRACTS.REGISTRY,
        this.registry.address,
      );
      const poolAdapters: { pool: string; adapter: string }[] = [];
      const tokenPools: string[] = [];
      for (const strategy of Object.keys(StrategiesByTokenByChain[fork]["Earn"]["USDC"])) {
        const strategyDetail = StrategiesByTokenByChain[fork]["Earn"]["USDC"][strategy];
        strategyDetail.strategy.map(step => {
          const adapterAddress = step.adapterName !== undefined ? adapterNameToAddress.get(step.adapterName) : "";
          !tokenPools.includes(step.contract)
            ? poolAdapters.push({
                pool: step.contract,
                adapter: adapterAddress !== undefined ? adapterAddress : "",
              })
            : null;
          tokenPools.push(step.contract);
        });
      }
      await expect(
        registryContractInstance
          .connect(this.signers.operator)
          ["setLiquidityPoolToAdapter((address,address)[])"](poolAdapters),
      )
        .to.emit(this.registry, "LogLiquidityPoolToAdapter")
        .withArgs(poolAdapters[0].pool, poolAdapters[0].adapter, this.signers.operator.address);
      for (const pool of poolAdapters) {
        expect(await this.registry.getLiquidityPoolToAdapter(pool.pool)).to.equal(pool.adapter);
      }
    });

    it("21. Strategy operator can deploy StrategyProvider and operator can register", async function () {
      this.strategyProvider = <StrategyProvider>(
        await deployContract(hre, ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, false, this.signers.strategyOperator, [
          this.registry.address,
        ])
      );
      assert.isDefined(this.strategyProvider, "!StrategyProvider");
      expect(await this.strategyProvider.registryContract()).to.equal(this.registry.address);
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

    it("23. Deployer can deploy StrategyManager and ClaimAndHarvest ", async function () {
      this.strategyManager = <StrategyManager>(
        await deployContract(hre, ESSENTIAL_CONTRACTS.STRATEGY_MANAGER, false, this.signers.deployer, [])
      );
      assert.isDefined(this.strategyManager, "!StrategyManager");

      this.claimAndHarvest = <RiskManagerProxy>(
        await deployContract(hre, ESSENTIAL_CONTRACTS.CLAIM_AND_HARVEST, false, this.signers.deployer, [])
      );
      assert.isDefined(this.claimAndHarvest, "!ClaimAndHarvest");
    });

    it("24. Operator can deploy vault and admin can upgrade", async function () {
      // (0-15) Deposit fee UT = 1 USDC = 0001
      // (16-31) Deposit fee % = 0.05% = 0005
      // (32-47) Withdrawal fee UT = 1 USDC = 0001
      // (48-63) Withdrawal fee % = 0.05% = 0005
      // (64-79) Max vault value jump % = 0.01% = 0001
      // (80-239) vault fee address = 0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5
      // (240-247) risk profile code = 2 = 02
      // (248) emergency shutdown = false = 0
      // (249) unpause = true = 1
      // (250) allow whitelisted state = true = 0
      // (251) - 0
      // (252) - 0
      // (253) - 0
      // (254) - 0
      // (255) - 0
      // 0x060219cDeDF678aBE15a921a2AB26C9Bc8867fc35cE500010000000000000000
      const _vaultConfiguration = BigNumber.from(
        "2717588881137297196073629478594403830637904256449768059589358340699261501440",
      );
      this.vault = <Vault>(
        await deployVault(
          hre,
          this.registry.address,
          this.strategyManager.address,
          this.claimAndHarvest.address,
          StrategiesByTokenByChain[fork]["Earn"]["USDC"][Object.keys(StrategiesByTokenByChain[fork]["Earn"]["USDC"])[0]]
            .token,
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          _vaultConfiguration.toString(),
          0,
          0,
          0,
          this.signers.operator,
          this.signers.admin,
          "USDC",
          2,
          true,
        )
      );

      expect(await this.vault.name()).to.equal("OptyFi USDC Aggressive Vault");
      expect(await this.vault.symbol()).to.equal("opUSDCaggr");
      expect(await this.vault.decimals()).to.equal(BigNumber.from("6"));
      const actualRiskProfileCode = getRiskProfileCode(await this.vault.vaultConfiguration());
      expect(actualRiskProfileCode).to.equal("2");
      assertVaultConfiguration(
        await this.vault.vaultConfiguration(),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("0"),
        BigNumber.from("1"),
        "0x19cDeDF678aBE15a921a2AB26C9Bc8867fc35cE5",
        BigNumber.from("2"),
        false,
        true,
        true,
      );
    });

    it("25. Alice deposit should fail, EOA_NOT_WHITELISTED", async function () {
      this.erc20 = <ERC20>await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, TypedTokens.USDC);
      const deadline = (await getBlockTimestamp(hre)) * 2;
      await fundWalletToken(
        hre,
        TypedTokens.USDC,
        this.signers.alice,
        BigNumber.from("1600000000000"),
        deadline,
        this.signers.alice.address,
      );
      expect(await this.erc20.balanceOf(this.signers.alice.address)).to.equal(BigNumber.from("1600000000000")); // 1000 USDC
      await this.erc20.connect(this.signers.alice).approve(this.vault.address, BigNumber.from("1000000000")); // 1000 USDC
      expect(await this.erc20.allowance(this.signers.alice.address, this.vault.address)).to.equal(
        BigNumber.from("1000000000"),
      ); // USDC
      await expect(
        this.vault
          .connect(this.signers.alice)
          .userDepositVault(this.signers.alice.address, BigNumber.from("1000000000"), BigNumber.from("0"), "0x", []),
      ).to.revertedWith("8");
    });

    it("26. Operator can whitelist Alice,Bob for USDC vault", async function () {
      const _root = getAccountsMerkleRoot([this.signers.alice.address, this.signers.bob.address]);
      await this.vault.connect(this.signers.governance).setWhitelistedAccountsRoot(_root);
      expect(await this.vault.whitelistedAccountsRoot()).to.eq(_root);
    });

    it("27. Finance Operator can deposit min, cap and TVL limit", async function () {
      await this.vault
        .connect(this.signers.financeOperator)
        .setValueControlParams(BigNumber.from(10000000000), BigNumber.from(1000000000), BigNumber.from(1000000000000));
      expect(await this.vault.userDepositCapUT()).to.be.equal(BigNumber.from(10000000000));
      expect(await this.vault.minimumDepositValueUT()).to.be.equal(BigNumber.from(1000000000));
      expect(await this.vault.totalValueLockedLimitUT()).to.be.equal(BigNumber.from(1000000000000));
    });

    it("28. Alice has to deposit atleast 1000 USDC", async function () {
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address],
        this.signers.alice.address,
      );
      await expect(
        this.vault
          .connect(this.signers.alice)
          .userDepositVault(this.signers.alice.address, BigNumber.from("999999999"), BigNumber.from("0"), "0x", _proof),
      ).to.revertedWith("10");
      await expect(
        this.vault
          .connect(this.signers.alice)
          .userDepositVault(
            this.signers.alice.address,
            BigNumber.from("1000000000"),
            BigNumber.from("0"),
            "0x",
            _proof,
          ),
      )
        .to.emit(this.vault, "Transfer")
        .withArgs(hre.ethers.constants.AddressZero, this.signers.alice.address, BigNumber.from("1000000000"));
    });

    it("29. Bob tries a failed attempt to deposit beyond maxDepositCap of 10k", async function () {
      const deadline = (await getBlockTimestamp(hre)) * 2;
      await fundWalletToken(
        hre,
        TypedTokens.USDC,
        this.signers.bob,
        BigNumber.from("100000000000"), // 100000 USDC
        deadline,
        this.signers.bob.address,
      );
      expect(await this.erc20.balanceOf(this.signers.bob.address)).to.equal(BigNumber.from("100000000000"));
      await this.erc20.connect(this.signers.bob).approve(this.vault.address, BigNumber.from("100000000000"));
      expect(await this.erc20.allowance(this.signers.bob.address, this.vault.address)).to.equal(
        BigNumber.from("100000000000"),
      ); // USDC
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address],
        this.signers.bob.address,
      );
      await expect(
        this.vault
          .connect(this.signers.bob)
          .userDepositVault(
            this.signers.bob.address,
            BigNumber.from("100000000000"),
            BigNumber.from("0"),
            "0x",
            _proof,
          ),
      ).revertedWith("12");
    });

    it("30. Finance operator increases the userDepositCap and totalValueLockedLimit", async function () {
      await expect(this.vault.connect(this.signers.financeOperator).setUserDepositCapUT(BigNumber.from("500000000000")))
        .to.emit(this.vault, "LogUserDepositCapUT")
        .withArgs(BigNumber.from("500000000000"), this.signers.financeOperator.address);
      expect(await this.vault.userDepositCapUT()).to.equal(BigNumber.from("500000000000"));
      await expect(
        this.vault.connect(this.signers.financeOperator).setTotalValueLockedLimitUT(BigNumber.from("1500000000000")),
      )
        .to.emit(this.vault, "LogTotalValueLockedLimitUT")
        .withArgs(BigNumber.from("1500000000000"), this.signers.financeOperator.address);
      expect(await this.vault.totalValueLockedLimitUT()).to.equal(BigNumber.from("1500000000000"));
    });

    it("31. Big fish Bob can now successfully deposit 100K", async function () {
      const depositValue = BigNumber.from("100000000000");
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address],
        this.signers.bob.address,
      );
      await expect(
        this.vault
          .connect(this.signers.bob)
          .userDepositVault(this.signers.bob.address, depositValue, BigNumber.from("0"), "0x", _proof),
      )
        .to.emit(this.vault, "Transfer")
        .withArgs(hre.ethers.constants.AddressZero, this.signers.bob.address, depositValue);
    });

    it("32. Operator can set the next strategy and rebalance", async function () {
      const strategyDetail =
        StrategiesByTokenByChain[fork]["Earn"]["USDC"][Object.keys(StrategiesByTokenByChain[fork]["Earn"]["USDC"])[0]];
      const tokenHash = generateTokenHashV2([strategyDetail.token], NETWORKS_CHAIN_ID_HEX[fork]);
      const strategyHash = generateStrategyHashV2(strategyDetail.strategy, tokenHash);
      const steps = strategyDetail.strategy.map(item => ({
        pool: item.contract,
        outputToken: item.outputToken,
        isBorrow: item.isBorrow,
      }));
      expect((await this.vault.getInvestStrategySteps()).length).to.eq(0);
      await this.strategyProvider.connect(this.signers.strategyOperator).setBestStrategy("2", tokenHash, steps);
      expect(await this.vault.getNextBestInvestStrategy()).to.deep.eq(steps.map(item => Object.values(item)));
      const tx = await this.vault.rebalance();
      await tx.wait(1);
      expect(await this.vault.investStrategyHash()).to.eq(strategyHash);
      expect(await this.vault.getInvestStrategySteps()).to.deep.eq(steps.map(item => Object.values(item)));
    });

    it("33. Alice does failed attempt to go beyond TVL cap of vault", async function () {
      const depositValue = BigNumber.from("1500000000000");
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address],
        this.signers.alice.address,
      );
      await this.erc20.connect(this.signers.alice).approve(this.vault.address, depositValue);
      expect(await this.erc20.allowance(this.signers.alice.address, this.vault.address)).to.equal(depositValue);
      await expect(
        this.vault
          .connect(this.signers.alice)
          .userDepositVault(this.signers.bob.address, depositValue, BigNumber.from("0"), "0x", _proof),
      ).to.revertedWith("11");
    });

    it("34. The strategy operator can set the new best strategy", async function () {
      const strategyDetail =
        StrategiesByTokenByChain[fork]["Earn"]["USDC"][Object.keys(StrategiesByTokenByChain[fork]["Earn"]["USDC"])[3]];
      const tokenHash = generateTokenHashV2([strategyDetail.token], NETWORKS_CHAIN_ID_HEX[fork]);
      const strategyHash = generateStrategyHashV2(strategyDetail.strategy, tokenHash);
      const steps = strategyDetail.strategy.map(item => ({
        pool: item.contract,
        outputToken: item.outputToken,
        isBorrow: item.isBorrow,
      }));
      await this.strategyProvider.connect(this.signers.strategyOperator).setBestStrategy("2", tokenHash, steps);
      expect(await this.vault.getNextBestInvestStrategy()).to.deep.eq(steps.map(item => Object.values(item)));
      const tx = await this.vault.rebalance();
      await tx.wait(1);
      expect(await this.vault.investStrategyHash()).to.eq(strategyHash);
      expect(await this.vault.getInvestStrategySteps()).to.deep.eq(steps.map(item => Object.values(item)));
    });

    it("35. Alice can successfully withdraw 500 shares", async function () {
      const withdrawValue = BigNumber.from("500000000");
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address],
        this.signers.alice.address,
      );
      await expect(
        this.vault
          .connect(this.signers.alice)
          .userWithdrawVault(this.signers.alice.address, withdrawValue, BigNumber.from("0"), _proof),
      )
        .to.emit(this.vault, "Transfer")
        .withArgs(this.signers.alice.address, hre.ethers.constants.AddressZero, withdrawValue);
    });

    it("36. The big fish Bob can successfully withdraw 100K shares", async function () {
      const withdrawValue = BigNumber.from("100000000000");
      const _proof = getAccountsMerkleProof(
        [this.signers.alice.address, this.signers.bob.address],
        this.signers.bob.address,
      );
      await expect(
        this.vault
          .connect(this.signers.bob)
          .userWithdrawVault(this.signers.bob.address, withdrawValue, BigNumber.from("0"), _proof),
      )
        .to.emit(this.vault, "Transfer")
        .withArgs(this.signers.bob.address, hre.ethers.constants.AddressZero, withdrawValue);
    });

    it("37. The strategy operator claims rewards successfully", async function () {
      const strategyDetail =
        StrategiesByTokenByChain[fork]["Earn"]["USDC"][Object.keys(StrategiesByTokenByChain[fork]["Earn"]["USDC"])[3]];
      const claimedRewardBefore = await this.vault.balanceClaimedRewardToken(
        strategyDetail.strategy[strategyDetail.strategy.length - 1].contract,
      );
      await expect(
        await this.vault
          .connect(this.signers.strategyOperator)
          .claimRewardToken(strategyDetail.strategy[strategyDetail.strategy.length - 1].contract),
      ).to.emit(this.vault, "RewardTokenClaimed");
      const claimedRewardAfter = await this.vault.balanceClaimedRewardToken(
        strategyDetail.strategy[strategyDetail.strategy.length - 1].contract,
      );
      expect(claimedRewardAfter).gt(claimedRewardBefore);
    });

    it("38. The strategy operator harvest rewards successfully", async function () {
      const strategyDetail =
        StrategiesByTokenByChain[fork]["Earn"]["USDC"][Object.keys(StrategiesByTokenByChain[fork]["Earn"]["USDC"])[3]];
      const balanceBeforeUT = await this.vault.balanceUT();
      const _balanceClaimed = await this.vault.balanceClaimedRewardToken(strategyDetail.strategy[0].contract);
      await expect(
        await this.vault
          .connect(this.signers.strategyOperator)
          .harvest(strategyDetail.strategy[0].contract, _balanceClaimed),
      ).to.emit(this.vault, "Harvested");
      const balanceAfterUT = await this.vault.balanceUT();
      expect(balanceAfterUT).gt(balanceBeforeUT);
    });

    it("39. Governance calls emergency shutdown", async function () {
      const _balanceUTBefore = await this.vault.balanceUT();
      await expect(this.vault.connect(this.signers.governance).setEmergencyShutdown(true))
        .to.emit(this.vault, "LogEmergencyShutdown")
        .withArgs(true, this.signers.governance.address);
      const _balanceUTAfter = await this.vault.balanceUT();
      expect(_balanceUTAfter).to.gt(_balanceUTBefore);
      expect(await this.vault.investStrategyHash()).to.eq(hre.ethers.constants.HashZero);
      expect((await this.vault.getInvestStrategySteps()).length).to.eq(0);
    });
  });
});
