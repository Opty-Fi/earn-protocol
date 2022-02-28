import hre from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { waitforme } from "../helpers/utils";
import { RegistryV2 } from "../typechain";

const CONTRACTS_VERIFY = process.env.CONTRACTS_VERIFY;

const func: DeployFunction = async ({
  deployments,
  getNamedAccounts,
  getChainId,
  ethers,
}: HardhatRuntimeEnvironment) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const artifact = await deployments.getArtifact("CurveSwapPoolAdapter");
  const registryProxy = await deployments.get("RegistryProxy");
  const registryV2Instance = <RegistryV2>(
    await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryProxy.address)
  );
  const operatorAddress = await registryV2Instance.getOperator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const chainId = await getChainId();
  const networkName = hre.network.name;

  const result = await deploy("CurveSwapPoolAdapter", {
    from: deployer,
    contract: {
      abi: artifact.abi,
      bytecode: artifact.bytecode,
      deployedBytecode: artifact.deployedBytecode,
    },
    args: [registryProxy.address],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  // approve liquidity pools and map to adapter
  const pools = [
    "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7", // Pool for DAI/USDC/USDT
    "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022", // Curve ETH/stETH StableSwap
    "0x5a6A4D54456819380173272A5E8E9B9904BdF41B", // MIM Metapool
  ];
  const curveSwapPoolAdapter = await deployments.get("CurveSwapPoolAdapter");

  const poolToAdapterArr: { pool: string; adapter: string }[] = []; // pools to adapter mapping JSON array
  pools.forEach(pool => {
    poolToAdapterArr.push({ pool, adapter: curveSwapPoolAdapter.address });
  });
  const approveLiquidityPoolAndMapAdapterTx = await registryV2Instance
    .connect(operatorSigner)
    ["approveLiquidityPoolAndMapToAdapter(tuple[])"](poolToAdapterArr);
  await approveLiquidityPoolAndMapAdapterTx.wait();

  // rate liquidity pool
  const poolToRatingsArr: { pool: string; rate: number }[] = []; // pools to rating JSON array
  pools.forEach(pool => {
    poolToRatingsArr.push({ pool, rate: 80 });
  });
  const rateLiquidityPoolTx = await registryV2Instance
    .connect(operatorSigner)
    ["rateLiquidityPool(tuple[])"](poolToRatingsArr);
  await rateLiquidityPoolTx.wait();

  if (typeof CONTRACTS_VERIFY == "boolean" && CONTRACTS_VERIFY) {
    if (result.newlyDeployed) {
      if (networkName === "tenderly") {
        await hre.tenderly.verify({
          name: "CurveSwapPoolAdapter",
          address: curveSwapPoolAdapter.address,
          constructorArguments: [registryProxy.address],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await hre.run("verify:verify", {
          name: "CurveSwapPoolAdapter",
          address: curveSwapPoolAdapter.address,
          constructorArguments: [registryProxy.address],
        });
      }
    }
  }
};
export default func;
func.tags = ["CurveSwapPoolAdapter"];
