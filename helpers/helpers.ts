import { Contract, Signer, ContractFactory } from "ethers";
export async function deployContract(
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
