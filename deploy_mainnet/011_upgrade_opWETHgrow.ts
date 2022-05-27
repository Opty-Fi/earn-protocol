import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async ({ deployments, ethers }: HardhatRuntimeEnvironment) => {
  const { getAddress } = ethers.utils;
  const opWETHgrowProxyAddress = await (await deployments.get("opWETHgrowProxy")).address;
  const opWETHgrowAddress = await (await deployments.get("opWETHgrow")).address;

  const opWETHgrowProxyInstance = await ethers.getContractAt(
    "InitializableImmutableAdminUpgradeabilityProxy",
    opWETHgrowProxyAddress,
  );
  const proxyAdminAddress = await opWETHgrowProxyInstance.admin();
  const proxyAdminSigner = await ethers.getSigner(proxyAdminAddress);

  const implementationAddress = await opWETHgrowProxyInstance.implementation();

  console.log("opWETHgrow upgrade");
  console.log("\n");
  if (getAddress(implementationAddress) != getAddress(opWETHgrowAddress)) {
    console.log("Admin upgrading opWETHgrow..");
    console.log("\n");
    const tx = await opWETHgrowProxyInstance.connect(proxyAdminSigner).upgradeTo(opWETHgrowAddress);
    await tx.wait(1);
  } else {
    console.log("opWETHgrow is upto date..");
    console.log("\n");
  }
};
export default func;
func.tags = ["UpgradeopWETHgrow"];
func.dependencies = ["opWETHgrow"];
