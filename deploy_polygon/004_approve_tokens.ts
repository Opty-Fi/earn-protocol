import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { NETWORKS_CHAIN_ID, eEVMNetwork } from "../helper-hardhat-config";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { addRiskProfiles, approveAndMapTokenHashToTokensV2 } from "../helpers/contracts-actions";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const [owner] = await hre.ethers.getSigners();

  const registryAddress = (await deployments.get("RegistryProxy")).address;
  const registryContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryAddress);

  await addRiskProfiles(owner, registryContract);

  const tokenKeys = MULTI_CHAIN_VAULT_TOKENS[eEVMNetwork.polygon]
    ? Object.keys(MULTI_CHAIN_VAULT_TOKENS[eEVMNetwork.polygon])
    : [];
  const tokens =
    tokenKeys.length > 0 ? tokenKeys.map(token => MULTI_CHAIN_VAULT_TOKENS[eEVMNetwork.polygon][token].address) : [];
  if (tokens.length > 0) {
    console.log("Approving Tokens...");

    await approveAndMapTokenHashToTokensV2(
      owner,
      registryContract,
      tokens,
      true,
      NETWORKS_CHAIN_ID.polygon.toString(),
      false,
    );

    console.log("Approved Tokens...");
  }
};

export default func;
func.tags = ["ApproveToken"];
