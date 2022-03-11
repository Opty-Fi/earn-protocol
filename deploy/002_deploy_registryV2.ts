import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { RegistryProxy, RegistryV2 } from "../typechain";
import { getAddress } from "ethers/lib/utils";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({
  deployments,
  getNamedAccounts,
  getChainId,
  ethers,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact(ESSENTIAL_CONTRACTS.REGISTRY_V2);
  const chainId = await getChainId();
  const networkName = hre.network.name;
  const result = await deploy("RegistryV2", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const registryV2 = await deployments.get("RegistryV2");
  let registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryV2.address);
  const registryProxy = await deployments.get("RegistryProxy");
  let registryProxyInstance = <RegistryProxy>(
    await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, registryProxy.address)
  );
  const operatorAddress = await registryProxyInstance.operator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const governanceAddress = await registryProxyInstance.governance();
  const governanceSigner = await ethers.getSigner(governanceAddress);
  const riskOperatorAddress = await registryProxyInstance.riskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperatorAddress);
  registryProxyInstance = <RegistryProxy>(
    await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_PROXY, registryProxy.address)
  );
  // upgrade registry
  const registryImplementation = await registryProxyInstance.registryImplementation();
  if (getAddress(registryImplementation) != getAddress(registryV2.address)) {
    console.log("operator setting pending implementation...");
    const setPendingImplementationTx = await registryProxyInstance
      .connect(operatorSigner)
      .setPendingImplementation(registryV2.address);
    await setPendingImplementationTx.wait();
    console.log("governance upgrading Registry...");
    const becomeTx = await registryV2Instance.connect(governanceSigner).become(registryProxy.address);
    await becomeTx.wait();
  }

  registryV2Instance = <RegistryV2>await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryProxy.address);

  // approve tokens and map to tokens hash
  const onlySetTokensHash = [];
  const approveTokenAndMapHash = [];
  const tokenHashes: string[] = await registryV2Instance.getTokenHashes();
  const usdcApproved = await registryV2Instance.isApprovedToken(MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.address);

  if (usdcApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.hash)) {
    console.log("only set USDC hash");
    onlySetTokensHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.address],
    ]);
  }

  if (!usdcApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.hash)) {
    console.log("approve USDC and set hash");
    approveTokenAndMapHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].USDC.address],
    ]);
  }
  const wethApproved = await registryV2Instance.isApprovedToken(MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.address);

  if (wethApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.hash)) {
    console.log("only set WETH hash");
    onlySetTokensHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.address],
    ]);
  }

  if (!wethApproved && !tokenHashes.includes(MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.hash)) {
    console.log("approve WETH and set hash");
    approveTokenAndMapHash.push([
      MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.hash,
      [MULTI_CHAIN_VAULT_TOKENS[chainId].WETH.address],
    ]);
  }

  if (approveTokenAndMapHash.length > 0) {
    console.log("approve token and map hash");
    const approveTokenAndMapToTokensHashTx = await registryV2Instance
      .connect(operatorSigner)
      ["approveTokenAndMapToTokensHash((bytes32,address[])[])"](approveTokenAndMapHash);
    await approveTokenAndMapToTokensHashTx.wait();
  }

  if (onlySetTokensHash.length > 0) {
    console.log("operator mapping only tokenshash to tokens..", onlySetTokensHash);
    const onlyMapToTokensHashTx = await registryV2Instance
      .connect(operatorSigner)
      ["setTokensHashToTokens((bytes32,address[])[])"](onlySetTokensHash);
    await onlyMapToTokensHashTx.wait();
  }

  // add risk profile
  console.log("==Risk Profile config==");
  const growRiskProfilExists = (await registryV2Instance.getRiskProfile("1")).exists;
  if (!growRiskProfilExists) {
    console.log("risk operator adding grow risk profile...");
    const addRiskProfileTx = await registryV2Instance
      .connect(riskOperatorSigner)
      ["addRiskProfile(uint256,string,string,bool,(uint8,uint8))"]("1", "Growth", "grow", false, [0, 100]); // code,name,symbol,canBorrow,pool rating range
    await addRiskProfileTx.wait();
  } else {
    console.log("Already configured risk profile");
  }

  if (CONTRACTS_VERIFY === "true") {
    if (result.newlyDeployed) {
      if (networkName === "tenderly") {
        await hre.tenderly.verify({
          name: "RegistryV2",
          address: registryV2.address,
          constructorArguments: [],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/RegistryV2.sol:RegistryV2",
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await hre.run("verify:verify", {
          name: "RegistryProxy",
          address: registryV2.address,
          constructorArguments: [],
          contract: "contracts/protocol/earn-protocol-configuration/contracts/RegistryV2.sol:RegistryV2",
        });
      }
    }
  }
};
export default func;
func.tags = ["RegistryV2"];
