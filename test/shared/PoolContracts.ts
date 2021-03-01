import OptyTokenBasicPool from "../../build/BasicPool.json";
import OptyTokenBasicPoolMkr from "../../build/BasicPoolMkr.json";
import OptyTokenAdvancePool from "../../build/AdvancePool.json";
import OptyTokenAdvancePoolMkr from "../../build/AdvancePoolMkr.json";
import { deployContract } from "ethereum-waffle";

// Function for deploying the Pool Contracts
export async function deployPoolContracts(
    underlyingToken: any,
    ownerWallet: any,
    OptyTokenProfilePoolMkrContractJSON: any,
    OptyTokenProfilePoolContractJSON: any,
    RegistryAddress: any,
    RiskManagerAddress: any,
    StrategyCodeProviderAddress: any
) {
    //  Deploying the Pools Contract for MKR underlying token
    if (underlyingToken == "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2") {
        const optyTokenProfilePool = await deployContract(
            ownerWallet,
            OptyTokenProfilePoolMkrContractJSON,
            [
                RegistryAddress,
                RiskManagerAddress,
                underlyingToken,
                StrategyCodeProviderAddress,
            ]
        );
        return optyTokenProfilePool;
    } else {
        //  Deploying the Pool Contract for every underlying token
        const optyTokenProfilePool = await deployContract(
            ownerWallet,
            OptyTokenProfilePoolContractJSON,
            [
                RegistryAddress,
                RiskManagerAddress,
                underlyingToken,
                StrategyCodeProviderAddress,
            ]
        );
        return optyTokenProfilePool;
    }
}

export {
    OptyTokenBasicPool,
    OptyTokenBasicPoolMkr,
    OptyTokenAdvancePool,
    OptyTokenAdvancePoolMkr,
};
