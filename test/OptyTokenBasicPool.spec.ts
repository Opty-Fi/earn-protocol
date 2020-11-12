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
    accounts: [
      {
        secretKey: PRIV_KEY,
        balance: ethers.utils.hexlify(ethers.utils.parseEther("1000")),
      },
    ],
  });

  const provider = new ethers.providers.Web3Provider(ganache);
  const wallet = new ethers.Wallet(PRIV_KEY, provider);

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
    await fundWallet(underlyingToken, wallet, "5");
    // Check Token and opToken balance of User's wallet and OptyTokenBaiscPool Contract
    userTokenBalanceWei = await tokenContractInstance.balanceOf(wallet.address)
    userInitialTokenBalance = parseFloat(fromWei(userTokenBalanceWei))
    expect(userInitialTokenBalance).to.greaterThan(0);
    
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

    await tokenContractInstance.approve(optyTokenBasicPool.address, TEST_AMOUNT)
    const userDepositOutput = await optyTokenBasicPool.userDeposit(TEST_AMOUNT);
    assert.isOk(userDepositOutput, "UserDeposit() call failed");

    // Check Token and opToken balance after userDeposit() call
    userTokenBalanceWei = await tokenContractInstance.balanceOf(wallet.address)
    const  newUserDaiBalance = parseFloat(fromWei(userTokenBalanceWei))
    expect(newUserDaiBalance).to.equal(userInitialTokenBalance - TEST_AMOUNT_NUM);

    contractTokenBalanceWei = await tokenContractInstance.balanceOf(optyTokenBasicPool.address);
    contractTokenBalance = parseFloat(fromWei(contractTokenBalanceWei));
    expect(contractTokenBalance).to.equal(TEST_AMOUNT_NUM);

    userOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(wallet.address)
    userOptyTokenBalance = parseFloat(fromWei(userOptyTokenBalanceWei));
    expect(userOptyTokenBalance).to.equal(TEST_AMOUNT_NUM);

  })

  // it ('USDC userDepost()', async () => {
  //   // 1. instantiate contracts
  //   const daiContract = new ethers.Contract(
  //     erc20.dai.address,
  //     erc20.dai.abi,
  //     wallet,
  //   )
  //   const uniswapFactoryContract = new ethers.Contract(
  //     uniswap.factory.address,
  //     uniswap.factory.abi,
  //     wallet,
  //   )
  //   const daiExchangeAddress = await uniswapFactoryContract.getExchange(
  //     erc20.dai.address,
  //   )
  //   const daiExchangeContract = new ethers.Contract(
  //     daiExchangeAddress,
  //     uniswap.exchange.abi,
  //     wallet,
  //   )

  //   // 2. do the actual swapping
  //   await daiExchangeContract.ethToTokenSwapInput(
  //     1, // min amount of token retrieved
  //     2525644800, // random timestamp in the future (year 2050)
  //     {
  //       gasLimit: 4000000,
  //       value: ethers.utils.parseEther("5"),
  //     },
  //   )

  //   // util function
  //   const fromWei = (x: string) => ethers.utils.formatUnits(x, 18)

  //   // 3. check DAI and opDAI balance
  //   let userTokenBalanceWei = await daiContract.balanceOf(wallet.address)
  //   let userInitialTokenBalance = parseFloat(fromWei(userTokenBalanceWei))
  //   expect(userInitialTokenBalance).to.greaterThan(0);
    
  //   let contractTokenBalanceWei = await daiContract.balanceOf(optyTokenBasicPool.address)
  //   let contractTokenBalance = parseFloat(fromWei(contractTokenBalanceWei))
  //   expect(contractTokenBalance).to.equal(0);

  //   let userOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(wallet.address)
  //   let userOptyTokenBalance = parseFloat(fromWei(userOptyTokenBalanceWei));
  //   expect(userOptyTokenBalance).to.equal(0);
  //   // console.log("Dai contract: ", daiContract.address)
  //   console.log("Contract initial daiBalance", contractTokenBalance)
  //   console.log("User's initial daiBalance", userInitialTokenBalance)
  //   console.log("User's initial Opty Dai Balance: ", userOptyTokenBalance);

  //   await daiContract.approve(optyTokenBasicPool.address, TEST_AMOUNT)
  //   const depositOutput = await optyTokenBasicPool.userDeposit(TEST_AMOUNT);
  //   // await console.log(depositOutput);

  //   // 3. check DAI and opDAI balance after userDeposit() call
  //   userTokenBalanceWei = await daiContract.balanceOf(wallet.address)
  //   const  newUserDaiBalance = parseFloat(fromWei(userTokenBalanceWei))
  //   expect(newUserDaiBalance).to.equal(userInitialTokenBalance - TEST_AMOUNT_NUM);

  //   contractTokenBalanceWei = await daiContract.balanceOf(optyTokenBasicPool.address);
  //   contractTokenBalance = parseFloat(fromWei(contractTokenBalanceWei));
  //   expect(contractTokenBalance).to.equal(TEST_AMOUNT_NUM);

  //   userOptyTokenBalanceWei = await optyTokenBasicPool.balanceOf(wallet.address)
  //   userOptyTokenBalance = parseFloat(fromWei(userOptyTokenBalanceWei));
  //   expect(userOptyTokenBalance).to.equal(TEST_AMOUNT_NUM);

  //   console.log("Contract daiBalance", contractTokenBalance)
  //   console.log("User balance: ", newUserDaiBalance);
  //   console.log("User's Opty Dai Balance: ", userOptyTokenBalance);

  // })

  // it('Contract deployed', async () => {
  //   // test case for reading properties of pool token
  //   console.log("---- Contract deployed: ", optyTokenBasicPool.address, " ---------\n")
  //   // console.log("\nprint Test1..");
  //   // console.log("\noptyTokenBasicPool: " , optyTokenBasicPool.address);
  //   console.log("\nWallet: ", wallet.address);
  // })
  // it("Check initial Contract balance", async () => {
  //   // console.log("\nprint Test2..");
  //   // console.log("\noptyTokenBasicPool: " , optyTokenBasicPool.address);
  //   // console.log("\nWallet: ", wallet.address);
  //   expect(await optyTokenBasicPool.balance()).to.equal(0);
  // });
  // it("Check userDeposit", async () => {
  //   console.log("\n---- Testing UserDeposit() -------\n");
  //   // console.log("\noptyTokenBasicPool: " , optyTokenBasicPool.address);
  //   // console.log("\nWallet: ", wallet.address);
  //   const execSync = require("child_process").execSync; //  library which helps to run any command from inside the js code
  //   let runDefiFaucetTransferCmd = "node /Users/guptaji/blockchain_projects/capital_methods_optyfi/defi-faucet/transfer.js -s dai -r " + wallet.address.toString()
  //   const output = await execSync(runDefiFaucetTransferCmd); //  Running the node transfer.js command from defi-faucet

  //   const daiContract = new ethers.Contract(
  //     erc20.dai.address,
  //     erc20.dai.abi,
  //     wallet,
  //   )
  //   const daiBalanceWei = await daiContract.balanceOf(wallet.address);
  //   console.log("----- DAI BALANCE OF WALLET: ", daiBalanceWei);
  //   await daiContract.approve(optyTokenBasicPool.address, expandTo18Decimals(12))
  //   // let contract = new web3.eth.Contract(OptyoptyTokenBasicPoolBasicPool.abi, optyTokenBasicPool.address);
  //   const depositOutput = await optyTokenBasicPool.userDeposit(expandTo18Decimals(11));
  //   await console.log(depositOutput);


  //   // await expect(optyTokenBasicPool.transfer(other.address, TEST_AMOUNT))
  //   //   .to.emit(optyTokenBasicPool, 'Transfer')
  //   //   .withArgs(wallet.address, other.address, TEST_AMOUNT)
  //   // expect(await optyTokenBasicPool.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
  //   // expect(await optyTokenBasicPool.balanceOf(other.address)).to.eq(TEST_AMOUNT)
  // });
})