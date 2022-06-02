import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { eEVMNetwork, NETWORKS_CHAIN_ID } from "../helper-hardhat-config";

const FORK = process.env.FORK || "";

const func: DeployFunction = async ({ deployments, getChainId, ethers }: HardhatRuntimeEnvironment) => {
  let chainId = await getChainId();
  const registryProxyAddress: string = await (await deployments.get("RegistryProxy")).address;
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  chainId =
    ["31337", "43114"].includes(chainId) && FORK != "" ? NETWORKS_CHAIN_ID[FORK as eEVMNetwork].toString() : chainId;
  const operatorAddress = await registryV2Instance.operator();
  const operatorSigner = await ethers.getSigner(operatorAddress);

  // approve tokens and map to tokens hash
  const onlySetTokensHash = [];
  const approveTokenAndMapHash = [];
  const tokenHashes: string[] = await registryV2Instance.getTokenHashes();

  const tokens = Object.keys(MULTI_CHAIN_VAULT_TOKENS[chainId]);

  for (let i = 0; i < tokens.length; i++) {
    const tokenApproved = await registryV2Instance.isApprovedToken(
      MULTI_CHAIN_VAULT_TOKENS[chainId][tokens[i]].address,
    );

    if (!tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId][tokens[i]].hash)) {
      if (tokenApproved) {
        console.log(`only set ${tokens[i].toUpperCase()} hash`);
        console.log("\n");
        onlySetTokensHash.push([
          MULTI_CHAIN_VAULT_TOKENS[chainId][tokens[i]].hash,
          [MULTI_CHAIN_VAULT_TOKENS[chainId][tokens[i]].address],
        ]);
      } else {
        console.log(`approve ${tokens[i].toUpperCase()} and set hash`);
        console.log("\n");
        approveTokenAndMapHash.push([
          MULTI_CHAIN_VAULT_TOKENS[chainId][tokens[i]].hash,
          [MULTI_CHAIN_VAULT_TOKENS[chainId][tokens[i]].address],
        ]);
      }
    }
  }

  if (approveTokenAndMapHash.length > 0) {
    console.log("approve token and map hash");
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const approveTokenAndMapToTokensHashTx = await registryV2Instance
      .connect(operatorSigner)
      ["approveTokenAndMapToTokensHash((bytes32,address[])[])"](approveTokenAndMapHash, {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await approveTokenAndMapToTokensHashTx.wait(1);
  }

  if (onlySetTokensHash.length > 0) {
    console.log("operator mapping only tokenshash to tokens..", onlySetTokensHash);
    console.log("\n");
    const feeData = await ethers.provider.getFeeData();
    const onlyMapToTokensHashTx = await registryV2Instance
      .connect(operatorSigner)
      ["setTokensHashToTokens((bytes32,address[])[])"](onlySetTokensHash, {
        type: 2,
        maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
        maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
      });
    await onlyMapToTokensHashTx.wait(1);
  }
};
export default func;
func.tags = ["AvalancheApproveTokensAndMapTokensHash"];
func.dependencies = ["Registry"];
