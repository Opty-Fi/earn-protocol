import { Contract, Signer, ContractFactory, utils, BigNumber } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { STRATEGY_DATA } from "./type";
import { getSoliditySHA3Hash } from "./utils";
import { getAddress } from "ethers/lib/utils";
import { TypedTokens } from "./data";

export async function deployContract(
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  isDeployedOnce: boolean,
  owner: Signer,
  args: any[],
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
  owner?: Signer,
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
  owner: string,
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
  owner?: Signer,
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

export async function executeFunc(contract: Contract, executer: Signer, funcAbi: string, args: any[]): Promise<void> {
  const tx = await contract.connect(executer)[funcAbi](...args);
  await tx.wait();
}

export async function getExistingContractAddress(
  hre: HardhatRuntimeEnvironment,
  contractName: string,
): Promise<string> {
  let address;
  try {
    const deployedContract = await hre.deployments.get(contractName);
    address = deployedContract.address;
  } catch (error) {
    address = "";
  }
  return address;
}

export async function getContract(
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  address: string,
  contractProxy?: string,
): Promise<Contract | undefined> {
  let contract: Contract | undefined;
  if (address === "") {
    address = await getExistingContractAddress(hre, contractProxy ? contractProxy : contractName);
  }
  if (address !== "") {
    contract = await getContractInstance(hre, contractName, address);
  } else {
    contract = undefined;
  }
  return contract;
}

export async function getContractInstance(
  hre: HardhatRuntimeEnvironment,
  contractName: string,
  tokenAddress: string,
): Promise<Contract> {
  const contract = await hre.ethers.getContractAt(contractName, tokenAddress);
  return contract;
}

export function generateStrategyHash(strategy: STRATEGY_DATA[], tokenAddress: string): string {
  const strategyStepsHash: string[] = [];
  const tokensHash = getSoliditySHA3Hash(["address[]"], [[tokenAddress]]);
  for (let index = 0; index < strategy.length; index++) {
    strategyStepsHash[index] = getSoliditySHA3Hash(
      ["address", "address", "bool"],
      [strategy[index].contract, strategy[index].outputToken, strategy[index].isBorrow],
    );
  }
  return getSoliditySHA3Hash(["bytes32", "bytes32[]"], [tokensHash, strategyStepsHash]);
}

export function isAddress(address: string): boolean {
  return utils.isAddress(address);
}

export async function moveToNextBlock(hre: HardhatRuntimeEnvironment): Promise<void> {
  const blockNumber = await hre.ethers.provider.getBlockNumber();
  const block = await hre.ethers.provider.getBlock(blockNumber);
  await hre.network.provider.send("evm_setNextBlockTimestamp", [block.timestamp + 1]);
  await hre.network.provider.send("evm_mine");
}

export function edgeCaseTokens(adapterName: string, token: string): boolean {
  //  @reason: LINK: CLink's address not detectable as Contract with the blockNumber being used in Hardhat config.
  //  However, it works fine if existing blockNumber is removed with the latest blockNumber.
  //  @reason: TUSD: PoolValue comes `0` with existing blockNumber in hardhat config. However, it works fine with
  //  the latest blockNumber
  //  @reason: ETH: This is an exception as input is not considered in ETH rather it is replaced with WETH.
  if (
    (adapterName.toLowerCase() == "compoundadapter" && getAddress(token) == getAddress(TypedTokens.LINK)) ||
    getAddress(token) == getAddress(TypedTokens.TUSD)
  ) {
    return true;
  }
  return false;
}

export function getDefaultFundAmount(underlyingTokenAddress: string): BigNumber {
  let defaultFundAmount: BigNumber = BigNumber.from("20000");
  defaultFundAmount =
    underlyingTokenAddress == getAddress(TypedTokens.WBTC) ||
    underlyingTokenAddress == getAddress(TypedTokens.COMP) ||
    underlyingTokenAddress == getAddress(TypedTokens.SAI) ||
    underlyingTokenAddress == getAddress(TypedTokens.REP) ||
    underlyingTokenAddress == getAddress(TypedTokens.ETH) ||
    underlyingTokenAddress == getAddress(TypedTokens.WETH) ||
    underlyingTokenAddress == getAddress(TypedTokens.DUSD) ||
    underlyingTokenAddress == getAddress(TypedTokens.HUSD) ||
    underlyingTokenAddress == getAddress(TypedTokens.MUSD)
      ? BigNumber.from("200")
      : defaultFundAmount;
  return defaultFundAmount;
}

export function getEthValueGasOverrideOptions(hre: HardhatRuntimeEnvironment, parseEthAmount: string) {
  const ETH_VALUE_GAS_OVERRIDE_OPTIONS = {
    value: hre.ethers.utils.hexlify(hre.ethers.utils.parseEther(parseEthAmount)),
    gasLimit: 6721975,
  };
  return ETH_VALUE_GAS_OVERRIDE_OPTIONS;
}
