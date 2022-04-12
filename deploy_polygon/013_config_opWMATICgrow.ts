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
  const opWMATICgrowAddress = await (await deployments.get("opWMATICgrow")).address; // fetches proxy address
  const strategyProviderAddress = await (await deployments.get("StrategyProvider")).address;

  const opWMATICgrowInstance = await ethers.getContractAt("Vault", opWMATICgrowAddress);
  const financeOperatorSigner = await ethers.getSigner(await registryV2Instance.financeOperator());
  const operatorSigner = await ethers.getSigner(await registryV2Instance.operator());
  const governanceSigner = await ethers.getSigner(await registryV2Instance.governance());

  console.log("set risk profile code for opWMATICgrow");
  console.log("\n");
  const _vaultConfiguration_ = await opWMATICgrowInstance.vaultConfiguration();
  if (expectedRiskProfileCode.eq(getRiskProfileCode(_vaultConfiguration_))) {
    console.log("risk profile code  is as expected");
    console.log("\n");
  } else {
    console.log("Governance setting risk profile code for opWMATICgrow..");
    console.log("\n");
    const tx1 = await opWMATICgrowInstance.connect(governanceSigner).setRiskProfileCode(expectedRiskProfileCode);
    await tx1.wait(1);
  }

  console.log("vaultConfiguration for opWMATICgrow");
  console.log("\n");

  const _vaultConfiguration = await opWMATICgrowInstance.vaultConfiguration();
  if (expectedConfig.eq(_vaultConfiguration)) {
    console.log("vaultConfiguration is as expected");
    console.log("\n");
  } else {
    console.log("Governance setting vault configuration for opWMATICgrow..");
    console.log("\n");
    const tx2 = await opWMATICgrowInstance.connect(governanceSigner).setVaultConfiguration(expectedConfig);
    await tx2.wait(1);
  }

  console.log("Operator setting UnderlyingTokensHash...");
  console.log("\n");

  const tokensHash = await opWMATICgrowInstance.underlyingTokensHash();

  if (tokensHash != MULTI_CHAIN_VAULT_TOKENS[networkName].WMATIC.hash) {
    console.log("setting tokenshash..");
    console.log("\n");
    const tx3 = await opWMATICgrowInstance
      .connect(operatorSigner)
      .setUnderlyingTokensHash(MULTI_CHAIN_VAULT_TOKENS[networkName].WMATIC.hash);
    await tx3.wait(1);
  } else {
    console.log("Tokenshash is upto date");
    console.log("\n");
  }

  console.log("Finance operator setting opWMATICgrow config...");
  console.log("\n");

  const actualUserDepositCapUT = await opWMATICgrowInstance.userDepositCapUT();
  const actualMinimumDepositValueUT = await opWMATICgrowInstance.minimumDepositValueUT();
  const actualTotalValueLockedLimitUT = await opWMATICgrowInstance.totalValueLockedLimitUT();

  console.log("opWMATICgrow.setValueControlParams()");
  console.log("\n");
  if (
    expectedUserDepositCapUT.eq(actualUserDepositCapUT) &&
    expectedMinimumDepositValueUT.eq(actualMinimumDepositValueUT) &&
    expectedTotalValueLockedLimitUT.eq(actualTotalValueLockedLimitUT)
  ) {
    console.log("userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT is upto date on opWMATICgrow");
    console.log("\n");
  } else {
    console.log("Updating userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT on opWMATICgrow...");
    console.log("\n");
    const tx4 = await opWMATICgrowInstance
      .connect(financeOperatorSigner)
      .setValueControlParams(expectedUserDepositCapUT, expectedMinimumDepositValueUT, expectedTotalValueLockedLimitUT);
    await tx4.wait(1);
  }

  console.log("unpause opWMATICgrow");
  console.log("\n");
  const vaultConfiguration = await opWMATICgrowInstance.vaultConfiguration();
  const unpause = getUnpause(vaultConfiguration);

  if (!unpause) {
    console.log("Governance unpausing opWMATICgrow vault...");
    console.log("\n");
    const tx5 = await opWMATICgrowInstance.connect(governanceSigner).setUnpaused(true);
    await tx5.wait(1);
  } else {
    console.log("opWMATICgrow is already unpaused...");
    console.log("\n");
  }

  console.log("whitelisting for opWMATICgrow");
  console.log("\n");
  const actualAccountsRoot = await opWMATICgrowInstance.whitelistedAccountsRoot();
  if (actualAccountsRoot != expectedAccountsRoot) {
    console.log("Governance setting whitelisted account root opWMATICgrow vault...");
    console.log("\n");
    const tx6 = await opWMATICgrowInstance.connect(governanceSigner).setWhitelistedAccountsRoot(expectedAccountsRoot);
    await tx6.wait(1);
  } else {
    console.log("whitelisted accounts root for opWMATICgrow is as expected");
    console.log("\n");
  }

  const strategyProviderInstance = await ethers.getContractAt(
    ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER,
    strategyProviderAddress,
  );
  const strategyOperatorSigner = await ethers.getSigner(await registryV2Instance.strategyOperator());

  console.log("Operator setting best strategy for opWMATICgrow...");
  console.log("\n");

  const currentBestStrategySteps = await strategyProviderInstance.getRpToTokenToBestStrategy(
    expectedRiskProfileCode,
    MULTI_CHAIN_VAULT_TOKENS[networkName].WMATIC.hash,
  );
  const currentBestStrategyHash = await opWMATICgrowInstance.computeInvestStrategyHash(currentBestStrategySteps);
  const expectedStrategySteps = StrategiesByTokenByChain[networkName].WMATIC[strategyName].strategy;
  const expectedStrategyHash = await opWMATICgrowInstance.computeInvestStrategyHash(
    expectedStrategySteps.map(x => ({
      pool: x.contract,
      outputToken: x.outputToken,
      isBorrow: x.isBorrow,
    })),
  );

  if (currentBestStrategyHash !== expectedStrategyHash) {
    console.log("Strategy operator setting best strategy..");
    console.log("\n");
    const tx7 = await strategyProviderInstance.connect(strategyOperatorSigner).setBestStrategy(
      expectedRiskProfileCode,
      MULTI_CHAIN_VAULT_TOKENS[networkName].WMATIC.hash,
      expectedStrategySteps.map(x => ({
        pool: x.contract,
        outputToken: x.outputToken,
        isBorrow: x.isBorrow,
      })),
    );
    await tx7.wait(1);
  } else {
    console.log("best strategy is upto date.");
    console.log("\n");
  }
  console.log("Next Best Strategy ", await opWMATICgrowInstance.getNextBestInvestStrategy());
};
export default func;
func.tags = ["PolygonConfigopWMATICgrow"];
func.dependencies = ["PolygonopWMATICgrow", "PolygonApproveAndMapLiquidityPoolToAdapter", "StrategyProvider"];
