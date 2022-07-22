import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import ethereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { OptyFiOracle, OptyFiOracle__factory } from "../typechain";

const func: DeployFunction = async ({ deployments, ethers }: HardhatRuntimeEnvironment) => {
  const optyfiOracleAddress = await (await deployments.get("OptyFiOracle")).address;
  const optyfiOracleInstance = <OptyFiOracle>await ethers.getContractAt(OptyFiOracle__factory.abi, optyfiOracleAddress);

  const APE = "0x4d224452801ACEd8B2F0aebE155379bb5D594381";
  const USD = "0x0000000000000000000000000000000000000348";
  const MANA = "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942";
  ethereumTokens.PLAIN_TOKENS.USDC;
  ethereumTokens.PLAIN_TOKENS.USDT;
  const owner = await optyfiOracleInstance.owner();
  const feedToTokens = [
    {
      priceFeed: "0x6Df09E975c830ECae5bd4eD9d90f3A95a4f88012",
      tokenA: ethereumTokens.REWARD_TOKENS.AAVE,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
    },
    {
      priceFeed: "0xc7de7f4d4C9c991fF62a07D18b3E31e349833A18",
      tokenA: APE,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
    },
    { priceFeed: "0xD10aBbC76679a20055E167BB80A24ac851b37056", tokenA: APE, tokenB: USD },
    {
      priceFeed: "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46",
      tokenA: ethereumTokens.PLAIN_TOKENS.USDT,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
    },
    {
      priceFeed: "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
      tokenA: ethereumTokens.PLAIN_TOKENS.USDT,
      tokenB: USD,
    },
    {
      priceFeed: "0xe572CeF69f43c2E488b33924AF04BDacE19079cf",
      tokenA: ethereumTokens.REWARD_TOKENS.SUSHI,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
    },
    {
      priceFeed: "0xCc70F09A6CC17553b2E31954cD36E4A2d89501f7",
      tokenA: ethereumTokens.REWARD_TOKENS.SUSHI,
      tokenB: USD,
    },
    {
      priceFeed: "0x82A44D92D6c329826dc557c5E1Be6ebeC5D5FeB9",
      tokenA: MANA,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
    },
    {
      priceFeed: "0x56a4857acbcfe3a66965c251628B1c9f1c408C19",
      tokenA: MANA,
      tokenB: USD,
    },
  ];
  const ownerSigner = await ethers.getSigner(owner);
  console.log("adding chainlink price oracle feed");
  const tx = await optyfiOracleInstance.connect(ownerSigner).setChainlinkPriceFeed(feedToTokens);
  await tx.wait(1);
};

export default func;
func.tags = ["SetPriceFeedOracle"];
func.dependencies = ["OptyFiOracle"];
