import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ESSENTIAL_CONTRACTS } from "../helpers/constants/essential-contracts-name";
import { StrategyProviderV2 } from "../typechain";
import { generateTokenHashV2 } from "../helpers/helpers";
import AAVE_TOKENS from "../helpers/data/kovan_aave_tokens.json";
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments } = hre;

  const strategyProviderContract = <StrategyProviderV2>(
    await hre.ethers.getContractAt(
      ESSENTIAL_CONTRACTS.STRATEGY_PROVIDER,
      (
        await deployments.get("StrategyProviderV2")
      ).address,
    )
  );

  const AAVE_V2_STRATEGY = [
    {
      pool: "0x1E40B561EC587036f9789aF83236f057D1ed2A90",
      outputToken: "0xe12AFeC5aa12Cf614678f9bFeeB98cA9Bb95b5B0",
      isBorrow: true,
    },
  ];
  await strategyProviderContract.setBestDefaultStrategy(
    2,
    generateTokenHashV2([AAVE_TOKENS.USDC], (await hre.getChainId()).toString()),
    AAVE_V2_STRATEGY,
  );

  await strategyProviderContract.setBestStrategy(
    2,
    generateTokenHashV2([AAVE_TOKENS.USDC], (await hre.getChainId()).toString()),
    AAVE_V2_STRATEGY,
  );
};

export default func;
func.tags = ["Set_Strategy"];
