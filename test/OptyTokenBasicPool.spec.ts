import chai, { assert, expect } from 'chai'
import { Contract, ethers, utils } from 'ethers'
import { solidity, deployContract } from 'ethereum-waffle'

import { expandTo18Decimals, fundWallet } from './shared/utilities'
import OptyTokenBasicPool from "../build/OptyTokenBasicPool.json";
import OptyRegistry from "../build/OptyRegistry.json";
import RiskManager from "../build/OptyRiskManager.json";
import OptyStrategy from "../build/OptyStrategy.json";
import tokenAddresses from "./shared/TokenAddresses.json";
import addressAbis from "./shared/AddressAbis.json";
const envConfig = require("dotenv").config(); //  library to import the local ENV variables defined
//  Note: Don't remove line-6, because this line helps to get rid of error: NOT ABLE TO READ LOCAL ENV VARIABLES defined in .env file

chai.use(solidity)

const TEST_AMOUNT_NUM: number = 10;
const TEST_AMOUNT = expandTo18Decimals(TEST_AMOUNT_NUM)
const Ganache = require("ganache-core")

const MAINNET_NODE_URL = process.env.MAINNET_NODE_URL;
console.log("Mainnet: ", MAINNET_NODE_URL)
const PRIV_KEY = <string>process.env.MY_PRIV_KEY;

async function startChain() {
  const ganache = await Ganache.provider({
    fork: MAINNET_NODE_URL,
    network_id: 1,
    mnemonic: `${process.env.MY_METAMASK_MNEMONIC}`,
  });
  const provider = new ethers.providers.Web3Provider(ganache);
  const wallet = ethers.Wallet.fromMnemonic(`${process.env.MY_METAMASK_MNEMONIC}`).connect(provider);

  return wallet;
}

describe('OptyTokenBasicPool for DAI', async () => {
  let wallet: ethers.Wallet;
  let optyTokenBasicPool: Contract
  let optyRegistry: Contract
  let riskManager: Contract
  let optyStrategy: Contract
  let profile = "basic";
  let underlyingToken = tokenAddresses.dai;
  let tokenContractInstance: Contract;
  let userTokenBalanceWei
  let userInitialTokenBalance: number
  let contractTokenBalanceWei
  let contractTokenBalance: number
  let userOptyTokenBalanceWei
  let userOptyTokenBalance: number

  // util function
  const fromWei = (x: string) => ethers.utils.formatUnits(x, 18)

  before(async () => {
    wallet = await startChain();

    console.log("\n------ Deploying Contract ---------\n")
    
    optyRegistry = await deployContract(wallet, OptyRegistry);
    assert.isDefined(optyRegistry, "OptyRegistry contract not deployed");
    
    riskManager = await deployContract(wallet, RiskManager, [optyRegistry.address]);
    assert.isDefined(riskManager, "RiskManager contract not deployed");
    
    optyStrategy = await deployContract(wallet, OptyStrategy, [optyRegistry.address]);
    assert.isDefined(optyStrategy, "OptyStrategy contract not deployed");

    optyTokenBasicPool = await deployContract(wallet, OptyTokenBasicPool, [profile, riskManager.address, underlyingToken, optyStrategy.address]);
    assert.isDefined(optyTokenBasicPool, "OptyTokenBasicPool contract not deployed");

    // Instantiate token contract
    tokenContractInstance = new ethers.Contract(
      underlyingToken,
      addressAbis.erc20.abi,
      wallet,
    )

    //  Fund the user's wallet with some amount of tokens
    await fundWallet(underlyingToken, wallet, TEST_AMOUNT.toString());
    // Check Token and opToken balance of User's wallet and OptyTokenBaiscPool Contract
    userTokenBalanceWei = await tokenContractInstance.balanceOf(wallet.address)
    userInitialTokenBalance = parseFloat(fromWei(userTokenBalanceWei))
    // console.log(userTokenBalanceWei.toString());
    expect(userInitialTokenBalance).to.equal(TEST_AMOUNT_NUM);
    
    contractTokenBalanceWei = await tokenContractInstance.balanceOf(optyTokenBasicPool.address)
    contractTokenBalance = parseFloat(fromWei(contractTokenBalanceWei))
    expect(contractTokenBalance).to.equal(0);

    userOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(wallet.address)
    userOptyTokenBalance = parseFloat(fromWei(userOptyTokenBalanceWei));
    expect(userOptyTokenBalance).to.equal(0);
  })

  it('Contract deployed', async () => {
    assert.isOk(optyTokenBasicPool.address, "Contract is not deployed")
    console.log("\nDeployed OptyTokenBasicPool Contract address: ", optyTokenBasicPool.address)
    console.log("\nUser's Wallet address: ", wallet.address);
  })

  it ('DAI userDepost()', async () => {

    await tokenContractInstance.approve(optyTokenBasicPool.address, TEST_AMOUNT);
    expect(await tokenContractInstance.allowance(wallet.address, optyTokenBasicPool.address)).to.equal(TEST_AMOUNT);
    const userDepositOutput = await optyTokenBasicPool.userDeposit(TEST_AMOUNT);
    assert.isOk(userDepositOutput, "UserDeposit() call failed");

    // Check Token and opToken balance after userDeposit() call
    userTokenBalanceWei = await tokenContractInstance.balanceOf(wallet.address)
    const  userNewTokenBalance = parseFloat(fromWei(userTokenBalanceWei))
    expect(userNewTokenBalance).to.equal(userInitialTokenBalance - TEST_AMOUNT_NUM);

    contractTokenBalanceWei = await tokenContractInstance.balanceOf(optyTokenBasicPool.address);
    contractTokenBalance = parseFloat(fromWei(contractTokenBalanceWei));
    expect(contractTokenBalance).to.equal(TEST_AMOUNT_NUM);

    userOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(wallet.address)
    userOptyTokenBalance = parseFloat(fromWei(userOptyTokenBalanceWei));
    expect(userOptyTokenBalance).to.equal(TEST_AMOUNT_NUM);

  })

})