import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { getUnpause } from "../helpers/utils";

const func: DeployFunction = async ({ ethers }: HardhatRuntimeEnvironment) => {
  const { BigNumber } = ethers;
  const registryProxyAddress = "0xf710F75418353B36F2624784c290B80e7a5C892A";
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const opAVUSDCintProxyAddress = "0x118194e96b2d4b08957ba9a05508fb6d14a37a0d";

  const opAVUSDCintInstance = await ethers.getContractAt("Vault", opAVUSDCintProxyAddress);
  const financeOperatorSigner = await ethers.getSigner(await registryV2Instance.financeOperator());
  const operatorSigner = await ethers.getSigner(await registryV2Instance.operator());
  const governanceSigner = await ethers.getSigner(await registryV2Instance.governance());

  console.log("vaultConfiguration for opAVUSDCint");
  console.log("\n");
  const expectedConfig = BigNumber.from("2717410785629155098899111556142608677342670233394701959435704744959004377088");
  const _vaultConfiguration = await opAVUSDCintInstance.vaultConfiguration();
  if (expectedConfig.eq(_vaultConfiguration)) {
    console.log("vaultConfiguration is as expected");
    console.log("\n");
  } else {
    console.log("Governance setting vault configuration for opAVUSDCint..");
    console.log("\n");
    await opAVUSDCintInstance.connect(governanceSigner).setVaultConfiguration(expectedConfig);
  }

  console.log("Operator setting UnderlyingTokensHash...");
  console.log("\n");

  const tokensHash = await opAVUSDCintInstance.underlyingTokensHash();

  if (tokensHash != MULTI_CHAIN_VAULT_TOKENS["kovan"].USDC.hash) {
    console.log("setting tokenshash..");
    console.log("\n");
    await opAVUSDCintInstance
      .connect(operatorSigner)
      .setUnderlyingTokensHash(MULTI_CHAIN_VAULT_TOKENS["kovan"].USDC.hash);
  } else {
    console.log("Tokenshash is upto date");
    console.log("\n");
  }

  console.log("Finance operator setting opAVUSDCint config...");
  console.log("\n");
  const actualUserDepositCapUT = await opAVUSDCintInstance.userDepositCapUT();
  const actualMinimumDepositValueUT = await opAVUSDCintInstance.minimumDepositValueUT();
  const actualTotalValueLockedLimitUT = await opAVUSDCintInstance.totalValueLockedLimitUT();

  const expectedUserDepositCapUT = BigNumber.from("1000000000000"); // 1,000,000 USDC user deposit cap
  const expectedMinimumDepositValueUT = BigNumber.from("5000000"); // 5 UDDC minimum deposit
  const expectedTotalValueLockedLimitUT = BigNumber.from("10000000000000"); // 10,000,000 USDC TVL limit

  console.log("opAVUSDCint.setValueControlParams()");
  console.log("\n");
  if (
    expectedUserDepositCapUT.eq(actualUserDepositCapUT) &&
    expectedMinimumDepositValueUT.eq(actualMinimumDepositValueUT) &&
    expectedTotalValueLockedLimitUT.eq(actualTotalValueLockedLimitUT)
  ) {
    console.log("userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT is upto date on opAVUSDCint");
    console.log("\n");
  } else {
    console.log("Updating userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT on opAVUSDCint...");
    console.log("\n");
    await opAVUSDCintInstance
      .connect(financeOperatorSigner)
      .setValueControlParams(expectedUserDepositCapUT, expectedMinimumDepositValueUT, expectedTotalValueLockedLimitUT);
  }

  console.log("unpause opAVUSDCint");
  console.log("\n");
  const vaultConfiguration = await opAVUSDCintInstance.vaultConfiguration();
  const unpause = getUnpause(vaultConfiguration);

  if (!unpause) {
    console.log("Governance unpausing opAVUSDCint vault...");
    console.log("\n");
    await opAVUSDCintInstance.connect(governanceSigner).setUnpaused(true);
  } else {
    console.log("opAVUSDCint is already unpaused...");
    console.log("\n");
  }

  console.log("whitelisting for opAVUSDCint");
  const expectedAccountsRoot = "0x62689e8751ba85bee0855c30d61d17345faa5b23e82626a83f8d63db50d67694";
  const actualAccountsRoot = await opAVUSDCintInstance.whitelistedAccountsRoot();
  if (actualAccountsRoot != expectedAccountsRoot) {
    console.log("Governance setting whitelisted account root opAVUSDCint vault...");
    console.log("\n");
    await opAVUSDCintInstance.connect(governanceSigner).setWhitelistedAccountsRoot(expectedAccountsRoot);
  } else {
    console.log("whitelisted accounts root for opAVUSDCint is as expected");
    console.log("\n");
  }
};
export default func;
func.tags = ["KovanConfigopAVUSDCint"];
func.dependencies = ["KovanDeployopAVUSDCint", "KovanUpgradeopAVUSDCint"];
