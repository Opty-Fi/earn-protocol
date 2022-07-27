import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import ethereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { OptyFiOracle, OptyFiOracle__factory } from "../typechain";
import { getAddress } from "ethers/lib/utils";
import { BigNumber } from "ethers";

const func: DeployFunction = async ({ deployments, ethers }: HardhatRuntimeEnvironment) => {
  const optyfiOracleAddress = await (await deployments.get("OptyFiOracle")).address;
  const optyfiOracleInstance = <OptyFiOracle>await ethers.getContractAt(OptyFiOracle__factory.abi, optyfiOracleAddress);

  const APE = "0x4d224452801ACEd8B2F0aebE155379bb5D594381";
  const USD = "0x0000000000000000000000000000000000000348";
  const MANA = "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942";
  const AAVE_WETH_FEED = "0x6Df09E975c830ECae5bd4eD9d90f3A95a4f88012";
  const AAVE_USD_FEED = "0x547a514d5e3769680Ce22B2361c10Ea13619e8a9";
  const WETH_USD_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
  const APE_WETH_FEED = "0xc7de7f4d4C9c991fF62a07D18b3E31e349833A18";
  const APE_USD_FEED = "0xD10aBbC76679a20055E167BB80A24ac851b37056";
  const USDT_WETH_FEED = "0xEe9F2375b4bdF6387aa8265dD4FB8F16512A1d46";
  const USDT_USD_FEED = "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D";
  const SUSHI_WETH_FEED = "0xe572CeF69f43c2E488b33924AF04BDacE19079cf";
  const SUSHI_USD_FEED = "0xCc70F09A6CC17553b2E31954cD36E4A2d89501f7";
  const MANA_WETH_FEED = "0x82A44D92D6c329826dc557c5E1Be6ebeC5D5FeB9";
  const MANA_USD_FEED = "0x56a4857acbcfe3a66965c251628B1c9f1c408C19";
  const LINK_WETH_FEED = "0xDC530D9457755926550b59e8ECcdaE7624181557";
  const LINK_USD_FEED = "0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c";

  const owner = await optyfiOracleInstance.owner();
  const feedToTokens = [
    {
      priceFeed: AAVE_WETH_FEED,
      tokenA: ethereumTokens.REWARD_TOKENS.AAVE,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
    },
    {
      priceFeed: AAVE_USD_FEED,
      tokenA: ethereumTokens.REWARD_TOKENS.AAVE,
      tokenB: USD,
    },
    {
      priceFeed: WETH_USD_FEED,
      tokenA: ethereumTokens.WRAPPED_TOKENS.WETH,
      tokenB: USD,
    },
    {
      priceFeed: APE_WETH_FEED,
      tokenA: APE,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
    },
    { priceFeed: APE_USD_FEED, tokenA: APE, tokenB: USD },
    {
      priceFeed: USDT_WETH_FEED,
      tokenA: ethereumTokens.PLAIN_TOKENS.USDT,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
    },
    {
      priceFeed: USDT_USD_FEED,
      tokenA: ethereumTokens.PLAIN_TOKENS.USDT,
      tokenB: USD,
    },
    {
      priceFeed: SUSHI_WETH_FEED,
      tokenA: ethereumTokens.REWARD_TOKENS.SUSHI,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
    },
    {
      priceFeed: SUSHI_USD_FEED,
      tokenA: ethereumTokens.REWARD_TOKENS.SUSHI,
      tokenB: USD,
    },
    {
      priceFeed: MANA_WETH_FEED,
      tokenA: MANA,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
    },
    {
      priceFeed: MANA_USD_FEED,
      tokenA: MANA,
      tokenB: USD,
    },
    {
      priceFeed: LINK_WETH_FEED,
      tokenA: ethereumTokens.PLAIN_TOKENS.LINK,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
    },
    {
      priceFeed: LINK_WETH_FEED,
      tokenA: ethereumTokens.PLAIN_TOKENS.LINK,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
    },
    {
      priceFeed: LINK_USD_FEED,
      tokenA: ethereumTokens.PLAIN_TOKENS.LINK,
      tokenB: USD,
    },
  ];
  const pendingFeedToTokens = [];
  for (const feedToToken of feedToTokens) {
    const actualPriceFeed = await optyfiOracleInstance.chainlinkPriceFeed(feedToToken.tokenA, feedToToken.tokenB);
    if (getAddress(actualPriceFeed) !== getAddress(feedToToken.priceFeed)) {
      pendingFeedToTokens.push(feedToToken);
    }
  }
  const ownerSigner = await ethers.getSigner(owner);
  if (pendingFeedToTokens.length > 0) {
    console.log(`Setting ${pendingFeedToTokens.length} price feeds`);
    console.log(JSON.stringify(pendingFeedToTokens, {}, 4));
    console.log("adding chainlink price oracle feed");
    const tx = await optyfiOracleInstance.connect(ownerSigner).setChainlinkPriceFeed(feedToTokens);
    await tx.wait(1);
  } else {
    console.log("price feed is upto date");
  }

  const chainlinkTimeallowances = [
    { tokenA: APE, tokenB: USD, timeAllowance: "43200" },
    { tokenA: ethereumTokens.PLAIN_TOKENS.USDT, tokenB: USD, timeAllowance: "43200" },
    { tokenA: APE, tokenB: ethereumTokens.PLAIN_TOKENS.USDT, timeAllowance: "43200" },
    { tokenA: ethereumTokens.PLAIN_TOKENS.USDT, tokenB: APE, timeAllowance: "43200" },
    { tokenA: MANA, tokenB: ethereumTokens.WRAPPED_TOKENS.WETH, timeAllowance: "43200" },
    { tokenA: ethereumTokens.WRAPPED_TOKENS.WETH, tokenB: MANA, timeAllowance: "43200" },
  ];

  const pendingChainlinkTimeallowances = [];

  for (const chainlinkTimeallowance of chainlinkTimeallowances) {
    const allowance = await optyfiOracleInstance.chainlinkTimeAllowance(
      chainlinkTimeallowance.tokenA,
      chainlinkTimeallowance.tokenB,
    );
    if (!BigNumber.from(allowance).eq(BigNumber.from(chainlinkTimeallowance.timeAllowance))) {
      pendingChainlinkTimeallowances.push(chainlinkTimeallowance);
    }
  }

  if (pendingChainlinkTimeallowances.length > 0) {
    console.log("setting pending Chainlink Time allowances ");
    const tx = await optyfiOracleInstance
      .connect(ownerSigner)
      .setChainlinkTimeAllowance(pendingChainlinkTimeallowances);
    await tx.wait(1);
  } else {
    console.log("Chainlink Time allowances is up to date");
  }
};

export default func;
func.tags = ["SetPriceFeedOracle"];
func.dependencies = ["OptyFiOracle"];
