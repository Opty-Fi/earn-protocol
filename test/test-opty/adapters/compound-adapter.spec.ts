import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";
import chai, { expect } from "chai";
import { solidity } from "ethereum-waffle";
import hre, { artifacts } from "hardhat";
import { ethers } from "@weiroll/weiroll.js/node_modules/ethers";

import { LiquidityPool, PoolItem } from "./types";
import { Contract as weirollContract, Planner as weirollPlanner } from "@weiroll/weiroll.js";
import { setTokenBalanceInStorage } from "../utils";
import CompoundAdapterParticulars from "@optyfi/defi-legos/ethereum/compound";
import EthereumTokens from "@optyfi/defi-legos/ethereum/tokens/index";

import {
  ICompound,
  IComptroller,
  ERC20,
  CompoundAdapter,
  CompoundAdapter__factory,
  ERC20__factory,
} from "../../../typechain";
import { CompoundAdapter as CompoundAdapterClass } from "../../../helpers/adapters/ethereum/CompoundAdapter";
// import { AdapterInterface } from "../../../helpers/adapters/AdapterInterface";
import { ETH } from "../../../helpers/constants/utils";
const { pools }: { pools: LiquidityPool } = CompoundAdapterParticulars;

import { Signers } from "../../../helpers/utils";

import { TestDeFiAdapterWeiroll, TestDeFiAdapter } from "../../../typechain";
import { COMPOUND_ADAPTER_NAME } from "../../../helpers/constants/adapters";
import { deployContract } from "ethereum-waffle";
import { ReturnValue } from "../../../helpers/type";

chai.use(solidity);

describe(`${COMPOUND_ADAPTER_NAME} Unit test`, () => {
  before(async function () {
    this.signers = {} as Signers;
    const signers: SignerWithAddress[] = await hre.ethers.getSigners();
    this.signers.deployer = signers[0];
    this.signers.alice = signers[3];
    const Lib = await hre.ethers.getContractFactory("contracts/protocol/lib/CommandBuilder.sol:CommandBuilder");
    const lib = await Lib.deploy();
    await lib.deployed();
    const TESTADAPTER = await hre.ethers.getContractFactory("TestDeFiAdapterWeiroll", {
      signer: signers[0],
      libraries: {
        CommandBuilder: lib.address,
      },
    });
    this.testAdapter = <TestDeFiAdapterWeiroll>await TESTADAPTER.deploy();
    console.log("hello2");
  });
  Object.keys(pools).map((token: string) => {
    const poolItem: PoolItem = pools[token];
    shouldBeHaveLikeAaveAdapter(token, poolItem);
  });
});

function shouldBeHaveLikeAaveAdapter(token: string, pool: PoolItem): void {
  describe(`${token}, pool address : ${pool.pool}, lpToken address: ${pool.lpToken}`, async function () {
    let decimals: string;
    const { tokens, lpToken } = pool;
    let compound: ICompound;
    let comptroller: IComptroller;

    //let compTroller: IComptroller;
    let compoundAdapter: CompoundAdapter;
    let lpTokenContract: ERC20;
    //let rewardTokenContract: ERC20;
    let erc20Contract: ERC20;
    let compoundAdapterClass: CompoundAdapterClass;
    const lpTokenSymbol: string = "";
    before(async function () {
      const inputToken = tokens[0] === ETH ? EthereumTokens.WRAPPED_TOKENS.WETH : tokens[0];

      erc20Contract = await hre.ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", inputToken);
      lpTokenContract = await hre.ethers.getContractAt("@openzeppelin/contracts/token/ERC20/ERC20.sol:ERC20", lpToken);
      compound = await hre.ethers.getContractAt("ICompound", pool.pool);
      comptroller = await hre.ethers.getContractAt("IComptroller", await compound.comptroller());
      compoundAdapter = <CompoundAdapter>(
        await hre.ethers.getContractAt(CompoundAdapter__factory.abi, "0x9680624ad6bf5a34ce496a483400585136c575a4")
      );
      compoundAdapterClass = new CompoundAdapterClass(compoundAdapter);
      if (await comptroller.mintGuardianPaused(compound.address)) {
        this.skip();
      }
    });
    it("1. getDepositPlan() should deposit successfully", async function () {
      await setTokenBalanceInStorage(erc20Contract, this.testAdapter.address, "10");

      const depositPlanner = new weirollPlanner();
      const inputTokenContract = weirollContract.createContract(
        new ethers.Contract(erc20Contract.address, ERC20__factory.abi),
      );
      const beforeERC20Value = await erc20Contract.balanceOf(this.testAdapter.address);
      const beforeLPValue = await lpTokenContract.balanceOf(this.testAdapter.address);

      const inputTokenAmount = <ReturnValue>(
        depositPlanner.add(inputTokenContract["balanceOf(address)"](this.testAdapter.address).staticcall())
      );

      compoundAdapterClass.getDepositPlan(
        depositPlanner,
        this.testAdapter,
        erc20Contract.address,
        compound.address,
        lpTokenContract.address,
        false,
        inputTokenAmount,
      );
      if (tokens[0] !== ETH) {
        await this.testAdapter.giveAllowances([erc20Contract.address], [compound.address]);
      }

      await this.testAdapter.executeVMCommands(depositPlanner.plan().commands, depositPlanner.plan().state);

      const afterERC20Value = await erc20Contract.balanceOf(this.testAdapter.address);
      const afterLPValue = await lpTokenContract.balanceOf(this.testAdapter.address);
      expect(afterERC20Value).to.be.lt(beforeERC20Value);
      expect(afterLPValue).to.be.gt(beforeLPValue);
    });
  });
}
