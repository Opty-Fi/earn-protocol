import { ethers } from "hardhat";
import { Signer, Contract } from "ethers";
import { TypedDefiPools } from "./data";
import {
    ESSENTIAL_CONTRACTS as ESSENTIAL_CONTRACTS_DATA,
    TOKENS,
    ADAPTER,
} from "./utils/constants";
import { ESSENTIAL_CONTRACTS, CONTRACTS, STRATEGY_DATA } from "./utils/type";
import { getSoliditySHA3Hash } from "./utils/helpers";

export async function setUp(owner: Signer): Promise<[ESSENTIAL_CONTRACTS, CONTRACTS]> {
    const contracts = await deployEssentialContracts(owner);
    await approveTokens(contracts.registry);
    const adapters = await deployAdapters(
        owner,
        contracts.registry.address,
        contracts.harvestCodeProvider.address
    );
    await approveLiquidityPoolAndMapAdapters(contracts.registry, adapters);
    return [contracts, adapters];
}

async function deployEssentialContracts(owner: Signer): Promise<ESSENTIAL_CONTRACTS> {
    const RegistryFactory = await ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.REGISTRY
    );
    let registry = await RegistryFactory.connect(owner).deploy();

    const RegistryProxyFactory = await ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.REGISTRY_PROXY
    );
    const registryProxy = await RegistryProxyFactory.connect(owner).deploy();

    await registryProxy.connect(owner).setPendingImplementation(registry.address);
    await registry.connect(owner).become(registryProxy.address);

    registry = await ethers.getContractAt(
        ESSENTIAL_CONTRACTS_DATA.REGISTRY,
        registryProxy.address,
        owner
    );

    const StrategyProvider = await ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.STRATEGY_PROVIDER
    );
    const strategyProvider = await StrategyProvider.connect(owner).deploy(
        registry.address
    );

    const HarvestCodeProvider = await ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.HARVEST_CODE_PROVIDER
    );
    const harvestCodeProvider = await HarvestCodeProvider.connect(owner).deploy(
        registry.address
    );

    const RiskManager = await ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.RISK_MANAGER
    );
    const riskManager = await RiskManager.connect(owner).deploy(
        registry.address,
        strategyProvider.address
    );

    const StrategyManager = await ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.STRATEGY_MANAGER
    );
    const strategyManager = await StrategyManager.connect(owner).deploy(
        registry.address,
        harvestCodeProvider.address
    );

    const OPTY = await ethers.getContractFactory(ESSENTIAL_CONTRACTS_DATA.OPTY);
    const opty = await OPTY.connect(owner).deploy(registry.address, 0);

    const OPTYMinter = await ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.OPTY_MINTER
    );
    const optyMinter = await OPTYMinter.connect(owner).deploy(
        registry.address,
        opty.address
    );
    return {
        registry,
        strategyProvider,
        harvestCodeProvider,
        riskManager,
        strategyManager,
        opty,
        optyMinter,
    };
}

export async function deployVault(
    registry: string,
    riskManager: string,
    strategyCodeProvider: string,
    optyMinter: string,
    underlyingToken: string,
    owner: Signer,
    admin: Signer,
    profile: string
): Promise<Contract> {
    const VAULTFactory = await ethers.getContractFactory(profile);
    let vault = await VAULTFactory.connect(owner).deploy(registry, underlyingToken);

    const VAULTProxyFactory = await ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.VAULT_PROXY
    );
    const adminAddress = await admin.getAddress();
    const vaultProxy = await VAULTProxyFactory.connect(owner).deploy(adminAddress);

    await vaultProxy.connect(admin).upgradeTo(vault.address);
    vault = await ethers.getContractAt(profile, vaultProxy.address, owner);
    await vault.initialize(
        registry,
        riskManager,
        underlyingToken,
        strategyCodeProvider,
        optyMinter
    );
    return vault;
}

export async function setBestBasicStrategy(
    strategy: STRATEGY_DATA[],
    tokensHash: string,
    registry: Contract,
    strategyProvider: Contract
): Promise<void> {
    const strategySteps: [string, string, boolean][] = [];
    const strategyStepsHash: string[] = [];
    for (let index = 0; index < strategy.length; index++) {
        const tempArr: [string, string, boolean] = [
            strategy[index].contract,
            strategy[index].outputToken,
            strategy[index].isBorrow,
        ];
        strategyStepsHash[index] = getSoliditySHA3Hash(
            ["address", "address", "bool"],
            [
                strategy[index].contract,
                strategy[index].outputToken,
                strategy[index].isBorrow,
            ]
        );
        strategySteps.push(tempArr);
    }

    const strategies = await registry["setStrategy(bytes32,(address,address,bool)[])"](
        tokensHash,
        strategySteps
    );
    const strategyReceipt = await strategies.wait();
    const strategyHash = strategyReceipt.events[0].args[2];
    await strategyProvider.setBestRP1Strategy(tokensHash, strategyHash);
}

async function approveTokens(registryContract: Contract) {
    for (const token in TOKENS) {
        try {
            await registryContract.approveToken(TOKENS[token]);
            await registryContract.setTokensHashToTokens([TOKENS[token]]);
        } catch (error) {
            console.log(
                `Got error when executing approveTokens for ${token} : ${error}`
            );
        }
    }
}

export async function approveLiquidityPoolAndMapAdapter(
    registryContract: Contract,
    adapter: string,
    lqPool: string
): Promise<void> {
    await registryContract.approveLiquidityPool(lqPool);
    await registryContract.setLiquidityPoolToAdapter(lqPool, adapter);
}
async function approveLiquidityPoolAndMapAdapters(
    registryContract: Contract,
    adapters: CONTRACTS
) {
    for (const adapter in adapters) {
        if (TypedDefiPools[adapter]) {
            for (const token in TOKENS) {
                if (TypedDefiPools[adapter][token]) {
                    try {
                        await registryContract.approveLiquidityPool(
                            TypedDefiPools[adapter][token].lpToken
                        );
                        await registryContract.setLiquidityPoolToAdapter(
                            TypedDefiPools[adapter][token].lpToken,
                            adapters[adapter].address
                        );
                    } catch (error) {
                        console.log(
                            `Got error when executing approveLiquidityPoolAndMapAdapters for ${token} : ${error}`
                        );
                    }
                }
            }
        }
    }
}

async function deployAdapters(
    owner: Signer,
    registryAddr: string,
    harvestAddr: string
): Promise<CONTRACTS> {
    const data: CONTRACTS = {};

    for (const adapter of ADAPTER) {
        try {
            const factory = await ethers.getContractFactory(adapter);
            let contract: Contract;
            if (["dYdXAdapter", "FulcrumAdapter", "YVaultAdapter"].includes(adapter)) {
                contract = await factory.connect(owner).deploy(registryAddr);
            } else {
                contract = await factory
                    .connect(owner)
                    .deploy(registryAddr, harvestAddr);
            }

            data[adapter] = contract;
        } catch (error) {
            console.log(error);
        }
    }
    return data;
}
