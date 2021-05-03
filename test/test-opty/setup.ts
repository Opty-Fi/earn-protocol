import hre from "hardhat";
import { Signer } from "ethers";
import { CONTRACTS } from "../../helpers/type";
import { deployEssentialContracts, deployAdapters } from "../../helpers/contracts-deployments";
import { approveTokens } from "../../helpers/contracts-actions";
import { TESTING_DEPLOYMENT_ONCE } from "../../helpers/constants";
export async function setUp(owner: Signer): Promise<[CONTRACTS, CONTRACTS]> {
  const contracts = await deployEssentialContracts(hre, owner, TESTING_DEPLOYMENT_ONCE);
  await approveTokens(owner, contracts.registry);
  const adapters = await deployAdapters(
    hre,
    owner,
    contracts.registry.address,
    contracts.harvestCodeProvider.address,
    TESTING_DEPLOYMENT_ONCE,
  );
  return [contracts, adapters];
}
