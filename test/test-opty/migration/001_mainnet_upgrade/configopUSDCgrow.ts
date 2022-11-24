import { ethers } from "hardhat";
import { eEVMNetwork } from "../../../../helper-hardhat-config";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../../../helpers/constants/tokens";
import { RegistryV1, RegistryV1__factory } from "../../../../helpers/types/registryV1";
import { StrategyProviderV1, StrategyProviderV1__factory } from "../../../../helpers/types/strategyProviderv1";
import { VaultV3, VaultV3__factory } from "../../../../helpers/types/vaultv3";
import { getRiskProfileCode, getUnpause } from "../../../../helpers/utils";
import { RegistryProxy as registryProxyAddress, opUSDCgrow } from "../../_deployments/mainnet.json";

export async function configopUSDCgrow(strategyProviderAddress: string, fork: eEVMNetwork): Promise<void> {
  const { BigNumber } = ethers;
  const registryV2Instance = <RegistryV1>await ethers.getContractAt(RegistryV1__factory.abi, registryProxyAddress);

  const opUSDCgrowInstance = <VaultV3>await ethers.getContractAt(VaultV3__factory.abi, opUSDCgrow.VaultProxy);
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
  const expectedMinimumDepositValueUT = BigNumber.from("1000000000"); // 1000 USDC
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

  const expectedAccountsRoot = "0x62689e8751ba85bee0855c30d61d17345faa5b23e82626a83f8d63db50d67694";
  const actualAccountsRoot = await opUSDCgrowInstance.whitelistedAccountsRoot();
  if (actualAccountsRoot != expectedAccountsRoot) {
    const tx6 = await opUSDCgrowInstance.connect(governanceSigner).setWhitelistedAccountsRoot(expectedAccountsRoot);
    await tx6.wait(1);
  }

  const strategyProviderInstance = <StrategyProviderV1>(
    await ethers.getContractAt(StrategyProviderV1__factory.abi, strategyProviderAddress)
  );
  const strategyOperatorSigner = await ethers.getSigner(await registryV2Instance.strategyOperator());

  const currentBestStrategySteps = await strategyProviderInstance.getRpToTokenToBestStrategy(
    "1",
    MULTI_CHAIN_VAULT_TOKENS[fork].USDC.hash,
  );
  const currentBestStrategyHash = await opUSDCgrowInstance.computeInvestStrategyHash(currentBestStrategySteps);
  const expectedStrategySteps = [
    {
      contract: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
      outputToken: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
      isBorrow: false,
      adapterName: "CurveSwapPoolAdapter",
      protocol: "Curve",
      outputTokenSymbol: "3Crv",
    },
    {
      contract: "0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1",
      outputToken: "0x4f3E8F405CF5aFC05D68142F3783bDfE13811522",
      isBorrow: false,
      adapterName: "CurveSwapPoolAdapter",
      protocol: "Curve",
      outputTokenSymbol: "usdn3Crv",
    },
    {
      contract: "0x3689f325E88c2363274E5F3d44b6DaB8f9e1f524",
      outputToken: "0x3689f325E88c2363274E5F3d44b6DaB8f9e1f524",
      isBorrow: false,
      adapterName: "ConvexFinanceAdapter",
      protocol: "Convex",
      outputTokenSymbol: "cvxusdn3CRV",
    },
  ];

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
