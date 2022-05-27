import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async ({ deployments, ethers }: HardhatRuntimeEnvironment) => {
  const { getAddress } = ethers.utils;
  const opUSDCgrowProxyAddress = await (await deployments.get("opUSDCgrowProxy")).address;
  const opUSDCgrowAddress = await (await deployments.get("opUSDCgrow")).address;

  const opUSDCgrowProxyInstance = await ethers.getContractAt(
    "InitializableImmutableAdminUpgradeabilityProxy",
    opUSDCgrowProxyAddress,
  );
  const proxyAdminAddress = await opUSDCgrowProxyInstance.admin();
  const proxyAdminSigner = await ethers.getSigner(proxyAdminAddress);

  const implementationAddress = await opUSDCgrowProxyInstance.implementation();

  console.log("opUSDCgrow upgrade");
  console.log("\n");
  if (getAddress(implementationAddress) != getAddress(opUSDCgrowAddress)) {
    console.log("Admin upgrading opUSDCgrow..");
    console.log("\n");
    const tx1 = await opUSDCgrowProxyInstance.connect(proxyAdminSigner).upgradeTo(opUSDCgrowAddress);
    await tx1.wait(1);
  } else {
    console.log("opUSDCgrow is upto date..");
    console.log("\n");
  }
};
export default func;
func.tags = ["UpgradeopUSDCgrow"];
func.dependencies = ["opUSDCgrow"];
