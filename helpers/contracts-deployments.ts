import {
    ESSENTIAL_CONTRACTS as ESSENTIAL_CONTRACTS_DATA,
    RISK_PROFILES,
    ADAPTER,
    TOKENS,
} from "./constants";
import { Contract, Signer } from "ethers";
import { CONTRACTS, CONTRACTS_WITH_HASH } from "./type";
import {
    Registry__factory,
    RegistryProxy__factory,
    StrategyProvider__factory,
    HarvestCodeProvider__factory,
    RiskManagerProxy__factory,
    RiskManager__factory,
    StrategyManager__factory,
    OPTY__factory,
    OPTYMinter__factory,
    Vault__factory,
    InitializableImmutableAdminUpgradeabilityProxy__factory,
} from "../typechain";
import { getTokenName, getTokenSymbol } from "./contracts-actions";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { deployContract, executeFunc, deployContractWithHash } from "./helpers";
export async function deployRegistry(
    hre: HardhatRuntimeEnvironment,
    owner: Signer
): Promise<Contract> {
    let registry = await deployContract(new Registry__factory(owner), []);
    const registryProxy = await deployContract(new RegistryProxy__factory(owner), []);
    await executeFunc(registryProxy, owner, "setPendingImplementation(address)", [
        registry.address,
    ]);
    await executeFunc(registry, owner, "become(address)", [registryProxy.address]);
    registry = await hre.ethers.getContractAt(
        ESSENTIAL_CONTRACTS_DATA.REGISTRY,
        registryProxy.address,
        owner
    );
    return registry;
}

export async function deployEssentialContracts(
    hre: HardhatRuntimeEnvironment,
    owner: Signer
): Promise<CONTRACTS> {
    const registry = await deployRegistry(hre, owner);
    const profiles = Object.keys(RISK_PROFILES);
    for (let i = 0; i < profiles.length; i++) {
        await executeFunc(
            registry,
            owner,
            "addRiskProfile(string,uint8,(uint8,uint8))",
            [
                RISK_PROFILES[profiles[i]].name,
                RISK_PROFILES[profiles[i]].steps,
                RISK_PROFILES[profiles[i]].poolRating,
            ]
        );
    }
    const strategyProvider = await deployContract(
        new StrategyProvider__factory(owner),
        [registry.address]
    );
    const harvestCodeProvider = await deployContract(
        new HarvestCodeProvider__factory(owner),
        [registry.address]
    );
    let riskManager = await deployContract(new RiskManager__factory(owner), [
        registry.address,
    ]);
    const riskManagerProxy = await deployContract(
        new RiskManagerProxy__factory(owner),
        [registry.address]
    );
    await executeFunc(riskManagerProxy, owner, "setPendingImplementation(address)", [
        riskManager.address,
    ]);
    await executeFunc(riskManager, owner, "become(address)", [
        riskManagerProxy.address,
    ]);
    riskManager = await hre.ethers.getContractAt(
        ESSENTIAL_CONTRACTS_DATA.RISK_MANAGER,
        riskManagerProxy.address,
        owner
    );
    await executeFunc(riskManager, owner, "initialize(address)", [
        strategyProvider.address,
    ]);
    const strategyManager = await deployContract(new StrategyManager__factory(owner), [
        registry.address,
        harvestCodeProvider.address,
    ]);
    const opty = await deployContract(new OPTY__factory(owner), [registry.address, 0]);
    const optyMinter = await deployContract(new OPTYMinter__factory(owner), [
        registry.address,
        opty.address,
    ]);
    const essentialContracts: CONTRACTS = {
        registry,
        strategyProvider,
        strategyManager,
        optyMinter,
        opty,
        riskManager,
        harvestCodeProvider,
    };
    return essentialContracts;
}

export async function deployAdapters(
    hre: HardhatRuntimeEnvironment,
    owner: Signer,
    registryAddr: string,
    harvestAddr: string
): Promise<CONTRACTS> {
    const data: CONTRACTS = {};
    for (const adapter of ADAPTER) {
        try {
            const factory = await hre.ethers.getContractFactory(adapter);
            let contract: Contract;
            if (["dYdXAdapter", "FulcrumAdapter", "YVaultAdapter"].includes(adapter)) {
                contract = await deployContract(factory, [registryAddr], owner);
            } else {
                contract = await deployContract(
                    factory,
                    [registryAddr, harvestAddr],
                    owner
                );
            }

            data[adapter] = contract;
        } catch (error) {
            console.log(error);
        }
    }
    return data;
}

