import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { executeFunc } from "../helpers/helpers";
import { RISK_PROFILES } from "../helpers/constants/contracts-data";
import KOVAN from "../_deployments/kovan.json";
import { legos as PolygonLegos } from "@optyfi/defi-legos/polygon";
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const [owner, admin] = await hre.ethers.getSigners();
  const { deploy } = deployments;
  const riskProfileCode = 2;
  const underlyingToken = PolygonLegos.tokens.WMATIC;
  const tokenContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, underlyingToken);
  const underlyingTokenName = await tokenContract.name();
  const underlyingTokenSymbol = await tokenContract.symbol();
  const vaultAddress = (
    await deploy("VaultWMATICV2", {
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

  const vaultProxyAddress = (
    await deploy("VaultUSDCProxyV2", {
      from: await owner.getAddress(),
      args: [vaultAddress, await admin.getAddress(), "0x"],
      log: true,
      contract: ESSENTIAL_CONTRACTS.VAULT_PROXY_V2,
    })
  ).address;

  const vault = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT_V2, vaultProxyAddress, owner);

  await executeFunc(vault, owner, "initialize(address,address,string,string,uint256)", [
    KOVAN.RegistryProxy,
    underlyingToken,
    underlyingTokenName,
    underlyingTokenSymbol,
    riskProfileCode,
  ]);
};

export default func;
func.tags = ["VaultWMATICV2"];
