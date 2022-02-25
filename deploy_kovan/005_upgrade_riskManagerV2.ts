import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { RiskManagerV2, RiskManagerProxy } from "../typechain";
import KOVAN from "../_deployments/kovan.json";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const [owner] = await hre.ethers.getSigners();
  const { deploy } = deployments;
  const riskManagerAddress = (
    await deploy("RiskManagerV2", {
      from: await owner.getAddress(),
      args: [KOVAN.RegistryProxy],
      log: true,
      contract: ESSENTIAL_CONTRACTS.RISK_MANAGER_V2,
    })
  ).address;

  const riskManagerProxyContract: RiskManagerProxy = <RiskManagerProxy>(
    await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER_PROXY, KOVAN.RiskManagerProxy)
  );

  const riskManagerContract: RiskManagerV2 = <RiskManagerV2>(
    await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.RISK_MANAGER_V2, riskManagerAddress)
  );

  await riskManagerProxyContract.connect(owner).setPendingImplementation(riskManagerAddress);
  await riskManagerContract.connect(owner).become(KOVAN.RiskManagerProxy);
};

export default func;
func.tags = ["RiskManagerV2"];