export async function deployVaults(
    hre: HardhatRuntimeEnvironment,
    registry: string,
    riskManager: string,
    strategyManager: string,
    optyMinter: string,
    owner: Signer,
    admin: Signer
): Promise<CONTRACTS> {
    const vaults: CONTRACTS = {};
    for (const token in TOKENS) {
        const name = await getTokenName(hre, token);
        const symbol = await getTokenSymbol(hre, token);
        for (const riskProfile of Object.keys(RISK_PROFILES)) {
            const vault = await deployVault(
                hre,
                registry,
                riskManager,
                strategyManager,
                optyMinter,
                TOKENS[token],
                owner,
                admin,
                name,
                symbol,
                riskProfile
            );
            vaults[`${symbol}-${riskProfile}`] = vault;
            break;
        }
    }
    return vaults;
}
export async function deployVault(
    hre: HardhatRuntimeEnvironment,
    registry: string,
    riskManager: string,
    strategyManager: string,
    optyMinter: string,
    underlyingToken: string,
    owner: Signer,
    admin: Signer,
    underlyingTokenName: string,
    underlyingTokenSymbol: string,
    riskProfile: string
): Promise<Contract> {
    let vault = await deployContract(new Vault__factory(owner), [
        registry,
        underlyingTokenName,
        underlyingTokenSymbol,
        riskProfile,
    ]);
    const adminAddress = await admin.getAddress();
    const vaultProxy = await deployContract(
        new InitializableImmutableAdminUpgradeabilityProxy__factory(owner),
        [adminAddress]
    );

    await executeFunc(vaultProxy, admin, "upgradeTo(address)", [vault.address]);

    vault = await hre.ethers.getContractAt(
        ESSENTIAL_CONTRACTS_DATA.VAULT,
        vaultProxy.address,
        owner
    );

    await executeFunc(
        vault,
        owner,
        "initialize(address,address,address,address,address,string,string,string)",
        [
            registry,
            riskManager,
            underlyingToken,
            strategyManager,
            optyMinter,
            underlyingTokenName,
            underlyingTokenSymbol,
            riskProfile,
        ]
    );
    return vault;
}

export async function deployVaultsWithHash(
    hre: HardhatRuntimeEnvironment,
    registry: string,
    riskManager: string,
    strategyManager: string,
    optyMinter: string,
    owner: Signer,
    admin: Signer
): Promise<CONTRACTS_WITH_HASH> {
    const vaults: CONTRACTS_WITH_HASH = {};
    for (const token in TOKENS) {
        const name = await getTokenName(hre, token);
        const symbol = await getTokenSymbol(hre, token);
        for (const riskProfile of Object.keys(RISK_PROFILES)) {
            const vault = await deployVaultWithHash(
                hre,
                registry,
                riskManager,
                strategyManager,
                optyMinter,
                TOKENS[token],
                owner,
                admin,
                name,
                symbol,
                riskProfile
            );
            vaults[`${symbol}-${riskProfile}`] = vault;
        }
    }
    return vaults;
}

export async function deployVaultWithHash(
    hre: HardhatRuntimeEnvironment,
    registry: string,
    riskManager: string,
    strategyManager: string,
    optyMinter: string,
    underlyingToken: string,
    owner: Signer,
    admin: Signer,
    underlyingTokenName: string,
    underlyingTokenSymbol: string,
    riskProfile: string
): Promise<{ contract: Contract; hash: string }> {
    const vault = await deployContractWithHash(new Vault__factory(owner), [
        registry,
        underlyingTokenName,
        underlyingTokenSymbol,
        riskProfile,
    ]);
    const adminAddress = await admin.getAddress();
    const vaultProxy = await deployContractWithHash(
        new InitializableImmutableAdminUpgradeabilityProxy__factory(owner),
        [adminAddress]
    );

    await executeFunc(vaultProxy.contract, admin, "upgradeTo(address)", [
        vault.contract.address,
    ]);

    vaultProxy.contract = await hre.ethers.getContractAt(
        ESSENTIAL_CONTRACTS_DATA.VAULT,
        vaultProxy.contract.address,
        owner
    );

    await executeFunc(
        vaultProxy.contract,
        owner,
        "initialize(address,address,address,address,address,string,string,string)",
        [
            registry,
            riskManager,
            underlyingToken,
            strategyManager,
            optyMinter,
            underlyingTokenName,
            underlyingTokenSymbol,
            riskProfile,
        ]
    );
    return vaultProxy;
}
