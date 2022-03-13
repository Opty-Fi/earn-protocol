import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { getUnpause } from "../helpers/utils";

const func: DeployFunction = async ({ ethers }: HardhatRuntimeEnvironment) => {
  const registryProxyAddress = "0x99fa011e33a8c6196869dec7bc407e896ba67fe3";
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const opUSDCgrowProxyAddress = "0x6d8bfdb4c4975bb086fc9027e48d5775f609ff88";

  const opUSDCgrowInstance = await ethers.getContractAt("Vault", opUSDCgrowProxyAddress);
  const financeOperatorSigner = await ethers.getSigner(await registryV2Instance.financeOperator());
  const governanceSigner = await ethers.getSigner(await registryV2Instance.governance());
  console.log("Finance operator setting opUSDCgrow config...");
  console.log("\n");

  const actualUserDepositCapUT = await opUSDCgrowInstance.userDepositCapUT();
  const actualMinimumDepositValueUT = await opUSDCgrowInstance.minimumDepositValueUT();
  const actualTotalValueLockedLimitUT = await opUSDCgrowInstance.totalValueLockedLimitUT();

  const expectedUserDepositCapUT = BigNumber.from("100000000000"); // 100,000 USDC
  const expectedMinimumDepositValueUT = BigNumber.from("1000000000"); // 1000 USDC
  const expectedTotalValueLockedLimitUT = BigNumber.from("10000000000000"); // 10,000,000

  console.log("opUSDCgrow.setValueControlParams()");
  console.log("\n");
  if (
    expectedUserDepositCapUT.eq(actualUserDepositCapUT) &&
    expectedMinimumDepositValueUT.eq(actualMinimumDepositValueUT) &&
    expectedTotalValueLockedLimitUT.eq(actualTotalValueLockedLimitUT)
  ) {
    console.log("userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT is upto date on opUSDCgrow");
    console.log("\n");
  } else {
    console.log("Updating userDepositCapUT , minimumDepositValueUT and totalValueLockedLimitUT on opUSDCgrow...");
    console.log("\n");
    await opUSDCgrowInstance
      .connect(financeOperatorSigner)
      .setValueControlParams(expectedUserDepositCapUT, expectedMinimumDepositValueUT, expectedTotalValueLockedLimitUT);
  }

  console.log("unpause opUSDCgrow");
  console.log("\n");
  const vaultConfiguration = await opUSDCgrowInstance.vaultConfiguration();
  const unpause = getUnpause(vaultConfiguration);

  if (!unpause) {
    console.log("Governance unpausing opUSDCgrow vault...");
    console.log("\n");
    await opUSDCgrowInstance.connect(governanceSigner).setUnpaused(true);
  } else {
    console.log("opUSDCgrow is already unpaused...");
    console.log("\n");
  }

  console.log("whitelisting for opUSDCgrow");
  console.log("\n");
  const expectedAccountsRoot = "0x62689e8751ba85bee0855c30d61d17345faa5b23e82626a83f8d63db50d67694";
  const actualAccountsRoot = await opUSDCgrowInstance.whitelistedAccountsRoot();
  if (actualAccountsRoot != expectedAccountsRoot) {
    console.log("Governance setting whitelisted account root opUSDCgrow vault...");
    console.log("\n");
    await opUSDCgrowInstance.connect(governanceSigner).setWhitelistedAccountsRoot(expectedAccountsRoot);
  } else {
    console.log("whitelisted accounts root for opUSDCgrow is as expected");
    console.log("\n");
  }
};
export default func;
func.tags = ["ConfigopUSDCgrow"];
func.dependencies = ["DeployopUSDCgrow", "UpgradeopUSDCgrow"];
