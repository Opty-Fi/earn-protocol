import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import ethereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";
import { getAddress } from "ethers/lib/utils";
import { BigNumber } from "ethers";
import { getNamedAccounts } from "hardhat";
import { OptyFiOracle, OptyFiOracle__factory } from "../typechain";

const func: DeployFunction = async ({ deployments, ethers }: HardhatRuntimeEnvironment) => {
  const { deployer } = await getNamedAccounts();
  const optyfiOracleAddress = await (await deployments.get("OptyFiOracle")).address;
  const optyfiOracleInstance = <OptyFiOracle>await ethers.getContractAt(OptyFiOracle__factory.abi, optyfiOracleAddress);

  const APE = "0x4d224452801ACEd8B2F0aebE155379bb5D594381";
  const USD = "0x0000000000000000000000000000000000000348";
  const MANA = "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942";
  const ENS = "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72";
  const IMX = "0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF";
  const LDO = "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32";
  const ALCX = "0xdBdb4d16EdA451D0503b854CF79D55697F90c8DF";
  const YFI = "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e";
  const CVX = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";
  const WBTC = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599";
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
  const ENS_USD_FEED = "0x5C00128d4d1c2F4f652C267d7bcdD7aC99C16E16";
  const COMP_WETH_FEED = "0x1B39Ee86Ec5979ba5C322b826B3ECb8C79991699";
  const COMP_USD_FEED = "0xdbd020CAeF83eFd542f4De03e3cF0C28A4428bd5";
  const IMX_USD_FEED = "0xBAEbEFc1D023c0feCcc047Bff42E75F15Ff213E6";
  const LDO_WETH_FEED = "0x4e844125952D32AcdF339BE976c98E22F6F318dB";
  const ALCX_WETH_FEED = "0x194a9AaF2e0b67c35915cD01101585A33Fe25CAa";
  const ALCX_USD_FEED = "0xc355e4C0B3ff4Ed0B49EaACD55FE29B311f42976";
  const YFI_WETH_FEED = "0x7c5d4F8345e66f68099581Db340cd65B078C41f4";
  const YFI_USD_FEED = "0xA027702dbb89fbd58938e4324ac03B58d812b0E1";
  const CRV_ETH_FEED = "0x8a12Be339B0cD1829b91Adc01977caa5E9ac121e";
  const CRV_USD_FEED = "0xCd627aA160A6fA45Eb793D19Ef54f5062F20f33f";
  const CVX_ETH_FEED = "0xC9CbF687f43176B302F03f5e58470b77D07c61c6";
  const CVX_USD_FEED = "0xd962fC30A72A84cE50161031391756Bf2876Af5D";
  const USDC_WETH_FEED = "0x986b5E1e1755e3C2440e960477f25201B0a8bbD4";
  const USDC_USD_FEED = "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6";
  const WBTC_WETH_FEED = "0xdeb288F737066589598e9214E782fa5A8eD689e8";
  const WETH_WBTC_FEED = "0xAc559F25B1619171CbC396a50854A3240b6A4e99";
  const WBTC_USD_FEED = "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c";

  const owner = await optyfiOracleInstance.owner();
  const feedToTokens = [
    {
      tokenA: ethereumTokens.REWARD_TOKENS.AAVE,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
      priceFeed: AAVE_WETH_FEED,
    },
    {
      tokenA: ethereumTokens.REWARD_TOKENS.AAVE,
      tokenB: USD,
      priceFeed: AAVE_USD_FEED,
    },
    {
      tokenA: ethereumTokens.WRAPPED_TOKENS.WETH,
      tokenB: USD,
      priceFeed: WETH_USD_FEED,
    },
    {
      tokenA: APE,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
      priceFeed: APE_WETH_FEED,
    },
    { tokenA: APE, tokenB: USD, priceFeed: APE_USD_FEED },
    {
      tokenA: ethereumTokens.PLAIN_TOKENS.USDT,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
      priceFeed: USDT_WETH_FEED,
    },
    {
      tokenA: ethereumTokens.PLAIN_TOKENS.USDT,
      tokenB: USD,
      priceFeed: USDT_USD_FEED,
    },
    {
      tokenA: ethereumTokens.REWARD_TOKENS.SUSHI,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
      priceFeed: SUSHI_WETH_FEED,
    },
    {
      tokenA: ethereumTokens.REWARD_TOKENS.SUSHI,
      tokenB: USD,
      priceFeed: SUSHI_USD_FEED,
    },
    {
      tokenA: MANA,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
      priceFeed: MANA_WETH_FEED,
    },
    {
      tokenA: MANA,
      tokenB: USD,
      priceFeed: MANA_USD_FEED,
    },
    {
      tokenA: ethereumTokens.PLAIN_TOKENS.LINK,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
      priceFeed: LINK_WETH_FEED,
    },
    {
      tokenA: ethereumTokens.PLAIN_TOKENS.LINK,
      tokenB: USD,
      priceFeed: LINK_USD_FEED,
    },
    {
      tokenA: ENS,
      tokenB: USD,
      priceFeed: ENS_USD_FEED,
    },
    {
      tokenA: ethereumTokens.REWARD_TOKENS.COMP,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
      priceFeed: COMP_WETH_FEED,
    },
    {
      tokenA: ethereumTokens.REWARD_TOKENS.COMP,
      tokenB: USD,
      priceFeed: COMP_USD_FEED,
    },
    {
      tokenA: IMX,
      tokenB: USD,
      priceFeed: IMX_USD_FEED,
    },
    {
      tokenA: LDO,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
      priceFeed: LDO_WETH_FEED,
    },
    {
      tokenA: ALCX,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
      priceFeed: ALCX_WETH_FEED,
    },
    {
      tokenA: ALCX,
      tokenB: USD,
      priceFeed: ALCX_USD_FEED,
    },
    {
      tokenA: YFI,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
      priceFeed: YFI_WETH_FEED,
    },
    {
      tokenA: YFI,
      tokenB: USD,
      priceFeed: YFI_USD_FEED,
    },
    {
      tokenA: ethereumTokens.REWARD_TOKENS.CRV,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
      priceFeed: CRV_ETH_FEED,
    },
    {
      tokenA: ethereumTokens.REWARD_TOKENS.CRV,
      tokenB: USD,
      priceFeed: CRV_USD_FEED,
    },
    {
      tokenA: CVX,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
      priceFeed: CVX_ETH_FEED,
    },
    {
      tokenA: CVX,
      tokenB: USD,
      priceFeed: CVX_USD_FEED,
    },
    {
      tokenA: ethereumTokens.PLAIN_TOKENS.USDC,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
      priceFeed: USDC_WETH_FEED,
    },
    {
      tokenA: ethereumTokens.PLAIN_TOKENS.USDC,
      tokenB: USD,
      priceFeed: USDC_USD_FEED,
    },
    {
      tokenA: WBTC,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
      priceFeed: WBTC_WETH_FEED,
    },
    {
      tokenA: ethereumTokens.WRAPPED_TOKENS.WETH,
      tokenB: WBTC,
      priceFeed: WETH_WBTC_FEED,
    },
    {
      tokenA: WBTC,
      tokenB: USD,
      priceFeed: WBTC_USD_FEED,
    },
  ];
  const pendingFeedToTokens = [];
  for (const feedToToken of feedToTokens) {
    const actualPriceFeed = await optyfiOracleInstance.chainlinkPriceFeed(
      getAddress(feedToToken.tokenA),
      getAddress(feedToToken.tokenB),
    );
    if (getAddress(actualPriceFeed) !== getAddress(feedToToken.priceFeed)) {
      console.log("feedToToken.tokenA ", feedToToken.tokenA);
      console.log("feedToToken.tokenB ", feedToToken.tokenB);
      console.log("actualPriceFeed ", actualPriceFeed);
      console.log("feedToToken.priceFeed ", feedToToken.priceFeed);
      pendingFeedToTokens.push(feedToToken);
    }
  }
  const ownerSigner = await ethers.getSigner(owner);
  if (pendingFeedToTokens.length > 0) {
    console.log(`Setting ${pendingFeedToTokens.length} price feeds`);
    console.log(JSON.stringify(pendingFeedToTokens, null, 4));
    if (getAddress(ownerSigner.address) === getAddress(deployer)) {
      console.log("adding chainlink price oracle feed");
      const tx = await optyfiOracleInstance.connect(ownerSigner).setChainlinkPriceFeed(feedToTokens);
      await tx.wait(1);
    } else {
      console.log("cannot set chainlink price oracle feed because signer is not owner");
    }
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
    { tokenA: ENS, tokenB: USD, timeAllowance: "43200" },
    { tokenA: ethereumTokens.WRAPPED_TOKENS.WETH, tokenB: ENS, timeAllowance: "43200" },
    { tokenA: ENS, tokenB: ethereumTokens.WRAPPED_TOKENS.WETH, timeAllowance: "43200" },
    { tokenA: IMX, tokenB: ethereumTokens.WRAPPED_TOKENS.WETH, timeAllowance: "43200" },
    { tokenA: ethereumTokens.WRAPPED_TOKENS.WETH, tokenB: IMX, timeAllowance: "43200" },
    { tokenA: IMX, tokenB: USD, timeAllowance: "43200" },
    { tokenA: LDO, tokenB: ethereumTokens.WRAPPED_TOKENS.WETH, timeAllowance: "24000" },
    { tokenA: ethereumTokens.WRAPPED_TOKENS.WETH, tokenB: LDO, timeAllowance: "24000" },
    { tokenA: LDO, tokenB: USD, timeAllowance: "24000" },
    { tokenA: ALCX, tokenB: ethereumTokens.WRAPPED_TOKENS.WETH, timeAllowance: "47000" },
    { tokenA: ethereumTokens.WRAPPED_TOKENS.WETH, tokenB: ALCX, timeAllowance: "47000" },
    { tokenA: ALCX, tokenB: USD, timeAllowance: "47000" },
    { tokenA: ethereumTokens.REWARD_TOKENS.CRV, tokenB: ethereumTokens.WRAPPED_TOKENS.WETH, timeAllowance: "24000" },
    { tokenA: ethereumTokens.WRAPPED_TOKENS.WETH, tokenB: ethereumTokens.REWARD_TOKENS.CRV, timeAllowance: "24000" },
    { tokenA: ethereumTokens.REWARD_TOKENS.CRV, tokenB: USD, timeAllowance: "24000" },
    { tokenA: CVX, tokenB: ethereumTokens.WRAPPED_TOKENS.WETH, timeAllowance: "48000" },
    { tokenA: ethereumTokens.WRAPPED_TOKENS.WETH, tokenB: CVX, timeAllowance: "48000" },
    { tokenA: CVX, tokenB: USD, timeAllowance: "48000" },
    { tokenA: ethereumTokens.PLAIN_TOKENS.USDC, tokenB: ethereumTokens.WRAPPED_TOKENS.WETH, timeAllowance: "86400" },
    { tokenA: ethereumTokens.WRAPPED_TOKENS.WETH, tokenB: ethereumTokens.PLAIN_TOKENS.USDC, timeAllowance: "86400" },
    { tokenA: ethereumTokens.PLAIN_TOKENS.USDC, tokenB: USD, timeAllowance: "48000" },
    { tokenA: ethereumTokens.WRAPPED_TOKENS.WETH, tokenB: USD, timeAllowance: "48000" },
    { tokenA: WBTC, tokenB: ethereumTokens.WRAPPED_TOKENS.WETH, timeAllowance: "48000" },
    { tokenA: ethereumTokens.WRAPPED_TOKENS.WETH, tokenB: WBTC, timeAllowance: "48000" },
    { tokenA: WBTC, tokenB: USD, timeAllowance: "48000" },
    { tokenA: ethereumTokens.PLAIN_TOKENS.LINK, tokenB: ethereumTokens.WRAPPED_TOKENS.WETH, timeAllowance: "6000" },
    { tokenA: ethereumTokens.WRAPPED_TOKENS.WETH, tokenB: ethereumTokens.PLAIN_TOKENS.LINK, timeAllowance: "6000" },
    { tokenA: ethereumTokens.PLAIN_TOKENS.LINK, tokenB: USD, timeAllowance: "6000" },
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
    console.log(JSON.stringify(pendingChainlinkTimeallowances, null, 4));
    if (getAddress(ownerSigner.address) === getAddress(deployer)) {
      const tx = await optyfiOracleInstance
        .connect(ownerSigner)
        .setChainlinkTimeAllowance(pendingChainlinkTimeallowances);
      await tx.wait(1);
    } else {
      console.log("cannot set pending chainlink time allowances because signer is not owner");
    }
  } else {
    console.log("Chainlink Time allowances is up to date");
  }
};

export default func;
func.tags = ["SetPriceFeedOracle"];
func.dependencies = ["OptyFiOracle"];
