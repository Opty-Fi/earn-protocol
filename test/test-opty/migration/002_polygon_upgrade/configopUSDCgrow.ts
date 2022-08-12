import { ethers } from "hardhat";
import { eEVMNetwork } from "../../../../helper-hardhat-config";
import { ESSENTIAL_CONTRACTS } from "../../../../helpers/constants/essential-contracts-name";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../../../helpers/constants/tokens";
import { StrategiesByTokenByChain } from "../../../../helpers/data/adapter-with-strategies";
import { getRiskProfileCode, getUnpause } from "../../../../helpers/utils";
import { RegistryProxy as registryProxyAddress, opUSDCgrow } from "../../_deployments/polygon.json";

export async function configopUSDCgrow(strategyProviderAddress: string, fork: eEVMNetwork): Promise<void> {
  const { BigNumber } = ethers;
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);

  const opUSDCgrowInstance = await ethers.getContractAt("Vault", opUSDCgrow.VaultProxy);
  const financeOperatorSigner = await ethers.getSigner(await registryV2Instance.financeOperator());
  const operatorSigner = await ethers.getSigner(await registryV2Instance.operator());
  const governanceSigner = await ethers.getSigner(await registryV2Instance.governance());

  const expectedRiskProfileCode = BigNumber.from("1");
  const _vaultConfiguration_ = await opUSDCgrowInstance.vaultConfiguration();
  if (!expectedRiskProfileCode.eq(getRiskProfileCode(_vaultConfiguration_))) {
    const tx1 = await opUSDCgrowInstance.connect(governanceSigner).setRiskProfileCode(expectedRiskProfileCode);
    await tx1.wait(1);
  }

  const expectedConfig = BigNumber.from("2715643938564376714569528258641865758826842749497826340477583138757711757312");
  const _vaultConfiguration = await opUSDCgrowInstance.vaultConfiguration();
  if (!expectedConfig.eq(_vaultConfiguration)) {
    const tx2 = await opUSDCgrowInstance.connect(governanceSigner).setVaultConfiguration(expectedConfig);
    await tx2.wait(1);
  }

  const tokensHash = await opUSDCgrowInstance.underlyingTokensHash();

  if (tokensHash != MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash) {
    const tx3 = await opUSDCgrowInstance
      .connect(operatorSigner)
      .setUnderlyingTokensHash(MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash);
    await tx3.wait(1);
  }

  const actualUserDepositCapUT = await opUSDCgrowInstance.userDepositCapUT();
  const actualMinimumDepositValueUT = await opUSDCgrowInstance.minimumDepositValueUT();
  const actualTotalValueLockedLimitUT = await opUSDCgrowInstance.totalValueLockedLimitUT();

  const expectedUserDepositCapUT = BigNumber.from("100000000000"); // 100,000 USDC
  const expectedMinimumDepositValueUT = BigNumber.from("0"); // 1000 USDC
  const expectedTotalValueLockedLimitUT = BigNumber.from("10000000000000"); // 10,000,000

  if (
    !(
      expectedUserDepositCapUT.eq(actualUserDepositCapUT) &&
      expectedMinimumDepositValueUT.eq(actualMinimumDepositValueUT) &&
      expectedTotalValueLockedLimitUT.eq(actualTotalValueLockedLimitUT)
    )
  ) {
    const tx4 = await opUSDCgrowInstance
      .connect(financeOperatorSigner)
      .setValueControlParams(expectedUserDepositCapUT, expectedMinimumDepositValueUT, expectedTotalValueLockedLimitUT);
    await tx4.wait(1);
  }

  const vaultConfiguration = await opUSDCgrowInstance.vaultConfiguration();
  const unpause = getUnpause(vaultConfiguration);

  if (!unpause) {
    const tx5 = await opUSDCgrowInstance.connect(governanceSigner).setUnpaused(true);
    await tx5.wait(1);
  }

  const expectedAccountsRoot = "0x5a67b2194048bd003f63682aaff156c5dd229e09b006150e3dad0736b75dbffc";
  const actualAccountsRoot = await opUSDCgrowInstance.whitelistedAccountsRoot();
  if (actualAccountsRoot != expectedAccountsRoot) {
    const tx6 = await opUSDCgrowInstance.connect(governanceSigner).setWhitelistedAccountsRoot(expectedAccountsRoot);
    await tx6.wait(1);
  }

  const strategyProviderInstance = await ethers.getContractAt(
    ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER,
    strategyProviderAddress,
  );
  const strategyOperatorSigner = await ethers.getSigner(await registryV2Instance.strategyOperator());

  const currentBestStrategySteps = await strategyProviderInstance.getRpToTokenToBestStrategy(
    "1",
    MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash,
  );
  const currentBestStrategyHash = await opUSDCgrowInstance.computeInvestStrategyHash(currentBestStrategySteps);
  const expectedStrategySteps =
    StrategiesByTokenByChain[fork].USDC["usdc-DEPOSIT-CurveStableSwap-am3CRV-DEPOSIT-Beefy-mooCurveAm3CRV"].strategy;
  const expectedStrategyHash = await opUSDCgrowInstance.computeInvestStrategyHash(
    expectedStrategySteps.map(x => ({
      pool: x.contract,
      outputToken: x.outputToken,
      isBorrow: x.isBorrow,
    })),
  );

  if (currentBestStrategyHash !== expectedStrategyHash) {
    const tx7 = await strategyProviderInstance.connect(strategyOperatorSigner).setBestStrategy(
      "1",
      MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash,
      expectedStrategySteps.map(x => ({
        pool: x.contract,
        outputToken: x.outputToken,
        isBorrow: x.isBorrow,
      })),
    );
    await tx7.wait(1);
  }
}
