import hre from "hardhat";
import { Signer } from "ethers";
import { CONTRACTS } from "../../helpers/type";
import {
    deployEssentialContracts,
    deployAdapters,
} from "../../helpers/contracts-deployments";
import { approveTokens } from "../../helpers/contracts-actions";
export async function setUp(owner: Signer): Promise<[CONTRACTS, CONTRACTS]> {
    const contracts = await deployEssentialContracts(hre, owner);
    await approveTokens(owner, contracts.registry);
    const adapters = await deployAdapters(
        hre,
        owner,
        contracts.registry.address,
        contracts.harvestCodeProvider.address
    );
    return [contracts, adapters];
}
