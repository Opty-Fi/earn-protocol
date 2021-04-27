import { ethers } from "hardhat";
import { Signer, Contract } from "ethers";
import {
    ESSENTIAL_CONTRACTS as ESSENTIAL_CONTRACTS_DATA,
    TOKENS,
    RISK_PROFILES,
} from "./utils/constants";
import { ESSENTIAL_CONTRACTS, STRATEGY_DATA } from "./utils/type";
import { getSoliditySHA3Hash } from "./utils/helpers";

export async function setUp(owner: Signer): Promise<[ESSENTIAL_CONTRACTS]> {
    const contracts = await deployEssentialContracts(owner);
    await approveTokens(contracts.registry);
    return [contracts];
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
        riskManager,
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
