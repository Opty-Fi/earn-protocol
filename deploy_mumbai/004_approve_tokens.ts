import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { NETWORKS_CHAIN_ID } from "../helper-hardhat-config";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { addRiskProfiles, approveAndMapTokenHashToTokensV2 } from "../helpers/contracts-actions";
import { TypedMumbaiTokens } from "../helpers/data";
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const [owner] = await hre.ethers.getSigners();

  const registryAddress = (await deployments.get("RegistryProxy")).address;
  const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryAddress);

  await addRiskProfiles(owner, registryContract);

  const tokenKeys = Object.keys(TypedMumbaiTokens);

  const tokens = tokenKeys.length > 0 ? tokenKeys.map(token => TypedMumbaiTokens[token]) : [];

  if (tokens.length > 0) {
    console.log("Approving Tokens...");

    await approveAndMapTokenHashToTokensV2(
      owner,
      registryContract,
      tokens,
      true,
      NETWORKS_CHAIN_ID.mumbai.toString(),
      false,
    );

    console.log("Approved Tokens...");
  }
};

export default func;
func.tags = ["ApproveToken"];
