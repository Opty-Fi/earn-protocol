import { ethers } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({
  deployments,
  getNamedAccounts,
  getChainId,
  network,
  tenderly,
  run,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact("SushiswapAdapter");
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;

  const chainId = await getChainId();
  const networkName = network.name;

  const result = await deploy("SushiswapAdapter", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const sushiswapFarmAdapterEthereum = await deployments.get("SushiswapAdapter");
  const sushiswapFarmAdapterEthereumInstance = await ethers.getContractAt(
    artifact.abi,
    sushiswapFarmAdapterEthereum.address,
  );
  await sushiswapFarmAdapterEthereumInstance.setUnderlyingTokenToMasterChefToPid(
    "0xD75EA151a61d06868E31F8988D28DFE5E9df57B4",
    "0xc2EdaD668740f1aA35E4D8f227fB8E17dcA888Cd",
    "37",
  );
  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "SushiswapAdapter",
          address: sushiswapFarmAdapterEthereum.address,
          constructorArguments: [registryProxyAddress],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "SushiswapAdapter",
          address: sushiswapFarmAdapterEthereum.address,
          constructorArguments: [registryProxyAddress],
        });
      }
    }
  }
};
export default func;
func.tags = ["SushiswapAdapter"];
func.dependencies = ["RegistryProxy"];
