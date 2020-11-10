import chai, { expect } from 'chai'
import { Contract, ethers, utils } from 'ethers'
import { solidity, MockProvider, deployContract, getWallets } from 'ethereum-waffle'

import { expandTo18Decimals } from './shared/utilities'
import BasicToken from "../build/OptyTokenBasicPool.json";
import RiskManager from "../build/OptyRiskManager.json";
import IERC20 from "../build/IERC20.json";
// import from "./borrowTokensList";
// import * as Web3 from "web3";
// import Web3 from "web3";


chai.use(solidity)

// const TOTAL_SUPPLY = expandTo18Decimals(10000)
const TEST_AMOUNT = expandTo18Decimals(10)
// const { ethers } = require("ethers");
const erc20 = require("@studydefi/money-legos/erc20");

// const ethers = require('ethers')
// const utils = ethers.utils

describe('OptyTokenBasicPool', async () => {
  // const provider = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  // const web3 = await new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
  // const provider = new MockProvider({
  //   hardfork: 'istanbul',
  //   mnemonic: 'beep beep beep beep beep beep beep beep beep beep beep beep',
  //   gasLimit: 9999999
  // });
  // const [wallet, other] = provider.getWallets();

  const provider = new MockProvider({
    fork: 'http://localhost:8545',
    mnemonic: 'clarify near noodle jeans manage nice ignore female duck parrot fuel leader',
    gasLimit: 9999999
  })
  const [wallet, other] = provider.getWallets()

  // let wallet = await web3.eth.accounts.wallet;
  // const wal = new wallet()
  // console.log(wallet);

  let token: Contract
  let dai: Contract
  let profile = "basic";
  let underlyingToken = "0x6b175474e89094c44da98b954eedeac495271d0f";
  let optyRegistry = "0x72A7db2f912540d9c1C92d48d75Fee8Ce0B137d1";
  let riskManager = "0x27a0585517ad29882Df74962528c26DCF18Cb846";
  let strategyContract = "0xB74845099d30B56b2EE910BFC17ebBBb041FB5C0";

  // const inBytes = utils.formatBytes32String("0xB74845099d30B56b2EE910BFC17ebBBb041FB5C0");
  // console.log("printing.....")

  // let account = web3.eth.accounts.create(web3.utils.randomHex(32));
  // let wallet = web3.eth.accounts.wallet.add(account);
  // let keystore = wallet.encrypt(web3.utils.randomHex(32));
  // console.log({
  //   account: account,
  //   wallet: wallet,
  //   keystore: keystore
  // });

  before(async () => {

    console.log("------ Deploying Contract ---------\n")
    // token = await deployContract(wallet, BasicToken, ["basic", "0x52B2c634a931ADd8BA2EF784fB9bC51F46B7eB66", "0x6b175474e89094c44da98b954eedeac495271d0f", "0x0273F452590fa571283Ee0292B6a0380a44DF0f5"]);
    token = await deployContract(wallet, BasicToken, ["basic", riskManager, underlyingToken, strategyContract]);
    // console.log("---- Contract deployed: ", token.address, " ---------\n")
    // token = await deployContract(wallet, BasicToken, ["basic", utils.formatBytes32String("0x27a0585517ad29882Df74962528c26DCF18Cb846"), utils.formatBytes32String("0x6b175474e89094c44da98b954eedeac495271d0f"), utils.formatBytes32String("0xB74845099d30B56b2EE910BFC17ebBBb041FB5C0")]);
  });

  it('Contract deployed', async () => {
    // test case for reading properties of pool token
    console.log("---- Contract deployed: ", token.address, " ---------\n")
    // console.log("\nprint Test1..");
    // console.log("\nToken: " , token.address);
    console.log("\nWallet: ", wallet.address);
  })
  it("Check initial Contract balance", async () => {
    // console.log("\nprint Test2..");
    // console.log("\nToken: " , token.address);
    // console.log("\nWallet: ", wallet.address);
    expect(await token.balance()).to.equal(0);
  });
  it("Check userDeposit", async () => {
    console.log("\n---- Testing UserDeposit() -------\n");
    // console.log("\nToken: " , token.address);
    // console.log("\nWallet: ", wallet.address);
    const execSync = require("child_process").execSync; //  library which helps to run any command from inside the js code
    let runDefiFaucetTransferCmd = "node /Users/guptaji/blockchain_projects/capital_methods_optyfi/defi-faucet/transfer.js -s dai -r " + wallet.address.toString()
    const output = await execSync(runDefiFaucetTransferCmd); //  Running the node transfer.js command from defi-faucet

    const daiContract = new ethers.Contract(
      erc20.dai.address,
      erc20.dai.abi,
      wallet,
    )
    const daiBalanceWei = await daiContract.balanceOf(wallet.address);
    console.log("----- DAI BALANCE OF WALLET: ", daiBalanceWei);
    await daiContract.approve(token.address, expandTo18Decimals(12))
    // let contract = new web3.eth.Contract(BasicToken.abi, token.address);
    const depositOutput = await token.userDeposit(expandTo18Decimals(11));
    await console.log(depositOutput);


    // await expect(token.transfer(other.address, TEST_AMOUNT))
    //   .to.emit(token, 'Transfer')
    //   .withArgs(wallet.address, other.address, TEST_AMOUNT)
    // expect(await token.balanceOf(wallet.address)).to.eq(TOTAL_SUPPLY.sub(TEST_AMOUNT))
    // expect(await token.balanceOf(other.address)).to.eq(TEST_AMOUNT)
  });
})