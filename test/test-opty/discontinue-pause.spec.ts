import { expect, assert } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer, BigNumber } from "ethers";
import {
    setUp,
    deployVault,
    setBestBasicStrategy,
    approveLiquidityPoolAndMapAdapter,
} from "./setup";
import { ESSENTIAL_CONTRACTS, CONTRACTS } from "./utils/type";
import { TOKENS } from "./utils/constants";
import { TypedStrategies } from "./data";
import {
    getSoliditySHA3Hash,
    fundWalletToken,
    getBlockTimestamp,
    getTokenName,
    getTokenSymbol,
} from "./utils/helpers";
import scenario from "./scenarios/discontinue-pause.json";
describe(scenario.title, () => {
    // TODO: ADD TEST SCENARIOES, ADVANCED PROFILE, STRATEGIES.
    const token = "DAI";
    const MAX_AMOUNT = 100000000;
    let essentialContracts: ESSENTIAL_CONTRACTS;
    let contracts: CONTRACTS;
    let adapters: CONTRACTS;
    let owner: Signer;
    let admin: Signer;
    before(async () => {
        try {
            [owner, admin] = await ethers.getSigners();
            [essentialContracts, adapters] = await setUp(owner);
            assert.isDefined(essentialContracts, "Essential contracts not deployed");
            assert.isDefined(adapters, "Adapters not deployed");
        } catch (error) {
            console.log(error);
        }
    });

    for (let i = 0; i < scenario.vaults.length; i++) {
        describe(`${scenario.vaults[i].name}`, async () => {
            let vault: Contract;
            let underlyingTokenName: string;
            let underlyingTokenSymbol: string;
            const vaults = scenario.vaults[i];
            const vaultContractName = vaults.name;
            const profile = vaults.profile;
            const TOKEN_STRATEGY =
                TypedStrategies[token][profile + vaultContractName][0];
            const tokensHash = getSoliditySHA3Hash(["address[]"], [[TOKENS[token]]]);
            let ERC20Instance: Contract;
            before(async () => {
                try {
                    underlyingTokenName = await getTokenName(token);
                    underlyingTokenSymbol = await getTokenSymbol(token);
                    vault = await deployVault(
                        essentialContracts.registry.address,
                        essentialContracts.riskManager.address,
                        essentialContracts.strategyManager.address,
                        essentialContracts.optyMinter.address,
                        TOKENS[token],
                        owner,
                        admin,
                        vaultContractName,
                        underlyingTokenName,
                        underlyingTokenSymbol,
                        profile
                    );
                    contracts = { ...essentialContracts, vault };
                    await approveLiquidityPoolAndMapAdapter(
                        essentialContracts.registry,
                        adapters["CompoundAdapter"].address,
                        TOKEN_STRATEGY.strategy[0].contract
                    );

                    const riskProfile = await vault.profile();
                    await setBestBasicStrategy(
                        TOKEN_STRATEGY.strategy,
                        tokensHash,
                        essentialContracts.registry,
                        essentialContracts.strategyProvider,
                        riskProfile
                    );

                    const timestamp = (await getBlockTimestamp()) * 2;
                    await fundWalletToken(
                        TOKENS[token],
                        owner,
                        BigNumber.from(MAX_AMOUNT * 100),
                        timestamp
                    );
                    ERC20Instance = await ethers.getContractAt("ERC20", TOKENS[token]);
                } catch (error) {
                    console.error(error);
                }
            });

            for (let i = 0; i < vaults.stories.length; i++) {
                const story = vaults.stories[i];
                it(story.description, async () => {
                    for (let j = 0; j < story.actions.length; j++) {
                        if (
                            story.actions[j].action ===
                                "userDepositRebalance(uint256)" ||
                            story.actions[j].action === "userWithdrawRebalanceAll()"
                        ) {
                            const args = story.actions[j].args;
                            if (story.actions[j].expect === "success") {
                                await ERC20Instance.connect(owner).approve(
                                    contracts[story.actions[j].contract.toLowerCase()]
                                        .address,
                                    BigNumber.from(MAX_AMOUNT * 2)
                                );
                                story.actions[j].action ===
                                "userDepositRebalance(uint256)"
                                    ? await contracts[
                                          story.actions[j].contract.toLowerCase()
                                      ][story.actions[j].action](args?.amount)
                                    : await contracts[
                                          story.actions[j].contract.toLowerCase()
                                      ][story.actions[j].action];
                            } else {
                                await expect(
                                    contracts[story.actions[j].contract.toLowerCase()][
                                        story.actions[j].action
                                    ](args?.amount)
                                ).to.be.revertedWith(story.actions[j].message);
                            }
                        } else {
                            const args = story.actions[j].args;
                            if (story.actions[j].expect === "success") {
                                story.actions[j].action === "setPause(address,bool)"
                                    ? await contracts[
                                          story.actions[j].contract.toLowerCase()
                                      ][story.actions[j].action](
                                          vault.address,
                                          args?.pause
                                      )
                                    : await contracts[
                                          story.actions[j].contract.toLowerCase()
                                      ][story.actions[j].action](vault.address);
                            }
                        }
                    }
                }).timeout(100000);
            }
        });
    }
});
