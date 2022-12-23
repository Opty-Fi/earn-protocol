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

  const USDC_WETH_FEED = "0x986b5E1e1755e3C2440e960477f25201B0a8bbD4";
  const WBTC_WETH_FEED = "0xdeb288F737066589598e9214E782fa5A8eD689e8";
  const WETH_WBTC_FEED = "0xAc559F25B1619171CbC396a50854A3240b6A4e99";

  const owner = await optyfiOracleInstance.owner();
  const feedToTokens = [
    {
      tokenA: ethereumTokens.PLAIN_TOKENS.USDC,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
      priceFeed: USDC_WETH_FEED,
    },
    {
      tokenA: ethereumTokens.BTC_TOKENS.WBTC,
      tokenB: ethereumTokens.WRAPPED_TOKENS.WETH,
      priceFeed: WBTC_WETH_FEED,
    },
    {
      tokenA: ethereumTokens.WRAPPED_TOKENS.WETH,
      tokenB: ethereumTokens.BTC_TOKENS.WBTC,
      priceFeed: WETH_WBTC_FEED,
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
    { tokenA: ethereumTokens.PLAIN_TOKENS.USDC, tokenB: ethereumTokens.WRAPPED_TOKENS.WETH, timeAllowance: "86400" },
    { tokenA: ethereumTokens.BTC_TOKENS.WBTC, tokenB: ethereumTokens.WRAPPED_TOKENS.WETH, timeAllowance: "86400" },
    { tokenA: ethereumTokens.WRAPPED_TOKENS.WETH, tokenB: ethereumTokens.BTC_TOKENS.WBTC, timeAllowance: "86400" },
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
