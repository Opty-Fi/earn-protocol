import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async ({ deployments, ethers }: HardhatRuntimeEnvironment) => {
  const opAVUSDCintProxyAddress = "0x118194e96b2d4b08957ba9a05508fb6d14a37a0d";
  const opAVUSDCintAddress = await (await deployments.get("opAVUSDCint")).address;
  const { getAddress } = ethers.utils;

  const opAVUSDCintProxyInstance = await ethers.getContractAt(
    "InitializableImmutableAdminUpgradeabilityProxy",
    opAVUSDCintProxyAddress,
  );
  const proxyAdminAddress = await opAVUSDCintProxyInstance.admin();
  const proxyAdminSigner = await ethers.getSigner(proxyAdminAddress);

  const implementationAddress = await opAVUSDCintProxyInstance.implementation();

  console.log("opUSDCearn upgrade");
  console.log("\n");
  if (getAddress(implementationAddress) != getAddress(opAVUSDCintAddress)) {
    console.log("Admin upgrading opUSDCearn..");
    console.log("\n");
    await opAVUSDCintProxyInstance.connect(proxyAdminSigner).upgradeTo(opAVUSDCintAddress);
  } else {
    console.log("opUSDCearn is upto date..");
    console.log("\n");
  }
};
export default func;
func.tags = ["KovanUpgradeopAVUSDCint"];
func.dependencies = ["opAVUSDCint"];
