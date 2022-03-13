import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";

const func: DeployFunction = async ({ ethers }: HardhatRuntimeEnvironment) => {
  const registryProxyAddress = "0x99fa011e33a8c6196869dec7bc407e896ba67fe3";
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const opWETHgrowProxyAddress = "0xff2fbd9fbc6d03baa77cf97a3d5671bea183b9a8";

  const opWETHgrowInstance = await ethers.getContractAt("Vault", opWETHgrowProxyAddress);
  const financeOperatorSigner = await ethers.getSigner(await registryV2Instance.financeOperator());
  const governanceSigner = await ethers.getSigner(await registryV2Instance.governance());
  console.log("Finance operator setting opWETHgrow config...");
  console.log("\n");
  await opWETHgrowInstance.connect(financeOperatorSigner).setValueControlParams(
    "1000000000000000000", // 1 WETH user deposit cap
    "250000000000000000", // 0.25 WETH minimum deposit
    "1000000000000000000000", // 1000 WETH TVL
  );

  // unpause vault
  console.log("Governance unpausing opWETHgrow vault...");
  await opWETHgrowInstance.connect(governanceSigner).setUnpaused(true);

  // set whitelist account root hash
  // await opWETHgrowInstance.connect(governanceSigner).setWhitelistedAccountsRoot("0x0")
};
export default func;
func.tags = ["ConfigopWETHgrow"];
func.dependencies = ["DeployopWETHgrow", "UpgradeopWETHgrow"];
