import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { eEVMNetwork } from "../helper-hardhat-config";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { StrategiesByTokenByChain } from "../helpers/data/adapter-with-strategies";
import { getRiskProfileCode, getUnpause } from "../helpers/utils";

const func: DeployFunction = async ({ ethers, deployments }: HardhatRuntimeEnvironment) => {
  const { BigNumber } = ethers;
  const networkName = eEVMNetwork.polygon;
  const strategyName = "wmatic-DEPOSIT-Aave-amWMATIC";
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
  const expectedUserDepositCapUT = ethers.utils.parseEther("60000"); // 60,000 WMATIC
  const expectedMinimumDepositValueUT = ethers.utils.parseEther("600"); // 600 WMATIC
  const expectedTotalValueLockedLimitUT = ethers.utils.parseEther("6000000"); // 6,000,000 WMATIC
  const expectedAccountsRoot = "0x62689e8751ba85bee0855c30d61d17345faa5b23e82626a83f8d63db50d67694";
  const expectedRiskProfileCode = BigNumber.from("1");

  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const opWMATICearnAddress = await (await deployments.get("opWMATIC-Earn")).address; // fetches proxy address
  const strategyProviderAddress = await (await deployments.get("StrategyProvider")).address;

  const opWMATICearnInstance = await ethers.getContractAt("Vault", opWMATICearnAddress);
  const financeOperatorSigner = await ethers.getSigner(await registryV2Instance.financeOperator());
  const operatorSigner = await ethers.getSigner(await registryV2Instance.operator());
  const governanceSigner = await ethers.getSigner(await registryV2Instance.governance());

  console.log("set risk profile code for opWMATICearn");
  console.log("\n");
  const _vaultConfiguration_ = await opWMATICearnInstance.vaultConfiguration();
  if (expectedRiskProfileCode.eq(getRiskProfileCode(_vaultConfiguration_))) {
    console.log("risk profile code  is as expected");
    console.log("\n");
  } else {
    console.log("Governance setting risk profile code for opWMATICearn..");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx1 = await opWMATICearnInstance.connect(governanceSigner).setRiskProfileCode(expectedRiskProfileCode, {
      type: 2,
      maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
      maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
    });
    await tx1.wait(1);
  }

  console.log("vaultConfiguration for opWMATICearn");
  console.log("\n");

  const _vaultConfiguration = await opWMATICearnInstance.vaultConfiguration();
  if (expectedConfig.eq(_vaultConfiguration)) {
    console.log("vaultConfiguration is as expected");
    console.log("\n");
  } else {
    console.log("Governance setting vault configuration for opWMATICearn..");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx2 = await opWMATICearnInstance.connect(governanceSigner).setVaultConfiguration(expectedConfig, {
      type: 2,
      maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
      maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
    });
    await tx2.wait(1);
  }

  console.log("Operator setting UnderlyingTokensHash...");
  console.log("\n");

  const tokensHash = await opWMATICearnInstance.underlyingTokensHash();

  if (tokensHash != MULTI_CHAIN_VAULT_TOKENS[networkName].WMATIC.hash) {
    console.log("setting tokenshash..");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx3 = await opWMATICearnInstance
      .connect(operatorSigner)
      .setUnderlyingTokensHash(MULTI_CHAIN_VAULT_TOKENS[networkName].WMATIC.hash, {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await tx3.wait(1);
  } else {
    console.log("Tokenshash is upto date");
    console.log("\n");
  }

  console.log("Finance operator setting opWMATICearn config...");
  console.log("\n");

  const actualUserDepositCapUT = await opWMATICearnInstance.userDepositCapUT();
  const actualMinimumDepositValueUT = await opWMATICearnInstance.minimumDepositValueUT();
  const actualTotalValueLockedLimitUT = await opWMATICearnInstance.totalValueLockedLimitUT();

  console.log("opWMATICearn.setValueControlParams()");
  console.log("\n");
  if (
    expectedUserDepositCapUT.eq(actualUserDepositCapUT) &&
    expectedMinimumDepositValueUT.eq(actualMinimumDepositValueUT) &&
    expectedTotalValueLockedLimitUT.eq(actualTotalValueLockedLimitUT)
  ) {
    console.log("userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT is upto date on opWMATICearn");
    console.log("\n");
  } else {
    console.log("Updating userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT on opWMATICearn...");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx4 = await opWMATICearnInstance
      .connect(financeOperatorSigner)
      .setValueControlParams(expectedUserDepositCapUT, expectedMinimumDepositValueUT, expectedTotalValueLockedLimitUT, {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await tx4.wait(1);
  }

  console.log("unpause opWMATICearn");
  console.log("\n");
  const vaultConfiguration = await opWMATICearnInstance.vaultConfiguration();
  const unpause = getUnpause(vaultConfiguration);

  if (!unpause) {
    console.log("Governance unpausing opWMATICearn vault...");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx5 = await opWMATICearnInstance.connect(governanceSigner).setUnpaused(true, {
      type: 2,
      maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
      maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
    });
    await tx5.wait(1);
  } else {
    console.log("opWMATICearn is already unpaused...");
    console.log("\n");
  }

  console.log("whitelisting for opWMATICearn");
  console.log("\n");
  const actualAccountsRoot = await opWMATICearnInstance.whitelistedAccountsRoot();
  if (actualAccountsRoot != expectedAccountsRoot) {
    console.log("Governance setting whitelisted account root opWMATICearn vault...");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const tx6 = await opWMATICearnInstance.connect(governanceSigner).setWhitelistedAccountsRoot(expectedAccountsRoot, {
      type: 2,
      maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
      maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
    });
    await tx6.wait(1);
  } else {
    console.log("whitelisted accounts root for opWMATICearn is as expected");
    console.log("\n");
  }

  const strategyProviderInstance = await ethers.getContractAt(
    ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER,
    strategyProviderAddress,
  );
  const strategyOperatorSigner = await ethers.getSigner(await registryV2Instance.strategyOperator());

  console.log("Operator setting best strategy for opWMATICearn...");
  console.log("\n");

  const currentBestStrategySteps = await strategyProviderInstance.getRpToTokenToBestStrategy(
    expectedRiskProfileCode,
    MULTI_CHAIN_VAULT_TOKENS[networkName].WMATIC.hash,
  );
  const currentBestStrategyHash = await opWMATICearnInstance.computeInvestStrategyHash(currentBestStrategySteps);
  const expectedStrategySteps = StrategiesByTokenByChain[networkName]["Earn"].WMATIC[strategyName].strategy;
  const expectedStrategyHash = await opWMATICearnInstance.computeInvestStrategyHash(
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
      MULTI_CHAIN_VAULT_TOKENS[networkName].WMATIC.hash,
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
  console.log("Next Best Strategy ", await opWMATICearnInstance.getNextBestInvestStrategy());
};
export default func;
func.tags = ["PolygonConfigopWMATIC-Earn"];
func.dependencies = ["PolygonopWMATIC-Earn", "PolygonApproveAndMapLiquidityPoolToAdapter", "StrategyProvider"];
