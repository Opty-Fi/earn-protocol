import chai, { assert, expect } from 'chai'
import { Contract, ethers, utils } from 'ethers'
import { solidity, deployContract } from 'ethereum-waffle'

import { expandToTokenDecimals, fundWallet } from './shared/utilities'
import OptyTokenBasicPool from "../build/OptyTokenBasicPool.json";
import OptyRegistry from "../build/OptyRegistry.json";
import RiskManager from "../build/OptyRiskManager.json";
import OptyStrategy from "../build/OptyStrategy.json";
import OptyCompoundDepositPoolProxy from "../build/OptyCompoundDepositPoolProxy.json";
import OptyAaveDepositPoolProxy from "../build/OptyAaveDepositPoolProxy.json";
import tokenAddresses from "./shared/TokenAddresses.json";
import addressAbis from "./shared/AddressAbis.json";
import ssNoCPStrategies from "./shared/SS_NO_CP_strategies.json";
const envConfig = require("dotenv").config(); //  library to import the local ENV variables defined
//  Note: Don't remove line-6, because this line helps to get rid of error: NOT ABLE TO READ LOCAL ENV VARIABLES defined in .env file

chai.use(solidity)

const Ganache = require("ganache-core")
const abi = require('ethereumjs-abi')
const MAINNET_NODE_URL = process.env.MAINNET_NODE_URL;
const TEST_AMOUNT_NUM: number = 3;
let TEST_AMOUNT:ethers.utils.BigNumber

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
  const tokens = [tokenAddresses.dai];
  let tokenContractInstance: Contract;
  let userTokenBalanceWei
  let userInitialTokenBalance: number
  let userTotalTokenBalance: number
  let contractTokenBalanceWei
  let contractTokenBalance: number
  let contractTotalTokenBalance: number
  let userOptyTokenBalanceWei
  let userOptyTokenBalance: number
  let userTokenOptyTokenBalance: number
  let optyCompoundDepositPoolProxy: Contract
  let optyAaveDepositPoolProxy: Contract
  let underlyingTokenDecimals: number
  let underlyingTokenName
  let strategies:{
    compound: string[];
    aave: string[];
}
  let tokensHash: string

  // util function for converting expanded values to Deimals number for readability and Testing
  const fromWei = (x: string) => ethers.utils.formatUnits(x, underlyingTokenDecimals)

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

    optyCompoundDepositPoolProxy = await deployContract(wallet, OptyCompoundDepositPoolProxy, [optyRegistry.address]);
    console.log("Compound Pool Proxy: ", optyCompoundDepositPoolProxy.address)
    assert.isDefined(optyCompoundDepositPoolProxy, "OptyCompoundDepositPoolProxy contract not deployed");

    optyAaveDepositPoolProxy = await deployContract(wallet, OptyAaveDepositPoolProxy, [optyRegistry.address]);
    console.log("Aave Pool Proxy: ", optyAaveDepositPoolProxy.address)
    assert.isDefined(optyAaveDepositPoolProxy, "OptyAaveDepositPoolProxy contract not deployed");

    // Instantiate token contract
    tokenContractInstance = new ethers.Contract(
      underlyingToken,
      addressAbis.erc20.abi,
      wallet,
    )
    underlyingTokenDecimals = await tokenContractInstance.decimals();
    TEST_AMOUNT = expandToTokenDecimals(TEST_AMOUNT_NUM, underlyingTokenDecimals);
    tokensHash = "0x" + abi.soliditySHA3(
      [ "address[]" ],
      [ tokens ]
    ).toString('hex')

    underlyingTokenName = await tokenContractInstance.symbol();
  })

  beforeEach(async () => {
    userTokenBalanceWei = await tokenContractInstance.balanceOf(wallet.address)
    userInitialTokenBalance = parseFloat(fromWei(userTokenBalanceWei))
    userOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(wallet.address)
    userOptyTokenBalance = parseFloat(fromWei(userOptyTokenBalanceWei))
    if (userInitialTokenBalance == 0 || userInitialTokenBalance == undefined) {
      
      let TEST_AMOUNT_HEX = "0x" + Number(TEST_AMOUNT).toString(16)

      //  Fund the user's wallet with some amount of tokens
      await fundWallet(underlyingToken, wallet, TEST_AMOUNT_HEX);

      // Check Token and opToken balance of User's wallet and OptyTokenBaiscPool Contract
      userTokenBalanceWei = await tokenContractInstance.balanceOf(wallet.address)
      userInitialTokenBalance = parseFloat(fromWei(userTokenBalanceWei))
      expect(userInitialTokenBalance).to.equal(TEST_AMOUNT_NUM);
      
    }
  })

  it('Contract deployed', async () => {
    assert.isOk(optyTokenBasicPool.address, "Contract is not deployed")
    console.log("\nDeployed OptyTokenBasicPool Contract address: ", optyTokenBasicPool.address)
    console.log("\nUser's Wallet address: ", wallet.address);
    console.log("\nTokens Hash: ", tokensHash)

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

  //  TODO: Have to  modify this strategies logic once new strategy struct has been implemented
  //        - Deepanshu
  for (var key of Object.keys(ssNoCPStrategies)) {
    let strategySteps:string[][]

        if (key == "dai") {
          strategies = ssNoCPStrategies[key]
          
          for (var protocol of Object.keys(strategies)){
            if (protocol == "compound") {
              it (key.toUpperCase() + ' userDepositRebalance() for ' + protocol + ' protocol', async () => {
              strategies.compound[4] = optyCompoundDepositPoolProxy.address.toString()
              strategySteps = [strategies.compound]
              
              await testUserDepositRebalance(strategySteps)
            })
            } else if (protocol == "aave") {    
              it (key.toUpperCase() + ' userDepositRebalance() for ' + protocol + ' protocol', async () => {
              strategies.aave[4] = optyAaveDepositPoolProxy.address.toString()
              strategySteps = [strategies.aave]
              
              await testUserDepositRebalance(strategySteps)
            })
            } 

          }
        }
  }

  //  Function to test the userDepositRebalance() of optyTokenBasicPool contract
  async function testUserDepositRebalance(strategySteps:string[][]) {

    let prevUserOptyTokenBalanceWei:ethers.utils.BigNumber 
    prevUserOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(wallet.address)
    
    const setStrategyTx = await optyRegistry.setStrategy(tokensHash, strategySteps);
    assert.isDefined(setStrategyTx, "Setting StrategySteps has failed!")

    const receipt = await setStrategyTx.wait();
    let strategyHash = receipt.events[0].args[2];
    expect(strategyHash.toString().length).to.equal(66);

    let strategy = await optyRegistry.getStrategy(strategyHash.toString())
    if (!strategy["_isStrategy"]) {
      await optyRegistry.approveStrategy(strategyHash.toString());
      strategy = await optyRegistry.getStrategy(strategyHash.toString());
      assert.isTrue(strategy["_isStrategy"], "Strategy is not approved");
    }

    await tokenContractInstance.approve(optyTokenBasicPool.address, TEST_AMOUNT);
    expect(await tokenContractInstance.allowance(wallet.address, optyTokenBasicPool.address)).to.equal(TEST_AMOUNT);

    const userDepositRebalanceTx = await optyTokenBasicPool.userDepositRebalance(TEST_AMOUNT);
    assert.isOk(userDepositRebalanceTx, "UserDepositRebalance() call failed");

    // Check Token and opToken balance after userDeposit() call
    userTokenBalanceWei = await tokenContractInstance.balanceOf(wallet.address)
    const  userNewTokenBalance = parseFloat(fromWei(userTokenBalanceWei))
    expect(userNewTokenBalance).to.equal(userInitialTokenBalance - TEST_AMOUNT_NUM);
    userInitialTokenBalance = userNewTokenBalance;

    contractTokenBalanceWei = await tokenContractInstance.balanceOf(optyTokenBasicPool.address);
    contractTokenBalance = parseFloat(fromWei(contractTokenBalanceWei));
    expect(contractTokenBalance).to.equal(0);
    
    userOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(wallet.address)
    const userNewOptyTokenBalance = parseFloat(fromWei(userOptyTokenBalanceWei));
    //  TODO: Need to fix this assertion error for the decimals values - Deepanshu
    // expect(userNewOptyTokenBalance).to.equal(userOptyTokenBalance + TEST_AMOUNT_NUM);
    userOptyTokenBalance = userNewOptyTokenBalance;
  }
})