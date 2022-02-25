import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { executeFunc } from "../helpers/helpers";
import KOVAN from "../_deployments/kovan.json";
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const [owner] = await hre.ethers.getSigners();

  const vault = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_V2, KOVAN.opAVUSDCint.VaultProxy, owner);

  await executeFunc(vault, owner, "rebalance()", []);
};

export default func;
func.tags = ["VaultV2"];
