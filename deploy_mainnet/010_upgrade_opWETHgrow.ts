import { getAddress } from "ethers/lib/utils";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async ({ deployments, ethers }: HardhatRuntimeEnvironment) => {
  const opWETHgrowProxyAddress = "0xff2fbd9fbc6d03baa77cf97a3d5671bea183b9a8";
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
    await opWETHgrowProxyInstance.connect(proxyAdminSigner).upgradeTo(opWETHgrowAddress);
  } else {
    console.log("opWETHgrow is upto date..");
    console.log("\n");
  }
};
export default func;
func.tags = ["UpgradeopWETHgrow"];
func.dependencies = ["DeployopWETHgrow"];
