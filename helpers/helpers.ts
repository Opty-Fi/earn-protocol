import { Contract, Signer, ContractFactory } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

export async function deployContract(
    hre: HardhatRuntimeEnvironment,
    contractName: string,
    isDeployedOnce: boolean,
    owner: Signer,
    args: any[]
): Promise<Contract> {
    let contract: Contract;
    if (isDeployedOnce) {
        const ownerAddr = await owner.getAddress();
        contract = await _deployContractOnce(hre, contractName, args, ownerAddr);
    } else {
        const factory = await hre.ethers.getContractFactory(contractName);
        contract = await _deployContract(factory, args, owner);
    }
    return contract;
}

export async function _deployContract(
    contractFactory: ContractFactory,
    args: any[],
    owner?: Signer
): Promise<Contract> {
    let contract: Contract;
    if (owner) {
        contract = await contractFactory.connect(owner).deploy(...args);
    } else {
        contract = await contractFactory.deploy(...args);
    }
    await contract.deployTransaction.wait();
    return contract;
}

export async function _deployContractOnce(
    hre: HardhatRuntimeEnvironment,
    contractName: string,
    args: any[],
    owner: string
): Promise<Contract> {
    const result = await hre.deployments.deploy(contractName, {
        from: owner,
        args: args,
    });
    const contract = await hre.ethers.getContractAt(result.abi, result.address);
    return contract;
}

export async function deployContractWithHash(
    contractFactory: ContractFactory,
    args: any[],
    owner?: Signer
): Promise<{ contract: Contract; hash: string }> {
    let contract: Contract;
    if (owner) {
        contract = await contractFactory.connect(owner).deploy(...args);
    } else {
        contract = await contractFactory.deploy(...args);
    }
    const hash = contract.deployTransaction.hash;
    await contract.deployTransaction.wait();
    return { contract, hash };
}

export async function executeFunc(
    contract: Contract,
    executer: Signer,
    funcAbi: string,
    args: any[]
): Promise<void> {
    const tx = await contract.connect(executer)[funcAbi](...args);
    await tx.wait();
}

export async function getExistingContractAddress(
    hre: HardhatRuntimeEnvironment,
    contractName: string
): Promise<string> {
    const contract = await hre.deployments.get(contractName);
    return contract.address;
}
