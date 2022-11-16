import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import { expect } from "chai";
import { getAddress, parseEther } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import EthereumSushiswap from "@optyfi/defi-legos/ethereum/sushiswap/index";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { Signers } from "../../../../helpers/utils";
import {
  RegistryProxy,
  RegistryProxy__factory,
  Registry__factory,
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

const fork = process.env.FORK as eEVMNetwork;

const registryArguments: {
  [key: string]: {
    testToken: { [key: string]: string };
    testLiquidityPool: string;
    testLiquidityPoolAdapter: string;
    testVault: string;
    testAccount: string;
    testSwapPool: string;
    registryProxy: string;
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
  },
};

describe("Registry Upgrade", async function () {
  before(async function () {
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
    this.registryV1 = <RegistryV1>(
      await ethers.getContractAt(RegistryV1__factory.abi, registryArguments[fork].registryProxy)
    );
    const sushiswapExchangeAdapterFactory = await ethers.getContractFactory(
      UniswapV2ExchangeAdapter__factory.abi,
      UniswapV2ExchangeAdapter__factory.bytecode,
    );
    const sushiswapExchangeAdapter = await sushiswapExchangeAdapterFactory.deploy(
      "0x99fa011e33a8c6196869dec7bc407e896ba67fe3",
      EthereumSushiswap.SushiswapRouter.address,
      "0xC77AFEf1deeeF80Eb814aD159c93B28026FEbbe2",
    );
    this.sushiswapExchangeAdapter = <UniswapV2ExchangeAdapter>(
      await ethers.getContractAt(UniswapV2ExchangeAdapter__factory.abi, sushiswapExchangeAdapter.address)
    );
    const registryFactory = await ethers.getContractFactory(Registry__factory.abi, Registry__factory.bytecode);
    const registryV2 = await registryFactory.deploy();
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
      riskManager: await this.registryV1.riskManager(),
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
    let registryV2Instance = await ethers.getContractAt(Registry__factory.abi, registryV2.address);
    let registryProxyInstance = <RegistryProxy>(
      await ethers.getContractAt(RegistryProxy__factory.abi, "0x99fa011e33a8c6196869dec7bc407e896ba67fe3")
    );
    const operatorAddress = await registryProxyInstance.operator();
    const operatorSigner = await ethers.getSigner(operatorAddress);
    const governanceAddress = await registryProxyInstance.governance();
    const governanceSigner = await ethers.getSigner(governanceAddress);
    const riskOperatorAddress = await registryProxyInstance.riskOperator();
    const riskOperatorSigner = await ethers.getSigner(riskOperatorAddress);
    registryProxyInstance = <RegistryProxy>(
      await ethers.getContractAt(RegistryProxy__factory.abi, "0x99fa011e33a8c6196869dec7bc407e896ba67fe3")
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
    // upgrade registry
    const registryImplementation = await registryProxyInstance.registryImplementation();
    console.log("registryImplementation ", registryImplementation);
    if (getAddress(registryImplementation) != getAddress(registryV2.address)) {
      const pendingImplementation = await registryProxyInstance.pendingRegistryImplementation();
      if (getAddress(pendingImplementation) != getAddress(registryV2.address)) {
        const setPendingImplementationTx = await registryProxyInstance
          .connect(operatorSigner)
          .setPendingImplementation(registryV2.address);
        await setPendingImplementationTx.wait(1);
      }
      const becomeTx = await registryV2Instance
        .connect(governanceSigner)
        .become("0x99fa011e33a8c6196869dec7bc407e896ba67fe3");
      const txr = await becomeTx.wait(1);
      console.log(txr);
      console.log("new registryImplementation ", await registryProxyInstance.registryImplementation());
    }

    registryV2Instance = await ethers.getContractAt(
      Registry__factory.abi,
      "0x99fa011e33a8c6196869dec7bc407e896ba67fe3",
    );
    let tx = await registryV2Instance
      .connect(operatorSigner)
      ["approveSwapPoolAndMapToAdapter(address,address)"](
        "0x397FF1542f962076d0BFE58eA045FfA2d347ACa0",
        this.sushiswapExchangeAdapter.address,
      );
    await tx.wait(1);
    tx = await registryV2Instance
      .connect(riskOperatorSigner)
      ["rateSwapPool(address,uint8)"]("0x397FF1542f962076d0BFE58eA045FfA2d347ACa0", 99);
    await tx.wait(1);
    this.registryV2 = <RegistryV2>await ethers.getContractAt(RegistryV2__factory.abi, registryV2Instance.address);
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
    // it("tokens mapping as expected", async function () {});
    // it("tokensHashToTokens mapping as expected", async function () {});
    // it("liquidity pools mapping as expected", async function () {});
    // it("swap pools mapping as expected", async function () {});
    // it("liquidityPoolToAdapter mapping as expected", async function () {});
    // it("riskProfiles mapping as expected", async function () {});
    // it("vaultToVaultConfiguration mapping as expected", async function () {});
    // it("whitelistedUsers mapping as expected", async function () {});
    // it("withdrawalFeeRange as expected", async function () {});
    // it("tokenHashIndexes Array as expected", async function () {});
    // it("riskProfilesArray as expected", async function () {});
    // it("strategyprovider as expected", async function () {});
    // it("investStrategyRegistry as expected", async function () {});
    // it("riskManager as expected", async function () {});
    // it("harvestCodeProvider as expected", async function () {});
    // it("strategyManager as expected", async function () {});
    // it("opty as expected", async function () {});
    // it("optyStakingRateBalance as expected", async function () {});
    // it("odefiVaultBooster as expected", async function () {});
    // it("swapPoolToAdapter mapping as expected", async function () {});
  });
});
