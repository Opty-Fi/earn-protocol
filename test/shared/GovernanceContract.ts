import OptyRegistry from "../../build/Registry.json";
import RegistryProxy from "../../build/RegistryProxy.json";
import RiskManager from "../../build/RiskManager.json";
import Gatherer from "../../build/Gatherer.json";
import OptyStrategyCodeProvider from "../../build/StrategyCodeProvider.json";
import StrategyProvider from "../../build/StrategyProvider.json";
import { deployContract } from "ethereum-waffle";
import * as utilities from "./utilities";
import { assert } from "chai";

//  Deploying RegistryProxy, Registry, StrategyProvider, RiskManager, Gatherer and StrategyCodeProvider Contracts
export async function deployAllGovernanceContracts(
    ownerWallet: any,
    RegistryProxyContractJSON: any,
    RegistryContractJSON: any,
    StrategyProviderContractJSON: any,
    RiskManagerContractJSON: any,
    GathererContractJSON: any,
    StrategyCodeProviderContractJSON: any,
    GAS_OVERRIDE_OPTIONS: any
) {
    //  Deploy RegistryProxy
    let optyRegistryProxy = await deployContract(
        ownerWallet,
        RegistryProxyContractJSON,
        [],
        GAS_OVERRIDE_OPTIONS
    );
    assert.isDefined(optyRegistryProxy, "OptyRegistry contract not deployed");

    //  Deploy Registry
    let optyRegistry = await deployContract(
        ownerWallet,
        RegistryContractJSON,
        [],
        GAS_OVERRIDE_OPTIONS
    );
    assert.isDefined(optyRegistry, "OptyRegistry contract not deployed");

    //  Setting Pending Implementation in RegistryProxy with Registry's address
    await optyRegistryProxy._setPendingImplementation(optyRegistry.address);

    //  Setting RegistryProxy to act as Registry
    await optyRegistry._become(optyRegistryProxy.address);

    //  Checking status if the registry implementation is set or not
    let registryImplementationAddress = await optyRegistryProxy.registryImplementation();
    assert.equal(
        registryImplementationAddress,
        optyRegistry.address,
        "Registry Implementation address should be equal to Registry Contract's address"
    );

    optyRegistry = await utilities.getContractInstance(
        optyRegistryProxy.address,
        RegistryContractJSON.abi,
        ownerWallet
    );
    assert.equal(
        optyRegistry.address,
        optyRegistryProxy.address,
        "Registry Contract's address should be equal to RegistryProxy Contract's address"
    );

    //  Deploy StrategyProvider
    let strategyProvider = await deployContract(
        ownerWallet,
        StrategyProviderContractJSON,
        [optyRegistry.address],
        GAS_OVERRIDE_OPTIONS
    );
    assert.isDefined(strategyProvider, "StrategyProvider contract not deployed");

    //  Deploy RiskManager
    let riskManager = await deployContract(
        ownerWallet,
        RiskManagerContractJSON,
        [optyRegistry.address, strategyProvider.address],
        GAS_OVERRIDE_OPTIONS
    );
    assert.isDefined(riskManager, "RiskManager contract not deployed");

    //  Deploy Gatherer
    let gatherer = await deployContract(
        ownerWallet,
        GathererContractJSON,
        [optyRegistry.address],
        GAS_OVERRIDE_OPTIONS
    );
    assert.isDefined(gatherer, "Gatherer contract not deployed");

    //  Deploy StrategyCodeProvider
    let optyStrategyCodeProvider = await deployContract(
        ownerWallet,
        StrategyCodeProviderContractJSON,
        [optyRegistry.address, gatherer.address],
        GAS_OVERRIDE_OPTIONS
    );
    assert.isDefined(
        optyStrategyCodeProvider,
        "OptyStrategyCodeProvider contract not deployed"
    );

    return [
        optyRegistry,
        strategyProvider,
        riskManager,
        gatherer,
        optyStrategyCodeProvider,
    ];
}

export {
    OptyRegistry,
    RegistryProxy,
    RiskManager,
    Gatherer,
    OptyStrategyCodeProvider,
    StrategyProvider,
};
