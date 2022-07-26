import { BigNumber } from "ethers";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { waitforme } from "../helpers/utils";
import {
  Registry,
  Registry__factory,
  SushiswapPoolAdapterEthereum,
  SushiswapPoolAdapterEthereum__factory,
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
  const artifact = await deployments.getArtifact("SushiswapPoolAdapterEthereum");
  const registryProxyAddress = await (await deployments.get("RegistryProxy")).address;
  const optyfiOracleAddress = await (await deployments.get("OptyFiOracle")).address;

  const chainId = await getChainId();
  const networkName = network.name;
  const feeData = await ethers.provider.getFeeData();
  const result = await deploy("SushiswapPoolAdapterEthereum", {
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

  if (CONTRACTS_VERIFY == "true") {
    if (result.newlyDeployed) {
      const sushiswapPoolAdapterEthereum = await deployments.get("SushiswapPoolAdapterEthereum");
      if (networkName === "tenderly") {
        await tenderly.verify({
          name: "SushiswapPoolAdapterEthereum",
          address: sushiswapPoolAdapterEthereum.address,
          constructorArguments: [registryProxyAddress, optyfiOracleAddress],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await run("verify:verify", {
          name: "SushiswapPoolAdapterEthereum",
          address: sushiswapPoolAdapterEthereum.address,
          constructorArguments: [registryProxyAddress, optyfiOracleAddress],
        });
      }
    }
  }
  const sushiswapPoolAdapterEthereumAddress = await (await deployments.get("SushiswapPoolAdapterEthereum")).address;
  const sushiswapPoolAdapterEthereumInstance = <SushiswapPoolAdapterEthereum>(
    await ethers.getContractAt(SushiswapPoolAdapterEthereum__factory.abi, sushiswapPoolAdapterEthereumAddress)
  );
  const registryProxyInstance = <Registry>await ethers.getContractAt(Registry__factory.abi, registryProxyAddress);
  const riskOperator = await registryProxyInstance.riskOperator();
  const riskOperatorSigner = await ethers.getSigner(riskOperator);
  const tx = await sushiswapPoolAdapterEthereumInstance.connect(riskOperatorSigner).setLiquidityPoolToTolerance([
    { liquidityPool: "0xD75EA151a61d06868E31F8988D28DFE5E9df57B4", tolerance: "150" },
    { liquidityPool: "0xB27C7b131Cf4915BeC6c4Bc1ce2F33f9EE434b9f", tolerance: "150" },
    { liquidityPool: "0x795065dCc9f64b5614C407a6EFDC400DA6221FB0", tolerance: "150" },
    { liquidityPool: "0x1bEC4db6c3Bc499F3DbF289F5499C30d541FEc97", tolerance: "150" },
  ]);
  await tx.wait(1);
};
export default func;
func.tags = ["SushiswapPoolAdapterEthereum"];
func.dependencies = ["Registry", "OptyFiOracle"];
