import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { eEVMNetwork } from "../helper-hardhat-config";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { getRiskProfileCode, getUnpause } from "../helpers/utils";
import { StrategiesByTokenByChain } from "../helpers/data/adapter-with-strategies";

const func: DeployFunction = async ({ ethers, deployments }: HardhatRuntimeEnvironment) => {
  const { BigNumber } = ethers;

  const networkName = eEVMNetwork.avalanche;
  // bit 0-15 deposit fee in underlying token without decimals 0000 (no fee)
  // bit 16-31 deposit fee in basis points 0000 (0% or 0 basis points)
  // bit 32-47 withdrawal fee in underlying token without decimals 0000 (no fee)
  // bit 48-63 withdrawal fee in basis points 000 (0% or 0 basis points)
  // bit 64-79 max vault value jump allowed in basis points (standard deviation allowed for vault value) 0064 (0.01% or 100 basis points)
  // bit 80-239 vault fee collection address 0000000000000000000000000000000000000000 (no address set)
  // bit 240-247 risk profile code 01
  // bit 248 emergency shutdown flag 0
  // bit 249 pause flag (deposit/withdraw is pause when bit is unset, unpause otherwise) 1
  // bit 250 white list state flag 1
  // bit 251-255 reserved 00000
  // 0x0601000000000000000000000000000000000000000000640000000000000000
  const expectedConfig = BigNumber.from("2715643938564376714569528258641865758826842749497826340477583138757711757312");
  // no whitelist state
  // 0x0201000000000000000000000000000000000000000000640000000000000000
  // const expectedConfig = BigNumber.from("906392544231311161076231617881117198619499239097192527361058388634069106688");
  const expectedUserDepositCapUT = BigNumber.from("100000000000"); // 100,000 USDCe
  const expectedMinimumDepositValueUT = BigNumber.from("0"); // 0 USDCe
  const expectedTotalValueLockedLimitUT = BigNumber.from("10000000000000"); // 10,000,000
  const expectedAccountsRoot = "0x5497616cb86ca51b3788923a239cb626f3593a6395e3c66fe24b452204fbf875";
  const expectedRiskProfileCode = BigNumber.from("1");

  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const opUSDCegrowAddress = await (await deployments.get("opUSDC.egrow")).address; // fetches proxy address
  const strategyProviderAddress = await (await deployments.get("StrategyProvider")).address;

  const opUSDCegrowInstance = await ethers.getContractAt("Vault", opUSDCegrowAddress);
  const financeOperatorSigner = await ethers.getSigner(await registryV2Instance.financeOperator());
  const operatorSigner = await ethers.getSigner(await registryV2Instance.operator());
  const governanceSigner = await ethers.getSigner(await registryV2Instance.governance());

  console.log("set risk profile code for opUSDCegrow");
  console.log("\n");
  const _vaultConfiguration_ = await opUSDCegrowInstance.vaultConfiguration();
  if (expectedRiskProfileCode.eq(getRiskProfileCode(_vaultConfiguration_))) {
    console.log("risk profile code  is as expected");
    console.log("\n");
  } else {
    console.log("Governance setting risk profile code for opUSDCegrow..");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx1 = await opUSDCegrowInstance.connect(governanceSigner).setRiskProfileCode(expectedRiskProfileCode, {
      type: 2,
      maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
      maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
    });
    await tx1.wait(1);
  }

  console.log("vaultConfiguration for opUSDCegrow");
  console.log("\n");

  const _vaultConfiguration = await opUSDCegrowInstance.vaultConfiguration();
  if (expectedConfig.eq(_vaultConfiguration)) {
    console.log("vaultConfiguration is as expected");
    console.log("\n");
  } else {
    console.log("Governance setting vault configuration for opUSDCegrow..");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx2 = await opUSDCegrowInstance.connect(governanceSigner).setVaultConfiguration(expectedConfig, {
      type: 2,
      maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
      maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
    });
    await tx2.wait(1);
  }

  console.log("Operator setting UnderlyingTokensHash...");
  console.log("\n");

  const tokensHash = await opUSDCegrowInstance.underlyingTokensHash();

  if (tokensHash != MULTI_CHAIN_VAULT_TOKENS[networkName].USDCe.hash) {
    console.log("setting tokenshash..");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx3 = await opUSDCegrowInstance
      .connect(operatorSigner)
      .setUnderlyingTokensHash(MULTI_CHAIN_VAULT_TOKENS[networkName].USDCe.hash, {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await tx3.wait(1);
  } else {
    console.log("Tokenshash is upto date");
    console.log("\n");
  }

  console.log("Finance operator setting opUSDCegrow config...");
  console.log("\n");

  const actualUserDepositCapUT = await opUSDCegrowInstance.userDepositCapUT();
  const actualMinimumDepositValueUT = await opUSDCegrowInstance.minimumDepositValueUT();
  const actualTotalValueLockedLimitUT = await opUSDCegrowInstance.totalValueLockedLimitUT();

  console.log("opUSDCegrow.setValueControlParams()");
  console.log("\n");
  if (
    expectedUserDepositCapUT.eq(actualUserDepositCapUT) &&
    expectedMinimumDepositValueUT.eq(actualMinimumDepositValueUT) &&
    expectedTotalValueLockedLimitUT.eq(actualTotalValueLockedLimitUT)
  ) {
    console.log("userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT is upto date on opUSDCegrow");
    console.log("\n");
  } else {
    console.log("Updating userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT on opUSDCegrow...");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx4 = await opUSDCegrowInstance
      .connect(financeOperatorSigner)
      .setValueControlParams(expectedUserDepositCapUT, expectedMinimumDepositValueUT, expectedTotalValueLockedLimitUT, {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await tx4.wait(1);
  }

  console.log("unpause opUSDCegrow");
  console.log("\n");
  const vaultConfiguration = await opUSDCegrowInstance.vaultConfiguration();
  const unpause = getUnpause(vaultConfiguration);

  if (!unpause) {
    console.log("Governance unpausing opUSDCegrow vault...");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx5 = await opUSDCegrowInstance.connect(governanceSigner).setUnpaused(true, {
      type: 2,
      maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
      maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
    });
    await tx5.wait(1);
  } else {
    console.log("opUSDCegrow is already unpaused...");
    console.log("\n");
  }

  console.log("whitelisting for opUSDCegrow");
  console.log("\n");
  const actualAccountsRoot = await opUSDCegrowInstance.whitelistedAccountsRoot();
  if (actualAccountsRoot != expectedAccountsRoot) {
    console.log("Governance setting whitelisted account root opUSDCegrow vault...");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx6 = await opUSDCegrowInstance.connect(governanceSigner).setWhitelistedAccountsRoot(expectedAccountsRoot, {
      type: 2,
      maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
      maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
    });
    await tx6.wait(1);
  } else {
    console.log("whitelisted accounts root for opUSDCegrow is as expected");
    console.log("\n");
  }

  const strategyProviderInstance = await ethers.getContractAt(
    ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER,
    strategyProviderAddress,
  );
  const strategyOperatorSigner = await ethers.getSigner(await registryV2Instance.strategyOperator());
  const strategyName = "usdce-DEPOSIT-AaveV2-avUSDC";
  console.log("Operator setting best strategy for opUSDCgrow...");
  console.log("\n");

  const currentBestStrategySteps = await strategyProviderInstance.getRpToTokenToBestStrategy(
    expectedRiskProfileCode,
    MULTI_CHAIN_VAULT_TOKENS[networkName].USDCe.hash,
  );
  const currentBestStrategyHash = await opUSDCegrowInstance.computeInvestStrategyHash(currentBestStrategySteps);
  const expectedStrategySteps = StrategiesByTokenByChain[networkName].USDCe[strategyName].strategy;
  const expectedStrategyHash = await opUSDCegrowInstance.computeInvestStrategyHash(
    expectedStrategySteps.map(x => ({
      pool: x.contract,
      outputToken: x.outputToken,
      isBorrow: x.isBorrow,
    })),
  );

  if (currentBestStrategyHash !== expectedStrategyHash) {
    console.log("Strategy operator setting best strategy..");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx7 = await strategyProviderInstance.connect(strategyOperatorSigner).setBestStrategy(
      expectedRiskProfileCode,
      MULTI_CHAIN_VAULT_TOKENS[networkName].USDCe.hash,
      expectedStrategySteps.map(x => ({
        pool: x.contract,
        outputToken: x.outputToken,
        isBorrow: x.isBorrow,
      })),
      {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      },
    );
    await tx7.wait(1);
  } else {
    console.log("best strategy is upto date.");
    console.log("\n");
  }
  console.log("Next Best Strategy ", await opUSDCegrowInstance.getNextBestInvestStrategy());
};
export default func;
func.tags = ["AvalancheConfigopUSDCegrow"];
func.dependencies = ["AvalancheopUSDCegrow", "AvalancheApproveAndMapLiquidityPoolToAdapter", "StrategyProvider"];
