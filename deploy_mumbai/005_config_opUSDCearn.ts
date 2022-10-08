import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { eEVMNetwork } from "../helper-hardhat-config";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { StrategiesByTokenByChain } from "../helpers/data/adapter-with-strategies";
import { getRiskProfileCode, getUnpause } from "../helpers/utils";

const func: DeployFunction = async ({ ethers, deployments }: HardhatRuntimeEnvironment) => {
  const { BigNumber } = ethers;

  const networkName = eEVMNetwork.mumbai;
  const strategyName = "usdc-DEPOSIT-Aave-amUSDC";
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
  // const expectedConfig = BigNumber.from("2715643938564376714569528258641865758826842749497826340477583138757711757312");
  // no whitelist state
  // 0x0201000000000000000000000000000000000000000000640000000000000000
  const expectedConfig = BigNumber.from("906392544231311161076231617881117198619499239097192527361058388634069106688");
  const expectedUserDepositCapUT = BigNumber.from("100000000000"); // 100,000 USDC
  const expectedMinimumDepositValueUT = BigNumber.from("5000000"); // 5 USDC
  const expectedTotalValueLockedLimitUT = BigNumber.from("10000000000000"); // 10,000,000
  const expectedRiskProfileCode = BigNumber.from("1");

  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const opUSDCearnAddress = await (await deployments.get("opUSDCearn")).address; // fetches proxy address
  const strategyProviderAddress = await (await deployments.get("StrategyProvider")).address;

  const opUSDCearnInstance = await ethers.getContractAt("Vault", opUSDCearnAddress);
  const financeOperatorSigner = await ethers.getSigner(await registryV2Instance.financeOperator());
  const operatorSigner = await ethers.getSigner(await registryV2Instance.operator());
  const governanceSigner = await ethers.getSigner(await registryV2Instance.governance());

  console.log("set risk profile code for opUSDCearn");
  console.log("\n");
  const _vaultConfiguration_ = await opUSDCearnInstance.vaultConfiguration();
  if (expectedRiskProfileCode.eq(getRiskProfileCode(_vaultConfiguration_))) {
    console.log("risk profile code  is as expected");
    console.log("\n");
  } else {
    console.log("Governance setting risk profile code for opUSDCearn..");
    console.log("\n");
    const tx1 = await opUSDCearnInstance.connect(governanceSigner).setRiskProfileCode(expectedRiskProfileCode);
    await tx1.wait(1);
  }

  console.log("vaultConfiguration for opUSDCearn");
  console.log("\n");

  const _vaultConfiguration = await opUSDCearnInstance.vaultConfiguration();
  if (expectedConfig.eq(_vaultConfiguration)) {
    console.log("vaultConfiguration is as expected");
    console.log("\n");
  } else {
    console.log("Governance setting vault configuration for opUSDCearn..");
    console.log("\n");
    const tx2 = await opUSDCearnInstance.connect(governanceSigner).setVaultConfiguration(expectedConfig);
    await tx2.wait(1);
  }

  console.log("Operator setting UnderlyingTokensHash...");
  console.log("\n");

  const tokensHash = await opUSDCearnInstance.underlyingTokensHash();

  if (tokensHash != MULTI_CHAIN_VAULT_TOKENS[networkName].USDC.hash) {
    console.log("setting tokenshash..");
    console.log("\n");
    const tx3 = await opUSDCearnInstance
      .connect(operatorSigner)
      .setUnderlyingTokensHash(MULTI_CHAIN_VAULT_TOKENS[networkName].USDC.hash);
    await tx3.wait(1);
  } else {
    console.log("Tokenshash is upto date");
    console.log("\n");
  }

  console.log("Finance operator setting opUSDCearn config...");
  console.log("\n");

  const actualUserDepositCapUT = await opUSDCearnInstance.userDepositCapUT();
  const actualMinimumDepositValueUT = await opUSDCearnInstance.minimumDepositValueUT();
  const actualTotalValueLockedLimitUT = await opUSDCearnInstance.totalValueLockedLimitUT();

  console.log("opUSDCearn.setValueControlParams()");
  console.log("\n");
  if (
    expectedUserDepositCapUT.eq(actualUserDepositCapUT) &&
    expectedMinimumDepositValueUT.eq(actualMinimumDepositValueUT) &&
    expectedTotalValueLockedLimitUT.eq(actualTotalValueLockedLimitUT)
  ) {
    console.log("userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT is upto date on opUSDCearn");
    console.log("\n");
  } else {
    console.log("Updating userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT on opUSDCearn...");
    console.log("\n");
    const tx4 = await opUSDCearnInstance
      .connect(financeOperatorSigner)
      .setValueControlParams(expectedUserDepositCapUT, expectedMinimumDepositValueUT, expectedTotalValueLockedLimitUT);
    await tx4.wait(1);
  }

  console.log("unpause opUSDCearn");
  console.log("\n");
  const vaultConfiguration = await opUSDCearnInstance.vaultConfiguration();
  const unpause = getUnpause(vaultConfiguration);

  if (!unpause) {
    console.log("Governance unpausing opUSDCearn vault...");
    console.log("\n");
    const tx5 = await opUSDCearnInstance.connect(governanceSigner).setUnpaused(true);
    await tx5.wait(1);
  } else {
    console.log("opUSDCearn is already unpaused...");
    console.log("\n");
  }

  const strategyProviderInstance = await ethers.getContractAt(
    ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER,
    strategyProviderAddress,
  );
  const strategyOperatorSigner = await ethers.getSigner(await registryV2Instance.strategyOperator());

  console.log("Operator setting best strategy for opUSDCearn...");
  console.log("\n");

  const currentBestStrategySteps = await strategyProviderInstance.getRpToTokenToBestStrategy(
    expectedRiskProfileCode,
    MULTI_CHAIN_VAULT_TOKENS[networkName].USDC.hash,
  );
  const currentBestStrategyHash = await opUSDCearnInstance.computeInvestStrategyHash(currentBestStrategySteps);
  const expectedStrategySteps = StrategiesByTokenByChain[networkName]["Earn"].USDC[strategyName].strategy;
  const expectedStrategyHash = await opUSDCearnInstance.computeInvestStrategyHash(
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
      MULTI_CHAIN_VAULT_TOKENS[networkName].USDC.hash,
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
  console.log("Next Best Strategy ", await opUSDCearnInstance.getNextBestInvestStrategy());
};
export default func;
func.tags = ["MumbaiConfigopUSDCearn"];
func.dependencies = ["MumbaiopUSDCearn", "MumbaiApproveAndMapLiquidityPoolToAdapter", "StrategyProvider"];
