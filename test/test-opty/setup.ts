import hre from "hardhat";
import { Signer } from "ethers";
import { CONTRACTS } from "../../helpers/type";
import { deployEssentialContracts, deployAdapters } from "../../helpers/contracts-deployments";
import { approveAndSetTokenHashToTokens } from "../../helpers/contracts-actions";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants/utils";
import { TypedTokens } from "../../helpers/data";

export async function setUp(owner: Signer, tokens?: string[]): Promise<[CONTRACTS, CONTRACTS]> {
  const contracts = await deployEssentialContracts(hre, owner, TESTING_DEPLOYMENT_ONCE);

  const tokenAddresses: string[] = tokens
    ? tokens
    : Object.values(TypedTokens).filter(addr => addr !== TypedTokens.ETH);
  await approveAndSetTokenHashToTokens(owner, contracts["registry"], tokenAddresses, true);

  const adapters = await deployAdapters(hre, owner, contracts.registry.address, TESTING_DEPLOYMENT_ONCE);
  return [contracts, adapters];
}
