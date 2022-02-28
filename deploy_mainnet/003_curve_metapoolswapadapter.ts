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
  const artifact = await deployments.getArtifact("CurveMetaPoolSwapAdapter");
  const registryProxy = await deployments.get("RegistryProxy");
  const registryV2Instance = <RegistryV2>(
    await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryProxy.address)
  );
  const operatorAddress = await registryV2Instance.getOperator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const chainId = await getChainId();
  const networkName = hre.network.name;

  const result = await deploy("CurveMetaPoolSwapAdapter", {
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

  // approve liquidity pools and map to adapters
  const pools = [
    "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B", // swap pool for FRAX3CRV
  ];
  const curveMetaPoolSwapAdapter = await deployments.get("CurveMetaPoolSwapAdapter");
  const poolToAdapterArr: { pool: string; adapter: string }[] = []; // pools to adapter mapping JSON array
  pools.forEach(pool => {
    poolToAdapterArr.push({ pool, adapter: curveMetaPoolSwapAdapter.address });
  });
  const approveLiquidityPoolAndMapAdapterTx = await registryV2Instance
    .connect(operatorSigner)
    ["approveLiquidityPoolAndMapToAdapter(tuple[])"](poolToAdapterArr);
  await approveLiquidityPoolAndMapAdapterTx.wait();

  // rate liquidity pools
  const poolToRatingArr: { pool: string; rate: number }[] = []; // pools to rate JSON array
  pools.forEach(pool => {
    poolToRatingArr.push({ pool, rate: 80 });
  });
  const rateLiquidityPoolTx = await registryV2Instance
    .connect(operatorSigner)
    ["rateLiquidityPool(tuple[])"](poolToRatingArr);
  await rateLiquidityPoolTx.wait();

  if (typeof CONTRACTS_VERIFY == "boolean" && CONTRACTS_VERIFY) {
    if (result.newlyDeployed) {
      if (networkName === "tenderly") {
        await hre.tenderly.verify({
          name: "CurveMetaPoolSwapAdapter",
          address: curveMetaPoolSwapAdapter.address,
          constructorArguments: [registryProxy.address],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await hre.run("verify:verify", {
          name: "CurveMetaPoolSwapAdapter",
          address: curveMetaPoolSwapAdapter.address,
          constructorArguments: [registryProxy.address],
        });
      }
    }
  }
};
export default func;
func.tags = ["CurveMetaPoolSwapAdapter"];
