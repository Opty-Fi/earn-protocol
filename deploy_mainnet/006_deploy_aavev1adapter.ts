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
  const artifact = await deployments.getArtifact("AaveV1Adapter");
  const registryProxy = await deployments.get("RegistryProxy");
  const registryV2Instance = <RegistryV2>(
    await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY_V2, registryProxy.address)
  );
  const operatorAddress = await registryV2Instance.getOperator();
  const operatorSigner = await ethers.getSigner(operatorAddress);
  const chainId = await getChainId();
  const networkName = hre.network.name;

  const result = await deploy("AaveV1Adapter", {
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

  const pools = [
    "0x24a42fD28C976A61Df5D00D0599C34c4f90748c8", // lending pool address provider
  ];

  const aaveV1Adapter = await deployments.get("AaveV1Adapter");
  const poolToAdapterArr: { pool: string; adapter: string }[] = []; // pools to adapter mapping JSON array
  pools.forEach(pool => {
    poolToAdapterArr.push({ pool, adapter: aaveV1Adapter.address });
  });
  const approveLiquidityPoolAndMapAdapterTx = await registryV2Instance
    .connect(operatorSigner)
    ["approveLiquidityPoolAndMapToAdapter(tuple[])"](poolToAdapterArr);
  await approveLiquidityPoolAndMapAdapterTx.wait();

  // rate liquidity pools
  const poolToRatingArr: { pool: string; rate: number }[] = []; // pools to rate JSON array
  pools.forEach(pool => {
    poolToRatingArr.push({ pool, rate: 90 });
  });
  const rateLiquidityPoolTx = await registryV2Instance
    .connect(operatorSigner)
    ["rateLiquidityPool(tuple[])"](poolToRatingArr);
  await rateLiquidityPoolTx.wait();
  if (typeof CONTRACTS_VERIFY == "boolean" && CONTRACTS_VERIFY) {
    if (result.newlyDeployed) {
      if (networkName === "tenderly") {
        await hre.tenderly.verify({
          name: "AaveV1Adapter",
          address: aaveV1Adapter.address,
          constructorArguments: [registryProxy.address],
        });
      } else if (!["31337"].includes(chainId)) {
        await waitforme(20000);

        await hre.run("verify:verify", {
          name: "AaveV1Adapter",
          address: aaveV1Adapter.address,
          constructorArguments: [registryProxy.address],
        });
      }
    }
  }
};
export default func;
func.tags = ["AaveV1Adapter"];
