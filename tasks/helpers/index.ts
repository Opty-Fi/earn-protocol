import { ContractFactory, Signer, Contract } from "ethers";

export async function deployContract(
    contractFactory: ContractFactory,
    args: any[]
): Promise<Contract> {
    const contract = await contractFactory.deploy(...args);
    await contract.deployTransaction.wait();
    return contract;
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
