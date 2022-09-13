import { ethers } from "hardhat";
import { eEVMNetwork } from "../../../../helper-hardhat-config";
import { ESSENTIAL_CONTRACTS } from "../../../../helpers/constants/essential-contracts-name";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../../../helpers/constants/tokens";
import { StrategiesByTokenByChain } from "../../../../helpers/data/adapter-with-strategies";
import { getRiskProfileCode, getUnpause } from "../../../../helpers/utils";
import { RegistryProxy as registryProxyAddress, opWETHsave } from "../../_deployments/mainnet.json";

export async function configopWETHsave(strategyProviderAddress: string, fork: eEVMNetwork): Promise<void> {
  const { BigNumber } = ethers;
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);

  const opWETHsaveInstance = await ethers.getContractAt("Vault", opWETHsave.VaultProxy);
  const financeOperatorSigner = await ethers.getSigner(await registryV2Instance.financeOperator());
  const operatorSigner = await ethers.getSigner(await registryV2Instance.operator());
  const governanceSigner = await ethers.getSigner(await registryV2Instance.governance());

  const expectedRiskProfileCode = BigNumber.from("1");
  const _vaultConfiguration_ = await opWETHsaveInstance.vaultConfiguration();
  if (!expectedRiskProfileCode.eq(getRiskProfileCode(_vaultConfiguration_))) {
    const txn = await opWETHsaveInstance.connect(governanceSigner).setRiskProfileCode(expectedRiskProfileCode);
    await txn.wait(1);
  }

  const expectedConfig = BigNumber.from("2715643938564376714569528258641865758826842749497826340477583138757711757312");
  const _vaultConfiguration = await opWETHsaveInstance.vaultConfiguration();
  if (!expectedConfig.eq(_vaultConfiguration)) {
    const tx1 = await opWETHsaveInstance.connect(governanceSigner).setVaultConfiguration(expectedConfig);
    await tx1.wait(1);
  }

  const tokensHash = await opWETHsaveInstance.underlyingTokensHash();

  if (tokensHash != MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash) {
    const tx2 = await opWETHsaveInstance
      .connect(operatorSigner)
      .setUnderlyingTokensHash(MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash);
    await tx2.wait(1);
  }

  const actualUserDepositCapUT = await opWETHsaveInstance.userDepositCapUT();
  const actualMinimumDepositValueUT = await opWETHsaveInstance.minimumDepositValueUT();
  const actualTotalValueLockedLimitUT = await opWETHsaveInstance.totalValueLockedLimitUT();

  const expectedUserDepositCapUT = BigNumber.from("5000000000000000000"); // 5 WETH user deposit cap
  const expectedMinimumDepositValueUT = BigNumber.from("250000000000000000"); // 0.25 WETH minimum deposit
  const expectedTotalValueLockedLimitUT = BigNumber.from("5000000000000000000000"); // 5000 WETH TVL limit

  if (
    !(
      expectedUserDepositCapUT.eq(actualUserDepositCapUT) &&
      expectedMinimumDepositValueUT.eq(actualMinimumDepositValueUT) &&
      expectedTotalValueLockedLimitUT.eq(actualTotalValueLockedLimitUT)
    )
  ) {
    const tx3 = await opWETHsaveInstance
      .connect(financeOperatorSigner)
      .setValueControlParams(expectedUserDepositCapUT, expectedMinimumDepositValueUT, expectedTotalValueLockedLimitUT);
    await tx3.wait(1);
  }

  const vaultConfiguration = await opWETHsaveInstance.vaultConfiguration();
  const unpause = getUnpause(vaultConfiguration);

  if (!unpause) {
    const tx4 = await opWETHsaveInstance.connect(governanceSigner).setUnpaused(true);
    await tx4.wait();
  }

  const expectedAccountsRoot = "0x62689e8751ba85bee0855c30d61d17345faa5b23e82626a83f8d63db50d67694";
  const actualAccountsRoot = await opWETHsaveInstance.whitelistedAccountsRoot();
  if (actualAccountsRoot != expectedAccountsRoot) {
    const tx5 = await opWETHsaveInstance.connect(governanceSigner).setWhitelistedAccountsRoot(expectedAccountsRoot);
    await tx5.wait(1);
  }

  const strategyProviderInstance = await ethers.getContractAt(
    ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER,
    strategyProviderAddress,
  );
  const strategyOperatorSigner = await ethers.getSigner(await registryV2Instance.strategyOperator());

  const currentBestStrategySteps = await strategyProviderInstance.getRpToTokenToBestStrategy(
    "1",
    MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash,
  );
  const currentBestStrategyHash = await opWETHsaveInstance.computeInvestStrategyHash(currentBestStrategySteps);
  const expectedStrategySteps =
    StrategiesByTokenByChain[fork]["Earn"].WETH[
      "weth-DEPOSIT-Lido-stETH-DEPOSIT-CurveSwapPool-steCRV-DEPOSIT-Convex-cvxsteCRV"
    ].strategy;
  const expectedStrategyHash = await opWETHsaveInstance.computeInvestStrategyHash(
    expectedStrategySteps.map(x => ({
      pool: x.contract,
      outputToken: x.outputToken,
      isBorrow: x.isBorrow,
    })),
  );

  if (currentBestStrategyHash !== expectedStrategyHash) {
    const tx6 = await strategyProviderInstance.connect(strategyOperatorSigner).setBestStrategy(
      "1",
      MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash,
      expectedStrategySteps.map(x => ({
        pool: x.contract,
        outputToken: x.outputToken,
        isBorrow: x.isBorrow,
      })),
    );
    await tx6.wait(1);
  }
}
