import { ethers } from "hardhat";
import { eEVMNetwork } from "../../../../helper-hardhat-config";
import { MULTI_CHAIN_VAULT_TOKENS } from "../../../../helpers/constants/tokens";
import { RegistryV1, RegistryV1__factory } from "../../../../helpers/types/registryV1";
import { StrategyProviderV1, StrategyProviderV1__factory } from "../../../../helpers/types/strategyProviderv1";
import { VaultV3, VaultV3__factory } from "../../../../helpers/types/vaultv3";
import { getRiskProfileCode, getUnpause } from "../../../../helpers/utils";
import { RegistryProxy as registryProxyAddress, opWETHgrow } from "../../_deployments/mainnet.json";

export async function configopWETHgrow(strategyProviderAddress: string, fork: eEVMNetwork): Promise<void> {
  const { BigNumber } = ethers;
  const registryV2Instance = <RegistryV1>await ethers.getContractAt(RegistryV1__factory.abi, registryProxyAddress);

  const opWETHgrowInstance = <VaultV3>await ethers.getContractAt(VaultV3__factory.abi, opWETHgrow.VaultProxy);
  const financeOperatorSigner = await ethers.getSigner(await registryV2Instance.financeOperator());
  const operatorSigner = await ethers.getSigner(await registryV2Instance.operator());
  const governanceSigner = await ethers.getSigner(await registryV2Instance.governance());

  const expectedRiskProfileCode = BigNumber.from("1");
  const _vaultConfiguration_ = await opWETHgrowInstance.vaultConfiguration();
  if (!expectedRiskProfileCode.eq(getRiskProfileCode(_vaultConfiguration_))) {
    const txn = await opWETHgrowInstance.connect(governanceSigner).setRiskProfileCode(expectedRiskProfileCode);
    await txn.wait(1);
  }

  const expectedConfig = BigNumber.from("2715643938564376714569528258641865758826842749497826340477583138757711757312");
  const _vaultConfiguration = await opWETHgrowInstance.vaultConfiguration();
  if (!expectedConfig.eq(_vaultConfiguration)) {
    const tx1 = await opWETHgrowInstance.connect(governanceSigner).setVaultConfiguration(expectedConfig);
    await tx1.wait(1);
  }

  const tokensHash = await opWETHgrowInstance.underlyingTokensHash();

  if (tokensHash != MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash) {
    const tx2 = await opWETHgrowInstance
      .connect(operatorSigner)
      .setUnderlyingTokensHash(MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash);
    await tx2.wait(1);
  }

  const actualUserDepositCapUT = await opWETHgrowInstance.userDepositCapUT();
  const actualMinimumDepositValueUT = await opWETHgrowInstance.minimumDepositValueUT();
  const actualTotalValueLockedLimitUT = await opWETHgrowInstance.totalValueLockedLimitUT();

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
    const tx3 = await opWETHgrowInstance
      .connect(financeOperatorSigner)
      .setValueControlParams(expectedUserDepositCapUT, expectedMinimumDepositValueUT, expectedTotalValueLockedLimitUT);
    await tx3.wait(1);
  }

  const vaultConfiguration = await opWETHgrowInstance.vaultConfiguration();
  const unpause = getUnpause(vaultConfiguration);

  if (!unpause) {
    const tx4 = await opWETHgrowInstance.connect(governanceSigner).setUnpaused(true);
    await tx4.wait();
  }

  const expectedAccountsRoot = "0x62689e8751ba85bee0855c30d61d17345faa5b23e82626a83f8d63db50d67694";
  const actualAccountsRoot = await opWETHgrowInstance.whitelistedAccountsRoot();
  if (actualAccountsRoot != expectedAccountsRoot) {
    const tx5 = await opWETHgrowInstance.connect(governanceSigner).setWhitelistedAccountsRoot(expectedAccountsRoot);
    await tx5.wait(1);
  }

  const strategyProviderInstance = <StrategyProviderV1>(
    await ethers.getContractAt(StrategyProviderV1__factory.abi, strategyProviderAddress)
  );
  const strategyOperatorSigner = await ethers.getSigner(await registryV2Instance.strategyOperator());

  const currentBestStrategySteps = await strategyProviderInstance.getRpToTokenToBestStrategy(
    "1",
    MULTI_CHAIN_VAULT_TOKENS[fork].WETH.hash,
  );
  const currentBestStrategyHash = await opWETHgrowInstance.computeInvestStrategyHash(currentBestStrategySteps);
  const expectedStrategySteps = [
    {
      contract: "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022",
      outputToken: "0x06325440D014e39736583c165C2963BA99fAf14E",
      isBorrow: false,
      outputTokenSymbol: "steCRV",
      adapterName: "CurveSwapPoolAdapter",
      protocol: "Curve",
    },
    {
      contract: "0x9518c9063eB0262D791f38d8d6Eb0aca33c63ed0",
      outputToken: "0x9518c9063eB0262D791f38d8d6Eb0aca33c63ed0",
      isBorrow: false,
      outputTokenSymbol: "cvxsteCRV",
      adapterName: "ConvexFinanceAdapter",
      protocol: "Convex",
    },
  ];
  const expectedStrategyHash = await opWETHgrowInstance.computeInvestStrategyHash(
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
