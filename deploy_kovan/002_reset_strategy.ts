import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import KOVAN from "../_deployments/kovan.json";
import { StrategyProvider } from "../typechain";
import { generateTokenHash } from "../helpers/helpers";
import AAVE_TOKENS from "../helpers/data/kovan_aave_tokens.json";
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const strategyProviderContract = <StrategyProvider>(
    await hre.ethers.getContractAt(ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER, KOVAN.StrategyProvider)
  );

  await strategyProviderContract.setBestDefaultStrategy(
    2,
    generateTokenHash([AAVE_TOKENS.USDC]),
    hre.ethers.constants.HashZero,
  );

  await strategyProviderContract.setBestStrategy(
    2,
    generateTokenHash([AAVE_TOKENS.USDC]),
    hre.ethers.constants.HashZero,
  );
};

export default func;
func.tags = ["StrategyProviderV2"];
