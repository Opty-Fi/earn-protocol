import {
    ESSENTIAL_CONTRACTS as ESSENTIAL_CONTRACTS_DATA,
    RISK_PROFILES,
    ADAPTER,
    TOKENS,
} from "./constants";
import { Contract, Signer } from "ethers";
import { CONTRACTS, CONTRACTS_WITH_HASH } from "./type";
import { getTokenName, getTokenSymbol } from "./contracts-actions";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { deployContract, executeFunc, deployContractWithHash } from "./helpers";

export async function deployRegistry(
    hre: HardhatRuntimeEnvironment,
    owner: Signer
): Promise<Contract> {
    const REGISTRY_FACTORY = await hre.ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.REGISTRY
    );

    let registry = await deployContract(REGISTRY_FACTORY, [], owner);

    const REGISTRY_PROXY_FACTORY = await hre.ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.REGISTRY_PROXY
    );
    const registryProxy = await deployContract(REGISTRY_PROXY_FACTORY, [], owner);

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

    const STRATEGY_PROVIDER_FACTORY = await hre.ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.STRATEGY_PROVIDER
    );
    const strategyProvider = await deployContract(
        STRATEGY_PROVIDER_FACTORY,
        [registry.address],
        owner
    );

    const HARVEST_CODE_PROVIDER_FACTORY = await hre.ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.HARVEST_CODE_PROVIDER
    );
    const harvestCodeProvider = await deployContract(
        HARVEST_CODE_PROVIDER_FACTORY,
        [registry.address],
        owner
    );

    const RISK_MANAGER_FACTORY = await hre.ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.RISK_MANAGER
    );
    let riskManager = await deployContract(
        RISK_MANAGER_FACTORY,
        [registry.address],
        owner
    );

    const RISK_MANAGER_PROXY_FACTORY = await hre.ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.RISK_MANAGER_PROXY
    );
    const riskManagerProxy = await deployContract(
        RISK_MANAGER_PROXY_FACTORY,
        [registry.address],
        owner
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

    const STRATEGY_MANAGER_FACTORY = await hre.ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.STRATEGY_MANAGER
    );
    const strategyManager = await deployContract(
        STRATEGY_MANAGER_FACTORY,
        [registry.address, harvestCodeProvider.address],
        owner
    );

    const OPTY_FACTORY = await hre.ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.OPTY
    );
    const opty = await deployContract(OPTY_FACTORY, [registry.address, 0], owner);

    const OPTY_MINTER_FACTORY = await hre.ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.OPTY_MINTER
    );
    const optyMinter = await deployContract(
        OPTY_MINTER_FACTORY,
        [registry.address, opty.address],
        owner
    );
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
    const VAULT_FACTORY = await hre.ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.VAULT
    );
    let vault = await deployContract(
        VAULT_FACTORY,
        [registry, underlyingTokenName, underlyingTokenSymbol, riskProfile],
        owner
    );
    const adminAddress = await admin.getAddress();

    const VAULT_PROXY_FACTORY = await hre.ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.VAULT_PROXY
    );
    const vaultProxy = await deployContract(VAULT_PROXY_FACTORY, [adminAddress], owner);

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
    const VAULT_FACTORY = await hre.ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.VAULT
    );
    const vault = await deployContractWithHash(
        VAULT_FACTORY,
        [registry, underlyingTokenName, underlyingTokenSymbol, riskProfile],
        owner
    );
    const adminAddress = await admin.getAddress();

    const VAULT_PROXY_FACTORY = await hre.ethers.getContractFactory(
        ESSENTIAL_CONTRACTS_DATA.VAULT_PROXY
    );
    const vaultProxy = await deployContractWithHash(
        VAULT_PROXY_FACTORY,
        [adminAddress],
        owner
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
