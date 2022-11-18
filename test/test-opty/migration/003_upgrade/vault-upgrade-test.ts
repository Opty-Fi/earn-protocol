import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { getAddress, parseEther } from "ethers/lib/utils";
import { ethers, getChainId, network } from "hardhat";
import EthereumSushiswap from "@optyfi/defi-legos/ethereum/sushiswap/index";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import CurveExports from "@optyfi/defi-legos/ethereum/curve/index";
import PolygonSushiswapExports from "@optyfi/defi-legos/polygon/sushiswap/index";
import { Signers } from "../../../../helpers/utils";
import {
  CurveExchangeAdapter,
  CurveExchangeAdapter__factory,
  InitializableImmutableAdminUpgradeabilityProxy,
  InitializableImmutableAdminUpgradeabilityProxy__factory,
  RegistryProxy,
  RegistryProxy__factory,
  StrategyProvider,
  StrategyProvider__factory,
  UniswapV2ExchangeAdapter,
  UniswapV2ExchangeAdapter__factory,
} from "../../../../typechain";
import { eEVMNetwork, NETWORKS_CHAIN_ID_HEX } from "../../../../helper-hardhat-config";
import { generateTokenHashV2 } from "../../../../helpers/helpers";
import { RegistryProxy as MainnetRegistryProxyAddress } from "../../_deployments/mainnet.json";
import { RegistryProxy as PolygonRegistryProxyAddress } from "../../_deployments/polygon.json";
import PolygonTokens from "@optyfi/defi-legos/polygon/tokens/index";
import { RegistryV1, RegistryV1__factory } from "../../../../helpers/types/registryV1";
import { RegistryV2 } from "../../../../helpers/types/registryV2/RegistryV2";
import { RegistryV2__factory } from "../../../../helpers/types/registryV2";
import { ethereumTestVaults, polygonTestVaults } from "./test-vaults";
import { StrategyManagerV2, StrategyManagerV2__factory } from "../../../../helpers/types/strategyManagerv2";
import { RiskManagerV2__factory } from "../../../../helpers/types/riskManagerv2/factories/RiskManagerV2__factory";
import { VaultV6, VaultV6__factory } from "../../../../helpers/types/vaultv6";
import { VaultV5 } from "../../../../helpers/types/vaultv5/VaultV5";
import { BigNumber } from "ethers";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../../../helpers/constants/tokens";

const fork = process.env.FORK as eEVMNetwork;
const testVaults = fork === eEVMNetwork.mainnet ? ethereumTestVaults : polygonTestVaults;
const EIP712_DOMAIN = ethers.utils.id(
  "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)",
);
const EIP712_REVISION = ethers.utils.id("1");
const registryArguments: {
  [key: string]: {
    testToken: { [key: string]: string };
    testLiquidityPool: string;
    testLiquidityPoolAdapter: string;
    testVault: string;
    testAccount: string;
    testSwapPool: string;
    registryProxy: string;
    oracle: string;
  };
} = {
  [eEVMNetwork.mainnet]: {
    testToken: {
      address: EthereumTokens.PLAIN_TOKENS.USDC,
      hash: generateTokenHashV2([EthereumTokens.PLAIN_TOKENS.USDC], NETWORKS_CHAIN_ID_HEX[fork]),
    },
    testLiquidityPool: "0x9Dd451aB7bB62DA57b638070760A747bB6b1c5b1", // dAMM finance - dAWBTC
    testLiquidityPoolAdapter: "0x9680624ad6bf5a34ce496a483400585136c575a4", // compoundAdapter
    testVault: "0x6d8bfdb4c4975bb086fc9027e48d5775f609ff88", //opUSDC-Earn
    testAccount: "0x6bd60f089B6E8BA75c409a54CDea34AA511277f6",
    testSwapPool: "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0",
    registryProxy: MainnetRegistryProxyAddress,
    oracle: "0xC77AFEf1deeeF80Eb814aD159c93B28026FEbbe2",
  },
  [eEVMNetwork.polygon]: {
    testToken: {
      address: PolygonTokens.USDC,
      hash: generateTokenHashV2([PolygonTokens.USDC], NETWORKS_CHAIN_ID_HEX[fork]),
    },
    testLiquidityPool: "0x5b13B583D4317aB15186Ed660A1E4C65C10da659", // Apeswap USDC-DAI
    testLiquidityPoolAdapter: "0xf831B05217C65A39AA300a6a6a3F3C6bc8B9a0C4", // ApeswapPoolAdapter
    testVault: "0x7FeA9Dc468855B999389E396BdB1e3EbF6d19E83", //opUSDC-Earn
    testAccount: "0x6bd60f089B6E8BA75c409a54CDea34AA511277f6",
    testSwapPool: "0x4b1f1e2435a9c96f7330faea190ef6a7c8d70001",
    registryProxy: PolygonRegistryProxyAddress,
    oracle: "0x415A3046719047113F339d87aEC703EB8e938454",
  },
};

