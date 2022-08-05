import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import {
  Registry,
  Registry__factory,
  SushiswapMasterChefV1Adapter,
  SushiswapMasterChefV1Adapter__factory,
} from "../typechain";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({
  deployments,
  getNamedAccounts,
  getChainId,
  network,
  tenderly,
  run,
  ethers,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact("SushiswapMasterChefV1Adapter");
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;

  const chainId = await getChainId();
  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("SushiswapMasterChefV1Adapter", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  const sushiswapFarmAdapterEthereum = await (await deployments.get("SushiswapMasterChefV1Adapter")).address;

  const sushiswapFarmAdapterEthereumInstance = <SushiswapMasterChefV1Adapter>(
    await ethers.getContractAt(SushiswapMasterChefV1Adapter__factory.abi, sushiswapFarmAdapterEthereum)
  );
  const registryProxyInstance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
  const operator = await registryProxyInstance.operator();
  const operatorSigner = await ethers.getSigner(operator);

  const CRV_WETH_LP = "0x58Dc5a51fE44589BEb22E8CE67720B5BC5378009";
  const YFI_WETH_LP = "0x088ee5007C98a9677165D78dD2109AE4a3D04d0C";
  const SNX_WETH_LP = "0xA1d7b2d891e3A1f9ef4bBC5be20630C2FEB1c470";

  const underlyingTokenToPids = [
    { underlyingToken: CRV_WETH_LP, pid: 17 },
    { underlyingToken: YFI_WETH_LP, pid: 11 },
    { underlyingToken: SNX_WETH_LP, pid: 6 },
  ];

  const pendingUnderlyingTokens = [];
  const pendingPids = [];

  for (const underlyingTokenToPid of underlyingTokenToPids) {
    const _pid = await sushiswapFarmAdapterEthereumInstance.underlyingTokenToPid(underlyingTokenToPid.underlyingToken);
    if (!BigNumber.from(_pid).eq(underlyingTokenToPid.pid)) {
      pendingUnderlyingTokens.push(underlyingTokenToPid.underlyingToken);
      pendingPids.push(underlyingTokenToPid.pid);
    }
  }

  if (pendingUnderlyingTokens.length > 0) {
    console.log("Pending underlying token to pids ", JSON.stringify(pendingUnderlyingTokens, null, 4));
    console.log("Pending underlying token to pids ", JSON.stringify(pendingPids, null, 4));
    const tx = await sushiswapFarmAdapterEthereumInstance
      .connect(operatorSigner)
      .setUnderlyingTokenToPid(pendingUnderlyingTokens, pendingPids);
    await tx.wait(1);
  } else {
    console.log("underlying token to pids is up to date");
  }

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "SushiswapMasterChefV1Adapter",
          address: sushiswapFarmAdapterEthereum,
          constructorArguments: [registryProxyAddress],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "SushiswapMasterChefV1Adapter",
          address: sushiswapFarmAdapterEthereum,
          constructorArguments: [registryProxyAddress],
        });
      }
    }
  }
};
export default func;
func.tags = ["SushiswapMasterChefV1Adapter"];
func.dependencies = ["Registry"];
