import { ethers } from "hardhat";
import { Signer, Contract } from "ethers";
import { TypedDefiPools } from "./data";
import {
    ESSENTIAL_CONTRACTS as ESSENTIAL_CONTRACTS_DATA,
    TOKENS,
    ADAPTER,
    RISK_PROFILES,
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
    return [contracts, adapters];
}

export async function deployRegistry(owner: Signer): Promise<Contract> {
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
    return registry;
}

async function deployEssentialContracts(owner: Signer): Promise<ESSENTIAL_CONTRACTS> {
    const registry = await deployRegistry(owner);

    const profiles = Object.keys(RISK_PROFILES);
    for (let i = 0; i < profiles.length; i++) {
        await registry.addRiskProfile(
            RISK_PROFILES[profiles[i]].name,
            RISK_PROFILES[profiles[i]].steps,
            RISK_PROFILES[profiles[i]].poolRating
        );
    }

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

    const RiskManagerFactory = await ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.RISK_MANAGER
    );
    let riskManager = await RiskManagerFactory.connect(owner).deploy(registry.address);

    const RiskManagerProxyFactory = await ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.RISK_MANAGER_PROXY
    );
    const riskManagerProxy = await RiskManagerProxyFactory.connect(owner).deploy(
        registry.address
    );

    await riskManagerProxy.connect(owner).setPendingImplementation(riskManager.address);
    await riskManager.connect(owner).become(riskManagerProxy.address);

    riskManager = await ethers.getContractAt(
        ESSENTIAL_CONTRACTS_DATA.RISK_MANAGER,
        riskManagerProxy.address,
        owner
    );

    await riskManager.initialize(strategyProvider.address);

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

export const GAS_OVERRIDE_OPTIONS = {
    gasLimit: 6721975,
};

export async function deployVault(
    registry: string,
    riskManager: string,
    strategyCodeProvider: string,
    optyMinter: string,
    underlyingToken: string,
    owner: Signer,
    admin: Signer,
    vaultContractName: string,
    underlyingTokenName: string,
    underlyingTokenSymbol: string,
    riskProfile: string
): Promise<Contract> {
    const VAULTFactory = await ethers.getContractFactory(vaultContractName);
    let vault = await VAULTFactory.connect(owner).deploy(
        registry,
        underlyingTokenName,
        underlyingTokenSymbol,
        riskProfile
    );

    const VAULTProxyFactory = await ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.VAULT_PROXY
    );
    const adminAddress = await admin.getAddress();
    const vaultProxy = await VAULTProxyFactory.connect(owner).deploy(adminAddress);

    await vaultProxy.connect(admin).upgradeTo(vault.address);
    vault = await ethers.getContractAt(vaultContractName, vaultProxy.address, owner);
    await vault.initialize(
        registry,
        riskManager,
        underlyingToken,
        strategyCodeProvider,
        optyMinter,
        underlyingTokenName,
        underlyingTokenSymbol,
        riskProfile
    );
    return vault;
}

export async function setBestBasicStrategy(
    strategy: STRATEGY_DATA[],
    tokensHash: string,
    registry: Contract,
    strategyProvider: Contract,
    riskProfile: string
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
    await strategyProvider.setBestStrategy(riskProfile, tokensHash, strategyHash);
    return strategyHash;
}

async function approveTokens(registryContract: Contract) {
    const tokenAddresses: string[] = [];
    for (const token in TOKENS) {
        tokenAddresses.push(TOKENS[token]);
    }

    try {
        await registryContract.approveTokens(tokenAddresses);
        await registryContract.setMultipleTokensHashToTokens(
            tokenAddresses.map((addr) => [addr])
        );
    } catch (error) {
        console.log(`Got error when executing approveTokens : ${error}`);
    }
}

export async function approveLiquidityPoolAndMapAdapter(
    registryContract: Contract,
    adapter: string,
    lqPool: string
): Promise<void> {
    await registryContract.approveLiquidityPools([lqPool]);
    await registryContract.setLiquidityPoolsToAdapters([[lqPool, adapter]]);
}
async function approveLiquidityPoolAndMapAdapters(
    registryContract: Contract,
    adapters: CONTRACTS
) {
    const liquidityPools: string[] = [];
    const liquidityPoolsMapToAdapters: [string, string][] = [];
    for (const adapter in adapters) {
        if (TypedDefiPools[adapter]) {
            for (const token in TOKENS) {
                if (TypedDefiPools[adapter][token]) {
                    liquidityPools.push(TypedDefiPools[adapter][token].lpToken);
                    liquidityPoolsMapToAdapters.push([
                        TypedDefiPools[adapter][token].lpToken,
                        adapters[adapter].address,
                    ]);
                }
            }
        }
    }
    try {
        await registryContract.approveLiquidityPools(liquidityPools);
        await registryContract.setLiquidityPoolsToAdapters(liquidityPoolsMapToAdapters);
    } catch (error) {
        console.log(
            `Got error when executing approveLiquidityPoolAndMapAdapters : ${error}`
        );
    }
}

export async function deployAdapters(
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
