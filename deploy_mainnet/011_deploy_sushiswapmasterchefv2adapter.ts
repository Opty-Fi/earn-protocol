import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import {
  Registry,
  Registry__factory,
  SushiswapMasterChefV2AdapterEthereum,
  SushiswapMasterChefV2AdapterEthereum__factory,
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
  const artifact = await deployments.getArtifact("SushiswapMasterChefV2AdapterEthereum");
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const optyfiOracleAddress = await (await deployments.get("OptyFiOracle")).address;

  const chainId = await getChainId();
  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("SushiswapMasterChefV2AdapterEthereum", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxyAddress, optyfiOracleAddress],
    log: true,
    skipIfAlreadyDeployed: true,
    maxPriorityFeePerGas: BigNumber.from(feeData["maxPriorityFeePerGas"]), // Recommended maxPriorityFeePerGas
    maxFeePerGas: BigNumber.from(feeData["maxFeePerGas"]),
  });

  const sushiswapFarmAdapterEthereum = await (await deployments.get("SushiswapMasterChefV2AdapterEthereum")).address;

  const sushiswapFarmAdapterEthereumInstance = <SushiswapMasterChefV2AdapterEthereum>(
    await ethers.getContractAt(SushiswapMasterChefV2AdapterEthereum__factory.abi, sushiswapFarmAdapterEthereum)
  );
  const registryProxyInstance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
  const operator = await registryProxyInstance.operator();
  const operatorSigner = await ethers.getSigner(operator);

  const CVX_WETH_LP = "0x05767d9EF41dC40689678fFca0608878fb3dE906";

  const underlyingTokenToPids = [{ underlyingToken: CVX_WETH_LP, pid: 1 }];

  const pendingUnderlyingTokenToPids = [];

  for (const underlyingTokenToPid of underlyingTokenToPids) {
    const _pid = await sushiswapFarmAdapterEthereumInstance.underlyingTokenToPid(underlyingTokenToPid.underlyingToken);
    if (!BigNumber.from(_pid).eq(underlyingTokenToPid.pid)) {
      pendingUnderlyingTokenToPids.push(underlyingTokenToPid);
    }
  }

  if (pendingUnderlyingTokenToPids.length > 0) {
    console.log("Pending underlying tokens to pids ", JSON.stringify(pendingUnderlyingTokenToPids, null, 4));
    const tx = await sushiswapFarmAdapterEthereumInstance
      .connect(operatorSigner)
      .setUnderlyingTokenToPid(pendingUnderlyingTokenToPids);
    await tx.wait(1);
  } else {
    console.log("underlying token to pids is up to date");
  }

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "SushiswapMasterChefV2AdapterEthereum",
          address: sushiswapFarmAdapterEthereum,
          constructorArguments: [registryProxyAddress, optyfiOracleAddress],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "SushiswapMasterChefV2AdapterEthereum",
          address: sushiswapFarmAdapterEthereum,
          constructorArguments: [registryProxyAddress, optyfiOracleAddress],
        });
      }
    }
  }
};
export default func;
func.tags = ["SushiswapMasterChefV2AdapterEthereum"];
func.dependencies = ["Registry"];
