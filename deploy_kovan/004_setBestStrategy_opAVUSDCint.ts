import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { MULTI_CHAIN_VAULT_TOKENS } from "../helpers/constants/tokens";
import { StrategiesByTokenByChain } from "../helpers/data/adapter-with-strategies";

const func: DeployFunction = async ({ ethers, deployments }: HardhatRuntimeEnvironment) => {
  const registryProxyAddress = "0xf710F75418353B36F2624784c290B80e7a5C892A";
  const registryV2Instance = await ethers.getContractAt(ESSENTIAL_CONTRACTS.REGISTRY, registryProxyAddress);
  const opAVUSDCintProxyAddress = "0x118194e96b2d4b08957ba9a05508fb6d14a37a0d";
  const strategyProviderAddress = await (await deployments.get("StrategyProvider")).address;
  const strategyProviderInstance = await ethers.getContractAt(
    ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER,
    strategyProviderAddress,
  );
  const opAVUSDCintInstance = await ethers.getContractAt("Vault", opAVUSDCintProxyAddress);
  const strategyOperatorSigner = await ethers.getSigner(await registryV2Instance.strategyOperator());

  console.log("Operator setting best strategy for opAVUSDCint...");
  console.log("\n");

  const currentBestStrategySteps = await strategyProviderInstance.getRpToTokenToBestStrategy(
    "2",
    MULTI_CHAIN_VAULT_TOKENS["kovan"].USDC.hash,
  );
  const currentBestStrategyHash = await opAVUSDCintInstance.computeInvestStrategyHash(currentBestStrategySteps);
  const expectedStrategySteps = StrategiesByTokenByChain["kovan"].USDC["usdc-DEPOSIT-AaveV1-aUSDC"].strategy;
  const expectedStrategyHash = await opAVUSDCintInstance.computeInvestStrategyHash(
    expectedStrategySteps.map(x => ({
      pool: x.contract,
      outputToken: x.outputToken,
      isBorrow: x.isBorrow,
    })),
  );

  if (currentBestStrategyHash !== expectedStrategyHash) {
    console.log("Strategy operator setting best strategy..");
    console.log("\n");
    await strategyProviderInstance.connect(strategyOperatorSigner).setBestStrategy(
      "2",
      MULTI_CHAIN_VAULT_TOKENS["kovan"].USDC.hash,
      expectedStrategySteps.map(x => ({
        pool: x.contract,
        outputToken: x.outputToken,
        isBorrow: x.isBorrow,
      })),
    );
  } else {
    console.log("best strategy is upto date.");
    console.log("\n");
  }
  console.log("Next Best Strategy ", await opAVUSDCintInstance.getNextBestInvestStrategy());
  console.log("\n");
};
export default func;
func.tags = ["KovanSetBestStrategyopAVUSDCint"];
func.dependencies = ["StrategyProvider"];
