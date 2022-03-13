import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async ({ deployments, ethers }: HardhatRuntimeEnvironment) => {
  const opUSDCgrowProxyAddress = "0x6d8bfdb4c4975bb086fc9027e48d5775f609ff88";
  const opUSDCgrowAddress = await (await deployments.get("opUSDCgrow")).address;

  const opUSDCgrowProxyInstance = await ethers.getContractAt(
    "InitializableImmutableAdminUpgradeabilityProxy",
    opUSDCgrowProxyAddress,
  );
  const proxyAdminAddress = await opUSDCgrowProxyInstance.admin();
  const proxyAdminSigner = await ethers.getSigner(proxyAdminAddress);

  console.log("Admin upgrading opUSDCgrow..");
  console.log("\n");
  await opUSDCgrowProxyInstance.connect(proxyAdminSigner).upgradeTo(opUSDCgrowAddress);
};
export default func;
func.tags = ["UpgradeopUSDCgrow"];
func.dependencies = ["DeployopUSDCgrow"];
