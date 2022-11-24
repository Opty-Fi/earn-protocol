import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import polygonTokens from "@optyfi/defi-legos/polygon/tokens/index";
import { getAddress } from "ethers/lib/utils";
import { getNamedAccounts } from "hardhat";
import { OptyFiOracle, OptyFiOracle__factory } from "../typechain";
import { BigNumber } from "ethers";

const func: DeployFunction = async ({ deployments, ethers }: HardhatRuntimeEnvironment) => {
  const { deployer } = await getNamedAccounts();
  const optyfiOracleAddress = await (await deployments.get("OptyFiOracle")).address;
  const optyfiOracleInstance = <OptyFiOracle>await ethers.getContractAt(OptyFiOracle__factory.abi, optyfiOracleAddress);

  const USDC_USD_FEED = "0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7";
  const USDT_USD_FEED = "0x0A6513e40db6EB1b165753AD52E80663aeA50545";
  const DAI_USD_FEED = "0x4746DeC9e833A82EC7C2C1356372CcF2cfcD2F3D";
  const MAI_USD_FEED = "0xd8d483d813547CfB624b8Dc33a00F2fcbCd2D428";

  const owner = await optyfiOracleInstance.owner();
  const feedToTokens = [
    {
      tokenA: polygonTokens.USDC,
      tokenB: polygonTokens.USD,
      priceFeed: USDC_USD_FEED,
    },
    {
      tokenA: polygonTokens.USDT,
      tokenB: polygonTokens.USD,
      priceFeed: USDT_USD_FEED,
    },
    {
      tokenA: polygonTokens.DAI,
      tokenB: polygonTokens.USD,
      priceFeed: DAI_USD_FEED,
    },
    {
      tokenA: polygonTokens.MIMATIC,
      tokenB: polygonTokens.USD,
      priceFeed: MAI_USD_FEED,
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
    { tokenA: polygonTokens.USDC, tokenB: polygonTokens.MIMATIC, timeAllowance: "55000" },
    { tokenA: polygonTokens.MIMATIC, tokenB: polygonTokens.USDC, timeAllowance: "55000" },
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
func.tags = ["PolygonSetPriceFeedOracle"];
func.dependencies = ["OptyFiOracle"];
