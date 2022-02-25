import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { executeFunc } from "../helpers/helpers";
import { RISK_PROFILES } from "../helpers/constants/contracts-data";
import KOVAN from "../_deployments/kovan.json";
import { expect } from "chai";
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const [owner, admin] = await hre.ethers.getSigners();
  const { deploy } = deployments;
  const riskProfileCode = 2;
  const oldVault = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, KOVAN.opAVUSDCint.VaultProxy);
  const underlyingToken = await oldVault.underlyingToken();
  const tokenContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, underlyingToken);
  const underlyingTokenName = await tokenContract.name();
  const underlyingTokenSymbol = await tokenContract.symbol();
  const vaultAddress = (
    await deploy("VaultV2", {
      from: await owner.getAddress(),
      args: [
        KOVAN.RegistryProxy,
        underlyingTokenName,
        underlyingTokenSymbol,
        RISK_PROFILES[riskProfileCode].name,
        RISK_PROFILES[riskProfileCode].symbol,
      ],
      log: true,
      contract: ESSENTIAL_CONTRACTS.VAULT_V2,
    })
  ).address;

  const vaultProxy = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_PROXY, KOVAN.opAVUSDCint.VaultProxy);

  expect(vaultProxy.ADMIN()).to.be.equals(await admin.getAddress());
  await executeFunc(vaultProxy, admin, "upgradeTo(address)", [vaultAddress]);
  const vault = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_V2, KOVAN.opAVUSDCint.VaultProxy, owner);

  await executeFunc(vault, owner, "initialize(address,address,string,string,uint256)", [
    KOVAN.RegistryProxy,
    underlyingToken,
    underlyingTokenName,
    underlyingTokenSymbol,
    riskProfileCode,
  ]);
};

export default func;
func.tags = ["VaultV2"];
