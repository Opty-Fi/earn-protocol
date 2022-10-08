import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import addresses from "../data/mainnet-addresses.json";

const deployOracle: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const ethers = hre.ethers;
  const [deployer] = await ethers.getSigners();
  const { deploy } = hre.deployments;

  const day = ethers.BigNumber.from("86400");
  const OracleResult = await deploy("OptyFiOracle", {
    from: deployer.address,
    contract: "OptyFiOracle",
    args: [day, day],
    log: true,
  });
};

export default deployOracle;
deployOracle.id = "OptyFiOracle";
deployOracle.tags = ["OptyFiOracle"];
