import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";

const func: DeployFunction = async ({ ethers }: HardhatRuntimeEnvironment) => {
  const registryProxyAddress = "0x99fa011e33a8c6196869dec7bc407e896ba67fe3";
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const opUSDCgrowProxyAddress = "0x6d8bfdb4c4975bb086fc9027e48d5775f609ff88";

  const opUSDCgrowInstance = await ethers.getContractAt("Vault", opUSDCgrowProxyAddress);
  const financeOperatorSigner = await ethers.getSigner(await registryV2Instance.financeOperator());
  const governanceSigner = await ethers.getSigner(await registryV2Instance.governance());
  console.log("Finance operator setting opUSDCgrow config...");
  console.log("\n");
  await opUSDCgrowInstance.connect(financeOperatorSigner).setValueControlParams(
    "100000000000", // 100,000 USDC user deposit cap
    "1000000000", // 1000 USDC minimum deposit
    "10000000000000", // 10,000,000 USDC TVL
  );
  // unpause vault
  console.log("Governance unpausing opUSDCgrow vault...");
  await opUSDCgrowInstance.connect(governanceSigner).setUnpaused(true);

  // set whitelist account root hash
  // await opUSDCgrowInstance.connect(governanceSigner).setWhitelistedAccountsRoot("0x0")
};
export default func;
func.tags = ["ConfigopUSDCgrow"];
func.dependencies = ["DeployopUSDCgrow", "UpgradeopUSDCgrow"];