describe(`${fork}-Vault-rev6 upgrade test`, async function () {
  before(async function () {
    this.registryV1 = <RegistryV1>(
      await ethers.getContractAt(RegistryV1__factory.abi, registryArguments[fork].registryProxy)
    );
    const sushiswapExchangeAdapterFactory = await ethers.getContractFactory(
      UniswapV2ExchangeAdapter__factory.abi,
      UniswapV2ExchangeAdapter__factory.bytecode,
    );
    if (fork === eEVMNetwork.mainnet) {
      await network.provider.request({
        method: "hardhat_reset",
        params: [
          {
            forking: {
              jsonRpcUrl: process.env.MAINNET_NODE_URL,
              blockNumber: 15972454,
            },
          },
        ],
      });
      const curveExchangeAdapterFactory = await ethers.getContractFactory(
        CurveExchangeAdapter__factory.abi,
        CurveExchangeAdapter__factory.bytecode,
      );
      const curveExchangeAdapter = await curveExchangeAdapterFactory.deploy(
        this.registryV1.address,
        CurveExports.CurveRegistryExchange.address,
        CurveExports.CurveMetaRegistry.address,
        EthereumTokens.WRAPPED_TOKENS.WETH,
        EthereumTokens.PLAIN_TOKENS.ETH,
        CurveExports.CurveSwapPool["seth_eth+seth"].pool,
        CurveExports.CurveSwapPool["aethc_eth+aethc"].pool,
        CurveExports.CurveSwapPool["reth_eth+reth"].pool,
        CurveExports.CurveSwapPool["steth_eth+steth"].pool,
      );
      this.curveExchangeAdapter = <CurveExchangeAdapter>(
        await ethers.getContractAt(CurveExchangeAdapter__factory.abi, curveExchangeAdapter.address)
      );
      const sushiswapExchangeAdapter = await sushiswapExchangeAdapterFactory.deploy(
        this.registryV1.address,
        EthereumSushiswap.SushiswapRouter.address,
        registryArguments[fork].oracle,
      );
      this.sushiswapExchangeAdapter = <UniswapV2ExchangeAdapter>(
        await ethers.getContractAt(UniswapV2ExchangeAdapter__factory.abi, sushiswapExchangeAdapter.address)
      );
    }
    if (fork == eEVMNetwork.polygon) {
      await network.provider.request({
        method: "hardhat_reset",
        params: [
          {
            forking: {
              jsonRpcUrl: process.env.POLYGON_NODE_URL,
              blockNumber: 35620372,
            },
          },
        ],
      });
      const sushiswapExchangeAdapter = await sushiswapExchangeAdapterFactory.deploy(
        registryArguments[fork].registryProxy,
        PolygonSushiswapExports.SushiswapRouter.address,
        registryArguments[fork].oracle,
      );
      this.sushiswapExchangeAdapter = <UniswapV2ExchangeAdapter>(
        await ethers.getContractAt(UniswapV2ExchangeAdapter__factory.abi, sushiswapExchangeAdapter.address)
      );
    }
    const registryFactory = await ethers.getContractFactory(RegistryV2__factory.abi, RegistryV2__factory.bytecode);
    const registryV2 = await registryFactory.deploy();

    const riskManagerFactory = await ethers.getContractFactory(
      RiskManagerV2__factory.abi,
      RiskManagerV2__factory.bytecode,
    );

    // deploy risk manager
    const riskManager = await riskManagerFactory.deploy(this.registryV1.address);
    this.riskManagerV2 = await ethers.getContractAt(RiskManagerV2__factory.abi, riskManager.address);
    // registryV1Obj
    this.registryV1Obj = {
      instance: this.registryV1,
      governance: await this.registryV1.governance(),
      financeOperator: await this.registryV1.financeOperator(),
      riskOperator: await this.registryV1.riskOperator(),
      strategyOperator: await this.registryV1.strategyOperator(),
      operator: await this.registryV1.operator(),
      treasury: await this.registryV1.treasury(),
      optyDistributor: await this.registryV1.optyDistributor(),
      pendingGovernance: await this.registryV1.pendingGovernance(),
      registryImplementation: registryV2.address,
      pendingRegistryImplementation: await this.registryV1.pendingRegistryImplementation(),
      tokens: await this.registryV1.tokens(registryArguments[fork].testToken.address),
      tokensHashIndexByHash: await this.registryV1.getTokensHashIndexByHash(registryArguments[fork].testToken.hash),
      tokensHashToTokenList: await this.registryV1.getTokensHashToTokenList(registryArguments[fork].testToken.hash),
      liquidityPools: await this.registryV1.liquidityPools(registryArguments[fork].testLiquidityPool),
      creditPools: { rating: 99, isLiquidityPool: true },
      liquidityPoolToAdapter: registryArguments[fork].testLiquidityPoolAdapter,
      riskProfiles: await this.registryV1.getRiskProfile("2"),
      vaultToVaultConfiguration: await this.registryV1.vaultToVaultConfiguration(registryArguments[fork].testVault),
      whitelistedUsers: await this.registryV1.whitelistedUsers(
        registryArguments[fork].testVault,
        registryArguments[fork].testAccount,
      ),
      withdrawalFeeRange: await this.registryV1.withdrawalFeeRange(),
      tokensHashIndexes: await this.registryV1.tokensHashIndexes(0),
      riskProfilesArray: await this.registryV1.riskProfilesArray(3),
      strategyProvider: await this.registryV1.strategyProvider(),
      investStrategyRegistry: await this.registryV1.investStrategyRegistry(),
      riskManager: this.riskManagerV2.address,
      harvestCodeProvider: await this.registryV1.harvestCodeProvider(),
      strategyManager: await this.registryV1.strategyManager(),
      opty: await this.registryV1.opty(),
      aprOracle: await this.registryV1.aprOracle(),
      optyStakingRateBalancer: await this.registryV1.optyStakingRateBalancer(),
      odefiVaultBooster: await this.registryV1.optyStakingRateBalancer(),
      swapPoolToAdapter: this.sushiswapExchangeAdapter.address,
    };
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await ethers.getSigners();
    this.signers.admin = signers[1];
    let registryV2Instance = await ethers.getContractAt(RegistryV2__factory.abi, registryV2.address);
    let registryProxyInstance = <RegistryProxy>(
      await ethers.getContractAt(RegistryProxy__factory.abi, this.registryV1.address)
    );
    const operatorAddress = await registryProxyInstance.operator();
    const operatorSigner = await ethers.getSigner(operatorAddress);
    const governanceAddress = await registryProxyInstance.governance();
    const governanceSigner = await ethers.getSigner(governanceAddress);
    const riskOperatorAddress = await registryProxyInstance.riskOperator();
    const riskOperatorSigner = await ethers.getSigner(riskOperatorAddress);
    this.signers.riskOperator = riskOperatorSigner;
    const strategyOperatorAddress = await registryProxyInstance.strategyOperator();
    const strategyOperatorSigner = await ethers.getSigner(strategyOperatorAddress);
    this.signers.strategyOperator = strategyOperatorSigner;
    registryProxyInstance = <RegistryProxy>(
      await ethers.getContractAt(RegistryProxy__factory.abi, this.registryV1.address)
    );
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [await registryProxyInstance.governance()],
    });
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [await registryProxyInstance.operator()],
    });
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [await registryProxyInstance.riskOperator()],
    });
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [await registryProxyInstance.strategyOperator()],
    });
    let txs = await this.signers.admin.sendTransaction({
      to: await registryProxyInstance.governance(),
      value: parseEther("1"),
    });
    await txs.wait(1);
    txs = await this.signers.admin.sendTransaction({
      to: await registryProxyInstance.operator(),
      value: parseEther("1"),
    });
    await txs.wait(1);
    txs = await this.signers.admin.sendTransaction({
      to: await registryProxyInstance.riskOperator(),
      value: parseEther("1"),
    });
    await txs.wait(1);
    txs = await this.signers.admin.sendTransaction({
      to: await registryProxyInstance.strategyOperator(),
      value: parseEther("1"),
    });
    await txs.wait(1);
    // upgrade registry
    const registryImplementation = await registryProxyInstance.registryImplementation();
    if (getAddress(registryImplementation) != getAddress(registryV2.address)) {
      const pendingImplementation = await registryProxyInstance.pendingRegistryImplementation();
      if (getAddress(pendingImplementation) != getAddress(registryV2.address)) {
        const setPendingImplementationTx = await registryProxyInstance
          .connect(operatorSigner)
          .setPendingImplementation(registryV2.address);
        await setPendingImplementationTx.wait(1);
      }
      const becomeTx = await registryV2Instance.connect(governanceSigner).become(this.registryV1.address);
      await becomeTx.wait(1);
    }
    registryV2Instance = await ethers.getContractAt(RegistryV2__factory.abi, this.registryV1.address);
    if (fork === eEVMNetwork.mainnet) {
      let tx = await registryV2Instance
        .connect(operatorSigner)
        ["approveSwapPoolAndMapToAdapter(address,address)"](
          "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
          this.curveExchangeAdapter.address,
        );
      await tx.wait(1);
      tx = await registryV2Instance
        .connect(riskOperatorSigner)
        ["rateSwapPool(address,uint8)"]("0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7", 99);
      await tx.wait(1);
      tx = await registryV2Instance
        .connect(operatorSigner)
        ["approveLiquidityPoolAndMapToAdapter(address,address)"](
          "0xBf0852A95eC76e87f7431Fa505B27937C9836372",
          "0x9680624ad6bf5a34ce496a483400585136c575a4",
        );
      await tx.wait(1);
      tx = await registryV2Instance
        .connect(riskOperatorSigner)
        ["rateLiquidityPool(address,uint8)"]("0xBf0852A95eC76e87f7431Fa505B27937C9836372", 90);
      await tx.wait(1);

      this.strategyProvider = <StrategyProvider>(
        await ethers.getContractAt(StrategyProvider__factory.abi, await registryV2Instance.strategyProvider())
      );
      tx = await this.strategyProvider
        .connect(strategyOperatorSigner)
        .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[eEVMNetwork.mainnet]["USD3"].hash, [
          {
            pool: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
            outputToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
            isSwap: true,
          },
          {
            pool: "0xBf0852A95eC76e87f7431Fa505B27937C9836372",
            outputToken: "0xBf0852A95eC76e87f7431Fa505B27937C9836372",
            isSwap: false,
          },
        ]);
      await tx.wait(1);
    }
    let tx = await registryV2Instance
      .connect(operatorSigner)
      ["approveSwapPoolAndMapToAdapter(address,address)"](
        registryArguments[fork].testSwapPool,
        this.sushiswapExchangeAdapter.address,
      );
    await tx.wait(1);
    tx = await registryV2Instance
      .connect(riskOperatorSigner)
      ["rateSwapPool(address,uint8)"](registryArguments[fork].testSwapPool, 99);
    await tx.wait(1);

    this.registryV2 = <RegistryV2>await ethers.getContractAt(RegistryV2__factory.abi, registryV2Instance.address);

    // update risk manager
    const tx2 = await this.registryV2.connect(operatorSigner).setRiskManager(riskManager.address);
    await tx2.wait(1);

    const strategyManagerFactory = await ethers.getContractFactory(
      StrategyManagerV2__factory.abi,
      StrategyManagerV2__factory.bytecode,
    );
    const strategyManager = <StrategyManagerV2>await strategyManagerFactory.deploy();

    const vaultFactory = await ethers.getContractFactory(
      VaultV6__factory.abi,
      linkLibrary(
        VaultV6__factory.bytecode,
        "contracts/protocol/lib/StrategyManager.sol:StrategyManager",
        strategyManager.address,
      ),
    );
    const vaultImplementation = await vaultFactory.deploy(this.registryV1.address);

    this.vaultsV5Obj = {};
    this.vaultsV6 = {};
    for (const underlyingToken of Object.keys(testVaults)) {
      this.vaultsV5Obj[underlyingToken] = {};
      this.vaultsV6[underlyingToken] = {};
      for (const testVault of Object.keys(testVaults[underlyingToken])) {
        await network.provider.request({
          method: "hardhat_impersonateAccount",
          params: [testVaults[underlyingToken][testVault].proxyAdmin],
        });
        const txs = await this.signers.admin.sendTransaction({
          to: testVaults[underlyingToken][testVault].proxyAdmin,
          value: parseEther("1"),
        });
        await txs.wait(1);
        const proxySigner = await ethers.getSigner(testVaults[underlyingToken][testVault].proxyAdmin);
        const vaultV5Instance = <VaultV5>(
          await ethers.getContractAt(testVaults[underlyingToken][testVault].oldAbi, testVault)
        );
        this.vaultsV5Obj[underlyingToken][testVault] = {
          instance: vaultV5Instance,
          registryContract: await vaultV5Instance.registryContract(),
          pendingDeposits:
            testVaults[underlyingToken][testVault].testAccount !== undefined
              ? await vaultV5Instance.pendingDeposits(testVaults[underlyingToken][testVault].testAccount as string)
              : BigNumber.from("0"),
          totalDeposits:
            testVaults[underlyingToken][testVault].testAccount !== undefined
              ? await vaultV5Instance.totalDeposits(testVaults[underlyingToken][testVault].testAccount as string)
              : BigNumber.from("0"),
          blockToBlockVaultValues:
            testVaults[underlyingToken][testVault].testBlockNumber !== undefined
              ? [
                  {
                    actualVaultValue: (
                      await vaultV5Instance.blockToBlockVaultValues(
                        testVaults[underlyingToken][testVault].testBlockNumber as BigNumber,
                        0,
                      )
                    ).actualVaultValue,
                    blockMaxVaultValue: (
                      await vaultV5Instance.blockToBlockVaultValues(
                        testVaults[underlyingToken][testVault].testBlockNumber as BigNumber,
                        0,
                      )
                    ).blockMaxVaultValue,
                    blockMinVaultValue: (
                      await vaultV5Instance.blockToBlockVaultValues(
                        testVaults[underlyingToken][testVault].testBlockNumber as BigNumber,
                        0,
                      )
                    ).blockMinVaultValue,
                  },
                ]
              : [
                  {
                    actualVaultValue: BigNumber.from("0"),
                    blockMaxVaultValue: BigNumber.from("0"),
                    blockMinVaultValue: BigNumber.from("0"),
                  },
                ],
          investStrategyHash: await vaultV5Instance.investStrategyHash(),
          userDepositCap: await vaultV5Instance.userDepositCapUT(),
          minimumDepositValueUT: await vaultV5Instance.minimumDepositValueUT(),
          vaultConfiguration: await vaultV5Instance.vaultConfiguration(),
          underlyingToken: await vaultV5Instance.underlyingToken(),
          whitelistedAccountsRoot: await vaultV5Instance.whitelistedAccountsRoot(),
          totalValueLockedLimitUT: await vaultV5Instance.totalValueLockedLimitUT(),
          domainSeparator: await vaultV5Instance._domainSeparator(),
          underlyingTokensHash: await vaultV5Instance.underlyingTokensHash(),
          investStrategySteps: testVaults[underlyingToken][testVault].hasStrategy
            ? [
                {
                  pool: (await vaultV5Instance.investStrategySteps(0)).pool,
                  outputToken: (await vaultV5Instance.investStrategySteps(0)).outputToken,
                  isBorrow: (await vaultV5Instance.investStrategySteps(0)).isBorrow,
                },
              ]
            : [
                {
                  pool: ethers.constants.AddressZero,
                  outputToken: ethers.constants.AddressZero,
                  isBorrow: false,
                },
              ],
        };
        expect(await vaultV5Instance.name()).to.eq(testVaults[underlyingToken][testVault].oldName);
        expect(await vaultV5Instance.symbol()).to.eq(testVaults[underlyingToken][testVault].oldSymbol);
        expect(await vaultV5Instance.opTOKEN_REVISION()).to.eq(testVaults[underlyingToken][testVault].revision);

        const proxyInstance = <InitializableImmutableAdminUpgradeabilityProxy>(
          await ethers.getContractAt(InitializableImmutableAdminUpgradeabilityProxy__factory.abi, testVault)
        );
        this.vaultsV6[underlyingToken][testVault] = <VaultV6>(
          await ethers.getContractAt(VaultV6__factory.abi, testVault)
        );
        const tx = await proxyInstance
          .connect(proxySigner)
          .upgradeToAndCall(
            vaultImplementation?.address as string,
            this.vaultsV6[underlyingToken][testVault].interface.encodeFunctionData("initialize", [
              this.vaultsV5Obj[underlyingToken][testVault].registryContract,
              this.vaultsV5Obj[underlyingToken][testVault].underlyingTokensHash,
              this.vaultsV5Obj[underlyingToken][testVault].whitelistedAccountsRoot,
              testVaults[underlyingToken][testVault].underlyingTokenSymbol,
              testVaults[underlyingToken][testVault].riskProfileCode,
              this.vaultsV5Obj[underlyingToken][testVault].vaultConfiguration,
              this.vaultsV5Obj[underlyingToken][testVault].userDepositCap,
              this.vaultsV5Obj[underlyingToken][testVault].minimumDepositValueUT,
              this.vaultsV5Obj[underlyingToken][testVault].totalValueLockedLimitUT,
            ]),
          );
        await tx.wait(1);
      }
    }
  });

  describe("Registry Storage test", async function () {
    it("governance as expected", async function () {
      expect(this.registryV1Obj.governance).to.eq(await this.registryV2.governance());
    });
    it("finance operator as expected", async function () {
      expect(this.registryV1Obj.financeOperator).to.eq(await this.registryV2.financeOperator());
    });
    it("riskOperator as expected", async function () {
      expect(this.registryV1Obj.riskOperator).to.eq(await this.registryV2.riskOperator());
    });
    it("strategyoperator as expected", async function () {
      expect(this.registryV1Obj.strategyOperator).to.eq(await this.registryV2.strategyOperator());
    });
    it("operator as expected", async function () {
      expect(this.registryV1Obj.operator).to.eq(await this.registryV2.operator());
    });
    it("treasury as expected", async function () {
      expect(this.registryV1Obj.treasury).to.eq(await this.registryV2.treasury());
    });
    it("optyDistributor as expected", async function () {
      expect(this.registryV1Obj.optyDistributor).to.eq(await this.registryV2.optyDistributor());
    });
    it("pendingGovernance as expected", async function () {
      expect(this.registryV1Obj.pendingGovernance).to.eq(await this.registryV2.pendingGovernance());
    });
    it("registryImplementation as expected", async function () {
      expect(this.registryV1Obj.registryImplementation).to.eq(await this.registryV2.registryImplementation());
    });
    it("pendingRegistryImplementation as expected", async function () {
      expect(this.registryV1Obj.pendingRegistryImplementation).to.eq(
        await this.registryV2.pendingRegistryImplementation(),
      );
    });
    it("tokens mapping as expected", async function () {
      expect(this.registryV1Obj.tokens).to.eq(await this.registryV2.tokens(registryArguments[fork].testToken.address));
    });
    it("tokensHashIndexByHash as expected", async function () {
      expect(this.registryV1Obj.tokensHashIndexByHash).to.eq(
        await this.registryV2.getTokensHashIndexByHash(registryArguments[fork].testToken.hash),
      );
    });
    it("tokensHashToTokenList as expected", async function () {
      expect(this.registryV1Obj.tokensHashToTokenList).to.deep.eq(
        await this.registryV2.getTokensHashToTokenList(registryArguments[fork].testToken.hash),
      );
    });
    it("liquidity pools mapping as expected", async function () {
      expect(this.registryV1Obj.liquidityPools).to.deep.eq(
        await this.registryV2.liquidityPools(registryArguments[fork].testLiquidityPool),
      );
    });
    it("swap pools mapping as expected", async function () {
      expect(Object.values(this.registryV1Obj.creditPools)).to.deep.eq(
        await this.registryV2.swapPools(registryArguments[fork].testSwapPool),
      );
    });
    it("liquidityPoolToAdapter mapping as expected", async function () {
      expect(getAddress(this.registryV1Obj.liquidityPoolToAdapter)).to.eq(
        getAddress(await this.registryV2.liquidityPoolToAdapter(registryArguments[fork].testLiquidityPool)),
      );
    });
    it("riskProfiles mapping as expected", async function () {
      expect(this.registryV1Obj.riskProfiles).to.deep.eq(await this.registryV2.getRiskProfile("2"));
    });
    it("vaultToVaultConfiguration mapping as expected", async function () {
      expect(this.registryV1Obj.vaultToVaultConfiguration).to.deep.eq(
        await this.registryV2.vaultToVaultConfiguration(registryArguments[fork].testVault),
      );
    });
    it("whitelistedUsers mapping as expected", async function () {
      expect(this.registryV1Obj.whitelistedUsers).to.eq(
        await this.registryV2.whitelistedUsers(registryArguments[fork].testVault, registryArguments[fork].testAccount),
      );
    });
    it("withdrawalFeeRange as expected", async function () {
      expect(this.registryV1Obj.withdrawalFeeRange).to.deep.eq(await this.registryV2.withdrawalFeeRange());
    });
    it("tokenHashIndexes Array as expected", async function () {
      expect(this.registryV1Obj.tokensHashIndexes).to.eq(await this.registryV2.tokensHashIndexes("0"));
    });
    it("riskProfilesArray as expected", async function () {
      expect(this.registryV1Obj.riskProfilesArray).to.eq(await this.registryV2.riskProfilesArray("3"));
    });
    it("strategyprovider as expected", async function () {
      expect(this.registryV1Obj.strategyProvider).to.eq(await this.registryV2.strategyProvider());
    });
    it("investStrategyRegistry as expected", async function () {
      expect(this.registryV1Obj.investStrategyRegistry).to.eq(await this.registryV2.investStrategyRegistry());
    });
    it("riskManager as expected", async function () {
      expect(this.registryV1Obj.riskManager).to.eq(await this.registryV2.riskManager());
    });
    it("harvestCodeProvider as expected", async function () {
      expect(this.registryV1Obj.harvestCodeProvider).to.eq(await this.registryV2.harvestCodeProvider());
    });
    it("strategyManager as expected", async function () {
      expect(this.registryV1Obj.strategyManager).to.eq(await this.registryV2.strategyManager());
    });
    it("opty as expected", async function () {
      expect(this.registryV1Obj.opty).to.eq(await this.registryV2.opty());
    });
    it("optyStakingRateBalance as expected", async function () {
      expect(this.registryV1Obj.optyStakingRateBalancer).to.eq(await this.registryV2.optyStakingRateBalancer());
    });
    it("odefiVaultBooster as expected", async function () {
      expect(this.registryV1Obj.odefiVaultBooster).to.eq(await this.registryV2.odefiVaultBooster());
    });
    it("swapPoolToAdapter mapping as expected", async function () {
      expect(await this.registryV2.swapPoolToAdapter(registryArguments[fork].testSwapPool)).to.eq(
        this.sushiswapExchangeAdapter.address,
      );
    });
  });

  for (const testVaultUnderlyingToken of Object.keys(testVaults)) {
    for (const testVault of Object.keys(testVaults[testVaultUnderlyingToken])) {
      describe(`${fork}-${testVaults[testVaultUnderlyingToken][testVault].newSymbol} storage test`, () => {
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} registryContract as expected`, async function () {
          console.log("registryContract ", await this.vaultsV6[testVaultUnderlyingToken][testVault].registryContract());
          expect(await this.vaultsV6[testVaultUnderlyingToken][testVault].registryContract()).to.eq(
            this.vaultsV5Obj[testVaultUnderlyingToken][testVault].registryContract,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} name as expected`, async function () {
          console.log("name ", await this.vaultsV6[testVaultUnderlyingToken][testVault].name());
          expect(await this.vaultsV6[testVaultUnderlyingToken][testVault].name()).to.eq(
            testVaults[testVaultUnderlyingToken][testVault].newName,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} symbol as expected`, async function () {
          console.log("symbol ", await this.vaultsV6[testVaultUnderlyingToken][testVault].symbol());
          expect(await this.vaultsV6[testVaultUnderlyingToken][testVault].symbol()).to.eq(
            testVaults[testVaultUnderlyingToken][testVault].newSymbol,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} op_Revision as expected`, async function () {
          console.log(
            "op_Revision ",
            await (await this.vaultsV6[testVaultUnderlyingToken][testVault].opTOKEN_REVISION()).toString(),
          );
          expect(await this.vaultsV6[testVaultUnderlyingToken][testVault].opTOKEN_REVISION()).to.eq("6");
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} pendingDeposits as expected`, async function () {
          if (testVaults[testVaultUnderlyingToken][testVault].testAccount !== undefined) {
            expect(
              await this.vaultsV6[testVaultUnderlyingToken][testVault].pendingDeposits(
                testVaults[testVaultUnderlyingToken][testVault].testAccount as string,
              ),
            ).to.eq(this.vaultsV5Obj[testVaultUnderlyingToken][testVault].pendingDeposits);
          }
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} totalDeposits as expected`, async function () {
          if (testVaults[testVaultUnderlyingToken][testVault].testAccount !== undefined) {
            expect(
              await this.vaultsV6[testVaultUnderlyingToken][testVault].totalDeposits(
                testVaults[testVaultUnderlyingToken][testVault].testAccount as string,
              ),
            ).to.eq(this.vaultsV5Obj[testVaultUnderlyingToken][testVault].totalDeposits);
          }
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} blockToBlockVaultValues as expected`, async function () {
          if (testVaults[testVaultUnderlyingToken][testVault].testBlockNumber !== undefined) {
            const actualBlockToBlockVaultValues = await this.vaultsV6[testVaultUnderlyingToken][
              testVault
            ].blockToBlockVaultValues(testVaults[testVaultUnderlyingToken][testVault]?.testBlockNumber as BigNumber, 0);
            expect({
              actualVaultValue: actualBlockToBlockVaultValues.actualVaultValue,
              blockMinVaultValue: actualBlockToBlockVaultValues.blockMinVaultValue,
              blockMaxVaultValue: actualBlockToBlockVaultValues.blockMaxVaultValue,
            }).to.deep.eq(this.vaultsV5Obj[testVaultUnderlyingToken][testVault].blockToBlockVaultValues[0]);
          }
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} investStrategyHash as expected`, async function () {
          expect(await this.vaultsV6[testVaultUnderlyingToken][testVault].investStrategyHash()).to.eq(
            this.vaultsV5Obj[testVaultUnderlyingToken][testVault].investStrategyHash,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} userDepositCapUT as expected`, async function () {
          console.log(
            "userDepositCapUT ",
            await (await this.vaultsV6[testVaultUnderlyingToken][testVault].userDepositCapUT()).toString(),
          );
          expect(await this.vaultsV6[testVaultUnderlyingToken][testVault].userDepositCapUT()).to.eq(
            this.vaultsV5Obj[testVaultUnderlyingToken][testVault].userDepositCap,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} minimumDepositVaultUT as expected`, async function () {
          console.log(
            "minimumDepositVaultUT ",
            await (await this.vaultsV6[testVaultUnderlyingToken][testVault].minimumDepositValueUT()).toString(),
          );
          expect(await this.vaultsV6[testVaultUnderlyingToken][testVault].minimumDepositValueUT()).to.eq(
            this.vaultsV5Obj[testVaultUnderlyingToken][testVault].minimumDepositValueUT,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} vaultConfiguration as expected`, async function () {
          console.log(
            "vaultConfiguration ",
            await (await this.vaultsV6[testVaultUnderlyingToken][testVault].vaultConfiguration()).toString(),
          );
          expect(await this.vaultsV6[testVaultUnderlyingToken][testVault].vaultConfiguration()).to.eq(
            this.vaultsV5Obj[testVaultUnderlyingToken][testVault].vaultConfiguration,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} underlyingToken as expected`, async function () {
          console.log("underlyingToken ", await this.vaultsV6[testVaultUnderlyingToken][testVault].underlyingToken());
          expect(await this.vaultsV6[testVaultUnderlyingToken][testVault].underlyingToken()).to.eq(
            this.vaultsV5Obj[testVaultUnderlyingToken][testVault].underlyingToken,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} whitelistedAccountsRoot as expected`, async function () {
          console.log(
            "whitelistedAccountsRoot ",
            await this.vaultsV6[testVaultUnderlyingToken][testVault].whitelistedAccountsRoot(),
          );
          expect(await this.vaultsV6[testVaultUnderlyingToken][testVault].whitelistedAccountsRoot()).to.eq(
            this.vaultsV5Obj[testVaultUnderlyingToken][testVault].whitelistedAccountsRoot,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} totalValueLockedLimitUT as expected`, async function () {
          console.log(
            "totalValueLockedLimitUT ",
            await (await this.vaultsV6[testVaultUnderlyingToken][testVault].totalValueLockedLimitUT()).toString(),
          );
          expect(await this.vaultsV6[testVaultUnderlyingToken][testVault].totalValueLockedLimitUT()).to.eq(
            this.vaultsV5Obj[testVaultUnderlyingToken][testVault].totalValueLockedLimitUT,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} _domainSeparator as expected`, async function () {
          const expectedDomainSeparator = ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              ["bytes32", "bytes32", "bytes32", "uint256", "address"],
              [
                EIP712_DOMAIN,
                ethers.utils.id(testVaults[testVaultUnderlyingToken][testVault].newName),
                EIP712_REVISION,
                await getChainId(),
                this.vaultsV6[testVaultUnderlyingToken][testVault].address,
              ],
            ),
          );
          expect(await this.vaultsV6[testVaultUnderlyingToken][testVault]._domainSeparator()).to.eq(
            expectedDomainSeparator,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} underlyingTokensHash as expected`, async function () {
          expect(await this.vaultsV6[testVaultUnderlyingToken][testVault].underlyingTokensHash()).to.eq(
            this.vaultsV5Obj[testVaultUnderlyingToken][testVault].underlyingTokensHash,
          );
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} investStrategySteps as expected`, async function () {
          if (testVaults[testVaultUnderlyingToken][testVault].hasStrategy) {
            const strategyStep = await this.vaultsV6[testVaultUnderlyingToken][testVault].investStrategySteps(0);
            expect(
              Object.values({
                pool: strategyStep.pool,
                outputToken: strategyStep.outputToken,
                isSwap: strategyStep.isSwap,
              }),
            ).to.deep.eq(Object.values(this.vaultsV5Obj[testVaultUnderlyingToken][testVault].investStrategySteps[0]));
          }
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} nonces as expected`, async function () {
          expect(
            await this.vaultsV6[testVaultUnderlyingToken][testVault].nonces(
              "0x6bd60f089B6E8BA75c409a54CDea34AA511277f6",
            ),
          ).to.eq(0);
        });
        it(`${testVaults[testVaultUnderlyingToken][testVault].newSymbol} blockTransaction as expected`, async function () {
          if (fork == eEVMNetwork.polygon) {
            expect(await this.vaultsV6[testVaultUnderlyingToken][testVault].blockTransaction(33802456)).to.be.false;
          }
          if (fork == eEVMNetwork.mainnet) {
            expect(await this.vaultsV6[testVaultUnderlyingToken][testVault].blockTransaction(15654508)).to.be.false;
          }
        });
      });
    }
  }
  if (fork === eEVMNetwork.mainnet) {
    describe("Rebalance opUSD3-Earn", async function () {
      let opUSD3Earn: VaultV6;
      it("USDT Lending on DAMM", async function () {
        opUSD3Earn = <VaultV6>(
          await ethers.getContractAt(VaultV6__factory.abi, "0x9E8262534fAeF7cBB7E1AfDa483829246a0eB963")
        );
        expect(
          await opUSD3Earn.getLastStrategyStepBalanceLP([
            {
              pool: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
              outputToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
              isSwap: true,
            },
            {
              pool: "0xBf0852A95eC76e87f7431Fa505B27937C9836372",
              outputToken: "0xBf0852A95eC76e87f7431Fa505B27937C9836372",
              isSwap: false,
            },
          ]),
        ).eq("0");
        const tx = await opUSD3Earn.rebalance();
        await tx.wait(1);
        expect(
          await opUSD3Earn.getLastStrategyStepBalanceLP([
            {
              pool: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
              outputToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
              isSwap: true,
            },
            {
              pool: "0xBf0852A95eC76e87f7431Fa505B27937C9836372",
              outputToken: "0xBf0852A95eC76e87f7431Fa505B27937C9836372",
              isSwap: false,
            },
          ]),
        ).gt("0");
      });
      it("null strategy", async function () {
        await opUSD3Earn
          .connect(this.signers.riskOperator)
          .giveAllowances([EthereumTokens.PLAIN_TOKENS.USDT], ["0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7"]);
        let tx = await this.strategyProvider
          .connect(this.signers.strategyOperator)
          .setBestStrategy("1", MULTI_CHAIN_VAULT_TOKENS[eEVMNetwork.mainnet]["USD3"].hash, []);
        await tx.wait(1);
        tx = await opUSD3Earn.rebalance();
        await tx.wait(1);
        expect(await opUSD3Earn.getInvestStrategySteps()).to.deep.eq([]);
        expect(
          await opUSD3Earn.getLastStrategyStepBalanceLP([
            {
              pool: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
              outputToken: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
              isSwap: true,
            },
            {
              pool: "0xBf0852A95eC76e87f7431Fa505B27937C9836372",
              outputToken: "0xBf0852A95eC76e87f7431Fa505B27937C9836372",
              isSwap: false,
            },
          ]),
        ).eq("0");
      });
    });
  }
});

// reference : https://github.com/ethers-io/ethers.js/issues/195#issuecomment-1212815642
function linkLibrary(bytecode: string, name: string, address: string): string {
  let linkedBytecode = bytecode;
  // eslint-disable-next-line no-useless-escape
  const placeholder = `__\$${ethers.utils.solidityKeccak256(["string"], [name]).slice(2, 36)}\$__`;
  const formattedAddress = ethers.utils.getAddress(address).toLowerCase().replace("0x", "");
  if (linkedBytecode.indexOf(placeholder) === -1) {
    throw new Error(`Unable to find placeholder for library ${name}`);
  }
  while (linkedBytecode.indexOf(placeholder) !== -1) {
    linkedBytecode = linkedBytecode.replace(placeholder, formattedAddress);
  }
  return linkedBytecode;
}
