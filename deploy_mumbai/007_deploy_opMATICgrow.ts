import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { executeFunc, generateTokenHashV2 } from "../helpers/helpers";
import { RISK_PROFILES } from "../helpers/constants/contracts-data";
import { TypedMumbaiTokens } from "../helpers/data";
import { NETWORKS_CHAIN_ID_HEX } from "../helper-hardhat-config";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;
  const [owner, admin] = await hre.ethers.getSigners();
  const { deploy } = deployments;
  const riskProfileCode = 1;
  const registryAddress = (await deployments.get("RegistryProxy")).address;
  const underlyingToken = TypedMumbaiTokens.WMATIC;
  const tokenContract = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.ERC20, underlyingToken);
  const underlyingTokenName = await tokenContract.name();
  const underlyingTokenSymbol = await tokenContract.symbol();
  const vaultAddress = (
    await deploy("opWMATICgrow", {
      from: await owner.getAddress(),
      args: [
        registryAddress,
        underlyingTokenName,
        underlyingTokenSymbol,
        RISK_PROFILES[riskProfileCode].name,
        RISK_PROFILES[riskProfileCode].symbol,
      ],
      log: true,
      contract: ESSENTIAL_CONTRACTS.VAULT,
    })
  ).address;

  const vaultProxyAddress = (
    await deploy("opWMATICgrowProxy", {
      from: await owner.getAddress(),
      args: [vaultAddress, await admin.getAddress(), "0x"],
      log: true,
      contract: ESSENTIAL_CONTRACTS.VAULT_PROXY_V2,
    })
  ).address;

  const vault = await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.VAULT, vaultProxyAddress, owner);

  await executeFunc(vault, owner, "initialize(address,bytes32,string,string,uint256)", [
    registryAddress,
    generateTokenHashV2([underlyingToken], NETWORKS_CHAIN_ID_HEX.polygon.toString()),
    underlyingTokenName,
    underlyingTokenSymbol,
    riskProfileCode,
  ]);
};

export default func;
func.tags = ["opWMATICgrow"];
